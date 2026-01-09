import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen, CheckCircle2 as OIcon,
    RefreshCw 
} from 'lucide-react';

// [설정] 과목 카테고리 리스트
const SUBJECT_LIST = ['수계', '가스계', '제연', '전기', '법규', '기타', '설계', '점검'];

// [설정] 문제 유형 리스트
const PROBLEM_TYPES = [
    { value: 'descriptive', label: '서술형' },
    { value: 'selection', label: '단답형' },
    { value: 'drawing', label: '도면' },
    { value: 'calculation', label: '계산' }
];

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete }) {
    // --- 상태 관리 ---
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    
    // UI 상태
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); 
    const [userAnswer, setUserAnswer] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [showMemo, setShowMemo] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [memoText, setMemoText] = useState('');
    
    // 답안 수정(다시 쓰기) 모드 상태
    const [isRetrying, setIsRetrying] = useState(false);

    // 채점 결과 상태
    const [gradingResult, setGradingResult] = useState(null);

    // 전체 화면 연습장 모드 상태
    const [isOverlayMode, setIsOverlayMode] = useState(false);

    // 로컬 이미지 상태
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);

    // 드로잉 관련 Ref
    const canvasRef = useRef(null);        
    const overlayCanvasRef = useRef(null); 
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);

    // [추가] 재채점 입력창 자동 높이 조절용 Ref
    const textareaRef = useRef(null);

    const activePointerId = useRef(null);

    // --- 초기화 ---
    useEffect(() => {
        const p = problems && problems[currentIndex];
        if (p) {
            setCurrentProblem(p);
            setLocalProblemImages(p.images || []);
            setLocalAnswerImages(p.answerImages || []);
            setMemoText(p.memo || '');
            setUserAnswer('');
            setShowAnswer(false);
            setShowMemo(false);
            setIsEditMode(false);
            setIsOverlayMode(false);
            setGradingResult(null);
            setIsRetrying(false); 
            
            if (p.problemType === 'drawing' || p.problemType === 'calculation') {
                setInputMode('draw');
            } else {
                setInputMode('text');
            }
            document.querySelector('.problem-container')?.scrollTo(0, 0);
        }
    }, [currentIndex, problems]);

    // [추가] 재채점 시 텍스트 양에 따라 입력창 높이 자동 조절
    useEffect(() => {
        if (isRetrying && textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // 높이 초기화
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // 내용에 맞춰 늘리기
        }
    }, [userAnswer, isRetrying]);

    // 🔴 [iOS 선택 방지 1] 글로벌 스타일
    useEffect(() => {
        if (isOverlayMode) {
            const style = document.createElement('style');
            style.id = 'drawing-mode-lock';
            style.innerHTML = `*{-webkit-touch-callout:none!important;-webkit-user-select:none!important;user-select:none!important;touch-action:none!important;}`;
            document.head.appendChild(style);
            document.body.style.overflow = 'hidden';
        } else {
            const style = document.getElementById('drawing-mode-lock');
            if (style) style.remove();
            document.body.style.overflow = '';
        }
        return () => {
            const style = document.getElementById('drawing-mode-lock');
            if (style) style.remove();
            document.body.style.overflow = '';
        };
    }, [isOverlayMode]);

    // 🔴 [iOS 선택 방지 2] Native Event Listener
    useEffect(() => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : (inputMode === 'draw' ? canvasRef.current : null);
        if (!activeCanvas) return;

        const preventAll = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
        };

        const options = { passive: false };
        ['touchstart','touchmove','touchend','touchcancel','click','dblclick','selectstart','contextmenu'].forEach(evt => {
            activeCanvas.addEventListener(evt, preventAll, options);
        });

        return () => {
            ['touchstart','touchmove','touchend','touchcancel','click','dblclick','selectstart','contextmenu'].forEach(evt => {
                activeCanvas.removeEventListener(evt, preventAll, options);
            });
        };
    }, [isOverlayMode, inputMode]);

    // --- 캔버스 사이즈 조정 ---
    useEffect(() => {
        if (inputMode === 'draw' && canvasRef.current && !isOverlayMode) {
            const canvas = canvasRef.current;
            const parent = canvas.parentElement;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = penColor;
            ctx.lineWidth = lineWidth;
        }
        if (isOverlayMode && overlayCanvasRef.current) {
            const canvas = overlayCanvasRef.current;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = penColor;
            ctx.lineWidth = lineWidth;
        }
    }, [inputMode, isOverlayMode, window.innerWidth, window.innerHeight]);

    // 펜 스타일 업데이트
    useEffect(() => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) {
            const ctx = activeCanvas.getContext('2d');
            ctx.strokeStyle = penColor;
            ctx.lineWidth = lineWidth;
        }
    }, [penColor, lineWidth, isOverlayMode, inputMode]);

    // --- 드로잉 로직 ---
    const startDrawing = (e) => {
        e.preventDefault(); 
        if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        activePointerId.current = e.pointerId;
        if (e.target.setPointerCapture) try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
        
        const ctx = e.target.getContext('2d');
        const rect = e.target.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        if (e.pointerId !== activePointerId.current) return;
        
        const ctx = e.target.getContext('2d');
        const rect = e.target.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        e.preventDefault();
        if (e.pointerId === activePointerId.current) {
            setIsDrawing(false);
            activePointerId.current = null;
            if (e.target.releasePointerCapture) try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
        }
    };
    
    const clearCurrentCanvas = () => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) {
            const ctx = activeCanvas.getContext('2d');
            ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        }
    };

    // --- 채점 로직 ---
    const analyzeAnswer = () => {
        if (!currentProblem) return null;
        const keywords = currentProblem.keywords || [];
        
        if (inputMode === 'draw' || !userAnswer.trim()) {
            return { percentage: 0, matched: [], missing: keywords, manualGradingRequired: true };
        }

        const matched = keywords.filter(keyword => 
            userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, ''))
        );
        const percentage = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;
        
        return { 
            percentage, 
            matched, 
            missing: keywords.filter(k => !matched.includes(k)), 
            manualGradingRequired: false 
        };
    };

    const handleSubmit = async () => {
        setShowAnswer(true);
        const res = analyzeAnswer();
        setGradingResult(res); 
        
        if (inputMode === 'text' && userAnswer.trim() && !res.manualGradingRequired) {
            await updateProblemResult(currentProblem.id, res.percentage);
        }
    };

    const handleRetrySubmit = async () => {
        const res = analyzeAnswer();
        setGradingResult(res); 
        setIsRetrying(false);  
        
        if (!res.manualGradingRequired) {
            await updateProblemResult(currentProblem.id, res.percentage);
        }
    };

    const handleManualGrade = async (isCorrect) => {
        const score = isCorrect ? 100 : 0;
        await updateProblemResult(currentProblem.id, score);
        if (currentIndex < problems.length - 1) setCurrentIndex(prev => prev + 1);
        else onComplete();
    };

    const handleNext = () => {
        if (currentIndex < problems.length - 1) setCurrentIndex(prev => prev + 1);
        else onComplete();
    };

    // --- 데이터 관리 ---
    const handleSaveMemo = async () => {
        await updateProblemInfo(currentProblem.id, { memo: memoText });
        setCurrentProblem(prev => ({ ...prev, memo: memoText }));
        alert("메모 저장 완료!");
    };

    const handleSaveEdit = async () => {
        try {
            const newKeywords = Array.isArray(currentProblem.keywords) 
                ? currentProblem.keywords 
                : currentProblem.keywords.split(',').map(k => k.trim());

            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                content: currentProblem.question,
                answer: currentProblem.modelAnswer,
                keywords: newKeywords,
                category: currentProblem.subject, 
                problemType: currentProblem.problemType
            });
            
            if (currentProblem.problemType === 'drawing' || currentProblem.problemType === 'calculation') {
                setInputMode('draw');
            } else {
                setInputMode('text');
            }

            setIsEditMode(false);
            alert("수정 완료! ✅");
        } catch (e) { alert("수정 실패"); }
    };

    const handleDeleteProblem = async () => {
        if (window.confirm("이 문제를 삭제하시겠습니까?")) {
            await deleteProblem(currentProblem.id);
            alert("삭제되었습니다.");
            onBack();
        }
    };

    const handleDeleteImage = async (type, imageUrl) => {
        if (!window.confirm("이 이미지를 삭제하시겠습니까?")) return;
        try {
            const fileRef = ref(storage, imageUrl);
            await deleteObject(fileRef).catch(e => console.warn(e));
            const docRef = doc(db, "workbook", currentProblem.id);
            if (type === 'problem') {
                await updateDoc(docRef, { images: arrayRemove(imageUrl) });
                setLocalProblemImages(prev => prev.filter(url => url !== imageUrl));
            } else {
                await updateDoc(docRef, { answerImages: arrayRemove(imageUrl) });
                setLocalAnswerImages(prev => prev.filter(url => url !== imageUrl));
            }
            alert("삭제되었습니다.");
        } catch (e) { alert("삭제 오류"); }
    };

    const HighlightedUserAnswer = () => {
        if (!gradingResult || gradingResult.matched.length === 0) return <p className="text-slate-700 whitespace-pre-wrap break-words">{userAnswer}</p>;
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(${gradingResult.matched.map(escapeRegExp).join('|')})`, 'g');
        const parts = userAnswer.split(pattern);
        return (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed break-words text-lg">
                {parts.map((part, i) => {
                    if (gradingResult.matched.includes(part)) {
                        return <span key={i} className="text-emerald-600 font-bold bg-emerald-100 px-1 rounded mx-0.5 border border-emerald-200">{part}</span>;
                    }
                    return part;
                })}
            </p>
        );
    };

    if (!currentProblem) return <div className="p-10 text-center text-white">로딩 중...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold">
                    <ArrowLeft size={18} /> 목록
                </button>
                <button 
                    onClick={() => setIsOverlayMode(!isOverlayMode)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${isOverlayMode ? 'bg-amber-500 border-amber-500 text-white animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                >
                    <Pen size={14} /> {isOverlayMode ? "연습장 끄기" : "연습장 모드"}
                </button>
                <div className="flex gap-2">
                    <button onClick={() => setShowMemo(!showMemo)} className={`p-2 rounded-lg ${showMemo ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><StickyNote size={18} /></button>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-lg ${isEditMode ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><Edit3 size={18} /></button>
                    <button onClick={handleDeleteProblem} className="p-2 rounded-lg text-red-400 hover:bg-slate-800"><Trash2 size={18} /></button>
                </div>
            </div>

            {/* Main Content */}
            <div className="problem-container flex-1 overflow-y-auto p-4 md:p-6 pb-40 animate-in fade-in">
                <div className="max-w-3xl mx-auto space-y-6">
                    
                    {/* 문제 카드 */}
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative">
                        {isEditMode ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex gap-2">
                                    <select value={currentProblem.subject} onChange={(e) => setCurrentProblem({...currentProblem, subject: e.target.value})} className="bg-slate-800 text-white text-sm border border-slate-700 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
                                        {SUBJECT_LIST.map(subj => <option key={subj} value={subj}>{subj}</option>)}
                                    </select>
                                    <select value={currentProblem.problemType} onChange={(e) => setCurrentProblem({...currentProblem, problemType: e.target.value})} className="bg-slate-800 text-white text-sm border border-slate-700 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500">
                                        {PROBLEM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                                    </select>
                                </div>
                                <input value={currentProblem.title} onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-bold" placeholder="제목 수정" />
                                <textarea value={currentProblem.question} onChange={(e) => setCurrentProblem({...currentProblem, question: e.target.value})} className="w-full h-32 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200" placeholder="문제 내용 수정" />
                                <button onClick={handleSaveEdit} className="px-3 py-2 bg-blue-600 text-white rounded font-bold w-full flex justify-center items-center gap-1"><Save size={16} /> 저장</button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed break-keep">{currentProblem.title}</h1>
                                {localProblemImages.length > 0 && (
                                    <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={(url) => handleDeleteImage('problem', url)} />
                                )}
                                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-8 text-lg mt-4 select-text">
                                    {currentProblem.question}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 답안 입력 */}
                    {!showAnswer && !isOverlayMode && (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative">
                            {/* 탭 */}
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><Type size={14} /> 텍스트</button>
                                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}><PenTool size={14} /> 그리기</button>
                                </div>
                                {inputMode === 'draw' && (
                                    <div className="flex items-center gap-2">
                                         <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-black border ${penColor === '#000000' ? 'ring-2 ring-blue-500' : 'border-slate-300'}`} />
                                         <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-red-500 border ${penColor === '#ef4444' ? 'ring-2 ring-blue-500' : 'border-slate-300'}`} />
                                         <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-blue-500 border ${penColor === '#3b82f6' ? 'ring-2 ring-blue-500' : 'border-slate-300'}`} />
                                         <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                         <button onClick={() => {setPenColor('#ffffff'); setLineWidth(20)}} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><Eraser size={16} /></button>
                                         <button onClick={clearCurrentCanvas} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><RotateCcw size={16} /></button>
                                    </div>
                                )}
                            </div>

                            {/* 입력 영역 */}
                            <div className="relative w-full h-[400px] bg-white cursor-text select-none"> 
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 입력하세요..." className="w-full h-full p-6 pb-20 text-slate-900 text-lg outline-none resize-none placeholder:text-slate-400 select-text break-words whitespace-pre-wrap" spellCheck="false" style={{ userSelect: 'text', WebkitUserSelect: 'text' }} />
                                ) : (
                                    <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full bg-slate-50" style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', cursor: 'crosshair' }} />
                                )}
                            </div>

                            <div className="absolute bottom-4 right-4 z-50 pointer-events-auto">
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95 cursor-pointer">
                                    <Check size={18} /> {inputMode === 'draw' ? '정답 확인' : '제출'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 채점 결과 */}
                    {showAnswer && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            {gradingResult?.manualGradingRequired ? (
                                <div className="bg-slate-800 p-6 rounded-2xl text-center space-y-4 border border-slate-700">
                                    <h3 className="text-xl font-bold text-white">자가 채점</h3>
                                    <div className="flex justify-center gap-4">
                                        <button onClick={() => handleManualGrade(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-500"><OIcon size={20} /> 정답 (O)</button>
                                        <button onClick={() => handleManualGrade(false)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-500"><XCircle size={20} /> 오답 (X)</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${gradingResult?.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {gradingResult?.percentage >= 70 ? <Trophy size={32} /> : <RefreshCcw size={32} />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">일치율</p>
                                            <p className={`text-2xl font-bold ${gradingResult?.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{gradingResult?.percentage}%</p>
                                        </div>
                                    </div>
                                    <button onClick={handleNext} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">다음 <ChevronRight size={18} /></button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {inputMode === 'text' && (userAnswer.trim() || isRetrying) && (
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-slate-900 font-bold flex items-center gap-2"><CheckCircle2 size={20} className="text-blue-600" /> 나의 답안</h3>
                                            {!isRetrying && (
                                                <button 
                                                    onClick={() => setIsRetrying(true)} 
                                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors"
                                                >
                                                    <RefreshCw size={14} /> 다시 쓰기
                                                </button>
                                            )}
                                        </div>

                                        {/* 🔴 [수정됨] 재채점 시 높이 제한 해제 (max-h 제거, overflow 제거) */}
                                        <div className={`p-6 bg-slate-50 rounded-xl border border-slate-100 min-h-[300px] ${!isRetrying ? 'max-h-[600px] overflow-y-auto' : ''}`}>
                                            {isRetrying ? (
                                                <div className="flex flex-col gap-4">
                                                    <textarea 
                                                        ref={textareaRef}
                                                        value={userAnswer} 
                                                        onChange={(e) => setUserAnswer(e.target.value)} 
                                                        className="w-full bg-white p-4 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 resize-none text-slate-900 leading-relaxed overflow-hidden min-h-[200px]"
                                                        placeholder="답안을 수정해서 다시 외워보세요!"
                                                        autoFocus
                                                        rows={1}
                                                    />
                                                    <button 
                                                        onClick={handleRetrySubmit} 
                                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
                                                    >
                                                        <Check size={18} /> 재채점 하기
                                                    </button>
                                                </div>
                                            ) : (
                                                <HighlightedUserAnswer />
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className={`space-y-4 ${inputMode === 'draw' || (!userAnswer.trim() && !isRetrying) ? 'col-span-2' : ''}`}>
                                    <div className="bg-emerald-950/20 rounded-2xl p-6 border border-emerald-900/50 relative">
                                        <h3 className="text-emerald-400 font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={20} /> 모범 답안</h3>
                                        {localAnswerImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                {localAnswerImages.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-[4/3] group rounded-xl overflow-hidden border border-emerald-500/20 bg-black/40">
                                                        <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in transition-transform group-hover:scale-105" onClick={() => setZoomImage(url)} />
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteImage('answer', url); }} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isEditMode ? (
                                            <div className="space-y-3 mt-4 animate-in fade-in">
                                                <label className="text-xs font-bold text-emerald-400">모범 답안 텍스트</label>
                                                <textarea 
                                                    value={currentProblem.modelAnswer} 
                                                    onChange={(e) => setCurrentProblem({...currentProblem, modelAnswer: e.target.value})} 
                                                    className="w-full h-48 bg-emerald-900/40 border border-emerald-500/50 rounded p-3 text-emerald-100 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                                />
                                                <label className="text-xs font-bold text-emerald-400">채점 키워드 (쉼표로 구분)</label>
                                                <input 
                                                    value={Array.isArray(currentProblem.keywords) ? currentProblem.keywords.join(', ') : currentProblem.keywords} 
                                                    onChange={(e) => setCurrentProblem({...currentProblem, keywords: e.target.value.split(',').map(k => k.trim())})} 
                                                    className="w-full bg-emerald-900/40 border border-emerald-500/50 rounded p-3 text-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                                                />
                                                <button onClick={handleSaveEdit} className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"><Save size={16} /> 답안 및 키워드 저장</button>
                                            </div>
                                        ) : (
                                            <div className="prose prose-invert max-w-none text-emerald-100/90 whitespace-pre-line leading-8 text-lg font-medium select-text">{currentProblem.modelAnswer}</div>
                                        )}
                                    </div>
                                    {inputMode === 'text' && gradingResult?.missing?.length > 0 && (
                                        <div className="bg-red-900/20 rounded-2xl p-6 border border-red-500/30">
                                            <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2"><AlertTriangle size={20} /> 누락된 키워드</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {gradingResult.missing.map((kw, i) => <span key={i} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm border border-red-500/30">{kw}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 오버레이 연습장 */}
            {isOverlayMode && (
                <div className="fixed inset-0 z-[99] cursor-crosshair touch-none select-none">
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-full px-5 py-2.5 flex items-center gap-4 shadow-2xl animate-in slide-in-from-top-4 z-[100] pointer-events-auto">
                        <div className="flex gap-3">
                            <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-black border-2 ${penColor === '#000000' && lineWidth === 2 ? 'border-white scale-110' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-red-500 border-2 ${penColor === '#ef4444' && lineWidth === 2 ? 'border-white scale-110' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${penColor === '#3b82f6' && lineWidth === 2 ? 'border-white scale-110' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#f59e0b40'); setLineWidth(15)}} className={`w-6 h-6 rounded-full bg-amber-500/50 border-2 ${lineWidth === 15 ? 'border-white scale-110' : 'border-slate-600'}`} title="형광펜" />
                        </div>
                        <div className="w-px h-5 bg-slate-700"></div>
                        <button onClick={() => {setPenColor('#ffffff'); setLineWidth(20)}} className={`text-slate-400 hover:text-white p-1 ${penColor === '#ffffff' ? 'text-white scale-110' : ''}`} title="지우개"><Eraser size={20} /></button>
                        <button onClick={clearCurrentCanvas} className="text-slate-400 hover:text-white p-1" title="전체 지우기"><RotateCcw size={20} /></button>
                        <button onClick={() => setIsOverlayMode(false)} className="text-slate-400 hover:text-red-400 p-1 ml-1" title="닫기"><X size={24} /></button>
                    </div>
                    <canvas ref={overlayCanvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full" style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }} />
                </div>
            )}

            {/* 메모장 & 확대 모달 */}
            {showMemo && (
                <div className="fixed bottom-20 right-6 w-64 bg-amber-100/95 text-slate-800 p-4 rounded-xl border-l-4 border-amber-500 shadow-2xl animate-in slide-in-from-bottom-10 z-40">
                    <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><StickyNote size={16} /> 메모</h3>
                    <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} className="w-full h-32 bg-white/50 border border-amber-200 rounded p-2 text-sm resize-none" placeholder="암기 팁을 적어두세요." />
                    <button onClick={handleSaveMemo} className="mt-2 w-full py-1 bg-amber-500 text-white rounded text-sm font-bold">저장</button>
                </div>
            )}
            {zoomImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoomImage(null)}>
                    <button className="absolute top-6 right-6 text-white p-2"><X size={32} /></button>
                    <img src={zoomImage} alt="Zoom" className="max-w-full max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

// ImageCarousel 컴포넌트
function ImageCarousel({ images, onZoom, onDelete }) {
    const [index, setIndex] = useState(0);
    const next = () => setIndex((i) => (i + 1) % images.length);
    const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
    if (!images || images.length === 0) return null;
    return (
        <div className="relative w-full max-w-xl mx-auto aspect-video bg-black/50 rounded-xl overflow-hidden border border-slate-700 group mb-6 select-none">
            <img src={images[index]} alt="Problem" className="w-full h-full object-contain cursor-zoom-in" onClick={() => onZoom(images[index])} />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1 pointer-events-none"><Maximize2 size={12} /> 확대</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(images[index]); }} className="absolute top-3 right-3 bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" title="문제 이미지 삭제"><Trash2 size={18} /></button>
            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full"><ChevronLeft size={20} /></button>
                    <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full"><ChevronRight size={20} /></button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-bold">{index + 1} / {images.length}</div>
                </>
            )}
        </div>
    );
}