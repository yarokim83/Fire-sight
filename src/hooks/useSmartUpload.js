import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'; 
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 
import { getCroppedImg } from '../utils/canvasUtils'; 

// PDF.js CDN 로더 함수
async function loadPdfJS() {
    if (window.pdfjsLib) return window.pdfjsLib;
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = (err) => reject(new Error('PDF.js 라이브러리 로드 실패'));
        document.head.appendChild(script);
    });
}

// PDF 파일을 이미지 파일(File) 배열로 변환하는 함수
async function convertPdfToImages(pdfFile) {
    const pdfjsLib = await loadPdfJS();
    
    const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(pdfFile);
    });
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const images = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        // OCR 화질 해상도를 위해 고해상도(scale: 2.0)로 캔버스 렌더링
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        const blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
        });
        
        const fileName = `${pdfFile.name.replace(/\.[^/.]+$/, "")}_page_${pageNum}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        images.push(file);
    }
    
    return images;
}

export const useSmartUpload = (initialData, onSaveComplete) => {
    // 🔴 AI 모델 선택 상태 (로컬 스토리지 유지)
    const [aiModel, setAiModel] = useState(() => localStorage.getItem('firesight_aimodel') || 'gemini-3.1-pro-preview');

    useEffect(() => {
        if (aiModel) {
            localStorage.setItem('firesight_aimodel', aiModel);
        }
    }, [aiModel]);

    // --- [1. 시스템 제어 및 하드웨어 배선] ---
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

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // --- [2. 데이터 생명주기 및 PDF 원본 파일 큐] ---
    const cropQueueRef = useRef([]);      
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // --- [3. 멀티 크롭 상태 모델] ---
    const [splitProblems, setSplitProblems] = useState(true);
    const [activeProblemIndex, setActiveProblemIndex] = useState(0); // 🔴 현재 검토 중인 문항 세트 인덱스
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // 🔴 현재 문항 내 활성화된 이미지 페이지 인덱스
    const [cropSrc, setCropSrc] = useState(null); 
    const [crop, setCrop] = useState(); 
    const [completedCrop, setCompletedCrop] = useState(); 
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [extractText, setExtractText] = useState(true);

    // 문항별 임시 크롭 수집 큐
    const [problemsQueue, setProblemsQueue] = useState([]);
    const [currentProblemCrops, setCurrentProblemCrops] = useState({ problemFiles: [], answerFiles: [] });

    // --- [4. 문항 상태 리스트 통합 관리] ---
    const [problemsList, setProblemsList] = useState([
        {
            type: 'workbook', category: '수계소화설비', title: '', description: '', 
            modelAnswer: '', keywords: '', searchTags: [], problemType: 'descriptive',
            source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] },
            problemFiles: [], answerFiles: [],
            problemPreviewUrls: [], answerPreviewUrls: [],
            isSaved: false
        }
    ]);

    // 수정 모드 진입 시 데이터 수화
    useEffect(() => {
        if (initialData) {
            setSplitProblems(false);
            setProblemsList([
                {
                    type: initialData.type || 'workbook',
                    category: initialData.category || '수계소화설비',
                    title: initialData.title || '',
                    description: initialData.description || '',
                    modelAnswer: initialData.modelAnswer || '',
                    keywords: initialData.keywords || '',
                    searchTags: initialData.tags || [],
                    problemType: initialData.problemType || 'descriptive',
                    source: initialData.source || '',
                    gradingPoints: initialData.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] },
                    problemFiles: (initialData.problemImages || []).map(() => new File([], "placeholder.jpg")),
                    answerFiles: (initialData.answerImages || []).map(() => new File([], "placeholder.jpg")),
                    problemPreviewUrls: initialData.problemImages || [],
                    answerPreviewUrls: initialData.answerImages || []
                }
            ]);
            setStep(3);
        }
    }, [initialData]);

    const activeProblem = splitProblems 
        ? (problemsList[activeProblemIndex] || problemsList[0] || {})
        : (problemsList[0] || {});

    const updateActiveForm = useCallback((newFields) => {
        setProblemsList(prev => {
            const list = [...prev];
            const idx = splitProblems ? activeProblemIndex : 0;
            if (list[idx]) {
                const currentItem = list[idx];
                const updated = typeof newFields === 'function' ? newFields(currentItem) : newFields;
                list[idx] = { ...currentItem, ...updated };
            }
            return list;
        });
    }, [splitProblems, currentImageIndex]);

    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    // 페이지 이미지 로더
    const loadPageImage = useCallback((index) => {
        const file = cropQueueRef.current[index];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (isMounted.current) {
                    setCropSrc(reader.result?.toString() || '');
                    setCrop(undefined);
                    setCompletedCrop(undefined);
                }
            };
            reader.readAsDataURL(file);
        }
    }, []);

    // --- [5. 통합 크롭 및 시퀀스 제어 엔진] ---
    const processIncomingFiles = useCallback(async (files, target = 'problem') => {
        if (files && files.length > 0) {
            addLog(`📄 파일 수신 및 전처리 시작...`);
            
            const filesArray = Array.from(files);
            const convertedFiles = [];
            
            for (const file of filesArray) {
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    addLog(`⏳ PDF 파일 이미지 변환 중: ${file.name}`);
                    try {
                        const pageFiles = await convertPdfToImages(file);
                        convertedFiles.push(...pageFiles);
                        addLog(`✅ PDF 변환 완료: ${pageFiles.length}개 페이지 추출됨`);
                    } catch (err) {
                        console.error("PDF 변환 오류:", err);
                        addLog(`❌ PDF 변환 실패: ${file.name} (${err.message})`);
                    }
                } else {
                    convertedFiles.push(file);
                }
            }

            if (convertedFiles.length === 0) {
                addLog(`⚠️ 처리 가능한 파일이 없습니다.`);
                return;
            }

            cropQueueRef.current = convertedFiles;
            setCurrentPageIndex(0);
            setProblemsQueue([]);
            setCurrentProblemCrops({ problemFiles: [], answerFiles: [] });
            setExtractText(true);
            setViewMode(target); // 🔴 수입 타겟에 맞게 뷰모드 동기화

            // 첫 페이지 로드
            loadPageImage(0);
            setIsCropModalOpen(true);
            addLog(`📸 크롭 모달 구동 완료: 총 ${convertedFiles.length}장 유입됨 (타겟: ${target})`);
        }
    }, [addLog, loadPageImage, setViewMode]);

    const onSelectFile = (e, target = 'problem') => {
        if (e.target.files && e.target.files.length > 0) {
            processIncomingFiles(e.target.files, target);
            e.target.value = null; 
        }
    };

    // PDF 페이지 네비게이션
    const goToNextPage = () => {
        if (currentPageIndex < cropQueueRef.current.length - 1) {
            const nextIdx = currentPageIndex + 1;
            setCurrentPageIndex(nextIdx);
            loadPageImage(nextIdx);
            addLog(`📄 다음 페이지 이동: ${nextIdx + 1} / ${cropQueueRef.current.length}`);
        }
    };

    const goToPrevPage = () => {
        if (currentPageIndex > 0) {
            const prevIdx = currentPageIndex - 1;
            setCurrentPageIndex(prevIdx);
            loadPageImage(prevIdx);
            addLog(`📄 이전 페이지 이동: ${prevIdx + 1} / ${cropQueueRef.current.length}`);
        }
    };

    // 문제/해설 개별 크롭 추가 핸들러
    const addCropToActiveProblem = async (type = 'problem') => {
        try {
            const originalFile = cropQueueRef.current[currentPageIndex];
            if (!originalFile) return;

            let croppedFile;
            const minSize = completedCrop?.unit === '%' ? 1 : 5;
            if (completedCrop?.width && completedCrop?.height && completedCrop.width >= minSize && completedCrop.height >= minSize && imgRef.current) {
                addLog(`✂️ 선택 영역 크롭핑 중 (${type === 'problem' ? '지문' : '해설'})...`);
                const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
                const fileExt = originalFile.name.split('.').pop() || 'jpg';
                croppedFile = new File([croppedBlob], `crop_${type}_${Date.now()}.${fileExt}`, { type: `image/${fileExt}` });
            } else {
                addLog(`📸 전체 페이지 영역을 ${type === 'problem' ? '지문' : '해설'}으로 추가합니다.`);
                croppedFile = originalFile;
            }

            // OCR 스킵 플래그 연동
            croppedFile.skipExtraction = !extractText;

            setCurrentProblemCrops(prev => {
                const updated = { ...prev };
                if (type === 'problem') {
                    updated.problemFiles = [...updated.problemFiles, croppedFile];
                } else {
                    updated.answerFiles = [...updated.answerFiles, croppedFile];
                }
                return updated;
            });

            addLog(`✅ ${type === 'problem' ? '지문' : '해설'} 크롭 추가 완료! (현재 지문: ${currentProblemCrops.problemFiles.length + (type === 'problem' ? 1 : 0)}장, 해설: ${currentProblemCrops.answerFiles.length + (type === 'answer' ? 1 : 0)}장)`);
            
            // 크롭 선택 영역 초기화
            setCrop(undefined);
            setCompletedCrop(undefined);
        } catch (error) {
            console.error("Add crop error:", error);
            addLog(`❌ 크롭 추가 실패: ${error.message}`);
        }
    };

    // 다음 문제 분리 버튼 핸들러
    const nextProblem = () => {
        if (currentProblemCrops.problemFiles.length === 0 && currentProblemCrops.answerFiles.length === 0) {
            alert("현재 문항에 등록된 크롭 영역이 없습니다. 지문 또는 해설 크롭을 최소 1개 이상 추가해주세요.");
            return;
        }

        setProblemsQueue(prev => [...prev, currentProblemCrops]);
        setCurrentProblemCrops({ problemFiles: [], answerFiles: [] });
        addLog(`⏩ [문제 ${problemsQueue.length + 1}] 분리 완료! 이제 [문제 ${problemsQueue.length + 2}] 크롭 수집을 시작합니다.`);
        
        setCrop(undefined);
        setCompletedCrop(undefined);
    };

    // 최종 추출 종료 및 백그라운드 OCR 시퀀스
    const finishExtraction = async () => {
        let finalQueue = [...problemsQueue];
        
        // 작성 중이던 활성 문제 크롭이 있으면 자동으로 추가 포함
        if (currentProblemCrops.problemFiles.length > 0 || currentProblemCrops.answerFiles.length > 0) {
            finalQueue.push(currentProblemCrops);
        }

        if (finalQueue.length === 0) {
            alert("크롭된 문항이 없습니다. 지문/해설 크롭을 추가하고 다음 문제 혹은 추출 종료를 눌러주세요.");
            return;
        }

        setIsCropModalOpen(false);
        setCropSrc(null);
        setStep(2); 
        setIsAnalyzing(true);
        setViewMode('problem');

        addLog(`⚡ 총 ${finalQueue.length}개 문항에 대해 다중 병렬 AI OCR 스캔 시퀀스 기동... (모델: ${aiModel})`);

        // 초기 problemsList 설정
        const initialList = finalQueue.map((prob, i) => ({
            type: activeProblem.type || 'workbook',
            category: activeProblem.category || '소방시설 공통',
            title: `문항 ${i + 1} (${prob.problemFiles[0]?.name.replace(/\.[^/.]+$/, "") || '스캔본'})`,
            description: '',
            modelAnswer: '',
            keywords: '',
            searchTags: [],
            problemType: 'descriptive',
            source: '',
            gradingPoints: { mandatory_terms: [], mandatory_numbers: [] },
            problemFiles: prob.problemFiles,
            answerFiles: prob.answerFiles,
            problemPreviewUrls: prob.problemFiles.map(f => URL.createObjectURL(f)),
            answerPreviewUrls: prob.answerFiles.map(f => URL.createObjectURL(f)),
            isSaved: false
        }));

        setProblemsList(initialList);
        setActiveProblemIndex(0);
        setCurrentImageIndex(0);

        if (isManualMode) { setStep(3); setIsAnalyzing(false); return; }

        try {
            // 각 문항별 순차/병렬 복합 처리
            const promises = finalQueue.map(async (prob, problemIdx) => {
                addLog(`⚙️ [문제 ${problemIdx + 1}] 지문 ${prob.problemFiles.length}장 & 해설 ${prob.answerFiles.length}장 추출 가동...`);

                // 지문(Problem) 이미지 OCR 스캔 병합
                let description = "";
                let title = "";
                let category = activeProblem.category || "소방시설 공통";
                let searchTags = [];

                for (let i = 0; i < prob.problemFiles.length; i++) {
                    const file = prob.problemFiles[i];
                    if (file.skipExtraction) continue;

                    try {
                        const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file);
                        const res = await analyzeImage(compressedFile, activeProblem.type, 'problem', aiModel);
                        if (res) {
                            if (res.title && !title) title = res.title;
                            if (res.category) category = res.category;
                            description = description ? description + '\n\n' + res.description : res.description;
                            if (res.tags) searchTags = [...new Set([...searchTags, ...res.tags])];
                        }
                    } catch (err) {
                        console.error(`지문 스캔 에러 (${problemIdx + 1}-${i + 1}):`, err);
                        addLog(`⚠️ [문제 ${problemIdx + 1}] 지문 ${i + 1}쪽 분석 실패: ${err.message || err}`);
                    }
                }

                // 해설(Answer) 이미지 OCR 스캔 병합
                let modelAnswer = "";
                let gradingPoints = { mandatory_terms: [], mandatory_numbers: [] };

                for (let i = 0; i < prob.answerFiles.length; i++) {
                    const file = prob.answerFiles[i];
                    if (file.skipExtraction) continue;

                    try {
                        const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file);
                        const res = await analyzeImage(compressedFile, activeProblem.type, 'answer', aiModel);
                        if (res) {
                            modelAnswer = modelAnswer ? modelAnswer + '\n\n' + res.modelAnswer : res.modelAnswer;
                            if (res.gradingPoints) {
                                gradingPoints.mandatory_terms = [...new Set([...gradingPoints.mandatory_terms, ...(res.gradingPoints.mandatory_terms || [])])];
                                gradingPoints.mandatory_numbers = [...new Set([...gradingPoints.mandatory_numbers, ...(res.gradingPoints.mandatory_numbers || [])])];
                            }
                        }
                    } catch (err) {
                        console.error(`해설 스캔 에러 (${problemIdx + 1}-${i + 1}):`, err);
                        addLog(`⚠️ [문제 ${problemIdx + 1}] 해설 ${i + 1}쪽 분석 실패: ${err.message || err}`);
                    }
                }

                const keywords = searchTags.join(', ');
                addLog(`✅ [문제 ${problemIdx + 1}] 분석 마스터 완료`);

                return {
                    problemIdx,
                    title: title || `문항 ${problemIdx + 1}`,
                    category,
                    description,
                    modelAnswer,
                    searchTags,
                    keywords,
                    gradingPoints
                };
            });

            const results = await Promise.all(promises);

            setProblemsList(prev => {
                const list = [...prev];
                results.forEach(res => {
                    if (res) {
                        const idx = res.problemIdx;
                        list[idx] = {
                            ...list[idx],
                            title: res.title || list[idx].title,
                            category: res.category || list[idx].category,
                            description: res.description,
                            modelAnswer: res.modelAnswer,
                            searchTags: res.searchTags,
                            keywords: res.keywords,
                            gradingPoints: res.gradingPoints
                        };
                    }
                });
                return list;
            });

            addLog(`🎉 전 문항 분석 완료! 검토화면으로 진입합니다.`);
        } catch (error) {
            console.error("전체 병렬 분석 실패:", error);
            addLog(`⚠️ 분석 파이프라인에서 오류 발생: ${error.message}`);
        }

        setIsAnalyzing(false);
        setStep(3);
        
        // 크롭 완료 후 대기 큐 비우기
        setProblemsQueue([]);
        setCurrentProblemCrops({ problemFiles: [], answerFiles: [] });
    };

    // --- [8. 저장 엔진 및 유틸리티] ---
    const uploadImagesToStorage = async (files, folderPath) => {
        const urls = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size === 0) continue; 

            try {
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

    const saveSingleProblem = async (index, preventStateChange = false) => {
        const problem = problemsList[index];
        if (!problem) return false;
        if (problem.isSaved) {
            addLog(`⚠️ [${index + 1}번째 문항] 이미 저장 완료된 문항입니다.`);
            return true;
        }

        if (!preventStateChange) setIsSaving(true);
        addLog(`💾 [${index + 1}/${problemsList.length}] "${problem.title || '제목 없음'}" 저장 중...`);

        try {
            const collectionName = 'workbook';
            let finalProblemUrls = [...(problem.problemPreviewUrls || [])];
            let finalAnswerUrls = [...(problem.answerPreviewUrls || [])];

            const newProblemFiles = (problem.problemFiles || []).filter(f => f.size > 0);
            if (newProblemFiles.length > 0) {
                addLog(`  .. 지문 이미지 업로드 중...`);
                const uploadedUrls = await uploadImagesToStorage(newProblemFiles, 'problems');
                finalProblemUrls = [
                    ...problem.problemPreviewUrls.filter(url => !url.startsWith('blob:')),
                    ...uploadedUrls
                ];
            }

            const newAnswerFiles = (problem.answerFiles || []).filter(f => f.size > 0);
            if (newAnswerFiles.length > 0) {
                addLog(`  .. 해설 이미지 업로드 중...`);
                const uploadedUrls = await uploadImagesToStorage(newAnswerFiles, 'answers');
                finalAnswerUrls = [
                    ...problem.answerPreviewUrls.filter(url => !url.startsWith('blob:')),
                    ...uploadedUrls
                ];
            }

            const finalData = {
                type: problem.type || 'workbook',
                category: problem.category || '소방시설 공통',
                title: problem.title || '',
                description: problem.description || '',
                modelAnswer: problem.modelAnswer || '',
                problemType: problem.problemType || 'descriptive',
                source: problem.source || '',
                gradingPoints: problem.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] },
                subject: problem.type || 'workbook',
                tags: problem.searchTags || [],
                keywords: problem.searchTags && problem.searchTags.length > 0 ? problem.searchTags.join(', ') : '',
                images: finalProblemUrls,
                answerImages: finalAnswerUrls,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, collectionName), finalData);
            
            // 특정 인덱스 저장 성공 업데이트
            setProblemsList(prev => {
                const list = [...prev];
                if (list[index]) {
                    list[index] = { ...list[index], isSaved: true };
                }
                return list;
            });

            addLog(`✅ "${problem.title}" 저장 성공!`);
            return true;
        } catch (error) {
            console.error("Save Single Error:", error);
            addLog(`❌ "${problem.title}" 저장 실패: ${error.message}`);
            return false;
        } finally {
            if (!preventStateChange) setIsSaving(false);
        }
    };

    const handleSaveAll = async () => {
        if (isSaving) return;
        setIsSaving(true);
        addLog(`💾 데이터베이스 저장 시퀀스 시작... (총 ${problemsList.length}개 문항)`);

        try {
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < problemsList.length; i++) {
                if (problemsList[i].isSaved) continue;
                const success = await saveSingleProblem(i, true);
                if (success) successCount++; else failCount++;
            }

            addLog(`✅ 전체 저장 프로세스 완료 (성공: ${successCount}개, 실패: ${failCount}개)`);
            if (failCount === 0) {
                alert("모든 문항이 성공적으로 저장되었습니다!");
                if (onSaveComplete) onSaveComplete();
            } else {
                alert(`일부 문항 저장 완료 (성공: ${successCount}개 / 실패: ${failCount}개). 실패한 문항을 확인하고 다시 시도해주세요.`);
            }
        } catch (error) {
            console.error("Save All Error:", error);
            addLog(`❌ 저장 중 심각한 오류 발생: ${error.message}`);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    const removeProblem = (index) => {
        setProblemsList(prev => {
            if (prev.length <= 1) {
                alert("최소 한 개의 문항이 존재해야 합니다.");
                return prev;
            }
            const updated = prev.filter((_, i) => i !== index);
            setActiveProblemIndex(current => {
                const nextIdx = current >= updated.length ? updated.length - 1 : current;
                return Math.max(0, nextIdx);
            });
            setCurrentImageIndex(0);
            addLog(`🗑️ ${index + 1}번째 문항이 목록에서 제외되었습니다.`);
            return updated;
        });
    };

    const resetState = () => { 
        setStep(1); 
        setProblemsList([
            {
                type: 'workbook', category: '수계소화설비', title: '', description: '', 
                modelAnswer: '', keywords: '', searchTags: [], problemType: 'descriptive',
                source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] },
                problemFiles: [], answerFiles: [],
                problemPreviewUrls: [], answerPreviewUrls: [],
                isSaved: false
            }
        ]);
        setActiveProblemIndex(0);
        setCurrentImageIndex(0);
        addLog(`🔄 시스템이 초기화되었습니다.`);
    };

    const handleRemoveImage = () => {
        const activeIdx = splitProblems ? activeProblemIndex : 0;
        setProblemsList(prev => {
            const list = [...prev];
            const currentItem = { ...list[activeIdx] };
            if (!currentItem) return prev;
            
            if (viewMode === 'problem') {
                if (currentItem.problemPreviewUrls.length <= 1 && currentItem.problemFiles.length <= 1) {
                    alert("최소 한 장의 지문 이미지는 있어야 합니다. 문항 자체를 제외하려면 Exclude 버튼을 사용해 주세요.");
                    return prev;
                }
                currentItem.problemPreviewUrls = currentItem.problemPreviewUrls.filter((_, i) => i !== currentImageIndex);
                currentItem.problemFiles = currentItem.problemFiles.filter((_, i) => i !== currentImageIndex);
            } else {
                if (currentItem.answerPreviewUrls.length <= 1 && currentItem.answerFiles.length <= 1) {
                    alert("최소 한 장의 해설 이미지는 있어야 합니다. 문항 자체를 제외하려면 Exclude 버튼을 사용해 주세요.");
                    return prev;
                }
                currentItem.answerPreviewUrls = currentItem.answerPreviewUrls.filter((_, i) => i !== currentImageIndex);
                currentItem.answerFiles = currentItem.answerFiles.filter((_, i) => i !== currentImageIndex);
            }
            list[activeIdx] = currentItem;
            setCurrentImageIndex(prevIdx => Math.max(0, prevIdx - 1));
            addLog(`🗑️ ${viewMode === 'problem' ? '지문' : '해설'}의 ${currentImageIndex + 1}쪽이 삭제되었습니다.`);
            return list;
        });
    };

    const problemPreviewUrls = activeProblem.problemPreviewUrls || [];
        
    const answerPreviewUrls = activeProblem.answerPreviewUrls || [];

    // 해설 추가 업로드
    const processAnswerUpload = async (files) => {
        setIsAnalyzingAnswer(true);
        setViewMode('answer');
        
        const activeIdx = splitProblems ? activeProblemIndex : 0;
        
        setProblemsList(prev => {
            const list = [...prev];
            if (list[activeIdx]) {
                const currentItem = { ...list[activeIdx] };
                currentItem.answerFiles = [...(currentItem.answerFiles || []), ...files];
                currentItem.answerPreviewUrls = [
                    ...(currentItem.answerPreviewUrls || []), 
                    ...files.map(f => URL.createObjectURL(f))
                ];
                list[activeIdx] = currentItem;
            }
            return list;
        });

        if (isManualMode) { setIsAnalyzingAnswer(false); return; }

        addLog(`⚡ 다중 해설 추가 병렬 분석 시퀀스 가동... (총 ${files.length}장 / 모델: ${aiModel})`);
        
        try {
            const promises = files.map(async (file, i) => {
                const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file);
                return analyzeImage(compressedFile, activeProblem.type, 'answer', aiModel)
                    .then(res => {
                        addLog(`✅ 추가 해설 ${i + 1}쪽 추출 완료`);
                        return res;
                    })
                    .catch(err => {
                        console.error(`추가 해설 ${i + 1}번째 장 실패:`, err);
                        return null;
                    });
            });
            
            const results = await Promise.all(promises);
            
            setProblemsList(prev => {
                const list = [...prev];
                if (list[activeIdx]) {
                    const currentItem = { ...list[activeIdx] };
                    results.forEach(res => {
                        if (res) {
                            if (res.modelAnswer) {
                                currentItem.modelAnswer = currentItem.modelAnswer 
                                    ? currentItem.modelAnswer + '\n\n' + res.modelAnswer 
                                    : res.modelAnswer;
                            }
                            if (res.gradingPoints) {
                                currentItem.gradingPoints = {
                                    mandatory_terms: [...new Set([...(currentItem.gradingPoints?.mandatory_terms || []), ...(res.gradingPoints.mandatory_terms || [])])],
                                    mandatory_numbers: [...new Set([...(currentItem.gradingPoints?.mandatory_numbers || []), ...(res.gradingPoints.mandatory_numbers || [])])]
                                };
                            }
                        }
                    });
                    list[activeIdx] = currentItem;
                }
                return list;
            });
        } catch (error) {
            console.error("추가 해설 병렬 분석 실패:", error);
        }
        setIsAnalyzingAnswer(false);
    };

    return {
        aiModel, setAiModel, 
        splitProblems, setSplitProblems,
        isManualMode, setIsManualMode, isSaving, step, setStep, viewMode, setViewMode, 
        formData: activeProblem, 
        setFormData: updateActiveForm,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex, isAnalyzing, isAnalyzingAnswer, 
        debugLogs, showDebug, setShowDebug, setDebugLogs, inputFileRef, inputAddRef,
        processIncomingFiles,
        handleInitialUpload: (e) => onSelectFile(e, 'problem'), 
        handleAddImages: (e) => onSelectFile(e, 'answer'), 
        handleRemoveImage, handleSave: handleSaveAll, resetState, updateGradingPoint: (type, action, value, index) => {
            updateActiveForm(prev => {
                const list = [...(prev.gradingPoints?.[type] || [])];
                if (action === 'add') list.push(''); else if (action === 'update') list[index] = value; else if (action === 'remove') list.splice(index, 1);
                return { gradingPoints: { ...(prev.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] }), [type]: list } };
            });
        },
        updateSearchTag: (action, value, index) => {
            updateActiveForm(prev => {
                const list = [...(prev.searchTags || [])];
                if (action === 'add') list.push(''); else if (action === 'update') list[index] = value; else if (action === 'remove') list.splice(index, 1);
                return { searchTags: list };
            });
        },
        cropSrc, crop, setCrop, completedCrop, setCompletedCrop, isCropModalOpen, imgRef, 
        onCropCancel: () => { setIsCropModalOpen(false); setCropSrc(null); cropQueueRef.current = []; setExtractText(true); setProblemsQueue([]); },
        extractText, setExtractText,
        
        // 🔴 멀티 크롭 연동 추가 파라미터
        currentPageIndex,
        totalPagesIndex: cropQueueRef.current.length,
        goToNextPage,
        goToPrevPage,
        addCropToActiveProblem,
        nextProblem,
        finishExtraction,
        problemsQueueCount: problemsQueue.length,
        currentProblemCrops,
        
        // 🔴 문항 개별 제어 및 목록 상태 바인딩 추가
        problemsList,
        saveSingleProblem,
        removeProblem,
        
        // 🔴 신규 노출
        activeProblemIndex,
        setActiveProblemIndex
    };
};