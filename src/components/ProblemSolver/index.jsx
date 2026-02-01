import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp } from 'firebase/firestore'; 
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { updateProblemResult, updateProblemMemo, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen, CheckCircle2 as OIcon,
    RefreshCw, Plus, Link, Target, Calculator, Highlighter, Sparkles
} from 'lucide-react';

import { SUBJECT_LIST, PROBLEM_TYPES } from '/src/utils/constants';

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete, onEditProblem }) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); 
    const [userAnswer, setUserAnswer] = useState('');
    const [gradingResult, setGradingResult] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);
    const [showMemo, setShowMemo] = useState(false);
    const [memoText, setMemoText] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);

    const canvasRef = useRef(null);        
    const overlayCanvasRef = useRef(null); 
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);
    const activePointerId = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const p = problems && problems[currentIndex];
        if (p) {
            const rootNumbers = Array.isArray(p.numbers) ? p.numbers : [];
            const dbNumbers = p.gradingPoints?.mandatory_numbers || [];
            const mergedNumbers = Array.from(new Set([...rootNumbers, ...dbNumbers]))
                .map(n => String(n).trim())
                .filter(n => n !== "" && n !== "null" && n !== "undefined");

            const rootKeywords = Array.isArray(p.keywords) ? p.keywords : [];
            const dbTerms = p.gradingPoints?.mandatory_terms || [];
            const mergedTerms = Array.from(new Set([...rootKeywords, ...dbTerms]))
                .map(t => String(t).trim())
                .filter(t => t !== "");

            setCurrentProblem({
                ...p,
                gradingPoints: {
                    mandatory_terms: mergedTerms,
                    mandatory_numbers: mergedNumbers
                },
                question: p.content || p.question || '',
                modelAnswer: p.answer || p.modelAnswer || ''
            });

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

    const startDrawing = (e) => {
        e.preventDefault(); if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        activePointerId.current = e.pointerId;
        const ctx = e.target.getContext('2d');
        const rect = e.target.getBoundingClientRect();
        ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };
    const draw = (e) => {
        e.preventDefault(); if (!isDrawing || e.pointerId !== activePointerId.current) return;
        const ctx = e.target.getContext('2d');
        const rect = e.target.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
    };
    const stopDrawing = (e) => { if (e.pointerId === activePointerId.current) { setIsDrawing(false); activePointerId.current = null; } };
    const clearCurrentCanvas = () => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) activeCanvas.getContext('2d').clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    };

    const analyzeAnswer = () => {
        if (!currentProblem) return null;
        const terms = currentProblem.gradingPoints?.mandatory_terms || [];
        const numbers = currentProblem.gradingPoints?.mandatory_numbers || [];
        if (inputMode === 'draw' || !userAnswer.trim()) {
            return { percentage: 0, matchedTerms: [], matchedNumbers: [], missingTerms: terms, missingNumbers: numbers, manualGradingRequired: true };
        }
        const normalize = (text) => String(text).replace(/\s+/g, '').toLowerCase();
        const normalizedInput = normalize(userAnswer);
        const matchedTerms = terms.filter(t => normalizedInput.includes(normalize(t)));
        const matchedNumbers = numbers.filter(n => normalizedInput.includes(normalize(n)));
        let finalScore = 0;
        if (terms.length > 0 && numbers.length > 0) finalScore = (matchedTerms.length/terms.length * 40) + (matchedNumbers.length/numbers.length * 60);
        else if (terms.length > 0) finalScore = (matchedTerms.length/terms.length * 100);
        else if (numbers.length > 0) finalScore = (matchedNumbers.length/numbers.length * 100);
        return { percentage: Math.round(finalScore), matchedTerms, matchedNumbers, missingTerms: terms.filter(t => !matchedTerms.includes(t)), missingNumbers: numbers.filter(n => !matchedNumbers.includes(n)), manualGradingRequired: (terms.length === 0 && numbers.length === 0) };
    };

    const handleNext = () => {
        if (currentIndex < problems.length - 1) setCurrentIndex(prev => prev + 1);
        else onComplete();
    };

    const handleSubmit = async () => {
        const res = analyzeAnswer();
        setGradingResult(res); setShowAnswer(true);
        if (inputMode === 'text' && userAnswer.trim() && !res.manualGradingRequired) {
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
            alert("메모 저장 완료! 📝");
        } catch (e) { alert("메모 저장 실패"); }
    };

    const handleDeleteImage = async (type, imageUrl) => {
        if (!window.confirm("삭제하시겠습니까?")) return;
        try {
            const fileRef = ref(storage, imageUrl);
            await deleteObject(fileRef);
            const docRef = doc(db, "workbook", currentProblem.id);
            if (type === 'problem') {
                await updateDoc(docRef, { images: arrayRemove(imageUrl) });
                setLocalProblemImages(prev => prev.filter(url => url !== imageUrl));
            } else {
                await updateDoc(docRef, { answerImages: arrayRemove(imageUrl) });
                setLocalAnswerImages(prev => prev.filter(url => url !== imageUrl));
            }
        } catch (e) { alert("삭제 실패"); }
    };

    const HighlightedUserAnswer = () => {
        if (!gradingResult) return <p className="text-slate-700 whitespace-pre-wrap">{userAnswer}</p>;
        const allMatched = [...gradingResult.matchedTerms, ...gradingResult.matchedNumbers];
        if (allMatched.length === 0) return <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg">{userAnswer}</p>;
        const pattern = new RegExp(`(${allMatched.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
        const parts = userAnswer.split(pattern);
        return (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg font-medium">
                {parts.map((part, i) => {
                    const isTerm = gradingResult.matchedTerms.includes(part);
                    const isNum = gradingResult.matchedNumbers.includes(part);
                    if (isTerm || isNum) return <span key={i} className={`font-black px-1.5 rounded mx-0.5 border ${isTerm ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-blue-700 bg-blue-100 border-blue-200'}`}>{part}</span>;
                    return part;
                })}
            </p>
        );
    };

    if (!currentProblem) return <div className="p-10 text-center text-white font-black animate-pulse">FireSight Data Hydrating...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"><ArrowLeft size={18} /> 목록</button>
                    <button onClick={() => setIsOverlayMode(!isOverlayMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${isOverlayMode ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Pen size={14} /> {isOverlayMode ? "연습장 끄기" : "연습장 모드"}
                    </button>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setShowMemo(!showMemo)} className={`p-2.5 rounded-xl transition-all ${showMemo ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><StickyNote size={20} /></button>
                    <button onClick={() => onEditProblem(currentProblem)} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-800 transition-all hover:text-blue-400"><Edit3 size={20} /></button>
                    <button onClick={() => {if(window.confirm("삭제하시겠습니까?")) { deleteProblem(currentProblem.id); onBack(); }}} className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/20"><Trash2 size={20} /></button>
                </div>
            </div>

            {showMemo && (
                <div className="max-w-4xl mx-auto w-full px-4 md:px-8 mt-4 animate-in slide-in-from-top-4 duration-500 z-20">
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
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-8 leading-tight tracking-tight break-keep">{currentProblem.title}</h1>
                        {localProblemImages.length > 0 && (
                            <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={() => {}} />
                        )}
                        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-relaxed text-lg font-medium mt-6">{currentProblem.question}</div>
                    </div>

                    {!showAnswer && !isOverlayMode && (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-800 focus-within:border-blue-500 transition-all relative group">
                            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex gap-3">
                                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><Type size={14} /> TEXT</button>
                                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><PenTool size={14} /> DRAW</button>
                                </div>
                            </div>
                            <div className="relative w-full h-[450px] bg-white"> 
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 서술하세요..." className="w-full h-full p-8 text-slate-900 text-xl font-bold leading-relaxed outline-none resize-none border-none placeholder:text-slate-300 shadow-inner" spellCheck="false" />
                                ) : (
                                    <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full bg-slate-50 touch-none" />
                                )}
                            </div>
                            <div className="absolute bottom-8 right-8 z-50">
                                <button onClick={handleSubmit} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.5rem] font-black shadow-2xl transition-all transform active:scale-95 group-hover:scale-105"><Check size={24} /> 제출하기</button>
                            </div>
                        </div>
                    )}

                    {showAnswer && gradingResult && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700 pb-32">
                            {/* Grading Header */}
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

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* [🔴 핵심 수정] 나의 답안 분석 섹션 (수정/재채점 버튼 복구) */}
                                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-2xl h-full flex flex-col min-h-[500px]">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-slate-900 font-black flex items-center gap-3 text-xl"><CheckCircle2 size={28} className="text-blue-600" /> 나의 답안 분석</h3>
                                        {!isRetrying && inputMode === 'text' && (
                                            <button 
                                                onClick={() => setIsRetrying(true)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-blue-50 text-blue-600 text-xs font-black rounded-xl transition-all"
                                            >
                                                <Edit3 size={14} /> 수정하기
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner relative">
                                        {isRetrying ? (
                                            <div className="flex flex-col h-full gap-5">
                                                <textarea 
                                                    ref={textareaRef} 
                                                    value={userAnswer} 
                                                    onChange={(e) => setUserAnswer(e.target.value)} 
                                                    className="w-full flex-1 bg-white p-6 rounded-2xl border-2 border-blue-500/30 outline-none resize-none text-slate-900 text-lg font-bold shadow-xl" 
                                                    autoFocus 
                                                />
                                                <div className="flex gap-3">
                                                    <button onClick={() => setIsRetrying(false)} className="flex-1 py-4 bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95">취소</button>
                                                    <button onClick={handleRetrySubmit} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                                        <RefreshCw size={18} /> 재채점 실시
                                                    </button>
                                                </div>
                                            </div>
                                        ) : <HighlightedUserAnswer />}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-emerald-950/20 rounded-[2.5rem] p-10 border border-emerald-900/50 shadow-2xl relative group/answer">
                                        <h3 className="text-emerald-400 font-black text-xl mb-8 flex items-center gap-3"><BookOpen size={30} /> Model Answer</h3>
                                        {localAnswerImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                {localAnswerImages.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40 group/img">
                                                        <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-all duration-500" onClick={() => setZoomImage(url)} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="prose prose-invert max-w-none text-emerald-50/90 whitespace-pre-line leading-relaxed text-lg font-black tracking-tight select-text">
                                            {currentProblem.modelAnswer || "해설이 등록되지 않았습니다."}
                                        </div>
                                    </div>
                                    
                                    {!gradingResult.manualGradingRequired && (
                                        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-right-4 duration-700">
                                            <div className="p-6 bg-emerald-950/10 rounded-3xl border border-emerald-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} /> Mandatory Terms (40%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedTerms.map(t => <span key={t} className="px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/30">{t}</span>)}
                                                    {gradingResult.missingTerms.map(t => <span key={t} className="px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50">{t}</span>)}
                                                </div>
                                            </div>
                                            <div className="p-6 bg-blue-950/10 rounded-3xl border border-blue-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14} /> Mandatory Numbers (60%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedNumbers.map(n => <span key={n} className={`px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-950/30`}>{n}</span>)}
                                                    {gradingResult.missingNumbers.map(n => <span key={n} className="px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50">{n}</span>)}
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

            {zoomImage && (
                <div className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomImage(null)}>
                    <img src={zoomImage} alt="Zoomed" className="max-w-full max-h-[95vh] object-contain shadow-2xl animate-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

function ImageCarousel({ images, onZoom, onDelete }) {
    const [index, setIndex] = useState(0);
    const next = () => setIndex((i) => (i + 1) % images.length);
    const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
    if (!images || images.length === 0) return null;
    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-video bg-black/80 rounded-[2rem] overflow-hidden border-2 border-slate-800 group/carousel shadow-2xl select-none">
            <img src={images[index]} alt="Problem" className="w-full h-full object-contain cursor-zoom-in" onClick={() => onZoom(images[index])} />
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur px-4 py-2 rounded-xl text-white text-[10px] font-black tracking-widest flex items-center gap-2 pointer-events-none border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 size={14} /> TAP TO ENLARGE</div>
            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-emerald-500 text-white p-4 rounded-full transition-all opacity-0 group-hover:opacity-100 border border-white/5"><ChevronLeft size={32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-emerald-500 text-white p-4 rounded-full transition-all opacity-0 group-hover:opacity-100 border border-white/5"><ChevronRight size={32} /></button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl px-6 py-2 rounded-full text-emerald-400 text-xs font-black border border-emerald-500/20 shadow-2xl tracking-widest">{index + 1} / {images.length}</div>
                </>
            )}
        </div>
    );
}
