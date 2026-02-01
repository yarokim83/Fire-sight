import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'; 
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // --- [1. 상태 관리: 시스템 제어] ---
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualMode, setIsManualMode] = useState(!navigator.onLine);
    const [isSaving, setIsSaving] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [viewMode, setViewMode] = useState('problem');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingAnswer, setIsAnalyzingAnswer] = useState(false);
    const [step, setStep] = useState(1);
    
    // --- [2. 상태 관리: 이미지 데이터] ---
    const [problemPreviewUrls, setProblemPreviewUrls] = useState([]);
    const [answerPreviewUrls, setAnswerPreviewUrls] = useState([]);
    const [problemFiles, setProblemFiles] = useState([]);
    const [answerFiles, setAnswerFiles] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // --- [3. 상태 관리: 폼 데이터 초기값] ---
    const [formData, setFormData] = useState({
        type: 'workbook', 
        category: '수계소화설비', 
        title: '', 
        description: '', 
        modelAnswer: '', 
        keywords: '', 
        searchTags: [], // 🔴 [신규] 문제 검색용 태그 배열 추가
        problemType: 'descriptive',
        source: '',
        gradingPoints: { mandatory_terms: [], mandatory_numbers: [] }
    });

    const inputFileRef = useRef(null);
    const inputAddRef = useRef(null); 
    const isMounted = useRef(true);

    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    // --- [4. 데이터 수화: 0을 포함한 수치 및 태그 데이터 보존] ---
    useEffect(() => {
        if (initialData) {
            const rootNums = Array.isArray(initialData.numbers) ? initialData.numbers : [];
            const gradNums = initialData.gradingPoints?.mandatory_numbers || [];
            const mergedNumbers = Array.from(new Set([...rootNums, ...gradNums]))
                .map(n => String(n).trim())
                .filter(n => n !== "" && n !== "null" && n !== "undefined");

            // 🔴 기존 tags 또는 searchTags 데이터를 안전하게 병합
            const savedTags = initialData.tags || initialData.searchTags || [];
            const rootKeywords = Array.isArray(initialData.keywords) ? initialData.keywords : savedTags;
            const gradTerms = initialData.gradingPoints?.mandatory_terms || [];
            const mergedTerms = Array.from(new Set([...rootKeywords, ...gradTerms]))
                .map(t => String(t).trim())
                .filter(t => t !== "");

            setFormData({
                type: initialData.type || 'workbook',
                title: initialData.title || '',
                description: initialData.content || initialData.description || '',
                category: initialData.subject || initialData.category || '수계소화설비',
                keywords: mergedTerms.join(', '),
                searchTags: Array.isArray(savedTags) ? savedTags : [], // 🔴 검색 태그 복구
                modelAnswer: initialData.answer || initialData.modelAnswer || '',
                source: initialData.source || '',
                gradingPoints: {
                    mandatory_terms: mergedTerms,
                    mandatory_numbers: mergedNumbers
                }
            });
            setProblemPreviewUrls(initialData.images || []);
            setProblemFiles(initialData.images || []);
            setAnswerPreviewUrls(initialData.answerImages || []);
            setAnswerFiles(initialData.answerImages || []);
            setStep(3);
        }
    }, [initialData]);

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

    // --- [6. 분석 단계: 검색용 태그 자동 추출 로직 보강] ---
    const handleInitialUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setProblemPreviewUrls(files.map(f => URL.createObjectURL(f)));
        setProblemFiles(files);
        setViewMode('problem');

        if (isManualMode) { setStep(3); return; }
        setStep(2); setIsAnalyzing(true);
        try {
            const result = await analyzeImage(files[0], formData.type, 'problem');
            if (isMounted.current && result) {
                const extractedNumbers = result.grading_points?.mandatory_numbers || result.numbers || [];
                const extractedTerms = result.grading_points?.mandatory_terms || [];
                
                setFormData(prev => ({ 
                    ...prev, 
                    title: result.title || prev.title, 
                    description: result.content || prev.description,
                    category: result.category || prev.category,
                    searchTags: result.searchTags || result.tags || [], // 🔴 AI 분석에서 추출한 검색용 태그 주입
                    keywords: (result.searchTags || result.tags || []).join(', '),
                    gradingPoints: {
                        mandatory_terms: extractedTerms,
                        mandatory_numbers: extractedNumbers
                    }
                }));
                addLog(`✅ AI 지문 분석 완료: 검색 태그 ${result.searchTags?.length || 0}개 추출`);
            }
        } catch (e) { addLog(`❌ 분석 실패: ${e.message}`); }
        finally { if (isMounted.current) { setIsAnalyzing(false); setStep(3); } }
    };

    const handleAddImages = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setAnswerPreviewUrls(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
        setAnswerFiles(p => [...p, ...files]);
        
        if (isManualMode) return;
        setIsAnalyzingAnswer(true);
        try {
            for (const file of files) {
                const res = await analyzeImage(file, formData.type, 'answer');
                if (isMounted.current && res) {
                    setFormData(prev => {
                        const newTerms = [...new Set([...prev.gradingPoints.mandatory_terms, ...(res.grading_points?.mandatory_terms || [])])];
                        const newNumbers = [...new Set([...prev.gradingPoints.mandatory_numbers, ...(res.grading_points?.mandatory_numbers || [])])];
                        const newSearchTags = [...new Set([...(prev.searchTags || []), ...(res.searchTags || res.tags || [])])]; // 🔴 해설 태그 병합
                        
                        return {
                            ...prev,
                            modelAnswer: (prev.modelAnswer + "\n\n" + (res.answer || "")).trim(),
                            searchTags: newSearchTags,
                            keywords: newTerms.join(', '),
                            gradingPoints: {
                                mandatory_terms: newTerms,
                                mandatory_numbers: newNumbers
                            }
                        };
                    });
                }
            }
        } catch(e) { addLog(`❌ 해설 분석 오류`); }
        finally { if(isMounted.current) setIsAnalyzingAnswer(false); }
    };

    // 🔴 [신규] 검색용 태그 전용 업데이트 함수
    const updateSearchTag = (action, value, index) => {
        setFormData(prev => {
            const list = [...(prev.searchTags || [])];
            if (action === 'add') list.push('');
            else if (action === 'update') list[index] = value;
            else if (action === 'remove') list.splice(index, 1);
            return { ...prev, searchTags: list };
        });
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

    // --- [7. 저장 단계: 데이터 무결성 보장] ---
    const handleSave = async () => {
        if (!formData.title.trim()) return alert("제목을 입력해주세요.");
        setIsSaving(true);
        try {
            const pUrls = await uploadImagesToStorage(problemFiles);
            const aUrls = await uploadImagesToStorage(answerFiles);

            const finalNumbers = formData.gradingPoints.mandatory_numbers
                .map(n => String(n).trim())
                .filter(n => n !== null && n !== undefined && n !== "");

            const finalSearchTags = (formData.searchTags || [])
                .map(t => String(t).trim())
                .filter(t => t !== "");

            const saveData = {
                ...formData,
                content: formData.description,
                answer: formData.modelAnswer,
                tags: finalSearchTags, // 🔴 Firestore 검색용 태그 필드로 저장
                gradingPoints: {
                    ...formData.gradingPoints,
                    mandatory_numbers: finalNumbers
                },
                numbers: finalNumbers,
                keywords: formData.gradingPoints.mandatory_terms,
                images: pUrls,
                answerImages: aUrls,
                updatedAt: serverTimestamp(),
                isManual: isManualMode
            };

            if (initialData?.id) {
                await updateDoc(doc(db, "workbook", initialData.id), saveData);
                addLog("✅ 기존 문제 수정 완료");
            } else {
                saveData.createdAt = serverTimestamp();
                await addDoc(collection(db, "workbook"), saveData);
                addLog("✅ 신규 문제 저장 완료");
            }

            alert("성공적으로 저장되었습니다! ✅");
            if(onSaveComplete) onSaveComplete();
            resetState();
        } catch (e) { addLog(`❌ 저장 실패: ${e.message}`); }
        finally { if(isMounted.current) setIsSaving(false); }
    };

    const resetState = () => {
        setStep(1); setProblemFiles([]); setAnswerFiles([]); setProblemPreviewUrls([]); setAnswerPreviewUrls([]);
        setCurrentImageIndex(0);
        setFormData({ 
            type: 'workbook', category: '수계소화설비', title: '', description: '', 
            modelAnswer: '', keywords: '', searchTags: [], // 🔴 리셋 시 초기화
            gradingPoints: { mandatory_terms: [], mandatory_numbers: [] } 
        });
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
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState, updateGradingPoint,
        updateSearchTag // 🔴 [신규] 반환값 추가
    };
};