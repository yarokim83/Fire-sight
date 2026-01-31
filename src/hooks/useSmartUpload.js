import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'; // updateDoc, doc 복구
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // --- [1. 상태 관리: UI 및 시스템 제어] ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualMode, setIsManualMode] = useState(!navigator.onLine);
    const [isSaving, setIsSaving] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [viewMode, setViewMode] = useState('problem');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingAnswer, setIsAnalyzingAnswer] = useState(false);
    const [step, setStep] = useState(1);
    
    // --- [2. 상태 관리: 이미지 및 파일 데이터] ---
    const [problemPreviewUrls, setProblemPreviewUrls] = useState([]);
    const [answerPreviewUrls, setAnswerPreviewUrls] = useState([]);
    const [problemFiles, setProblemFiles] = useState([]);
    const [answerFiles, setAnswerFiles] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // --- [3. 상태 관리: 폼 데이터] ---
    const [formData, setFormData] = useState({
        type: 'workbook', 
        category: '수계소화설비', 
        title: '', 
        description: '', // UI 표시용 (DB의 content 필드)
        modelAnswer: '', 
        keywords: '', 
        problemType: 'descriptive',
        source: '',
        gradingPoints: {
            mandatory_terms: [],
            mandatory_numbers: []
        }
    });

    const inputFileRef = useRef(null);
    const inputAddRef = useRef(null);
    const isMounted = useRef(true);

    // --- [4. 로그 및 네트워크 관리] ---
    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    useEffect(() => {
        isMounted.current = true;
        const handleStatus = () => {
            if (!isMounted.current) return;
            setIsOnline(navigator.onLine);
            if (!navigator.onLine) setIsManualMode(true);
            addLog(navigator.onLine ? "✅ 네트워크 연결됨" : "⚠️ 오프라인 모드 전환");
        };
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        
        return () => {
            isMounted.current = false;
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
            problemPreviewUrls.forEach(url => { if(url?.startsWith('blob:')) URL.revokeObjectURL(url); });
            answerPreviewUrls.forEach(url => { if(url?.startsWith('blob:')) URL.revokeObjectURL(url); });
        };
    }, [problemPreviewUrls, answerPreviewUrls, addLog]); 

    // --- [5. 데이터 로드 (수정 모드 완벽 대응)] ---
    useEffect(() => {
        if (initialData) {
            setFormData({
                type: initialData.type || 'workbook',
                title: initialData.title || '',
                description: initialData.content || '',
                category: initialData.subject || initialData.category || '수계소화설비',
                keywords: initialData.tags ? initialData.tags.join(', ') : '',
                modelAnswer: initialData.answer || initialData.modelAnswer || '',
                source: initialData.source || '',
                gradingPoints: initialData.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] }
            });
            setProblemPreviewUrls(initialData.images || []);
            setProblemFiles(initialData.images || []);
            setAnswerPreviewUrls(initialData.answerImages || []);
            setAnswerFiles(initialData.answerImages || []);
            setStep(3);
        }
    }, [initialData]);

    // --- [6. 이미지 압축 및 업로드 엔진] ---
    const uploadImagesToStorage = async (files) => {
        const uploadedUrls = [];
        const compressionOptions = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' };

        const uploadSingleFile = async (file, index) => {
            if (typeof file === 'string') return file; // 이미 URL인 경우 패스

            let fileToUpload = file;
            try {
                if (file.size > 300 * 1024) {
                    addLog(`🔨 [${index + 1}] 이미지 압축 중...`);
                    fileToUpload = await imageCompression(file, compressionOptions);
                }
            } catch (e) { addLog(`⚠️ 압축 실패 (원본 사용)`); }

            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, `workbook_images/${fileName}`);
            
            return new Promise((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (progress % 20 === 0 || progress === 100) addLog(`📡 업로드: ${Math.round(progress)}%`);
                    }, 
                    (error) => reject(error), 
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(url);
                    }
                );
            });
        };

        for (const [index, file] of files.entries()) {
            const url = await uploadSingleFile(file, index);
            uploadedUrls.push(url);
        }
        return uploadedUrls;
    };

    // --- [7. AI 분석 및 편집 핸들러] ---
    const handleInitialUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setProblemPreviewUrls(files.map(file => URL.createObjectURL(file)));
        setProblemFiles(files);
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
                        title: result.title || prev.title, 
                        description: result.content || prev.description,
                        category: result.category || prev.category,
                        keywords: result.keywords || prev.keywords
                    }));
                }
            } catch (e) { addLog(`❌ 분석 실패: ${e.message}`); }
            finally { if (isMounted.current) { setIsAnalyzing(false); setStep(3); } }
        }
    };

    const handleAddImages = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const newUrls = files.map(file => URL.createObjectURL(file));

        if (viewMode === 'problem') {
            setProblemPreviewUrls(p => [...p, ...newUrls]);
            setProblemFiles(p => [...p, ...files]);
        } else {
            setAnswerPreviewUrls(p => [...p, ...newUrls]);
            setAnswerFiles(p => [...p, ...files]);
            if (!isManualMode) {
                setIsAnalyzingAnswer(true);
                try {
                    let accAnswer = ""; let accKeywords = ""; 
                    let newTerms = []; let newNumbers = [];
                    for (const file of files) {
                        const res = await analyzeImage(file, formData.type, 'answer');
                        if (res.answer) accAnswer += `\n\n${res.answer}`;
                        if (res.keywords) accKeywords += (accKeywords ? ", " : "") + res.keywords;
                        if (res.grading_points) {
                            newTerms.push(...(res.grading_points.mandatory_terms || []));
                            newNumbers.push(...(res.grading_points.mandatory_numbers || []));
                        }
                    }
                    if (isMounted.current) {
                        setFormData(prev => ({
                            ...prev,
                            modelAnswer: (prev.modelAnswer + accAnswer).trim(),
                            keywords: [...new Set([...(prev.keywords ? prev.keywords.split(',').map(s=>s.trim()) : []), ...(accKeywords ? accKeywords.split(',').map(s=>s.trim()) : [])])].join(', '),
                            gradingPoints: {
                                mandatory_terms: [...new Set([...prev.gradingPoints.mandatory_terms, ...newTerms].map(t => t.trim()))],
                                mandatory_numbers: [...new Set([...prev.gradingPoints.mandatory_numbers, ...newNumbers].map(n => n.trim()))]
                            }
                        }));
                    }
                } catch(e) { addLog(`❌ 해설 분석 오류`); }
                finally { if(isMounted.current) setIsAnalyzingAnswer(false); }
            }
        }
    };

    const updateGradingPoint = (type, action, value, index) => {
        setFormData(prev => {
            const list = [...prev.gradingPoints[type]];
            if (action === 'add') list.push('');
            else if (action === 'update') list[index] = value;
            else if (action === 'remove') list.splice(index, 1);
            return { ...prev, gradingPoints: { ...prev.gradingPoints, [type]: list } };
        });
    };

    // --- [8. 저장 로직 (신규 저장 및 수정 통합 복구)] ---
    const handleSave = async () => {
        if (!formData.title.trim()) return alert("제목을 입력해주세요.");
        setIsSaving(true);
        try {
            const pUrls = await uploadImagesToStorage(problemFiles);
            const aUrls = await uploadImagesToStorage(answerFiles);
            const searchTags = formData.keywords.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t);

            const saveData = {
                ...formData,
                content: formData.description, // field 명칭 일관성 유지
                answer: formData.modelAnswer,
                tags: searchTags,
                gradingPoints: formData.gradingPoints,
                images: pUrls,
                answerImages: aUrls,
                updatedAt: serverTimestamp(),
                isManual: isManualMode
            };

            if (initialData?.id) {
                // 🔴 삭제되었던 수정(Update) 로직 복구
                await updateDoc(doc(db, "workbook", initialData.id), saveData);
                addLog("✅ 기존 문제 수정 완료");
            } else {
                // 신규 저장 시에만 createdAt 추가
                saveData.createdAt = serverTimestamp();
                await addDoc(collection(db, "workbook"), saveData);
                addLog("✅ 신규 문제 저장 완료");
            }

            alert("성공적으로 저장되었습니다!");
            if(onSaveComplete) onSaveComplete();
            resetState();
        } catch (e) { 
            addLog(`❌ 저장 실패: ${e.message}`);
            alert("저장 중 오류가 발생했습니다.");
        } finally { 
            if(isMounted.current) setIsSaving(false); 
        }
    };

    const resetState = () => {
        setStep(1); setProblemFiles([]); setAnswerFiles([]); setProblemPreviewUrls([]); setAnswerPreviewUrls([]);
        setFormData({ type: 'workbook', category: '수계소화설비', title: '', description: '', modelAnswer: '', keywords: '', source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] } });
        if(isMounted.current) setIsSaving(false);
    };

    const handleRemoveImage = () => {
        const isProb = viewMode === 'problem';
        const urls = isProb ? problemPreviewUrls : answerPreviewUrls;
        if (urls.length === 0 || !window.confirm("삭제할까요?")) return;
        if (isProb) {
            setProblemPreviewUrls(p => p.filter((_, i) => i !== currentImageIndex));
            setProblemFiles(p => p.filter((_, i) => i !== currentImageIndex));
        } else {
            setAnswerPreviewUrls(p => p.filter((_, i) => i !== currentImageIndex));
            setAnswerFiles(p => p.filter((_, i) => i !== currentImageIndex));
        }
        setCurrentImageIndex(0);
    };

    return {
        isOnline, isManualMode, setIsManualMode, isSaving, step, setStep, viewMode, setViewMode, formData, setFormData,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex, isAnalyzing, isAnalyzingAnswer, 
        debugLogs, showDebug, setShowDebug, setDebugLogs, inputFileRef, inputAddRef,
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState, updateGradingPoint
    };
};