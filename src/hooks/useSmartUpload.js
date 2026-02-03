import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'; 
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 
import { getCroppedImg } from '../utils/canvasUtils'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // --- [1. 시스템 제어 및 하드웨어 배선] ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualMode, setIsManualMode] = useState(!navigator.onLine);
    const [isSaving, setIsSaving] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [viewMode, setViewMode] = useState('problem');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingAnswer, setIsAnalyzingAnswer] = useState(false);
    const [step, setStep] = useState(1);
    
    // 🔴 [검수 완료] 하드웨어 연결용 Ref 정상 선언
    const inputFileRef = useRef(null);
    const inputAddRef = useRef(null); 
    const imgRef = useRef(null); 
    const isMounted = useRef(true);

    // --- [2. 데이터 생명주기 제어 (동기식 엔진)] ---
    const cropQueueRef = useRef([]);      
    const processedFilesRef = useRef([]); 
    const currentIndexRef = useRef(0);    

    // --- [3. UI 상태 관리] ---
    const [problemPreviewUrls, setProblemPreviewUrls] = useState([]);
    const [answerPreviewUrls, setAnswerPreviewUrls] = useState([]);
    const [problemFiles, setProblemFiles] = useState([]);
    const [answerFiles, setAnswerFiles] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const [cropSrc, setCropSrc] = useState(null); 
    const [crop, setCrop] = useState(); 
    const [completedCrop, setCompletedCrop] = useState(); 
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [cropTarget, setCropTarget] = useState('problem'); 
    const [currentCropIndex, setCurrentCropIndex] = useState(0); 

    // --- [4. 🔴 데이터 수화: 유실 없는 필드 매핑 (검수 완료)] ---
    const [formData, setFormData] = useState({
        type: 'workbook', category: '수계소화설비', title: '', description: '', 
        modelAnswer: '', keywords: '', searchTags: [], problemType: 'descriptive',
        source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] }
    });

    useEffect(() => {
        if (initialData) {
            // 수치 및 태그 데이터 정제 (Set 중복 제거)
            const rootNums = Array.isArray(initialData.numbers) ? initialData.numbers : [];
            const gradNums = initialData.gradingPoints?.mandatory_numbers || [];
            const mergedNumbers = Array.from(new Set([...rootNums, ...gradNums]))
                .map(n => String(n).trim()).filter(n => n !== "" && n !== "null");

            const savedTags = initialData.tags || initialData.searchTags || [];
            const rootKeywords = Array.isArray(initialData.keywords) ? initialData.keywords : savedTags;
            const gradTerms = initialData.gradingPoints?.mandatory_terms || [];
            const mergedTerms = Array.from(new Set([...rootKeywords, ...gradTerms]))
                .map(t => String(t).trim()).filter(t => t !== "");

            setFormData({
                type: initialData.type || 'workbook',
                title: initialData.title || '',
                description: initialData.question || initialData.content || initialData.description || '',
                category: initialData.subject || initialData.category || '수계소화설비',
                keywords: mergedTerms.join(', '),
                searchTags: Array.isArray(savedTags) ? savedTags : [], 
                modelAnswer: initialData.modelAnswer || initialData.answer || '',
                source: initialData.source || '',
                gradingPoints: { mandatory_terms: mergedTerms, mandatory_numbers: mergedNumbers },
                problemType: initialData.problemType || 'descriptive'
            });
            setProblemPreviewUrls(initialData.images || []); setProblemFiles(initialData.images || []);
            setAnswerPreviewUrls(initialData.answerImages || []); setAnswerFiles(initialData.answerImages || []);
            setStep(3);
        }
    }, [initialData]);

    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    // --- [5. 통합 크롭 및 시퀀스 제어 엔진] ---

    const onSelectFile = (e, target = 'problem') => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setCropTarget(target);
        cropQueueRef.current = files; // 원본 보존
        processedFilesRef.current = [];
        currentIndexRef.current = 0;
        setCurrentCropIndex(0);
        setCrop(undefined);

        const reader = new FileReader();
        reader.onload = () => {
            setCropSrc(reader.result.toString());
            setIsCropModalOpen(true);
        };
        reader.readAsDataURL(files[0]);
        e.target.value = null; 
    };

    const onCropConfirm = async () => {
        try {
            const idx = currentIndexRef.current;
            const originalFile = cropQueueRef.current[idx];
            let finalProcessedFile = originalFile;

            if (completedCrop?.width && completedCrop?.height && imgRef.current) {
                finalProcessedFile = await getCroppedImg(imgRef.current, completedCrop, `cropped-${cropTarget}-${idx}.jpg`);
            }

            processedFilesRef.current.push(finalProcessedFile);

            const nextIdx = idx + 1;
            if (nextIdx < cropQueueRef.current.length) {
                currentIndexRef.current = nextIdx;
                setCurrentCropIndex(nextIdx);
                setCrop(undefined);
                const reader = new FileReader();
                reader.onload = () => setCropSrc(reader.result.toString());
                reader.readAsDataURL(cropQueueRef.current[nextIdx]);
            } else {
                const finalBatch = [...processedFilesRef.current];
                setIsCropModalOpen(false);
                setCropSrc(null);
                // 🔴 [검수 완료] 타겟에 따른 정확한 분기 처리
                if (cropTarget === 'problem') await processInitialUpload(finalBatch);
                else await processAnswerUpload(finalBatch);
            }
        } catch (e) {
            addLog(`❌ 크롭 처리 실패`);
            setIsCropModalOpen(false);
        }
    };

    // --- [6. AI 지문 추출 엔진 (검수 완료: Step 2 강제)] ---
    const processInitialUpload = async (files) => {
        if (!files || files.length === 0) return;
        
        setStep(2); // 🔴 로딩 화면 즉시 전환 확인
        setIsAnalyzing(true);
        setProblemPreviewUrls(files.map(f => URL.createObjectURL(f)));
        setProblemFiles(files); 
        setViewMode('problem');

        if (isManualMode) { setStep(3); setIsAnalyzing(false); return; }

        try {
            addLog(`🔍 AI 지문 정밀 분석 시작...`);
            const res = await analyzeImage(files[0], formData.type, 'problem');
            if (isMounted.current && res) {
                const extractedNumbers = res.grading_points?.mandatory_numbers || res.numbers || [];
                const extractedTerms = res.grading_points?.mandatory_terms || [];
                const extractedTags = res.searchTags || res.tags || [];

                setFormData(prev => ({ 
                    ...prev, 
                    title: res.title || prev.title, 
                    description: res.content || prev.description,
                    category: res.category || prev.category,
                    searchTags: extractedTags, 
                    keywords: extractedTerms.join(', '),
                    gradingPoints: { 
                        mandatory_terms: extractedTerms, 
                        mandatory_numbers: extractedNumbers 
                    }
                }));
                addLog(`✅ 지문 추출 및 필드 매핑 성공`);
            }
        } catch (e) { addLog(`❌ 지문 분석 오류`); }
        finally { if (isMounted.current) { setIsAnalyzing(false); setStep(3); } }
    };

    // --- [7. AI 해설 병합 엔진 (검수 완료: 일괄 처리)] ---
    const processAnswerUpload = async (files) => {
        setIsAnalyzingAnswer(true);
        setAnswerPreviewUrls(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
        setAnswerFiles(p => [...p, ...files]);
        setViewMode('answer');
        if (isManualMode) { setIsAnalyzingAnswer(false); return; }

        // 🔴 데이터 누락 방지를 위한 임시 Collector
        const batchResults = [];

        try {
            for (const file of files) {
                addLog(`📄 해설 페이지 분석 중...`);
                const res = await analyzeImage(file, formData.type, 'answer');
                if (res) batchResults.push(res);
            }
            
            // 🏁 [검수 완료] Loop 종료 후 단 1회 업데이트 (유실 원천 봉쇄)
            setFormData(prev => {
                const combinedAnswerText = batchResults.map(r => r.answer || "").join("\n\n");
                const combinedTerms = [...new Set([...prev.gradingPoints.mandatory_terms, ...batchResults.flatMap(r => r.grading_points?.mandatory_terms || [])])];
                const combinedNumbers = [...new Set([...prev.gradingPoints.mandatory_numbers, ...batchResults.flatMap(r => r.grading_points?.mandatory_numbers || [])])];
                const combinedTags = [...new Set([...(prev.searchTags || []), ...batchResults.flatMap(r => r.searchTags || r.tags || [])])];

                return {
                    ...prev,
                    modelAnswer: (prev.modelAnswer + "\n\n" + combinedAnswerText).trim(),
                    searchTags: combinedTags,
                    keywords: combinedTerms.join(', '),
                    gradingPoints: { mandatory_terms: combinedTerms, mandatory_numbers: combinedNumbers }
                };
            });
            addLog(`✅ 해설 ${files.length}매 통합 병합 완료`);
        } catch(e) { addLog(`❌ 해설 추출 오류`); }
        finally { if(isMounted.current) setIsAnalyzingAnswer(false); }
    };

    // --- [8. 저장 엔진 및 유틸리티 (보존 완료)] ---
    const handleSave = async () => {
        if (!formData.title.trim()) return alert("제목을 입력해주세요.");
        setIsSaving(true);
        try {
            const pUrls = await uploadImagesToStorage(problemFiles);
            const aUrls = await uploadImagesToStorage(answerFiles);
            const finalNumbers = formData.gradingPoints.mandatory_numbers.map(n => String(n).trim()).filter(n => n !== "");
            const saveData = {
                ...formData, content: formData.description, answer: formData.modelAnswer,
                tags: formData.searchTags, gradingPoints: { ...formData.gradingPoints, mandatory_numbers: finalNumbers },
                numbers: finalNumbers, keywords: formData.gradingPoints.mandatory_terms,
                images: pUrls, answerImages: aUrls, updatedAt: serverTimestamp(), isManual: isManualMode
            };
            if (initialData?.id) await updateDoc(doc(db, "workbook", initialData.id), saveData);
            else { saveData.createdAt = serverTimestamp(); await addDoc(collection(db, "workbook"), saveData); }
            alert("성공적으로 저장되었습니다! ✅");
            if(onSaveComplete) onSaveComplete();
            resetState();
        } catch (e) { addLog(`❌ 저장 실패`); }
        finally { if(isMounted.current) setIsSaving(false); }
    };

    const uploadImagesToStorage = async (files) => {
        const uploadedUrls = [];
        for (const file of files) {
            if (typeof file === 'string') { uploadedUrls.push(file); continue; }
            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true };
            const compressed = await imageCompression(file, options);
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, `workbook_images/${fileName}`);
            await uploadBytesResumable(storageRef, compressed);
            uploadedUrls.push(await getDownloadURL(storageRef));
        }
        return uploadedUrls;
    };

    const resetState = () => {
        setStep(1); setProblemFiles([]); setAnswerFiles([]); setProblemPreviewUrls([]); setAnswerPreviewUrls([]);
        setCurrentImageIndex(0); cropQueueRef.current = []; processedFilesRef.current = [];
        setFormData({ type: 'workbook', category: '수계소화설비', title: '', description: '', modelAnswer: '', keywords: '', searchTags: [], gradingPoints: { mandatory_terms: [], mandatory_numbers: [] } });
    };

    const handleRemoveImage = () => {
        if (viewMode === 'problem') {
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
        handleInitialUpload: (e) => onSelectFile(e, 'problem'), 
        handleAddImages: (e) => onSelectFile(e, 'answer'), 
        handleRemoveImage, handleSave, resetState, updateGradingPoint: (type, action, value, index) => {
            setFormData(prev => {
                const list = [...prev.gradingPoints[type]];
                if (action === 'add') list.push(''); else if (action === 'update') list[index] = value; else if (action === 'remove') list.splice(index, 1);
                return { ...prev, gradingPoints: { ...prev.gradingPoints, [type]: list } };
            });
        },
        updateSearchTag: (action, value, index) => {
            setFormData(prev => {
                const list = [...(prev.searchTags || [])];
                if (action === 'add') list.push(''); else if (action === 'update') list[index] = value; else if (action === 'remove') list.splice(index, 1);
                return { ...prev, searchTags: list };
            });
        },
        cropSrc, crop, setCrop, completedCrop, setCompletedCrop, isCropModalOpen, imgRef, onCropConfirm, 
        onCropCancel: () => { setIsCropModalOpen(false); setCropSrc(null); cropQueueRef.current = []; },
        currentCropTotal: cropQueueRef.current.length, currentCropIndex: currentCropIndex + 1
    };
};