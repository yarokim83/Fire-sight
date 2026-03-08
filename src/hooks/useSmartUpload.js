import { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'; 
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { analyzeImage } from '../utils/gemini'; 
import { getCroppedImg } from '../utils/canvasUtils'; 

export const useSmartUpload = (initialData, onSaveComplete) => {
    // 🔴 [추가] AI 모델 선택 상태 (최신 3.1 Pro 기본값)
    const [aiModel, setAiModel] = useState('gemini-3.1-pro-preview');

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

    // --- [4. 데이터 수화] ---
    const [formData, setFormData] = useState({
        type: 'workbook', category: '수계소화설비', title: '', description: '', 
        modelAnswer: '', keywords: '', searchTags: [], problemType: 'descriptive',
        source: '', gradingPoints: { mandatory_terms: [], mandatory_numbers: [] }
    });

    useEffect(() => {
        if (initialData) {
            // ... (데이터 수화 로직은 변경 없음)
        }
    }, [initialData]);

    const addLog = useCallback((msg) => {
        const time = new Date().toLocaleTimeString();
        if(isMounted.current) setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    }, []);

    // --- [5. 통합 크롭 및 시퀀스 제어 엔진] ---
    const onSelectFile = (e, target = 'problem') => {
        // ... (onSelectFile 로직은 변경 없음)
    };

    const onCropConfirm = async () => {
        // ... (onCropConfirm 로직은 변경 없음)
    };

    // --- [6. 🔴 AI 지문 추출 엔진 (모델 선택 기능 적용)] ---
    const processInitialUpload = async (files) => {
        if (!files || files.length === 0) return;
        
        setStep(2); 
        setIsAnalyzing(true);
        setProblemPreviewUrls(files.map(f => URL.createObjectURL(f)));
        setProblemFiles(files); 
        setViewMode('problem');

        if (isManualMode) { setStep(3); setIsAnalyzing(false); return; }

        const batchResults = [];
        for (let i = 0; i < files.length; i++) {
            addLog(`🔍 지문 페이지(${i + 1}/${files.length}) 분석 중... (모델: ${aiModel})`);
            try {
                // 🔴 [수정] analyzeImage에 aiModel 전달
                const res = await analyzeImage(files[i], formData.type, 'problem', aiModel);
                if (res) batchResults.push(res);
            } catch (error) {
                console.error(`지문 ${i + 1}번째 장 실패:`, error);
                addLog(`⚠️ 지문 ${i + 1}쪽 분석 실패`);
            }
            if (i < files.length - 1) await new Promise(resolve => setTimeout(resolve, 1500));
        }

        if (isMounted.current && batchResults.length > 0) {
            setFormData(prev => { 
                // ... (결과 병합 로직은 변경 없음)
            });
            addLog(`✅ 지문 ${batchResults.length}매 병합 완료`);
        }
        if (isMounted.current) { setIsAnalyzing(false); setStep(3); }
    };

    // --- [7. 🔴 AI 해설 병합 엔진 (모델 선택 기능 적용)] ---
    const processAnswerUpload = async (files) => {
        setIsAnalyzingAnswer(true);
        setAnswerPreviewUrls(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
        setAnswerFiles(p => [...p, ...files]);
        setViewMode('answer');
        if (isManualMode) { setIsAnalyzingAnswer(false); return; }

        const batchResults = [];
        for (let i = 0; i < files.length; i++) {
            addLog(`📄 해설 페이지(${i + 1}/${files.length}) 분석 중... (모델: ${aiModel})`);
            try {
                 // 🔴 [수정] analyzeImage에 aiModel 전달
                const res = await analyzeImage(files[i], formData.type, 'answer', aiModel);
                if (res) batchResults.push(res);
            } catch (error) {
                console.error(`해설 ${i + 1}번째 장 실패:`, error);
                addLog(`⚠️ 해설 ${i + 1}쪽 분석 실패`);
            }
            if (i < files.length - 1) await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        if (isMounted.current && batchResults.length > 0) {
            setFormData(prev => {
                // ... (결과 병합 로직은 변경 없음)
            });
            addLog(`✅ 해설 ${batchResults.length}매 통합 병합 완료`);
        }
        if (isMounted.current) { setIsAnalyzingAnswer(false); }
    };

    // --- [8. 저장 엔진 및 유틸리티] ---
    const handleSave = async () => { /* ... (변경 없음) ... */ };
    const uploadImagesToStorage = async (files) => { /* ... (변경 없음) ... */ };
    const resetState = () => { /* ... (변경 없음) ... */ };
    const handleRemoveImage = () => { /* ... (변경 없음) ... */ };

    // 🔴 [수정] 반환 객체에 aiModel, setAiModel 추가
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