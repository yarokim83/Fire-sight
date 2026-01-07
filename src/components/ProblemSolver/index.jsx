import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle
} from 'lucide-react';

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete }) {
    // --- 상태 관리 ---
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    
    // UI 상태
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); // 'text' | 'draw'
    const [userAnswer, setUserAnswer] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [showMemo, setShowMemo] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [memoText, setMemoText] = useState('');

    // 로컬 이미지 상태
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);

    // 드로잉 관련 Ref
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);

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
            
            if (p.problemType === 'drawing' || p.problemType === 'calculation') {
                setInputMode('draw');
            } else {
                setInputMode('text');
            }
            document.querySelector('.problem-container')?.scrollTo(0, 0);
        }
    }, [currentIndex, problems]);

    // --- 드로잉 캔버스 초기화 ---
    useEffect(() => {
        if (inputMode === 'draw' && canvasRef.current) {
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
    }, [inputMode]); 

    // 펜 스타일 업데이트
    useEffect(() => {
        if (inputMode === 'draw' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = penColor;
            ctx.lineWidth = lineWidth;
        }
    }, [penColor, lineWidth]);

    // [핵심] 팜 리젝션 로직
    const isPenOrMouse = (e) => {
        const type = e.nativeEvent ? e.nativeEvent.pointerType : e.pointerType;
        return type === 'pen' || type === 'mouse';
    };

    const startDrawing = (e) => {
        e.preventDefault(); 
        if (!isPenOrMouse(e)) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        if (!isPenOrMouse(e)) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        if(e) e.preventDefault();
        setIsDrawing(false);
    };
    
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    // --- 채점 로직 ---
    const analyzeAnswer = () => {
        if (!currentProblem) return null;
        const keywords = currentProblem.keywords || [];
        
        if (inputMode === 'draw' || !userAnswer.trim() || keywords.length === 0) {
            return { score: 0, percentage: 0, matched: [], missing: keywords, manualGradingRequired: true };
        }

        const matched = keywords.filter(keyword =>
            userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, ''))
        );
        const percentage = Math.round((matched.length / keywords.length) * 100);
        
        return { 
            percentage, 
            matched, 
            missing: keywords.filter(k => !matched.includes(k)), 
            manualGradingRequired: false 
        };
    };

    const gradingResult = showAnswer ? analyzeAnswer() : null;

    // --- 핸들러 ---
    const handleSubmit = async () => {
        if (inputMode === 'text' && !userAnswer.trim()) return alert("답안을 입력해주세요!");
        setShowAnswer(true);

        if (inputMode === 'text') {
            const res = analyzeAnswer();
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

    const handlePrev = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };

    const handleSaveMemo = async () => {
        await updateProblemInfo(currentProblem.id, { memo: memoText });
        setCurrentProblem(prev => ({ ...prev, memo: memoText }));
        alert("메모 저장 완료!");
    };

    const handleSaveEdit = async () => {
        try {
            const updatedData = {
                title: currentProblem.title,
                content: currentProblem.question,
                answer: currentProblem.modelAnswer,
                keywords: Array.isArray(currentProblem.keywords) ? currentProblem.keywords : currentProblem.keywords.split(',').map(k => k.trim())
            };
            await updateProblemInfo(currentProblem.id, updatedData);
            setCurrentProblem(prev => ({ ...prev, ...updatedData }));
            setIsEditMode(false);
            alert("수정 완료!");
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
            alert("삭제되었습니다.");
        } catch (e) { alert("삭제 실패: " + e.message); }
    };

    if (!currentProblem) return <div className="p-10 text-center text-white">로딩 중...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold">
                    <ArrowLeft size={18} /> 목록
                </button>
                <div className="flex items-center gap-2 text-sm font-mono text-emerald-500 font-bold">
                    <BookOpen size={14} /> <span>Problem {currentIndex + 1} / {problems.length}</span>
                </div>
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
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-500 uppercase">
                            <span className="bg-slate-800 px-2 py-1 rounded text-slate-300">{currentProblem.subject}</span>
                            <span>{currentProblem.problemType === 'drawing' ? '도면' : '서술형'}</span>
                        </div>

                        {isEditMode ? (
                            <div className="space-y-3">
                                <input value={currentProblem.title} onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-bold" />
                                <textarea value={currentProblem.question} onChange={(e) => setCurrentProblem({...currentProblem, question: e.target.value})} className="w-full h-32 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200" />
                                <button onClick={handleSaveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"><Save size={14} /> 저장</button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-xl md:text-2xl font-bold text-white mb-6 leading-relaxed break-keep">{currentProblem.title}</h1>
                                {localProblemImages.length > 0 && (
                                    <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={(url) => handleDeleteImage('problem', url)} />
                                )}
                                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-8 text-lg mt-4">{currentProblem.question}</div>
                            </>
                        )}
                    </div>

                    {/* 메모장 */}
                    {showMemo && (
                        <div className="bg-amber-100/95 text-slate-800 p-4 rounded-xl border-l-4 border-amber-500 shadow-lg animate-in slide-in-from-top-2">
                            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><StickyNote size={16} /> 메모</h3>
                            <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} className="w-full h-24 bg-white/50 border border-amber-200 rounded p-2 text-sm resize-none" placeholder="암기 팁을 적어두세요." />
                            <div className="flex justify-end mt-2"><button onClick={handleSaveMemo} className="px-3 py-1 bg-amber-500 text-white rounded text-sm font-bold">저장</button></div>
                        </div>
                    )}

                    {/* 답안 입력 (드로잉/텍스트) */}
                    {!showAnswer && (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-bold ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}><Type size={14} /> 텍스트</button>
                                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-bold ${inputMode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}><PenTool size={14} /> 그리기</button>
                                </div>
                                {inputMode === 'draw' && (
                                    <div className="flex items-center gap-2">
                                         <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-black border ${penColor === '#000000' ? 'ring-2 ring-blue-500' : ''}`} />
                                         <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-red-500 border ${penColor === '#ef4444' ? 'ring-2 ring-blue-500' : ''}`} />
                                         <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-5 h-5 rounded-full bg-blue-500 border ${penColor === '#3b82f6' ? 'ring-2 ring-blue-500' : ''}`} />
                                         <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                         <button onClick={() => {setPenColor('#ffffff'); setLineWidth(20)}} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><Eraser size={16} /></button>
                                         <button onClick={clearCanvas} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><RotateCcw size={16} /></button>
                                    </div>
                                )}
                            </div>

                            {/* [수정 포인트] user-select: none 및 touch-action: none 적용 */}
                            <div className="relative w-full h-[350px] bg-white cursor-text select-none"> 
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 입력하세요..." className="w-full h-full p-6 text-slate-900 text-lg outline-none resize-none placeholder:text-slate-400" spellCheck="false" />
                                ) : (
                                    <canvas 
                                        ref={canvasRef} 
                                        onPointerDown={startDrawing} 
                                        onPointerMove={draw} 
                                        onPointerUp={stopDrawing} 
                                        onPointerLeave={stopDrawing}
                                        onContextMenu={(e) => e.preventDefault()} // 우클릭 방지
                                        className="w-full h-full touch-none cursor-crosshair bg-slate-50" 
                                        style={{ 
                                            touchAction: 'none', 
                                            userSelect: 'none', 
                                            WebkitUserSelect: 'none', 
                                            WebkitTouchCallout: 'none' 
                                        }} 
                                    />
                                )}
                            </div>

                            <div className="absolute bottom-4 right-4">
                                <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
                                    <Check size={18} /> 제출
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
                                        <button onClick={() => handleManualGrade(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-500"><CheckCircle2 size={20} /> 정답 (O)</button>
                                        <button onClick={() => handleManualGrade(false)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-500"><XCircle size={20} /> 오답 (X)</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${gradingResult.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {gradingResult.percentage >= 70 ? <Trophy size={32} /> : <RefreshCcw size={32} />}
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">키워드 일치율</p>
                                            <p className={`text-2xl font-bold ${gradingResult.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{gradingResult.percentage}%</p>
                                        </div>
                                    </div>
                                    <button onClick={handleNext} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">다음 <ChevronRight size={18} /></button>
                                </div>
                            )}

                            <div className="bg-emerald-950/20 rounded-2xl p-6 border border-emerald-900/50">
                                <h3 className="text-emerald-400 font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={20} /> 모범 답안</h3>
                                {localAnswerImages.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {localAnswerImages.map((url, idx) => (
                                            <div key={idx} className="relative aspect-[4/3] group rounded-xl overflow-hidden border border-emerald-500/20 bg-black/40">
                                                <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in transition-transform group-hover:scale-105" onClick={() => setZoomImage(url)} />
                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur p-1 rounded text-white opacity-0 group-hover:opacity-100 pointer-events-none"><Maximize2 size={14} /></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none text-emerald-100/90 whitespace-pre-line leading-8 text-lg font-medium">{currentProblem.modelAnswer}</div>
                                {inputMode === 'text' && gradingResult?.missing?.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-emerald-900/30">
                                        <h4 className="text-red-400 text-sm font-bold mb-2 flex items-center gap-1"><AlertTriangle size={14} /> 누락 키워드</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {gradingResult.missing.map((kw, i) => <span key={i} className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded border border-red-900/50">{kw}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 확대 모달 */}
            {zoomImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setZoomImage(null)}>
                    <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2" onClick={() => setZoomImage(null)}><X size={32} /></button>
                    <img src={zoomImage} alt="Zoom" className="max-w-full max-h-[90vh] object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

// 이미지 캐러셀
function ImageCarousel({ images, onZoom, onDelete }) {
    const [index, setIndex] = useState(0);
    const next = () => setIndex((i) => (i + 1) % images.length);
    const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);

    if (!images || images.length === 0) return null;
    if (index >= images.length) setIndex(0);

    return (
        <div className="relative w-full max-w-xl mx-auto aspect-video bg-black/50 rounded-xl overflow-hidden border border-slate-700 group mb-6 select-none">
            <img src={images[index]} alt="Problem" className="w-full h-full object-contain cursor-zoom-in" onClick={() => onZoom(images[index])} />
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded-lg text-white text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none"><Maximize2 size={12} /> 확대</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(images[index]); }} className="absolute top-3 right-3 bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
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