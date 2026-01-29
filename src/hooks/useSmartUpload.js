import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
// 🔴 analyzeImage가 grading_points를 반환하도록 수정된 버전이어야 합니다.
import { analyzeImage } from '../utils/gemini'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // --- [기능 보존] 상태 관리 전체 ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualMode, setIsManualMode] = useState(!navigator.onLine);
    const [isSaving, setIsSaving] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [viewMode, setViewMode] = useState('problem');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingAnswer, setIsAnalyzingAnswer] = useState(false);
    const [step, setStep] = useState(1);
    
    const [problemPreviewUrls, setProblemPreviewUrls] = useState([]);
    const [answerPreviewUrls, setAnswerPreviewUrls] = useState([]);
    const [problemFiles, setProblemFiles] = useState([]);
    const [answerFiles, setAnswerFiles] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // 🔴 [개선] gradingPoints 초기 상태 추가
    const [formData, setFormData] = useState({
        type: 'workbook', 
        category: '수계소화설비', 
        title: '', 
        description: '',
        modelAnswer: '', 
        keywords: '', 
        problemType: 'descriptive',
        answer: '', 
        reference: '',
        gradingPoints: {
            mandatory_terms: [],
            mandatory_numbers: []
        }
    });

    const inputFileRef = useRef(null);
    const inputAddRef = useRef(null);
    const isMounted = useRef(true);

    // --- [기능 보존] 로그 및 네트워크 관리 ---
    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${msg}`);
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    useEffect(() => {
        isMounted.current = true;
        const handleStatus = () => {
            if (!isMounted.current) return;
            setIsOnline(navigator.onLine);
            if (!navigator.onLine) setIsManualMode(true);
            addLog(navigator.onLine ? "네트워크 연결됨" : "오프라인 모드 전환");
        };
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        
        return () => {
            isMounted.current = false;
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
            // 메모리 누수 방지
            problemPreviewUrls.forEach(url => { if(url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
            answerPreviewUrls.forEach(url => { if(url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
        };
    }, [problemPreviewUrls, answerPreviewUrls, addLog]); 

    useEffect(() => { setCurrentImageIndex(0); }, [viewMode]);

    // --- [기능 보존] 데이터 로드 ---
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                type: initialData.type || 'workbook',
                title: initialData.title || '',
                description: initialData.content || '',
                category: initialData.subject || prev.category,
                keywords: initialData.tags ? initialData.tags.join(', ') : '',
                modelAnswer: initialData.answer || '',
                // 🔴 기존 데이터 로드 시 채점 포인트도 함께 로드
                gradingPoints: initialData.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] }
            }));
            const pImages = initialData.images || (initialData.imageUrl ? [initialData.imageUrl] : []);
            const aImages = initialData.answerImages || (initialData.answerImageUrl ? [initialData.answerImageUrl] : []);
            setProblemPreviewUrls(pImages); setProblemFiles(pImages);
            setAnswerPreviewUrls(aImages); setAnswerFiles(aImages);
            setStep(3);
        }
    }, [initialData]);

    const processFiles = async (files) => {
        if (files.length === 0) return { newUrls: [] };
        const newUrls = files.map(file => URL.createObjectURL(file));
        return { newUrls };
    };

    // --- [기능 보존] 이미지 압축 및 업로드 로직 전체 ---
    const uploadImagesToStorage = async (files) => {
        const uploadedUrls = [];
        const compressionOptions = { 
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1280,
            useWebWorker: true, 
            fileType: 'image/webp',
            initialQuality: 0.7      
        };

        const uploadSingleFile = async (file, index) => {
            if (typeof file === 'string') return file;

            let fileToUpload = file;
            try {
                if (file.size > 300 * 1024) {
                    addLog(`🔨 [${index + 1}] 압축 중...`);
                    fileToUpload = await imageCompression(file, compressionOptions);
                }
            } catch (e) { addLog(`⚠️ 압축 패스 (원본 사용)`); }

            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, `workbook_images/${fileName}`);
            
            return new Promise((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
                const timer = setTimeout(() => {
                    uploadTask.cancel();
                    reject(new Error("2분 시간 초과"));
                }, 120000);

                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (progress % 20 === 0 || progress === 100) { 
                            addLog(`📡 [${index + 1}] 전송 중... ${Math.round(progress)}%`);
                        }
                    }, 
                    (error) => { clearTimeout(timer); reject(error); }, 
                    async () => {
                        clearTimeout(timer);
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(url);
                    }
                );
            });
        };

        for (const [index, file] of files.entries()) {
            try {
                const url = await uploadSingleFile(file, index);
                uploadedUrls.push(url);
                addLog(`✅ [${index + 1}] 업로드 완료`);
            } catch (error) { addLog(`🔥 [${index + 1}] 실패: ${error.message}`); throw error; }
        }
        return uploadedUrls;
    };

    // --- [기능 보존 & 개선] 액션 핸들러 ---
    const handleInitialUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const { newUrls } = await processFiles(files);
        setProblemPreviewUrls(prev => [...prev, ...newUrls]);
        setProblemFiles(prev => [...prev, ...files]);
        setViewMode('problem');

        if (isManualMode) {
            setFormData(prev => ({ ...prev, title: `수동 기록 (${new Date().toLocaleTimeString()})` }));
            setStep(3);
        } else {
            setStep(2); setIsAnalyzing(true);
            try {
                const result = await analyzeImage(files[0], formData.type, 'problem');
                if (isMounted.current) {
                    setFormData(prev => ({ 
                        ...prev, 
                        title: result.title || '', 
                        description: result.content || '',
                        category: result.category || prev.category,
                        keywords: result.keywords || ''
                    }));
                }
            } catch (e) { addLog(`분석 실패: ${e.message}`); }
            finally { if (isMounted.current) { setIsAnalyzing(false); setStep(3); } }
        }
    };

    const handleAddImages = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const { newUrls } = await processFiles(files);

        if (viewMode === 'problem') {
            setProblemPreviewUrls(p => {
                const updated = [...p, ...newUrls];
                setCurrentImageIndex(updated.length - 1); 
                return updated;
            });
            setProblemFiles(p => [...p, ...files]);
        } else {
            setAnswerPreviewUrls(p => {
                const updated = [...p, ...newUrls];
                setCurrentImageIndex(updated.length - 1);
                return updated;
            });
            setAnswerFiles(p => [...p, ...files]);
            
            if (!isManualMode) {
                setIsAnalyzingAnswer(true);
                try {
                    let accAnswer = ""; 
                    let accKeywords = ""; 
                    // 🔴 채점 포인트 누적용 변수
                    let newTerms = [];
                    let newNumbers = [];
                    
                    for (const file of files) {
                        const res = await analyzeImage(file, formData.type, 'answer');
                        if (res.answer) accAnswer += `\n\n[추가 해설]\n${res.answer}`;
                        if (res.keywords) accKeywords += (accKeywords ? ", " : "") + res.keywords;
                        
                        // 🔴 AI가 추출한 채점 포인트 수집
                        if (res.grading_points) {
                            newTerms = [...newTerms, ...(res.grading_points.mandatory_terms || [])];
                            newNumbers = [...newNumbers, ...(res.grading_points.mandatory_numbers || [])];
                        }
                    }
                    
                    if (isMounted.current) {
                        setFormData(prev => ({
                            ...prev,
                            modelAnswer: (prev.modelAnswer + accAnswer).trim(),
                            keywords: [...new Set([
                                ...(prev.keywords ? prev.keywords.split(',').map(s=>s.trim()) : []), 
                                ...(accKeywords ? accKeywords.split(',').map(s=>s.trim()) : [])
                            ])].join(', '),
                            // 🔴 기존 포인트와 새 포인트를 합쳐서 업데이트 (중복 제거)
                            gradingPoints: {
                                mandatory_terms: [...new Set([...prev.gradingPoints.mandatory_terms, ...newTerms])],
                                mandatory_numbers: [...new Set([...prev.gradingPoints.mandatory_numbers, ...newNumbers])]
                            }
                        }));
                    }
                } catch(e) { addLog(`해설 분석 오류: ${e.message}`); }
                finally { if(isMounted.current) setIsAnalyzingAnswer(false); }
            }
        }
    };

    const handleRemoveImage = () => {
        const isProb = viewMode === 'problem';
        const urls = isProb ? problemPreviewUrls : answerPreviewUrls;
        if (urls.length === 0 || !window.confirm("삭제하시겠습니까?")) return;
        
        const targetUrl = urls[currentImageIndex];
        if (targetUrl && targetUrl.startsWith('blob:')) URL.revokeObjectURL(targetUrl);

        if (isProb) {
            setProblemPreviewUrls(p => p.filter((_, i) => i !== currentImageIndex));
            setProblemFiles(p => p.filter((_, i) => i !== currentImageIndex));
        } else {
            setAnswerPreviewUrls(p => p.filter((_, i) => i !== currentImageIndex));
            setAnswerFiles(p => p.filter((_, i) => i !== currentImageIndex));
        }
        setCurrentImageIndex(prev => Math.max(0, prev - 1));
    };

    // --- [기능 보존 & 개선] 저장 로직 ---
    const handleSave = async () => {
        addLog("👇 저장 시작");
        if (!formData.title.trim()) return alert("제목을 입력해주세요.");
        if (isSaving) return;

        setIsSaving(true); 
        setDebugLogs([]); 
        
        try {
            const pUrls = await uploadImagesToStorage(problemFiles);
            const aUrls = await uploadImagesToStorage(answerFiles);
            
            const saveData = {
                ...formData,
                title: formData.title || "제목 없음",
                content: formData.description || "",
                answer: formData.modelAnswer || "", 
                tags: formData.keywords.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t),
                // 🔴 [핵심] Firestore에 채점 포인트 필드 추가 저장
                gradingPoints: formData.gradingPoints,
                createdAt: serverTimestamp(),
                images: pUrls, imageUrl: pUrls[0] || null,
                answerImages: aUrls, answerImageUrl: aUrls[0] || null,
                isManual: isManualMode
            };

            await addDoc(collection(db, "workbook"), saveData);
            addLog("✅ DB 저장 최종 완료");
            alert("저장되었습니다!");
            if(onSaveComplete) onSaveComplete();
            resetState(true);
        } catch (e) {
            addLog(`🔥 최종 실패: ${e.message}`);
            alert(`저장 실패: ${e.message}`);
        } finally { 
            if(isMounted.current) setIsSaving(false);
        }
    };

    const resetState = (keepSettings = false) => {
        setStep(1); 
        problemPreviewUrls.forEach(url => { if(url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
        answerPreviewUrls.forEach(url => { if(url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
        
        setProblemFiles([]); setAnswerFiles([]);
        setProblemPreviewUrls([]); setAnswerPreviewUrls([]);
        setFormData(prev => ({
            ...prev, title: '', description: '', modelAnswer: '', keywords: '', answer: '',
            category: keepSettings ? prev.category : '수계소화설비',
            // 🔴 초기화 시 채점 포인트도 리셋
            gradingPoints: { mandatory_terms: [], mandatory_numbers: [] }
        }));
        if(inputFileRef.current) inputFileRef.current.value = '';
        if(inputAddRef.current) inputAddRef.current.value = '';
        if(isMounted.current) setIsSaving(false);
        addLog("상태 초기화됨");
    };

    return {
        isOnline, isManualMode, setIsManualMode, isSaving, step, setStep,
        viewMode, setViewMode, formData, setFormData,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex,
        isAnalyzing, isAnalyzingAnswer, debugLogs, showDebug, setShowDebug, setDebugLogs,
        inputFileRef, inputAddRef,
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState
    };
};