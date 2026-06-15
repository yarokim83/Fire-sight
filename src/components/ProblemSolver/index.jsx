import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp } from 'firebase/firestore'; 
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { updateProblemResult, updateProblemMemo, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon, ClipboardPaste,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen, CheckCircle2 as OIcon,
    RefreshCw, Plus, Link, Target, Calculator, Highlighter, Sparkles, EyeOff
} from 'lucide-react';

import { SUBJECT_LIST, PROBLEM_TYPES } from '/src/utils/constants';
import SharedCanvas from '../SharedCanvas';
import DrawingToolbar from './DrawingToolbar';
import ImageCarousel from './ImageCarousel';
import AudioStudyPlayer from './AudioStudyPlayer';

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete, onEditProblem }) {
    const [splitRatio, setSplitRatio] = useState(50);
    const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
    const containerRef = useRef(null);
    const leftPanelRef = useRef(null);
    const rightPanelRef = useRef(null);
    const shouldKeepAnswerRef = useRef(false);
    const isDragging = useRef(false);
    const currentRatioRef = useRef(50);

    useEffect(() => {
        const handleResize = () => {
            setIsLargeScreen(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSplitStart = (clientX) => {
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        if (leftPanelRef.current && rightPanelRef.current) {
            leftPanelRef.current.style.transition = 'none';
            rightPanelRef.current.style.transition = 'none';
        }
    };

    const handleSplitMove = (clientX) => {
        if (!isDragging.current || !containerRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const relativeX = clientX - containerRect.left;
        let percentage = (relativeX / containerRect.width) * 100;
        
        if (percentage < 25) percentage = 25;
        if (percentage > 75) percentage = 75;
        
        currentRatioRef.current = percentage;
        if (leftPanelRef.current && rightPanelRef.current) {
            leftPanelRef.current.style.flexBasis = `${percentage}%`;
            rightPanelRef.current.style.flexBasis = `${100 - percentage}%`;
        }
    };

    const handleSplitEnd = () => {
        if (isDragging.current) {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (leftPanelRef.current && rightPanelRef.current) {
                leftPanelRef.current.style.transition = '';
                rightPanelRef.current.style.transition = '';
            }
            setSplitRatio(currentRatioRef.current);
        }
    };

    const handleSplitMouseDown = (e) => {
        handleSplitStart(e.clientX);
    };

    const handleSplitTouchStart = (e) => {
        if (e.touches && e.touches[0]) {
            handleSplitStart(e.touches[0].clientX);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => handleSplitMove(e.clientX);
        const handleTouchMove = (e) => {
            if (e.touches && e.touches[0]) {
                handleSplitMove(e.touches[0].clientX);
            }
        };
        const handleMouseUp = () => handleSplitEnd();

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, []);

    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); 
    const [userAnswer, setUserAnswer] = useState('');
    const [gradingResult, setGradingResult] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [isPeek, setIsPeek] = useState(false); // 터치 기기용 정답 강제 표시 상태

    const [isEditMode, setIsEditMode] = useState(false);
    const [editedQuestion, setEditedQuestion] = useState('');
    const [editedAnswer, setEditedAnswer] = useState('');
    const [editedTerms, setEditedTerms] = useState([]);
    const [editedNumbers, setEditedNumbers] = useState([]);
    const [editedSubject, setEditedSubject] = useState('');
    const [newTerm, setNewTerm] = useState('');
    const [newNumber, setNewNumber] = useState('');

    const getCreationTime = (p) => {
        if (!p) return 0;
        if (p.createdAt && typeof p.createdAt.toMillis === 'function') {
            return p.createdAt.toMillis();
        }
        if (p.createdAt && p.createdAt.seconds) {
            return p.createdAt.seconds * 1000 + (p.createdAt.nanoseconds || 0) / 1000000;
        }
        if (p.createdAt) {
            const parsed = Number(p.createdAt);
            if (!isNaN(parsed)) return parsed;
            const dateParsed = Date.parse(p.createdAt);
            if (!isNaN(dateParsed)) return dateParsed;
        }
        return 0;
    };

    const isDescending = useMemo(() => {
        if (!problems || problems.length < 2) return false;
        const firstTime = getCreationTime(problems[0]);
        const lastTime = getCreationTime(problems[problems.length - 1]);
        return firstTime > lastTime;
    }, [problems]);

    const [showMemo, setShowMemo] = useState(false);
    const [memoText, setMemoText] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);
     // 🔴 [신규 추가] 해설 이미지 업로드 상태 및 함수
    const [isUploading, setIsUploading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });
    const showConfirm = (title, message, onConfirm, onCancel = null) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm,
            onCancel
        });
    };
    const canvasRef = useRef(null);        
    const overlayCanvasRef = useRef(null); 
    
    const [penColor, setPenColor] = useState('#facc15'); 
    const [lineWidth, setLineWidth] = useState(4);
    const [isEraserMode, setIsEraserMode] = useState(false);

    const textareaRef = useRef(null);

    useEffect(() => {
        const p = problems && problems[currentIndex];
        if (p) {
            const rootNumbers = Array.isArray(p.numbers) ? p.numbers : [];
            const dbNumbers = p.gradingPoints?.mandatory_numbers || [];
            const mergedNumbers = Array.from(new Set([...rootNumbers, ...dbNumbers]))
                .map(n => String(n).trim())
                .filter(n => n !== '' && n !== 'null' && n !== 'undefined');

            const rootKeywords = Array.isArray(p.keywords) ? p.keywords : [];
            const dbTerms = p.gradingPoints?.mandatory_terms || [];
            const mergedTerms = Array.from(new Set([...rootKeywords, ...dbTerms]))
                .map(t => String(t).trim())
                .filter(t => t !== '');

            const formattedQuestion = p.content || p.question || '';
            const formattedAnswer = p.answer || p.modelAnswer || '';

            setCurrentProblem({
                ...p,
                gradingPoints: {
                    mandatory_terms: mergedTerms,
                    mandatory_numbers: mergedNumbers
                },
                question: formattedQuestion,
                modelAnswer: formattedAnswer
            });

            setEditedQuestion(formattedQuestion);
            setEditedAnswer(formattedAnswer);
            setEditedTerms(mergedTerms);
            setEditedNumbers(mergedNumbers);
            setEditedSubject(p.subject || p.category || '');

            setLocalProblemImages(p.images || []);
            setLocalAnswerImages(p.answerImages || []);
            setMemoText(p.memo || '');
            setUserAnswer('');
            if (shouldKeepAnswerRef.current) {
                setShowAnswer(true);
                const emptyGrading = {
                    percentage: 0,
                    matchedTerms: [],
                    matchedNumbers: [],
                    missingTerms: mergedTerms,
                    missingNumbers: mergedNumbers,
                    manualGradingRequired: true
                };
                setGradingResult(emptyGrading);
                shouldKeepAnswerRef.current = false;
            } else {
                setShowAnswer(false);
                setGradingResult(null);
            }
            setShowMemo(false);
            setIsEditMode(false); 
            setIsOverlayMode(false);
            setIsRetrying(false); 
            setIsPeek(false);
            
            setInputMode(p.problemType === 'drawing' || p.problemType === 'calculation' ? 'draw' : 'text');
            document.querySelector('.problem-container')?.scrollTo(0, 0);
        }
    }, [currentIndex, problems]);

    useEffect(() => {
        if (isRetrying && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [userAnswer, isRetrying]);

    const addTerm = () => {
        if (newTerm.trim() && !editedTerms.includes(newTerm.trim())) {
            setEditedTerms([...editedTerms, newTerm.trim()]);
            setNewTerm('');
        }
    };

    const addNumber = () => {
        if (newNumber.trim() && !editedNumbers.includes(newNumber.trim())) {
            setEditedNumbers([...editedNumbers, newNumber.trim()]);
            setNewNumber('');
        }
    };

    const clearCurrentCanvas = () => {
        if (isOverlayMode && overlayCanvasRef.current) overlayCanvasRef.current.clear();
        else if (!isOverlayMode && canvasRef.current) canvasRef.current.clear();
    };

    const analyzeAnswer = (answerText = userAnswer) => { 
        if (!currentProblem) return null;
        const terms = currentProblem.gradingPoints?.mandatory_terms || [];
        const numbers = currentProblem.gradingPoints?.mandatory_numbers || [];
        if (inputMode === 'draw' || !answerText.trim()) {
            return { percentage: 0, matchedTerms: [], matchedNumbers: [], missingTerms: terms, missingNumbers: numbers, manualGradingRequired: true };
        }
        
        // 1. 공백 및 개행을 단일 공백으로 단순화
        const normalizedInput = answerText.replace(/\s+/g, ' ');

        // [고도화된 Regex 검사기] 키워드의 각 글자 사이에 최대 3자의 임의 문자(조사, 오타 제한적 허용) 허용
        const buildRegex = (term) => {
            const chars = Array.from(String(term).replace(/\s+/g, ''));
            const escapedChars = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            return new RegExp(escapedChars.join('.{0,3}?'), 'i');
        };

        const matchedTerms = terms.filter(t => buildRegex(t).test(normalizedInput));
        
        // 숫자는 단위 혼동 방지를 위해 오직 공백만 무시하고 스캔
        const normalizedInputForNumbers = answerText.replace(/\s+/g, '').toLowerCase();
        const matchedNumbers = numbers.filter(n => normalizedInputForNumbers.includes(String(n).replace(/\s+/g, '').toLowerCase()));
        
        let finalScore = 0;
        if (terms.length > 0 && numbers.length > 0) finalScore = (matchedTerms.length/terms.length * 40) + (matchedNumbers.length/numbers.length * 60);
        else if (terms.length > 0) finalScore = (matchedTerms.length/terms.length * 100);
        else if (numbers.length > 0) finalScore = (matchedNumbers.length/numbers.length * 100);
        
        return { 
            percentage: Math.round(finalScore), 
            matchedTerms, 
            matchedNumbers, 
            missingTerms: terms.filter(t => !matchedTerms.includes(t)), 
            missingNumbers: numbers.filter(n => !matchedNumbers.includes(n)), 
            manualGradingRequired: (terms.length === 0 && numbers.length === 0) 
        };
    };

    const handleNext = (keepAnswer = false) => {
        if (keepAnswer) {
            shouldKeepAnswerRef.current = true;
        }
        if (isDescending) {
            if (currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
            } else {
                onComplete();
            }
        } else {
            if (currentIndex < problems.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                onComplete();
            }
        }
    };

    const handlePrev = (keepAnswer = false) => {
        if (keepAnswer) {
            shouldKeepAnswerRef.current = true;
        }
        if (isDescending) {
            if (currentIndex < problems.length - 1) {
                setCurrentIndex(prev => prev + 1);
            }
        } else {
            if (currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
            }
        }
    };

    const handleShowAnswerDirectly = () => {
        const emptyGrading = {
            percentage: 0,
            matchedTerms: [],
            matchedNumbers: [],
            missingTerms: currentProblem.gradingPoints?.mandatory_terms || [],
            missingNumbers: currentProblem.gradingPoints?.mandatory_numbers || [],
            manualGradingRequired: true
        };
        setGradingResult(emptyGrading);
        setShowAnswer(true);
    };

    const handleSubmit = async () => {
        let currentAnswer = userAnswer;
        // 도화지에 그림을 그렸다면, 새 도화지에서 이미지를 뽑아옵니다!
        if (inputMode === 'draw' && canvasRef.current) {
            currentAnswer = canvasRef.current.getImageData('white');
            setUserAnswer(currentAnswer);
        }

        const res = analyzeAnswer(currentAnswer);
        setGradingResult(res); 
        setShowAnswer(true);

        if (inputMode === 'text' && currentAnswer.trim() && !res.manualGradingRequired) {
            await updateProblemResult(currentProblem.id, res.percentage);
        }
    };

    const handleRetrySubmit = async () => {
        const res = analyzeAnswer();
        setGradingResult(res); setIsRetrying(false);  
        if (!res.manualGradingRequired) await updateProblemResult(currentProblem.id, res.percentage);
    };

    const handleSaveMemo = async () => {
        try {
            await updateProblemMemo(currentProblem.id, memoText);
            setCurrentProblem(prev => ({ ...prev, memo: memoText }));
            alert('메모 저장 완료! 📝');
        } catch (e) { alert('메모 저장 실패'); }
    };

    const handleQuickUpdate = async () => {
        try {
            const finalTerms = editedTerms.map(t => String(t).trim()).filter(t => t !== '');
            const finalNumbers = editedNumbers.map(n => String(n).trim()).filter(n => n !== '');

            await updateProblemInfo(currentProblem.id, {
                content: editedQuestion,
                answer: editedAnswer,
                keywords: finalTerms,
                numbers: finalNumbers,
                subject: editedSubject,
                category: editedSubject,
                gradingPoints: {
                    mandatory_terms: finalTerms,
                    mandatory_numbers: finalNumbers
                }
            });

            setCurrentProblem(prev => ({
                ...prev,
                question: editedQuestion,
                modelAnswer: editedAnswer,
                keywords: finalTerms,
                numbers: finalNumbers,
                subject: editedSubject,
                category: editedSubject,
                gradingPoints: {
                    mandatory_terms: finalTerms,
                    mandatory_numbers: finalNumbers
                }
            }));
            
            setIsEditMode(false);
            setGradingResult(null);
            setShowAnswer(false);
            setUserAnswer('');

            alert('지문, 해설 및 채점 기준이 성공적으로 수정되었습니다! ✅\n변경된 기준으로 다시 풀어보세요.');
        } catch (e) {
            console.error(e);
            alert('수정 저장 중 오류가 발생했습니다.');
        }
    };
    


    const handleDeleteImage = async (type, imageUrl) => {
        showConfirm(
            '이미지 삭제',
            '이 이미지를 정말 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.',
            async () => {
                try {
                    // [에러 핸들링] Storage 삭제 시도 (실패해도 DB 정리는 강제 진행)
                    try {
                        const fileRef = ref(storage, imageUrl);
                        await deleteObject(fileRef);
                    } catch (storageError) {
                        console.warn('스토리지에서 이미지를 찾을 수 없거나 이미 삭제되었습니다. DB 정리를 계속 진행합니다.', storageError);
                    }

                    // DB 레코드 삭제 (좀비 이미지 링크 제거)
                    const docRef = doc(db, 'workbook', currentProblem.id);
                    if (type === 'problem') {
                        await updateDoc(docRef, { images: arrayRemove(imageUrl) });
                        setLocalProblemImages(prev => prev.filter(url => url !== imageUrl));
                    } else {
                        await updateDoc(docRef, { answerImages: arrayRemove(imageUrl) });
                        setLocalAnswerImages(prev => prev.filter(url => url !== imageUrl));
                    }
                } catch (e) { 
                    alert('삭제 처리에 실패했습니다. 다시 시도해주세요.'); 
                    console.error(e); 
                }
            }
        );
    };

   

    const handleAddAnswerImages = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newUrls = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileRef = ref(storage, `answers/${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                newUrls.push(url);
            }

            const docRef = doc(db, 'workbook', currentProblem.id);
            await updateDoc(docRef, { answerImages: arrayUnion(...newUrls) });

            setLocalAnswerImages(prev => [...prev, ...newUrls]);
            alert('이미지가 성공적으로 추가되었습니다! ✅');
        } catch (error) {
            console.error('Upload error:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
            e.target.value = null; 
        }
    };

    const handlePasteAnswerImage = async (e) => {
        if (isUploading) return;
        
        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;
        
        const imageFiles = [];
        for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const pastedFile = new File([file], `clipboard_${Date.now()}_${i}.png`, { type: file.type });
                    imageFiles.push(pastedFile);
                }
            }
        }
        
        if (imageFiles.length === 0) return;
        
        e.preventDefault();
        
        setIsUploading(true);
        try {
            const newUrls = [];
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const fileRef = ref(storage, `answers/${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                newUrls.push(url);
            }
            
            const docRef = doc(db, 'workbook', currentProblem.id);
            await updateDoc(docRef, { answerImages: arrayUnion(...newUrls) });
            
            setLocalAnswerImages(prev => [...prev, ...newUrls]);
            alert('클립보드 이미지가 성공적으로 추가되었습니다! ✅');
        } catch (error) {
            console.error('Paste upload error:', error);
            alert('클립보드 이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePasteFromClipboard = async () => {
        if (isUploading) return;
        try {
            if (!navigator.clipboard || !navigator.clipboard.read) {
                alert("이 브라우저/환경에서는 클립보드 읽기 API를 지원하지 않습니다. 최신 Safari 또는 Chrome 브라우저를 사용해 주세요.");
                return;
            }
            setIsUploading(true);
            const clipboardItems = await navigator.clipboard.read();
            let imageBlob = null;
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        imageBlob = await item.getType(type);
                        break;
                    }
                }
                if (imageBlob) break;
            }

            if (imageBlob) {
                const file = new File([imageBlob], `clipboard_${Date.now()}.png`, { type: imageBlob.type });
                const fileRef = ref(storage, `answers/${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                
                const docRef = doc(db, 'workbook', currentProblem.id);
                await updateDoc(docRef, { answerImages: arrayUnion(url) });
                
                setLocalAnswerImages(prev => [...prev, url]);
                alert('클립보드 이미지가 성공적으로 추가되었습니다! ✅');
            } else {
                alert("클립보드에 복사된 이미지가 없습니다. 이미지를 캡처 후 '복사'한 다음 눌러주세요.");
            }
        } catch (err) {
            console.error("클립보드 이미지 붙여넣기 실패:", err);
            alert("클립보드 읽기 권한이 거부되었거나 이미지를 가져올 수 없습니다. 브라우저의 클립보드 접근 권한 설정을 확인해 주세요.");
        } finally {
            setIsUploading(false);
        }
    };

    const renderModelAnswer = (text) => {
        if (!text) return <p className="text-slate-500">해설이 등록되지 않았습니다.</p>;

        // 동적 채점 기준 키워드 결합
        const customTerms = currentProblem?.gradingPoints?.mandatory_terms || [];
        const baseKeywords = ['형식승인', '유효 설치 범위', '방호구역 내', '유효설치범위', '방호구역내'];
        const keywords = Array.from(new Set([...baseKeywords, ...customTerms]))
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);

        // 정규식 예약어 안전 이스케이프
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 텍스트 내 핵심 명사 하이라이팅 헬퍼
        const highlightText = (txt) => {
            if (!txt || keywords.length === 0) return txt;
            const escapedKeywords = keywords.map(escapeRegExp);
            const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'g');
            const parts = txt.split(regex);
            return parts.map((part, i) => 
                keywords.includes(part) 
                ? <strong key={i} className="text-emerald-400 font-extrabold tracking-tight">{part}</strong> 
                : part
            );
        };

        // 수치/단위 강조 헬퍼 (온도, 거리, 시간 등 숫자+단위)
        const highlightNumbersAndUnits = (txt) => {
            if (!txt) return '';
            const numRegex = /(\d+(?:\.\d+)?\s*(?:°C|℃|%|m|s|min|초|분|개|dB|V|A|W|Ω|Hz|kg|L|MPa|kg\/cm²|cm))/g;
            const parts = txt.split(numRegex);
            return parts.map((part, i) => 
                numRegex.test(part)
                ? <span key={i} className="text-amber-400 font-mono font-black">{part}</span>
                : highlightText(part)
            );
        };

        const lines = text.split('\n');
        const renderedElements = [];
        let gridItems = [];

        const renderGrid = (items, key) => {
            return (
                <div key={key} className="grid grid-cols-1 xs:grid-cols-2 gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 my-4 shadow-inner">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 bg-black/30 border border-white/5 p-3 rounded-xl">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider select-none">
                                {idx % 2 === 0 ? '조건 / 대상' : '기준 / 수치'}
                            </span>
                            <span className="text-sm font-bold text-slate-200">
                                {highlightNumbersAndUnits(item)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                if (gridItems.length > 0) {
                    renderedElements.push(renderGrid(gridItems, `grid-${i}`));
                    gridItems = [];
                }
                renderedElements.push(<div key={`empty-${i}`} className="h-2" />);
                continue;
            }

            // [패턴 4] 온도/수치 데이터 테이블(Grid)화 감지
            const gridMatch = line.match(/^([^\:]+)\s*[:\-]\s*([^\:]+)$/);
            if (gridMatch && (line.includes('°C') || line.includes('℃') || line.includes('%') || /\d+/.test(line))) {
                gridItems.push(gridMatch[1].trim());
                gridItems.push(gridMatch[2].trim());
                continue;
            } else {
                if (gridItems.length > 0) {
                    renderedElements.push(renderGrid(gridItems, `grid-${i}`));
                    gridItems = [];
                }
            }

            // [패턴 2] 조항 배지 분리 감지 (연속 다중 매칭 루프)
            let tempLine = line;
            const badges = [];
            while (true) {
                const match = tempLine.match(/^([\(（][0-9]+[\)）]|[①-⑳]|[0-9]+\.)\s*(.*)/);
                if (match) {
                    badges.push(match[1]);
                    tempLine = match[2].trim();
                } else {
                    break;
                }
            }

            if (badges.length > 0) {
                renderedElements.push(
                    <div key={`badge-line-${i}`} className="flex items-start gap-3 my-3.5 pl-1 leading-relaxed">
                        <div className="flex items-center gap-2 shrink-0 select-none mt-0.5">
                            {badges.map((badge, bIdx) => {
                                // ①-⑳ 유니코드 원기호는 둥근 배경 없이 큼직하고 굵은 독립 텍스트 기호로 강조 렌더링
                                if (/^[①-⑳]$/.test(badge)) {
                                    return (
                                        <span key={bIdx} className="text-emerald-400 font-black text-[22px] leading-none align-middle mr-0.5">
                                            {badge}
                                        </span>
                                    );
                                }
                                // (1), 1. 등의 괄호 및 숫자 기호는 둥근 사각형 배지로 연출
                                return (
                                    <span key={bIdx} className="shrink-0 bg-slate-800 text-emerald-400 font-extrabold border border-slate-700/80 px-3 py-1 rounded-xl text-[14px] font-mono shadow-md">
                                        {badge}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="flex-1 text-slate-100 text-[16px] font-medium tracking-tight">
                            {highlightNumbersAndUnits(tempLine)}
                        </div>
                    </div>
                );
            } else {
                // 일반 문단
                renderedElements.push(
                    <p key={`text-line-${i}`} className="my-2.5 text-slate-200 text-[16px] font-medium leading-[1.75] tracking-tight pl-1">
                        {highlightNumbersAndUnits(line)}
                    </p>
                );
            }
        }

        if (gridItems.length > 0) {
            renderedElements.push(renderGrid(gridItems, `grid-final`));
        }

        return <div className="font-sans space-y-1">{renderedElements}</div>;
    };

    const renderQuestion = (text) => {
        if (!text) return null;

        const customTerms = currentProblem?.gradingPoints?.mandatory_terms || [];
        const baseKeywords = ['형식승인', '유효 설치 범위', '방호구역 내', '유효설치범위', '방호구역내'];
        const keywords = Array.from(new Set([...baseKeywords, ...customTerms]))
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);

        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const highlightText = (txt) => {
            if (!txt || keywords.length === 0) return txt;
            const escapedKeywords = keywords.map(escapeRegExp);
            const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'g');
            const parts = txt.split(regex);
            return parts.map((part, i) => 
                keywords.includes(part) 
                ? <strong key={i} className="text-emerald-400 font-extrabold tracking-tight">{part}</strong> 
                : part
            );
        };

        const highlightNumbersAndUnits = (txt) => {
            if (!txt) return '';
            const numRegex = /(\d+(?:\.\d+)?\s*(?:°C|℃|%|m|s|min|초|분|개|dB|V|A|W|Ω|Hz|kg|L|MPa|kg\/cm²|cm))/g;
            const parts = txt.split(numRegex);
            return parts.map((part, i) => 
                numRegex.test(part)
                ? <span key={i} className="text-amber-400 font-mono font-black">{part}</span>
                : highlightText(part)
            );
        };

        const lines = text.split('\n');
        const renderedElements = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                renderedElements.push(<div key={`q-empty-${i}`} className="h-2" />);
                continue;
            }

            // [패턴 1] 대괄호 타이틀(예: [106]) 감지
            const titleMatch = line.match(/^([\[（][0-9a-zA-Z\s]+[\]）])\s*(.*)/);
            if (titleMatch) {
                const title = titleMatch[1];
                const body = titleMatch[2];
                renderedElements.push(
                    <h4 key={`q-title-${i}`} className="text-white font-black text-lg sm:text-xl leading-relaxed tracking-tight mb-4 flex items-center gap-2 mt-2">
                        <span className="text-blue-400 font-mono">{title}</span>
                        <span>{highlightNumbersAndUnits(body)}</span>
                    </h4>
                );
                continue;
            }

            // [패턴 2] 조항 배지 분리 감지 (연속 다중 매칭 루프)
            let tempLine = line;
            const badges = [];
            while (true) {
                const match = tempLine.match(/^([\(（][0-9]+[\)）]|[①-⑳]|[0-9]+\.)\s*(.*)/);
                if (match) {
                    badges.push(match[1]);
                    tempLine = match[2].trim();
                } else {
                    break;
                }
            }

            if (badges.length > 0) {
                renderedElements.push(
                    <div key={`q-badge-line-${i}`} className="flex items-start gap-3 my-3 pl-1 leading-relaxed">
                        <div className="flex items-center gap-2 shrink-0 select-none mt-0.5">
                            {badges.map((badge, bIdx) => {
                                if (/^[①-⑳]$/.test(badge)) {
                                    return (
                                        <span key={bIdx} className="text-emerald-400 font-black text-[22px] leading-none align-middle mr-0.5">
                                            {badge}
                                        </span>
                                    );
                                }
                                return (
                                    <span key={bIdx} className="shrink-0 bg-slate-800 text-slate-300 font-extrabold border border-slate-700/80 px-3 py-1 rounded-xl text-[14px] font-mono shadow-md">
                                        {badge}
                                    </span>
                                );
                            })}
                        </div>
                        <div className="flex-1 text-slate-200 text-[16px] sm:text-[17px] font-semibold tracking-tight">
                            {highlightNumbersAndUnits(tempLine)}
                        </div>
                    </div>
                );
            } else {
                // 일반 문단
                renderedElements.push(
                    <p key={`q-text-line-${i}`} className="my-2 text-slate-300 text-[16px] sm:text-[17px] font-semibold leading-[1.75] tracking-tight pl-1">
                        {highlightNumbersAndUnits(line)}
                    </p>
                );
            }
        }

        return <div className="font-sans space-y-1">{renderedElements}</div>;
    };

    const HighlightedUserAnswer = () => {
        if (!gradingResult) return <p className="text-slate-300 whitespace-pre-wrap">{userAnswer}</p>;
        
        const allTerms = gradingResult.matchedTerms || [];
        const allNums = gradingResult.matchedNumbers || [];
        
        if (allTerms.length === 0 && allNums.length === 0) {
            return <p className="text-white/80 whitespace-pre-wrap leading-relaxed text-lg">{userAnswer}</p>;
        }
        
        // 태그 파괴 방지를 위해 HTML 이스케이프
        const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let safeHtml = escapeHtml(userAnswer);
        
        // 긴 단어부터 매칭하여 태그 꼬임 방지
        const sortedTerms = [...allTerms].sort((a,b) => b.length - a.length);
        const sortedNums = [...allNums].sort((a,b) => String(b).length - String(a).length);

        sortedTerms.forEach(t => {
            const chars = Array.from(String(t).replace(/\s+/g, ''));
            const escapedChars = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            // 태그 내부 속성값 매칭 방지: (?![^<]*>)
            const pattern = new RegExp(`(${escapedChars.join('.{0,3}?')})(?![^<]*>)`, 'gi');
            safeHtml = safeHtml.replace(pattern, '<span class="font-black px-1.5 py-0.5 rounded mx-0.5 border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">$&</span>');
        });

        sortedNums.forEach(n => {
            const pattern = new RegExp(`(${String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi');
            safeHtml = safeHtml.replace(pattern, '<span class="font-black px-1.5 py-0.5 rounded mx-0.5 border text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(96,165,250,0.1)]">$&</span>');
        });

        return (
            <p 
                className="text-slate-200 whitespace-pre-wrap leading-relaxed text-lg font-medium"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        );
    };

    if (!currentProblem) return <div className="p-10 text-center text-white font-black animate-pulse">FireSight Data Hydrating...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"><ArrowLeft size={18} /> 목록</button>
                    <button onClick={() => setIsOverlayMode(!isOverlayMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${isOverlayMode ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Pen size={14} /> {isOverlayMode ? '연습장 끄기' : '연습장 모드'}
                    </button>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setShowMemo(!showMemo)} className={`p-2.5 rounded-xl transition-all ${showMemo ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><StickyNote size={20} /></button>
                    
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)} 
                        className={`p-2.5 rounded-xl transition-all ${isEditMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-blue-400'}`}
                        title="제자리 수정 모드"
                    >
                        <Edit3 size={20} />
                    </button>
                    
                    <button 
                        onClick={() => {
                            showConfirm(
                                '문제 삭제',
                                '이 문제를 복구할 수 없도록 정말 삭제하시겠습니까?',
                                async () => {
                                    try {
                                        await deleteProblem(currentProblem.id);
                                        onBack();
                                    } catch (err) {
                                        console.error(err);
                                        alert('문제 삭제에 실패했습니다.');
                                    }
                                }
                            );
                        }} 
                        onTouchStart={(e) => e.stopPropagation()}
                        className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center"
                        title="문제 삭제"
                        aria-label="Delete problem"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {showMemo && (
                <div className={`${(!isEditMode && showAnswer && gradingResult) ? 'max-w-[1500px]' : 'max-w-4xl'} mx-auto w-full px-4 md:px-8 mt-4 animate-in slide-in-from-top-4 duration-500 z-20 transition-all duration-700`}>
                    <div className="bg-amber-500/10 backdrop-blur-2xl border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl rounded-full" />
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-xl shadow-amber-500/20">
                                    <StickyNote size={22} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white tracking-tight">Study Memo</h4>
                                    <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">Personal Revision Note</p>
                                </div>
                            </div>
                            <button onClick={handleSaveMemo} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black rounded-full transition-all active:scale-95 shadow-lg shadow-amber-500/20">
                                <Save size={16} /> SAVE CHANGES
                            </button>
                        </div>
                        <textarea 
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="이 문제의 핵심 암기법이나 주의사항을 정밀하게 기록하세요..."
                            className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 text-slate-100 text-base leading-relaxed outline-none focus:border-amber-500/50 transition-all resize-none placeholder:text-white/5 shadow-inner relative z-10"
                        />
                    </div>
                </div>
            )}

            <div className="problem-container flex-1 overflow-y-auto p-4 md:p-8 pb-40 scroll-smooth">
                <div className={`${(!isEditMode && showAnswer && gradingResult) ? 'max-w-[1500px]' : 'max-w-4xl'} mx-auto space-y-8 transition-all duration-700`}>
                    
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-8 gap-4">
                            {isEditMode ? (
                                <div className="flex-1">
                                    <h1 className="text-2xl md:text-3xl font-black text-white/50 leading-tight tracking-tight break-keep mb-4">{currentProblem.title}</h1>
                                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5 w-fit">
                                        <label className="text-sm font-bold text-slate-400 pl-2">카테고리(과목) 변경:</label>
                                        <select 
                                            value={editedSubject} 
                                            onChange={(e) => setEditedSubject(e.target.value)}
                                            className="bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none focus:border-blue-500 transition-all cursor-pointer"
                                        >
                                            {SUBJECT_LIST.map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight break-keep">{currentProblem.title}</h1>
                            )}
                            
                            {isEditMode && (
                                <button onClick={handleQuickUpdate} className="flex flex-shrink-0 items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(37,99,235,0.3)]">
                                    <Save size={16} /> 수정 완료
                                </button>
                            )}
                        </div>
                        
                        {localProblemImages.length > 0 && (
                            <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={(url) => handleDeleteImage('problem', url)} isEditMode={isEditMode} />
                        )}

                        <div className="mt-6">
                            {isEditMode ? (
                                <textarea 
                                    value={editedQuestion}
                                    onChange={(e) => setEditedQuestion(e.target.value)}
                                    className="w-full min-h-[150px] bg-black/40 border-2 border-blue-500/50 rounded-2xl p-4 text-slate-200 text-lg font-medium outline-none focus:border-blue-400 transition-all resize-y"
                                    placeholder="지문 내용을 수정하세요..."
                                />
                            ) : (
                                <div className="max-w-none select-text">
                                    {renderQuestion(currentProblem.question)}
                                </div>
                            )}
                        </div>
                    </div>

                    {isEditMode && (
                        <div className="bg-slate-900/80 rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-black text-emerald-400 flex items-center gap-2 border-b border-slate-700 pb-4">
                                <BookOpen size={24} /> 해설 및 채점 기준 수정
                            </h3>
                            
                            {/* 🔴 [업그레이드된 UI] 해설 이미지 추가 버튼과 이미지 목록 통합 */}
                            <div className="mb-6" onPaste={handlePasteAnswerImage}>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-bold text-slate-400">
                                        Answer Images (해설 이미지) <span className="text-[10px] text-emerald-500/70 font-normal ml-2">(클립보드 붙여넣기 지원 📋)</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="file" 
                                            id="add-answer-image" 
                                            multiple 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleAddAnswerImages} 
                                            disabled={isUploading}
                                        />
                                        <label 
                                            htmlFor="add-answer-image" 
                                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-lg ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                                            <span>이미지 추가</span>
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={handlePasteFromClipboard}
                                            disabled={isUploading}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all shadow-lg ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title="클립보드에 복사된 이미지를 즉시 추가합니다"
                                        >
                                            <ClipboardPaste size={14} className="text-emerald-400" />
                                            <span>클립보드 붙여넣기</span>
                                        </button>
                                    </div>
                                </div>
                                
                                {localAnswerImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {localAnswerImages.map((url, idx) => (
                                            <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40 group/img">
                                                <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in hover:scale-105 transition-all duration-300" onClick={() => setZoomImage(url)} />
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteImage('answer', url); }}
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                    className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-500 text-white p-3 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center"
                                                    aria-label="Delete answer image"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-black/20 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm font-bold">
                                        등록된 해설 이미지가 없습니다. 우측 상단의 버튼을 눌러 추가하세요.
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-400 mb-2 block">Model Answer (정답 해설)</label>
                                <textarea 
                                    value={editedAnswer}
                                    onChange={(e) => setEditedAnswer(e.target.value)}
                                    onPaste={handlePasteAnswerImage}
                                    className="w-full min-h-[200px] bg-black/40 border-2 border-emerald-500/50 rounded-2xl p-4 text-emerald-50/90 text-lg font-black tracking-tight outline-none focus:border-emerald-400 transition-all resize-y shadow-inner"
                                    placeholder="해설 내용을 수정하세요... (클립보드 이미지를 여기에 붙여넣어 추가할 수도 있습니다 📋)"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-black/20 p-6 rounded-2xl border border-slate-800">
                                    <label className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Target size={14} /> Mandatory Terms
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {editedTerms.map((t, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg">
                                                {t} 
                                                <button onClick={() => setEditedTerms(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-200 bg-black/20 rounded-full p-0.5"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newTerm}
                                            onChange={(e) => setNewTerm(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') addTerm(); }}
                                            placeholder="새 키워드 입력 후 Enter" 
                                            className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                        />
                                        <button onClick={addTerm} className="px-4 py-2 bg-slate-800 hover:bg-emerald-600 text-white rounded-xl font-black transition-all">추가</button>
                                    </div>
                                </div>

                                <div className="bg-black/20 p-6 rounded-2xl border border-slate-800">
                                    <label className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Calculator size={14} /> Mandatory Numbers
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {editedNumbers.map((n, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg">
                                                {n} 
                                                <button onClick={() => setEditedNumbers(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-200 bg-black/20 rounded-full p-0.5"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newNumber}
                                            onChange={(e) => setNewNumber(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') addNumber(); }}
                                            placeholder="새 수치 입력 후 Enter" 
                                            className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <button onClick={addNumber} className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white rounded-xl font-black transition-all">추가</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditMode && !showAnswer && !isOverlayMode && (
                        <div className="bg-slate-950/80 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 focus-within:border-blue-500/50 transition-all relative group animate-in fade-in">
                            <div className="bg-black/40 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                                <div className="flex gap-3">
                                    <button onClick={() => { setInputMode('text'); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Type size={14} /> TEXT</button>
                                    <button onClick={() => { setInputMode('draw'); setPenColor('#FFFFFF'); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><PenTool size={14} /> DRAW</button>
                                </div>
                            </div>
                            
                            <div className="relative w-full h-[500px] bg-slate-900 overflow-hidden"> 
                                <div className="absolute inset-0 z-0 bg-grid-white/[0.02]" style={{ backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)' }} />
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 서술하세요..." className="w-full h-full p-8 text-white text-xl font-bold leading-relaxed outline-none resize-none border-none placeholder:text-white/20 shadow-inner bg-transparent relative z-10" spellCheck="false" />
                                ) : (
                                    <>
                                        <div className="absolute inset-0 z-10">
                                            <SharedCanvas ref={canvasRef} penColor={penColor} lineWidth={lineWidth} isEraserMode={isEraserMode} />
                                        </div>
                                        
                                        <DrawingToolbar 
                                            penColor={penColor} 
                                            setPenColor={setPenColor} 
                                            lineWidth={lineWidth} 
                                            setLineWidth={setLineWidth} 
                                            isEraserMode={isEraserMode} 
                                            setIsEraserMode={setIsEraserMode} 
                                            clearCurrentCanvas={clearCurrentCanvas} 
                                        />
                                    </>
                                )}
                                
                                <div className="absolute bottom-8 right-8 z-[300] flex gap-3">
                                    <button 
                                        onClick={handleShowAnswerDirectly} 
                                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-4 rounded-[1.5rem] font-black border border-slate-700 shadow-xl transition-all transform active:scale-95 pointer-events-auto"
                                    >
                                        해설 바로가기
                                    </button>
                                    <button onClick={handleSubmit} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.5rem] font-black shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 pointer-events-auto"><Check size={24} /> {inputMode === 'draw' ? '정답 확인' : '제출하기'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditMode && showAnswer && gradingResult && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700 pb-32">
                            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl gap-8">
                                <div className="flex items-center gap-6">
                                    <div className={`p-5 rounded-3xl ${gradingResult.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-amber-500/20 text-amber-500'}`}>
                                        {gradingResult.percentage >= 70 ? <Trophy size={48} /> : <RefreshCcw size={48} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Learning Accuracy</p>
                                        <p className={`text-5xl font-black ${gradingResult.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {gradingResult.percentage}%
                                        </p>
                                    </div>
                                </div>
                                <button onClick={handleNext} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-slate-700 shadow-xl active:scale-95">다음 학습 <ChevronRight size={24} /></button>
                            </div>

                            <div 
                                ref={containerRef}
                                className="flex flex-col lg:flex-row gap-4 lg:gap-0 lg:relative items-stretch min-h-[500px]"
                            >
                                <div 
                                    ref={leftPanelRef}
                                    style={{ flexBasis: isLargeScreen ? `${splitRatio}%` : 'auto' }}
                                    className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 shadow-2xl flex flex-col transition-all duration-75"
                                >
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-white font-black flex items-center gap-3 text-xl"><CheckCircle2 size={28} className="text-blue-500" /> 나의 답안 분석</h3>
                                        {!isRetrying && inputMode === 'text' && (
                                            <button 
                                                onClick={() => setIsRetrying(true)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-blue-500/20 text-blue-400 text-xs font-black rounded-xl transition-all border border-white/5"
                                            >
                                                <Edit3 size={14} /> 수정하기
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 p-8 bg-black/40 rounded-3xl border border-white/5 shadow-inner relative">
                                        {isRetrying ? (
                                            <div className="flex flex-col h-full gap-5">
                                                <textarea 
                                                    ref={textareaRef} 
                                                    value={userAnswer} 
                                                    onChange={(e) => setUserAnswer(e.target.value)} 
                                                    className="w-full flex-1 bg-slate-900 p-6 rounded-2xl border-2 border-blue-500/30 outline-none resize-none text-white text-lg font-bold shadow-xl" 
                                                    autoFocus 
                                                />
                                                <div className="flex gap-3">
                                                    <button onClick={() => setIsRetrying(false)} className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all active:scale-95 border border-white/5">취소</button>
                                                    <button onClick={handleRetrySubmit} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                                        <RefreshCw size={18} /> 재채점 실시
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            userAnswer?.startsWith('data:image') ? (
                                                <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-transparent rounded-2xl border border-white/10 p-2 shadow-sm">
                                                    <img src={userAnswer} alt="나의 답안 이미지" className="max-w-full max-h-[400px] object-contain rounded-xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                                                </div>
                                            ) : (
                                                <HighlightedUserAnswer />
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* 세로 조절 스플리터 바 */}
                                <div 
                                    onMouseDown={handleSplitMouseDown}
                                    onTouchStart={handleSplitTouchStart}
                                    className="hidden lg:flex items-center justify-center w-6 cursor-col-resize group/splitter select-none relative z-30 flex-shrink-0"
                                >
                                    <div className="w-1 h-32 rounded-full bg-slate-800 group-hover/splitter:bg-blue-500/50 transition-colors" />
                                    <div className="absolute w-2 h-6 flex flex-col justify-between items-center pointer-events-none">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover/splitter:bg-blue-400" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover/splitter:bg-blue-400" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover/splitter:bg-blue-400" />
                                    </div>
                                </div>

                                <div 
                                    ref={rightPanelRef}
                                    style={{ flexBasis: isLargeScreen ? `${100 - splitRatio}%` : 'auto', flexGrow: 1 }}
                                    className="space-y-8 flex flex-col transition-all duration-75"
                                >
                                    <div 
                                        className="bg-emerald-950/20 rounded-[2.5rem] p-10 border border-emerald-900/50 shadow-2xl relative group/answer overflow-hidden transition-all duration-500 cursor-pointer"
                                        onClick={() => isRetrying && setIsPeek(!isPeek)}
                                    >
                                        
                                        {/* 블라인드 모드 가림막 (isRetrying일 때만 활성화) */}
                                        {isRetrying && (
                                            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl transition-all duration-500 pointer-events-none ${isPeek ? 'opacity-0' : 'opacity-100 group-hover/answer:opacity-0'}`}>
                                                <EyeOff size={48} className="text-emerald-500/40 mb-4 animate-pulse" />
                                                <p className="text-emerald-400 font-black text-xl tracking-tight">Blind Typing Mode</p>
                                                <p className="text-emerald-500/70 text-sm font-bold mt-3 bg-emerald-950/50 px-4 py-2 rounded-full shadow-lg">가볍게 터치하거나 마우스를 올리면 정답이 보입니다 💡</p>
                                            </div>
                                        )}

                                        <div className={`relative z-10 transition-all duration-500 ${isRetrying ? (isPeek ? 'blur-none opacity-100 select-text' : 'blur-md opacity-20 group-hover/answer:blur-none group-hover/answer:opacity-100 select-none') : ''}`}>
                                            <h3 className="text-emerald-400 font-black text-xl mb-8 flex items-center gap-3"><BookOpen size={30} /> Model Answer</h3>
                                            {localAnswerImages.length > 0 && (
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    {localAnswerImages.map((url, idx) => (
                                                        <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40 group/img">
                                                            <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-all duration-500" onClick={(e) => { e.stopPropagation(); setZoomImage(url); }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="max-w-none select-text mt-4">
                                                {renderModelAnswer(currentProblem.modelAnswer)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {!gradingResult.manualGradingRequired && (
                                        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-right-4 duration-700">
                                            <div className="p-6 bg-emerald-950/10 rounded-3xl border border-emerald-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} /> Mandatory Terms (40%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedTerms.map(t => <span key={t} className={`px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/30`}>{t}</span>)}
                                                    {gradingResult.missingTerms.map(t => <span key={t} className={`px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50`}>{t}</span>)}
                                                </div>
                                            </div>
                                            <div className="p-6 bg-blue-950/10 rounded-3xl border border-blue-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14} /> Mandatory Numbers (60%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedNumbers.map(n => <span key={n} className={`px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-950/30`}>{n}</span>)}
                                                    {gradingResult.missingNumbers.map(n => <span key={n} className={`px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50`}>{n}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isOverlayMode && (
                <div className="fixed inset-0 z-[100] pointer-events-auto bg-transparent border-4 border-amber-500/30 animate-in fade-in">
                    <div className="absolute inset-0">
                        <SharedCanvas 
                            ref={overlayCanvasRef} 
                            penColor={penColor}
                            lineWidth={lineWidth}
                            isEraserMode={isEraserMode}
                            className="bg-transparent"
                        />
                    </div>
                    <DrawingToolbar 
                        penColor={penColor} 
                        setPenColor={setPenColor} 
                        lineWidth={lineWidth} 
                        setLineWidth={setLineWidth} 
                        isEraserMode={isEraserMode} 
                        setIsEraserMode={setIsEraserMode} 
                        clearCurrentCanvas={clearCurrentCanvas} 
                        onClose={() => setIsOverlayMode(false)} 
                    />
                </div>
            )}

            {zoomImage && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-zoom-out" 
                    onClick={() => setZoomImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 md:top-10 md:right-10 text-white/60 hover:text-white bg-black/50 hover:bg-red-500/80 p-3 rounded-full transition-all z-50 shadow-2xl"
                        onClick={() => setZoomImage(null)}
                    >
                        <X size={28} />
                    </button>
                    
                    <img 
                        src={zoomImage} 
                        alt="Zoomed" 
                        className="max-w-full max-h-[95vh] object-contain shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300" 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            setZoomImage(null); 
                        }} 
                    />
                </div>
            )}

            {confirmModal.isOpen && (
                <div 
                    className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => {
                        if (confirmModal.onCancel) confirmModal.onCancel();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                >
                    <div 
                        className="w-full max-w-sm bg-slate-900/95 border-2 border-slate-800/80 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl shrink-0 mt-0.5">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-white">{confirmModal.title}</h3>
                                <p className="text-sm text-slate-400 font-bold leading-relaxed">{confirmModal.message}</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end pt-2">
                            <button 
                                onClick={() => {
                                    if (confirmModal.onCancel) confirmModal.onCancel();
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all"
                            >
                                취소
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                }}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isEditMode && showAnswer && (
                <AudioStudyPlayer 
                    currentProblem={currentProblem}
                    onNext={(keep) => handleNext(keep === true)}
                    onPrev={(keep) => handlePrev(keep === true)}
                    isFirst={isDescending ? currentIndex === problems.length - 1 : currentIndex === 0}
                    isLast={isDescending ? currentIndex === 0 : currentIndex === problems.length - 1}
                />
            )}
        </div>
    );
}


