import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore'; 
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen, CheckCircle2 as OIcon,
    RefreshCw, Plus, Link 
} from 'lucide-react';

// 🔴 절대 경로 사용으로 빌드 에러 방지
import { SUBJECT_LIST, PROBLEM_TYPES } from '/src/utils/constants';

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete }) {
    // --- [상태 관리] ---
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); 
    const [userAnswer, setUserAnswer] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [showMemo, setShowMemo] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [memoText, setMemoText] = useState('');
    
    const [isRetrying, setIsRetrying] = useState(false);
    const [gradingResult, setGradingResult] = useState(null);
    const [isOverlayMode, setIsOverlayMode] = useState(false);

    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);

    const canvasRef = useRef(null);        
    const overlayCanvasRef = useRef(null); 
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);

    const textareaRef = useRef(null);
    const activePointerId = useRef(null);

    // --- [1. 초기화 및 문제 로드] ---
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

    // --- [2. 입력창 자동 높이 조절] ---
    useEffect(() => {
        if (isRetrying && textareaRef.current) {
            textareaRef.current.style.height = 'auto'; 
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; 
        }
    }, [userAnswer, isRetrying]);

    // --- [3. iOS 전용 터치 및 선택 방지 로직] ---
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
        };
    }, [isOverlayMode]);

    useEffect(() => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : (inputMode === 'draw' ? canvasRef.current : null);
        if (!activeCanvas) return;

        const preventAll = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
        };

        const options = { passive: false };
        const events = ['touchstart','touchmove','touchend','touchcancel','click','dblclick','selectstart','contextmenu'];
        events.forEach(evt => activeCanvas.addEventListener(evt, preventAll, options));

        return () => {
            events.forEach(evt => activeCanvas.removeEventListener(evt, preventAll, options));
        };
    }, [isOverlayMode, inputMode]);

    // --- [4. 캔버스 사이즈 및 스타일 관리] ---
    useEffect(() => {
        const updateCanvasSize = () => {
            if (inputMode === 'draw' && canvasRef.current && !isOverlayMode) {
                const canvas = canvasRef.current;
                const parent = canvas.parentElement;
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            }
            if (isOverlayMode && overlayCanvasRef.current) {
                const canvas = overlayCanvasRef.current;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                const ctx = canvas.getContext('2d');
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            }
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [inputMode, isOverlayMode]);

    useEffect(() => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) {
            const ctx = activeCanvas.getContext('2d');
            if (penColor === '#ffffff') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = 20;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = penColor;
                ctx.lineWidth = lineWidth;
            }
        }
    }, [penColor, lineWidth, isOverlayMode, inputMode]);

    // --- [5. 드로잉 핸들러 (Pointer Events)] ---
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
        if (!isDrawing || e.pointerId !== activePointerId.current) return;
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

    // --- [6. 채점 로직] ---
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
        return { percentage, matched, missing: keywords.filter(k => !matched.includes(k)), manualGradingRequired: false };
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
        if (!res.manualGradingRequired) await updateProblemResult(currentProblem.id, res.percentage);
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

    // --- [7. 데이터 저장 및 이미지 관리] ---
    const handleSaveMemo = async () => {
        await updateProblemInfo(currentProblem.id, { memo: memoText });
        setCurrentProblem(prev => ({ ...prev, memo: memoText }));
        alert("메모 저장 완료!");
    };

    const handleSaveEdit = async () => {
        try {
            const newKeywords = Array.isArray(currentProblem.keywords) 
                ? currentProblem.keywords 
                : (currentProblem.keywords || "").split(',').map(k => k.trim());

            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                content: currentProblem.question,
                answer: currentProblem.modelAnswer,
                keywords: newKeywords,
                category: currentProblem.subject, 
                problemType: currentProblem.problemType,
                source: currentProblem.source || ""
            });
            setIsEditMode(false);
            alert("수정 완료! ✅");
        } catch (e) { alert("수정 실패"); }
    };

    const handleDeleteProblem = async () => {
        if (window.confirm("문제를 삭제하시겠습니까?")) {
            await deleteProblem(currentProblem.id);
            onBack();
        }
    };

    const handleDeleteImage = async (type, imageUrl) => {
        if (!window.confirm("이미지를 삭제하시겠습니까?")) return;
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
        } catch (e) { alert("삭제 오류"); }
    };

    const handleAnswerImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentProblem) return;
        try {
            const storagePath = `workbook_images/${currentProblem.id}/answer_${Date.now()}_${file.name}`;
            const fileRef = ref(storage, storagePath);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            const docRef = doc(db, "workbook", currentProblem.id);
            await updateDoc(docRef, { answerImages: arrayUnion(downloadUrl) });
            setLocalAnswerImages(prev => [...prev, downloadUrl]);
            alert("이미지가 추가되었습니다. ✅");
        } catch (error) { alert("업로드 실패"); }
    };

    // --- [8. UI 렌더링 서브 컴포넌트] ---
    const HighlightedUserAnswer = () => {
        if (!gradingResult || gradingResult.matched.length === 0) return <p className="text-slate-700 whitespace-pre-wrap">{userAnswer}</p>;
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(${gradingResult.matched.map(escapeRegExp).join('|')})`, 'g');
        const parts = userAnswer.split(pattern);
        return (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg">
                {parts.map((part, i) => gradingResult.matched.includes(part) ? 
                    <span key={i} className="text-emerald-600 font-bold bg-emerald-100 px-1 rounded border border-emerald-200">{part}</span> : part
                )}
            </p>
        );
    };

    if (!currentProblem) return <div className="p-10 text-center text-white">로딩 중...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold"><ArrowLeft size={18} /> 목록</button>
                <button onClick={() => setIsOverlayMode(!isOverlayMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${isOverlayMode ? 'bg-amber-500 border-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Pen size={14} /> {isOverlayMode ? "연습장 끄기" : "연습장 모드"}</button>
                <div className="flex gap-2">
                    <button onClick={() => setShowMemo(!showMemo)} className={`p-2 rounded-lg transition-colors ${showMemo ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><StickyNote size={18} /></button>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-blue-600' : 'text-slate-400 hover:bg-slate-800'}`}><Edit3 size={18} /></button>
                    <button onClick={handleDeleteProblem} className="p-2 rounded-lg text-red-400 hover:bg-slate-800"><Trash2 size={18} /></button>
                </div>
            </div>

            {/* Main Content */}
            <div className="problem-container flex-1 overflow-y-auto p-4 md:p-6 pb-40 animate-in fade-in">
                <div className="max-w-3xl mx-auto space-y-6">
                    
                    {/* 문제 카드 (View/Edit) */}
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative">
                        {isEditMode ? (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <select value={currentProblem.subject} onChange={(e) => setCurrentProblem({...currentProblem, subject: e.target.value})} className="bg-slate-800 text-white text-sm border border-slate-700 rounded px-2 py-1.5 outline-none focus:border-blue-500">{SUBJECT_LIST.map(subj => <option key={subj} value={subj}>{subj}</option>)}</select>
                                    <select value={currentProblem.problemType} onChange={(e) => setCurrentProblem({...currentProblem, problemType: e.target.value})} className="bg-slate-800 text-white text-sm border border-slate-700 rounded px-2 py-1.5 outline-none focus:border-blue-500">{PROBLEM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
                                </div>
                                <input value={currentProblem.title} onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-bold" />
                                {localProblemImages.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 border-y border-slate-800 py-3">
                                        {localProblemImages.map((url, idx) => (
                                            <div key={idx} className="relative aspect-video rounded bg-black overflow-hidden group">
                                                <img src={url} className="w-full h-full object-contain" />
                                                <button onClick={() => handleDeleteImage('problem', url)} className="absolute top-1 right-1 bg-red-600 p-1 rounded shadow-lg"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <textarea value={currentProblem.question} onChange={(e) => setCurrentProblem({...currentProblem, question: e.target.value})} className="w-full h-32 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200" />
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-blue-400 flex items-center gap-1"><Link size={12} /> 출처</label>
                                    <input value={currentProblem.source || ""} onChange={(e) => setCurrentProblem({...currentProblem, source: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm" placeholder="기출 정보 등" />
                                </div>
                                <button onClick={handleSaveEdit} className="w-full py-2.5 bg-blue-600 rounded-xl font-bold flex justify-center items-center gap-2"><Save size={18} /> 저장</button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed break-keep">{currentProblem.title}</h1>
                                {localProblemImages.length > 0 && <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={(url) => handleDeleteImage('problem', url)} />}
                                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-8 text-lg mt-4 font-medium">{currentProblem.question}</div>
                            </>
                        )}
                    </div>

                    {/* 정답 제출 전 입력창 */}
                    {!showAnswer && !isOverlayMode && (
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative isolate">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><Type size={14} /> 텍스트</button>
                                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><PenTool size={14} /> 그리기</button>
                                </div>
                                {inputMode === 'draw' && (
                                    <div className="flex items-center gap-2">
                                         <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-black border ${penColor === '#000000' ? 'ring-2 ring-blue-500' : ''}`} />
                                         <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-red-500 border ${penColor === '#ef4444' ? 'ring-2 ring-blue-500' : ''}`} />
                                         <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-blue-500 border ${penColor === '#3b82f6' ? 'ring-2 ring-blue-500' : ''}`} />
                                         <button onClick={() => {setPenColor('#ffffff'); setLineWidth(20)}} className={`p-1 text-slate-500 hover:bg-slate-200 rounded ${penColor === '#ffffff' ? 'bg-slate-200 text-blue-600' : ''}`}><Eraser size={16} /></button>
                                         <button onClick={clearCurrentCanvas} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><RotateCcw size={16} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="relative w-full h-[400px] bg-white"> 
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 입력하세요..." className="w-full h-full p-6 text-slate-900 text-xl leading-relaxed outline-none resize-none border-none" spellCheck="false" />
                                ) : (
                                    <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full bg-slate-50 touch-none" />
                                )}
                            </div>
                            <div className="absolute bottom-6 right-6 z-50">
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold shadow-2xl transition-all transform active:scale-95"><Check size={20} /> 제출 하기</button>
                            </div>
                        </div>
                    )}

                    {/* 채점 결과 영역 */}
                    {showAnswer && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
                            {gradingResult?.manualGradingRequired ? (
                                <div className="bg-slate-800/80 backdrop-blur p-6 rounded-3xl text-center space-y-4 border border-slate-700 shadow-xl">
                                    <h3 className="text-xl font-bold text-white">직접 채점해 주세요</h3>
                                    <div className="flex justify-center gap-4">
                                        <button onClick={() => handleManualGrade(true)} className="px-8 py-3.5 bg-emerald-600 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"><OIcon size={20} /> 정답 (O)</button>
                                        <button onClick={() => handleManualGrade(false)} className="px-8 py-3.5 bg-red-600 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"><XCircle size={20} /> 오답 (X)</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur p-6 rounded-3xl border border-slate-700 shadow-xl">
                                    <div className="flex items-center gap-5">
                                        <div className={`p-4 rounded-2xl ${gradingResult?.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}><Trophy size={40} /></div>
                                        <div><p className="text-sm font-bold text-slate-500 uppercase tracking-widest">일치율</p><p className={`text-4xl font-black ${gradingResult?.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{gradingResult?.percentage}%</p></div>
                                    </div>
                                    <button onClick={handleNext} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all">다음 문제 <ChevronRight size={20} /></button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                {inputMode === 'text' && (userAnswer.trim() || isRetrying) && (
                                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl h-fit">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-slate-900 font-black flex items-center gap-2"><CheckCircle2 size={22} className="text-blue-600" /> 나의 답안</h3>
                                            {!isRetrying && <button onClick={() => setIsRetrying(true)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl flex items-center gap-1 font-bold transition-all shadow-sm"><RefreshCw size={14} /> 다시 쓰기</button>}
                                        </div>
                                        <div className={`p-6 bg-slate-50 rounded-2xl border border-slate-100 min-h-[300px] ${!isRetrying ? 'max-h-[600px] overflow-y-auto' : ''}`}>
                                            {isRetrying ? (
                                                <div className="flex flex-col gap-4">
                                                    <textarea ref={textareaRef} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} className="w-full bg-white p-4 rounded-xl border-2 border-slate-200 outline-none resize-none text-slate-900 text-lg leading-relaxed overflow-hidden min-h-[200px]" autoFocus rows={1} />
                                                    <button onClick={handleRetrySubmit} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl transition-transform active:scale-95">재채점 하기</button>
                                                </div>
                                            ) : <HighlightedUserAnswer />}
                                        </div>
                                    </div>
                                )}

                                <div className={`space-y-4 ${inputMode === 'draw' || (!userAnswer.trim() && !isRetrying) ? 'col-span-2' : ''}`}>
                                    <div className="bg-emerald-950/20 rounded-3xl p-6 border border-emerald-900/50 relative shadow-lg">
                                        <h3 className="text-emerald-400 font-black text-xl mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2"><BookOpen size={24} /> 모범 답안</div>
                                            {isEditMode && <label className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg"><Plus size={16} /> 이미지 추가<input type="file" accept="image/*" className="hidden" onChange={handleAnswerImageUpload} /></label>}
                                        </h3>
                                        {!isEditMode && currentProblem.source && <div className="mb-4 flex items-center gap-2 text-xs font-black text-emerald-500/80 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-sm"><Link size={12} /> 출처: {currentProblem.source}</div>}
                                        {localAnswerImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                {localAnswerImages.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-[4/3] group rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40"><img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-all" onClick={() => setZoomImage(url)} /><button onClick={(e) => { e.stopPropagation(); handleDeleteImage('answer', url); }} className="absolute top-2 right-2 bg-red-600 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button></div>
                                                ))}
                                            </div>
                                        )}
                                        {isEditMode ? (
                                            <div className="space-y-4 mt-4 animate-in fade-in">
                                                <textarea value={currentProblem.modelAnswer} onChange={(e) => setCurrentProblem({...currentProblem, modelAnswer: e.target.value})} className="w-full h-48 bg-emerald-900/30 border-2 border-emerald-500/30 rounded-2xl p-4 text-emerald-50 text-lg leading-relaxed outline-none focus:border-emerald-500" />
                                                <input value={Array.isArray(currentProblem.keywords) ? currentProblem.keywords.join(', ') : currentProblem.keywords} onChange={(e) => setCurrentProblem({...currentProblem, keywords: e.target.value.split(',').map(k => k.trim())})} className="w-full bg-emerald-900/30 border-2 border-emerald-500/30 rounded-2xl p-4 text-emerald-50 text-base" placeholder="키워드 (쉼표 구분)" />
                                                <button onClick={handleSaveEdit} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2"><Save size={18} /> 정답 저장</button>
                                            </div>
                                        ) : <div className="prose prose-invert max-w-none text-emerald-50/90 whitespace-pre-line leading-8 text-lg font-bold select-text">{currentProblem.modelAnswer}</div>}
                                    </div>
                                    {inputMode === 'text' && gradingResult?.missing?.length > 0 && (
                                        <div className="bg-red-900/20 rounded-3xl p-6 border-2 border-red-500/20 shadow-lg"><h3 className="text-red-400 font-black mb-4 flex items-center gap-2 tracking-widest uppercase text-sm"><AlertTriangle size={20} /> 누락된 필수 키워드</h3><div className="flex flex-wrap gap-2.5">{gradingResult.missing.map((kw, i) => <span key={i} className="px-4 py-1.5 bg-red-500/20 text-red-200 rounded-full text-sm font-black border border-red-500/30 shadow-sm">{kw}</span>)}</div></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modals (Overlay, Memo, Zoom) --- */}
            {isOverlayMode && (
                <div className="fixed inset-0 z-[100] cursor-crosshair touch-none select-none overflow-hidden">
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-full px-6 py-3 flex items-center gap-5 shadow-2xl animate-in slide-in-from-top-10 z-[110]">
                        <div className="flex gap-4">
                            <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-7 h-7 rounded-full bg-black border-2 ${penColor === '#000000' && lineWidth === 2 ? 'border-white scale-125' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-7 h-7 rounded-full bg-red-500 border-2 ${penColor === '#ef4444' ? 'border-white scale-125' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-7 h-7 rounded-full bg-blue-500 border-2 ${penColor === '#3b82f6' ? 'border-white scale-125' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#f59e0b40'); setLineWidth(15)}} className={`w-7 h-7 rounded-full bg-amber-500/50 border-2 ${lineWidth === 15 ? 'border-white scale-125' : 'border-slate-600'}`} title="형광펜" />
                        </div>
                        <div className="w-px h-6 bg-slate-700" />
                        <button onClick={() => {setPenColor('#ffffff'); setLineWidth(20)}} className={`text-slate-400 hover:text-white p-1 transition-all ${penColor === '#ffffff' ? 'text-white scale-125' : ''}`}><Eraser size={24} /></button>
                        <button onClick={clearCurrentCanvas} className="text-slate-400 hover:text-white p-1 transition-colors"><RotateCcw size={24} /></button>
                        <button onClick={() => setIsOverlayMode(false)} className="text-slate-400 hover:text-red-400 p-1 ml-2 transition-colors"><X size={28} /></button>
                    </div>
                    <canvas ref={overlayCanvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full touch-none" style={{ touchAction: 'none' }} />
                </div>
            )}
            {showMemo && (
                <div className="fixed bottom-24 right-8 w-72 bg-amber-50/95 backdrop-blur-md text-slate-800 p-5 rounded-3xl border-l-8 border-amber-500 shadow-2xl animate-in slide-in-from-right-10 z-40">
                    <h3 className="font-black text-amber-800 mb-3 flex items-center gap-2"><StickyNote size={20} /> 학습 메모</h3>
                    <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} className="w-full h-40 bg-white/50 border-2 border-amber-200 rounded-2xl p-3 text-lg leading-relaxed outline-none focus:border-amber-400 resize-none font-medium" />
                    <button onClick={handleSaveMemo} className="mt-3 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-base font-black shadow-lg transition-all active:scale-95">메모 저장하기</button>
                </div>
            )}
            {zoomImage && (
                <div className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomImage(null)}>
                    <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><X size={40} /></button>
                    <img src={zoomImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

// --- 보조 컴포넌트: ImageCarousel ---
function ImageCarousel({ images, onZoom, onDelete }) {
    const [index, setIndex] = useState(0);
    const next = () => setIndex((i) => (i + 1) % images.length);
    const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
    if (!images || images.length === 0) return null;
    return (
        <div className="relative w-full max-w-xl mx-auto aspect-video bg-black/60 rounded-3xl overflow-hidden border-2 border-slate-800 group mb-6 select-none shadow-2xl">
            <img src={images[index]} alt="Problem" className="w-full h-full object-contain cursor-zoom-in" onClick={() => onZoom(images[index])} />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 pointer-events-none border border-white/10 shadow-lg"><Maximize2 size={14} /> 확대 가능</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(images[index]); }} className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white p-2.5 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-10 transform hover:scale-110 active:scale-95"><Trash2 size={20} /></button>
            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-2xl transition-all shadow-xl backdrop-blur-sm border border-white/5"><ChevronLeft size={28} /></button>
                    <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-2xl transition-all shadow-xl backdrop-blur-sm border border-white/5"><ChevronRight size={28} /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 py-1.5 rounded-full text-white text-xs font-black border border-white/10 shadow-lg">{index + 1} / {images.length}</div>
                </>
            )}
        </div>
    );
}