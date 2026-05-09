import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'; 
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 
import { getCroppedImg } from '../utils/canvasUtils'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // 🔴 AI 모델 선택 상태 (로컬 스토리지 유지)
    const [aiModel, setAiModel] = useState(() => localStorage.getItem('firesight_aimodel') || 'gemini-3.1-pro-preview');

    useEffect(() => {
        if (aiModel) {
            localStorage.setItem('firesight_aimodel', aiModel);
        }
    }, [aiModel]);

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
    
    const inputFileRef = useRef(null);
    const inputAddRef = useRef(null); 
    const imgRef = useRef(null); 
    const isMounted = useRef(true);

    // --- [2. 데이터 생명주기 제어] ---
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

    // --- [4. 데이터 수화 (수정 모드 진입 시)] ---
    const [formData, setFormData] = useState({
        type: 'workbook', category: '수계소화설비', title: '', description: '', 
        modelAnswer: '', keywords: '', searchTags: [], problemType: 'descriptive',
        source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] }
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setStep(3);
            if (initialData.problemImages) {
                setProblemPreviewUrls(initialData.problemImages);
                setProblemFiles(initialData.problemImages.map(() => new File([], "placeholder.jpg")));
            }
            if (initialData.answerImages) {
                setAnswerPreviewUrls(initialData.answerImages);
                setAnswerFiles(initialData.answerImages.map(() => new File([], "placeholder.jpg")));
            }
        }
    }, [initialData]);

    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    // --- [5. 통합 크롭 및 시퀀스 제어 엔진] ---
    const onSelectFile = (e, target = 'problem') => {
        if (e.target.files && e.target.files.length > 0) {
            setCropTarget(target);
            const filesArray = Array.from(e.target.files);
            cropQueueRef.current = filesArray;
            setCurrentCropIndex(0);
            processedFilesRef.current = [];

            const reader = new FileReader();
            reader.onload = () => {
                setCropSrc(reader.result?.toString() || '');
                setIsCropModalOpen(true);
                addLog(`📸 이미지 로드 완료: ${filesArray.length}장 선택됨`);
            };
            reader.readAsDataURL(filesArray[0]);
            e.target.value = null; 
        }
    };

    const onCropConfirm = async () => {
        try {
            if (completedCrop?.width && completedCrop?.height && imgRef.current) {
                addLog(`✂️ 영역 정밀 타격 완료...`);
                const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
                const fileExt = cropQueueRef.current[currentCropIndex].name.split('.').pop();
                const croppedFile = new File([croppedBlob], `cropped_${Date.now()}.${fileExt}`, { type: `image/${fileExt}` });
                processedFilesRef.current.push(croppedFile);
            } else {
                processedFilesRef.current.push(cropQueueRef.current[currentCropIndex]);
            }

            const nextIndex = currentCropIndex + 1;
            if (nextIndex < cropQueueRef.current.length) {
                setCurrentCropIndex(nextIndex);
                const reader = new FileReader();
                reader.onload = () => {
                    setCropSrc(reader.result?.toString() || '');
                    setCrop(undefined); 
                    setCompletedCrop(undefined);
                };
                reader.readAsDataURL(cropQueueRef.current[nextIndex]);
            } else {
                setIsCropModalOpen(false);
                setCropSrc(null);
                const finalFiles = [...processedFilesRef.current];
                
                if (cropTarget === 'problem') {
                    processInitialUpload(finalFiles);
                } else {
                    processAnswerUpload(finalFiles);
                }
            }
        } catch (error) {
            console.error("Crop Error:", error);
            addLog(`⚠️ 이미지 처리 중 오류 발생`);
        }
    };

    // --- [6. AI 지문 추출 엔진 (병합 로직 적용)] ---
    const processInitialUpload = async (files) => {
        if (!files || files.length === 0) return;
        
        setStep(2); 
        setIsAnalyzing(true);
        setProblemPreviewUrls(files.map(f => URL.createObjectURL(f)));
        setProblemFiles(files); 
        setViewMode('problem');

        if (isManualMode) { setStep(3); setIsAnalyzing(false); return; }

        addLog(`⚡ 다중 이미지 병렬 분석 시퀀스 가동... (총 ${files.length}장 / 모델: ${aiModel})`);
        const batchResults = [];
        
        try {
            const promises = files.map((file, i) => 
                analyzeImage(file, formData.type, 'problem', aiModel)
                    .then(res => {
                        addLog(`✅ 지문 ${i + 1}쪽 추출 완료`);
                        return res;
                    })
                    .catch(err => {
                        console.error(`지문 ${i + 1}번째 장 실패:`, err);
                        const errorMsg = err.message || "알 수 없는 오류";
                        addLog(`⚠️ 지문 ${i + 1}쪽 분석 실패: ${errorMsg}`);
                        return null;
                    })
            );
            
            const results = await Promise.all(promises);
            results.forEach(res => { if (res) batchResults.push(res); });
        } catch (error) {
            console.error("전체 병렬 분석 실패:", error);
            addLog(`⚠️ 지문 병렬 분석 중 치명적 오류`);
        }

        if (isMounted.current && batchResults.length > 0) {
            setFormData(prev => {
                const merged = { ...prev };
                batchResults.forEach(res => {
                    if (res.title && !merged.title) merged.title = res.title;
                    if (res.category) merged.category = res.category;
                    
                    if (res.description) {
                        merged.description = merged.description ? merged.description + '\n\n' + res.description : res.description;
                    }
                    if (res.modelAnswer) {
                        merged.modelAnswer = merged.modelAnswer ? merged.modelAnswer + '\n\n' + res.modelAnswer : res.modelAnswer;
                    }
                    
                    if (res.tags && res.tags.length > 0) {
                        const newTags = new Set([...(merged.searchTags || []), ...res.tags]);
                        merged.searchTags = Array.from(newTags);
                    }
                });
                return merged;
            });
            addLog(`✅ 지문 분석 및 병합 완료`);
        }
        if (isMounted.current) { setIsAnalyzing(false); setStep(3); }
    };

    // --- [7. AI 해설 병합 엔진 (병합 로직 적용)] ---
    const processAnswerUpload = async (files) => {
        setIsAnalyzingAnswer(true);
        setAnswerPreviewUrls(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
        setAnswerFiles(p => [...p, ...files]);
        setViewMode('answer');
        if (isManualMode) { setIsAnalyzingAnswer(false); return; }

        addLog(`⚡ 다중 해설 병렬 분석 시퀀스 가동... (총 ${files.length}장 / 모델: ${aiModel})`);
        const batchResults = [];

        try {
            const promises = files.map((file, i) => 
                analyzeImage(file, formData.type, 'answer', aiModel)
                    .then(res => {
                        addLog(`✅ 해설 ${i + 1}쪽 추출 완료`);
                        return res;
                    })
                    .catch(err => {
                        console.error(`해설 ${i + 1}번째 장 실패:`, err);
                        const errorMsg = err.message || "알 수 없는 오류";
                        addLog(`⚠️ 해설 ${i + 1}쪽 분석 실패: ${errorMsg}`);
                        return null;
                    })
            );
            
            const results = await Promise.all(promises);
            results.forEach(res => { if (res) batchResults.push(res); });
        } catch (error) {
            console.error("해설 전체 병렬 분석 실패:", error);
            addLog(`⚠️ 해설 병렬 분석 중 치명적 오류`);
        }
        
        if (isMounted.current && batchResults.length > 0) {
            setFormData(prev => {
                const merged = { ...prev };
                batchResults.forEach(res => {
                    if (res.modelAnswer) {
                        merged.modelAnswer = merged.modelAnswer ? merged.modelAnswer + '\n\n' + res.modelAnswer : res.modelAnswer;
                    }
                    if (res.description) {
                         merged.description = merged.description ? merged.description + '\n\n' + res.description : res.description;
                    }
                    
                    if (res.gradingPoints) {
                        merged.gradingPoints = {
                            mandatory_terms: [...new Set([...(merged.gradingPoints?.mandatory_terms || []), ...(res.gradingPoints.mandatory_terms || [])])],
                            mandatory_numbers: [...new Set([...(merged.gradingPoints?.mandatory_numbers || []), ...(res.gradingPoints.mandatory_numbers || [])])]
                        };
                    }
                });
                return merged;
            });
            addLog(`✅ 해설 분석 및 병합 완료`);
        }
        if (isMounted.current) { setIsAnalyzingAnswer(false); }
    };

    // --- [8. 저장 엔진 및 유틸리티] ---
    const uploadImagesToStorage = async (files, folderPath) => {
        const urls = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            // 플레이스홀더(수정 모드 시 빈 파일)는 무시하고, 실제 새 파일만 업로드
            if (file.size === 0) continue; 

            try {
                // 🔴 텍스트 가독성을 위해 1MB에서 2MB로 압축 상한선 확장
                const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
                const compressedFile = await imageCompression(file, options);
                const fileRef = ref(storage, `${folderPath}/${Date.now()}_${i}.jpg`);
                const snapshot = await uploadBytesResumable(fileRef, compressedFile);
                const url = await getDownloadURL(snapshot.ref);
                urls.push(url);
            } catch (error) {
                console.error("이미지 스토리지 업로드 실패:", error);
                throw error;
            }
        }
        return urls;
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        addLog(`💾 데이터베이스 저장 시퀀스 시작...`);

        try {
            // 기존 URL 유지 (수정 모드일 때 기존 이미지 보존용)
            let finalProblemUrls = [...problemPreviewUrls]; 
            let finalAnswerUrls = [...answerPreviewUrls];

            // 1. 신규 이미지가 있다면 클라우드에 업로드하고 URL 획득
            if (problemFiles.some(f => f.size > 0)) {
                addLog(`📤 지문 이미지 클라우드 업로드 중...`);
                const newUrls = await uploadImagesToStorage(problemFiles.filter(f => f.size > 0), 'problems');
                finalProblemUrls = initialData ? [...initialData.problemImages || [], ...newUrls] : newUrls;
            }
            if (answerFiles.some(f => f.size > 0)) {
                addLog(`📤 해설 이미지 클라우드 업로드 중...`);
                const newUrls = await uploadImagesToStorage(answerFiles.filter(f => f.size > 0), 'answers');
                finalAnswerUrls = initialData ? [...initialData.answerImages || [], ...newUrls] : newUrls;
            }

            // 2. 최종 DB 기록용 데이터 조립 
            // 🔴 [핵심 보완] tags와 keywords 속성을 추가하여 Workbook 리스트에서 정상 노출/검색 되도록 매핑
            const finalData = {
                ...formData,
                tags: formData.searchTags || [], 
                keywords: formData.searchTags && formData.searchTags.length > 0 ? formData.searchTags.join(', ') : '', 
                images: finalProblemUrls,
                answerImages: finalAnswerUrls,
                updatedAt: serverTimestamp()
            };

            // 3. DB에 업데이트 또는 신규 추가
            const collectionName = 'workbook'; // 🟢 확인하신 컬렉션명

            if (initialData && initialData.id) {
                addLog(`📝 기존 데이터(ID: ${initialData.id}) 업데이트 중...`);
                const docRef = doc(db, collectionName, initialData.id); 
                await updateDoc(docRef, finalData);
                addLog(`✅ 업데이트 완료!`);
            } else {
                addLog(`📝 신규 데이터 클라우드 기록 중...`);
                finalData.createdAt = serverTimestamp();
                await addDoc(collection(db, collectionName), finalData);
                addLog(`✅ 신규 저장 완료!`);
            }

            alert("성공적으로 저장되었습니다!");
            if (onSaveComplete) onSaveComplete();

        } catch (error) {
            console.error("Save Error:", error);
            addLog(`❌ 저장 실패: ${error.message}`);
            alert("저장 중 오류가 발생했습니다. 로그를 확인해주세요.");
        } finally {
            setIsSaving(false);
        }
    };

    const resetState = () => { 
        setStep(1); 
        setProblemPreviewUrls([]); 
        setAnswerPreviewUrls([]);
        setProblemFiles([]); 
        setAnswerFiles([]);
        setFormData({ 
            type: 'workbook', category: '수계소화설비', title: '', description: '', 
            modelAnswer: '', keywords: '', searchTags: [], problemType: 'descriptive', 
            source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] }
        });
        setCurrentImageIndex(0);
        addLog(`🔄 시스템이 초기화되었습니다.`);
    };

    const handleRemoveImage = () => { 
        if (viewMode === 'problem') {
            setProblemPreviewUrls(prev => prev.filter((_, i) => i !== currentImageIndex));
            setProblemFiles(prev => prev.filter((_, i) => i !== currentImageIndex));
            setCurrentImageIndex(prev => Math.max(0, prev - 1));
        } else {
            setAnswerPreviewUrls(prev => prev.filter((_, i) => i !== currentImageIndex));
            setAnswerFiles(prev => prev.filter((_, i) => i !== currentImageIndex));
            setCurrentImageIndex(prev => Math.max(0, prev - 1));
        }
    };

    return {
        aiModel, setAiModel, 
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