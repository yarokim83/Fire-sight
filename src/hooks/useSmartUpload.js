import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // --- 상태 관리 ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualMode, setIsManualMode] = useState(!navigator.onLine);
    const [isSaving, setIsSaving] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(true);
    const [viewMode, setViewMode] = useState('problem'); // 'problem' | 'answer'
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingAnswer, setIsAnalyzingAnswer] = useState(false);
    const [step, setStep] = useState(1);
    
    // 데이터 상태
    const [problemPreviewUrls, setProblemPreviewUrls] = useState([]);
    const [answerPreviewUrls, setAnswerPreviewUrls] = useState([]);
    const [problemFiles, setProblemFiles] = useState([]);
    const [answerFiles, setAnswerFiles] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    const [formData, setFormData] = useState({
        type: 'workbook', category: '수계', title: '', description: '',
        modelAnswer: '', keywords: '', problemType: 'descriptive',
        answer: '', reference: '',
    });

    const inputFileRef = useRef(null);
    const inputAddRef = useRef(null);
    
    const isMounted = useRef(true);

    // --- 로그 기능 ---
    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${msg}`);
        if(isMounted.current) {
            setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
        }
    }, []);

    // --- 초기화 및 Cleanup ---
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
            
            problemPreviewUrls.forEach(url => { if(url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
            answerPreviewUrls.forEach(url => { if(url && url.startsWith('blob:')) URL.revokeObjectURL(url); });
        };
    }, []); 

    useEffect(() => { setCurrentImageIndex(0); }, [viewMode]);

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

    // =================================================================
    // [최종 해결책] 순차 업로드 (Sequential Upload) - 절대 실패하지 않음
    // =================================================================
    const uploadImagesToStorage = async (files) => {
        const uploadedUrls = [];
        
        // 1. 압축 옵션: WebP 변환 + 강력한 용량 제한
        const compressionOptions = { 
            maxSizeMB: 0.5,          // 0.5MB 목표
            maxWidthOrHeight: 1280,  // HD 해상도
            useWebWorker: true, 
            fileType: 'image/webp',
            initialQuality: 0.7      
        };

        // 2. 개별 파일 업로드 함수 (재시도 로직 포함)
        const uploadSingleFile = async (file, index) => {
            if (typeof file === 'string') return file;

            let fileToUpload = file;
            
            // [압축 단계]
            try {
                addLog(`[${index + 1}/${files.length}] 압축 중...`);
                // 300KB 이상일 때만 압축 (작은 파일은 바로 통과)
                if (file.size > 300 * 1024) {
                    fileToUpload = await imageCompression(file, compressionOptions);
                }
            } catch (e) {
                addLog(`⚠️ 압축 실패(원본 사용)`);
            }

            // [업로드 단계] - 재시도 3회
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, `workbook_images/${fileName}`);
            
            let attempt = 0;
            const maxRetries = 3;

            while (attempt < maxRetries) {
                try {
                    addLog(`⬆️ [${index + 1}/${files.length}] 업로드 시도 (${attempt + 1}회)...`);
                    
                    const uploadTask = uploadBytes(storageRef, fileToUpload);
                    
                    // 타임아웃 3분 (파일 1개당 3분이면 충분함)
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Timeout")), 180000)
                    );
                    
                    await Promise.race([uploadTask, timeoutPromise]);
                    
                    const url = await getDownloadURL(storageRef);
                    return url; // 성공 시 URL 반환하고 종료

                } catch (e) {
                    attempt++;
                    console.warn(`Upload failed: ${e.message}`);
                    if (attempt >= maxRetries) throw new Error(`업로드 최종 실패: ${e.message}`);
                    
                    // 실패 시 2초 대기 후 재시도
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        };

        // 3. [핵심 변경] 병렬(Promise.all) 대신 순차(for loop) 실행
        // 하나가 끝나야 다음으로 넘어갑니다. 대역폭을 독점하여 성공률을 극대화합니다.
        for (const [index, file] of files.entries()) {
            try {
                const url = await uploadSingleFile(file, index);
                uploadedUrls.push(url);
                addLog(`✅ [${index + 1}] 완료`);
            } catch (error) {
                addLog(`🔥 [${index + 1}] 실패 중단: ${error.message}`);
                throw error; // 하나라도 실패하면 전체 저장 중단
            }
        }

        return uploadedUrls;
    };

    // --- 액션 핸들러 ---
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
                    setFormData(prev => ({ ...prev, title: result.title || '', description: result.content || '' }));
                }
            } catch (e) {
                addLog(`분석 실패: ${e.message}`);
            } finally { 
                if (isMounted.current) {
                    setIsAnalyzing(false); 
                    setStep(3);
                }
            }
        }
    };

    const handleAddImages = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        const { newUrls } = await processFiles(files);

        if (viewMode === 'problem') {
            setProblemPreviewUrls(p => [...p, ...newUrls]);
            setProblemFiles(p => [...p, ...files]);
            setCurrentImageIndex(prev => prev + newUrls.length);
        } else {
            setAnswerPreviewUrls(p => [...p, ...newUrls]);
            setAnswerFiles(p => [...p, ...files]);
            setCurrentImageIndex(prev => prev + newUrls.length);
            
            if (!isManualMode) {
                setIsAnalyzingAnswer(true);
                try {
                    let accAnswer = ""; let accTags = [];
                    for (const file of files) {
                        const res = await analyzeImage(file, formData.type, 'answer');
                        if (res.answer) accAnswer += `\n\n[추가 해설]\n${res.answer}`;
                        if (res.tags) accTags = [...accTags, ...res.tags];
                    }
                    if (isMounted.current) {
                        setFormData(prev => ({
                            ...prev,
                            modelAnswer: (prev.modelAnswer + accAnswer).trim(),
                            keywords: [...new Set([...(prev.keywords?prev.keywords.split(','):[]), ...accTags])].join(', ')
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

    const handleSave = async () => {
        addLog("👇 저장 버튼 클릭됨 (함수 시작)");
        
        if (!formData.title.trim()) {
             addLog("⚠️ 제목 누락으로 중단");
             return alert("제목을 입력해주세요.");
        }
        
        if (isSaving) {
            addLog("⏳ 이미 저장 작업이 진행 중입니다.");
            return;
        }

        setIsSaving(true); 
        setDebugLogs([]); 
        addLog("🚀 저장 프로세스 시작 (순차 업로드 모드)");
        
        try {
            // [변경] 순차적으로 실행하기 때문에 await가 두 번 발생
            addLog("📁 문제 이미지 업로드 중...");
            const pUrls = await uploadImagesToStorage(problemFiles);
            
            addLog("📁 해설 이미지 업로드 중...");
            const aUrls = await uploadImagesToStorage(answerFiles);
            
            const saveData = {
                ...formData,
                title: formData.title || "제목 없음",
                content: formData.description || "",
                answer: formData.modelAnswer || "", 
                tags: formData.keywords.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t),
                createdAt: serverTimestamp(),
                images: pUrls, imageUrl: pUrls[0] || null,
                answerImages: aUrls, answerImageUrl: aUrls[0] || null,
                isManual: isManualMode
            };

            await addDoc(collection(db, "workbook"), saveData);
            addLog("✅ DB 저장 완료");
            alert("저장되었습니다!");
            if(onSaveComplete) onSaveComplete();
            resetState(true);
        } catch (e) {
            addLog(`🔥 저장 실패: ${e.message}`);
            alert(`저장 실패: ${e.message}`);
        } finally { 
            if(isMounted.current) {
                addLog("🏁 저장 프로세스 종료");
                setIsSaving(false); 
            }
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
            category: keepSettings ? prev.category : '수계',
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