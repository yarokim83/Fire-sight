import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen
} from 'lucide-react';

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
    
    // 전체 화면 연습장 모드
    const [isOverlayMode, setIsOverlayMode] = useState(false);

    // 로컬 이미지 상태
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);

    // 드로잉 관련
    const canvasRef = useRef(null); // 하단 인라인 캔버스
    const overlayCanvasRef = useRef(null); // 전체화면 오버레이
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#ef4444');
    const [lineWidth, setLineWidth] = useState(2);

    // 🔴 [핵심 추가] 현재 그리고 있는 펜의 고유 ID를 저장할 Ref
    // 손바닥과 펜이 동시에 닿았을 때 서로 간섭하지 않도록 ID로 구분합니다.
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
            
            // 문제 넘길 때 드로잉 상태 초기화
            activePointerId.current = null;
            setIsDrawing(false);

            if (p.problemType === 'drawing' || p.problemType === 'calculation') {
                setInputMode('draw');
            } else {
                setInputMode('text');
            }
            document.querySelector('.problem-container')?.scrollTo(0, 0);
        }
    }, [currentIndex, problems]);

    // 🔴 [iOS 선택 방지 1] 글로벌 스타일 주입
    useEffect(() => {
        if (isOverlayMode) {
            const style = document.createElement('style');
            style.id = 'drawing-mode-lock';
            style.innerHTML = `
                * {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    user-select: none !important;
                    touch-action: none !important;
                }
            `;
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

    // 🔴 [iOS 선택 방지 2] Native Event Listener (스크롤, 줌, 더블탭 방지)
    useEffect(() => {
        // 현재 활성화된 캔버스 찾기
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : (inputMode === 'draw' ? canvasRef.current : null);
        
        if (!activeCanvas) return;

        const preventAll = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
        };

        const options = { passive: false };

        activeCanvas.addEventListener('touchstart', preventAll, options);
        activeCanvas.addEventListener('touchmove', preventAll, options);
        activeCanvas.addEventListener('touchend', preventAll, options);
        activeCanvas.addEventListener('touchcancel', preventAll, options);
        
        // 클릭, 더블클릭, 선택, 우클릭 모두 차단
        activeCanvas.addEventListener('click', preventAll);
        activeCanvas.addEventListener('dblclick', preventAll); 
        activeCanvas.addEventListener('selectstart', preventAll); 
        activeCanvas.addEventListener('contextmenu', preventAll); 

        return () => {
            activeCanvas.removeEventListener('touchstart', preventAll);
            activeCanvas.removeEventListener('touchmove', preventAll);
            activeCanvas.removeEventListener('touchend', preventAll);
            activeCanvas.removeEventListener('touchcancel', preventAll);
            activeCanvas.removeEventListener('click', preventAll);
            activeCanvas.removeEventListener('dblclick', preventAll);
            activeCanvas.removeEventListener('selectstart', preventAll);
            activeCanvas.removeEventListener('contextmenu', preventAll);
        };
    }, [inputMode, isOverlayMode]);

    // --- 캔버스 사이즈 조정 ---
    useEffect(() => {
        // 1. 하단 인라인 캔버스
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
        // 2. 오버레이 캔버스
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

    // =========================================================
    // 🔴 [수정됨] 팜 리젝션 & 멀티터치 간섭 방지 로직
    // =========================================================
    
    const startDrawing = (e) => {
        e.preventDefault(); 
        e.stopPropagation();

        // 1. 펜이나 마우스가 아니면 무시 (손가락 터치 원천 차단)
        if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;

        // 2. [핵심] 현재 그리기 시작한 펜의 ID를 저장 (이 ID만 추적)
        activePointerId.current = e.pointerId;

        // 3. 포인터 캡처 (화면 밖으로 나가도 끊기지 않게 & 텍스트 선택 방지)
        if (e.target.setPointerCapture) {
            try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
        }

        const canvas = e.target;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. 그리기 상태가 아니면 리턴
        if (!isDrawing) return;

        // 2. [핵심] 아까 시작한 그 펜(ID)이 아니면 무시! 
        // (손바닥이 닿아서 이벤트가 발생해도, ID가 다르면 여기서 걸러져서 선이 튀지 않음)
        if (e.pointerId !== activePointerId.current) return;

        const canvas = e.target;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        e.preventDefault();
        
        // 내 펜이 끝난 경우에만 종료 처리
        if (e.pointerId === activePointerId.current) {
            setIsDrawing(false);
            activePointerId.current = null; // ID 초기화
            
            if (e.target.releasePointerCapture) {
                try { e.target.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        }
    };
    
    const clearCanvas = () => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) {
            const ctx = activeCanvas.getContext('2d');
            ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        }
    };

    // --- 기존 로직 (채점, 핸들러 등) ---
    const analyzeAnswer = () => {
        if (!currentProblem) return null;
        const keywords = currentProblem.keywords || [];
        if (inputMode === 'draw' || !userAnswer.trim() || keywords.length === 0) {
            return { score: 0, percentage: 0, matched: [], missing: keywords, manualGradingRequired: true };
        }
        const matched = keywords.filter(keyword => userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, '')));
        const percentage = Math.round((matched.length / keywords.length) * 100);
        return { percentage, matched, missing: keywords.filter(k => !matched.includes(k)), manualGradingRequired: false };
    };
    const gradingResult = showAnswer ? analyzeAnswer() : null;

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
        handleNext();
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
            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                content: currentProblem.question,
                answer: currentProblem.modelAnswer,
                keywords: Array.isArray(currentProblem.keywords) ? currentProblem.keywords : currentProblem.keywords.split(',').map(k => k.trim())
            });
            setIsEditMode(false);
            alert("수정 완료!");
        } catch (e) { alert("수정 실패"); }
    };

    const handleDeleteProblem = async () => {
        if (window.confirm("문제를 삭제하시겠습니까?")) {
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
        } catch (e) { alert("삭제 실패"); }
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
                                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-8 text-lg mt-4 select-text">
                                    {currentProblem.question}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 답안 입력 (텍스트 전용) */}
                    {!showAnswer && !isOverlayMode && (
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

                            {/* ✋ 하단 인라인 캔버스/텍스트 */}
                            <div 
                                className="relative w-full h-[350px] bg-white cursor-text" 
                                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                onSelectStart={(e) => e.preventDefault()}
                            > 
                                {inputMode === 'text' ? (
                                    <textarea 
                                        value={userAnswer} 
                                        onChange={(e) => setUserAnswer(e.target.value)} 
                                        placeholder="답안을 입력하세요..." 
                                        className="w-full h-full p-6 text-slate-900 text-lg outline-none resize-none placeholder:text-slate-400 select-text" 
                                        spellCheck="false"
                                        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                    />
                                ) : (
                                    <canvas 
                                        ref={canvasRef} 
                                        onPointerDown={startDrawing} 
                                        onPointerMove={draw} 
                                        onPointerUp={stopDrawing} 
                                        onPointerLeave={stopDrawing}
                                        className="w-full h-full bg-slate-50" 
                                        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', cursor: 'crosshair' }} 
                                    />
                                )}
                            </div>

                            <div className="absolute bottom-4 right-4">
                                <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-transform active:scale-95"><Check size={18} /> 제출</button>
                            </div>
                        </div>
                    )}

                    {/* 채점 결과 */}
                    {showAnswer && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            <div className="bg-emerald-950/20 rounded-2xl p-6 border border-emerald-900/50">
                                <h3 className="text-emerald-400 font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={20} /> 모범 답안</h3>
                                {localAnswerImages.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {localAnswerImages.map((url, idx) => (
                                            <div key={idx} className="relative aspect-[4/3] group rounded-xl overflow-hidden border border-emerald-500/20 bg-black/40">
                                                <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in transition-transform group-hover:scale-105" onClick={() => setZoomImage(url)} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="prose prose-invert max-w-none text-emerald-100/90 whitespace-pre-line leading-8 text-lg font-medium select-text">{currentProblem.modelAnswer}</div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleNext} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">다음 문제 <ChevronRight size={18} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 오버레이 연습장 */}
            {isOverlayMode && (
                <div className="fixed inset-0 z-[99] cursor-crosshair touch-none select-none">
                    {/* 툴바 */}
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-full px-5 py-2.5 flex items-center gap-4 shadow-2xl animate-in slide-in-from-top-4 z-[100] pointer-events-auto">
                        <div className="flex gap-3">
                            <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-black border-2 ${penColor === '#000000' ? 'border-white scale-110' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-red-500 border-2 ${penColor === '#ef4444' ? 'border-white scale-110' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${penColor === '#3b82f6' ? 'border-white scale-110' : 'border-slate-600'}`} />
                            <button onClick={() => {setPenColor('#f59e0b'); setLineWidth(4)}} className={`w-6 h-6 rounded-full bg-amber-500 border-2 ${penColor === '#f59e0b' ? 'border-white scale-110' : 'border-slate-600'}`} />
                        </div>
                        <div className="w-px h-5 bg-slate-700"></div>
                        <button onClick={clearCanvas} className="text-slate-400 hover:text-white p-1" title="지우기"><RotateCcw size={20} /></button>
                        <button onClick={() => setIsOverlayMode(false)} className="text-slate-400 hover:text-red-400 p-1 ml-1" title="닫기"><X size={24} /></button>
                    </div>

                    <canvas 
                        ref={overlayCanvasRef}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                        className="w-full h-full"
                        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    />
                </div>
            )}

            {/* 메모장 & 확대 모달 */}
            {showMemo && (
                <div className="fixed bottom-20 right-6 w-64 bg-amber-100/95 text-slate-800 p-4 rounded-xl border-l-4 border-amber-500 shadow-2xl animate-in slide-in-from-bottom-10 z-40">
                    <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><StickyNote size={16} /> 메모</h3>
                    <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} className="w-full h-32 bg-white/50 border border-amber-200 rounded p-2 text-sm resize-none" placeholder="암기 팁..." />
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