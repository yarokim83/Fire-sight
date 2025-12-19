import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Eraser, Eye, PenTool, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, Shuffle, ListFilter } from 'lucide-react';
import { QUESTIONS } from '../data/questions';

export default function Workbook() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // State
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'mechanical', 'electrical'
    const [isRandom, setIsRandom] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [shuffledIndices, setShuffledIndices] = useState([]); // Stores the order of indices

    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    // Filter Logic
    const filteredQuestions = useMemo(() => {
        return QUESTIONS.filter(q => {
            if (filterMode === 'all') return true;
            return q.category === filterMode;
        });
    }, [filterMode]);

    // Random Logic
    useEffect(() => {
        // Whenever filter or random mode changes, reset index and reshuffle if needed
        const indices = filteredQuestions.map((_, i) => i);
        if (isRandom) {
            // Fisher-Yates Shuffle
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
        }
        setShuffledIndices(indices);
        setCurrentIndex(0);
        setShowAnswer(false);
    }, [filterMode, isRandom, filteredQuestions]);

    // Current Question Data
    const activeQuestionIndex = shuffledIndices[currentIndex] || 0;
    const currentData = filteredQuestions[activeQuestionIndex] || {};

    // Clear canvas when Question changes
    useEffect(() => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setShowAnswer(false);
        }
    }, [activeQuestionIndex, context]); // Depend on the actual question index

    // Navigation
    const goNext = () => setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    const goPrev = () => setCurrentIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);

    // Canvas Init
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && containerRef.current) {
            const parent = containerRef.current;
            const initCanvas = () => {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.strokeStyle = '#Fde047';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                setContext(ctx);
            };
            initCanvas();
            const handleResize = () => initCanvas();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [currentIndex]); // Re-init on index change (sometimes needed if layout shifts, though here mainly for safety)

    // Drawing
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }
    const startDrawing = (e) => {
        if (e.cancelable) e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getPos(e);
        context?.beginPath();
        context?.moveTo(x, y);
    };
    const draw = (e) => {
        if (e.cancelable) e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        context?.lineTo(x, y);
        context?.stroke();
    };
    const stopDrawing = () => { setIsDrawing(false); context?.closePath(); };

    // Highlight Logic
    const renderAnswer = (text, keywords = []) => {
        // Simple highlighter: find keywords and wrap them
        if (!text) return null;

        let parts = [{ text: text, highlight: false }];

        keywords.forEach(keyword => {
            let newParts = [];
            parts.forEach(part => {
                if (part.highlight) {
                    newParts.push(part);
                } else {
                    // Split by keyword (case insensitive)
                    const regex = new RegExp(`(${keyword})`, 'gi');
                    const split = part.text.split(regex);
                    split.forEach(s => {
                        if (s.toLowerCase() === keyword.toLowerCase()) {
                            newParts.push({ text: s, highlight: true });
                        } else if (s.length > 0) {
                            newParts.push({ text: s, highlight: false });
                        }
                    });
                }
            });
            parts = newParts;
        });

        return (
            <div className="leading-relaxed whitespace-pre-line">
                {parts.map((part, i) => (
                    <span key={i} className={part.highlight ? "bg-yellow-200 text-slate-900 px-1 rounded font-bold shadow-sm mx-0.5 box-decoration-clone" : ""}>
                        {part.text}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 font-sans">

            {/* 1. Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 bg-slate-800 border-b border-white/5 shadow-sm gap-3">
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                    <div className="p-1 bg-slate-700/50 rounded-lg flex gap-1">
                        <button onClick={() => setFilterMode('all')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterMode === 'all' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            전체
                        </button>
                        <button onClick={() => setFilterMode('mechanical')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterMode === 'mechanical' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            기계
                        </button>
                        <button onClick={() => setFilterMode('electrical')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterMode === 'electrical' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            전기
                        </button>
                    </div>

                    <button
                        onClick={() => setIsRandom(!isRandom)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${isRandom ? 'bg-purple-600/20 text-purple-400 border-purple-500/50' : 'bg-slate-700/50 text-slate-400 border-transparent hover:border-slate-600'}`}
                    >
                        <Shuffle size={14} />
                        <span>{isRandom ? '랜덤 ON' : '순서대로'}</span>
                    </button>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                    <span className="text-slate-400 text-xs font-mono">
                        {currentIndex + 1} / {filteredQuestions.length}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={goPrev} className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition active:scale-95">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={goNext} className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition active:scale-95">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Question Area */}
            {currentData ? (
                <>
                    <div className="px-6 py-5 border-b bg-slate-800/60 backdrop-blur-sm border-slate-700/50 shadow-md relative z-10">
                        <div className="flex flex-col gap-2">
                            <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider uppercase
                                ${currentData.category === 'mechanical' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10'}`}>
                                {currentData.tag || currentData.category}
                            </span>
                            <h2 className="text-lg md:text-xl font-bold text-slate-50 leading-snug">
                                {currentData.q}
                            </h2>
                        </div>
                    </div>

                    {/* 3. Canvas & Answer */}
                    <div ref={containerRef} className="flex-1 relative bg-slate-800 overflow-hidden">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                        {/* Answer Overlay */}
                        <div className={`absolute inset-0 p-8 overflow-y-auto transition-all duration-300 pointer-events-none z-0 scrollbar-hide
                             ${showAnswer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            <div className="font-mono text-lg text-slate-300 drop-shadow-md">
                                {renderAnswer(currentData.a, currentData.keywords)}
                            </div>
                        </div>

                        {/* Canvas */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full cursor-cell touch-none z-10"
                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                        />

                        {!isDrawing && !showAnswer && (
                            <div className="absolute bottom-6 right-6 text-slate-500/70 text-xs pointer-events-none flex items-center bg-slate-900/40 px-3 py-2 rounded-full backdrop-blur border border-white/5 animate-pulse">
                                <PenTool className="inline mr-2" size={14} />
                                답안을 작성하세요
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                    문제가 없습니다.
                </div>
            )}

            {/* 4. Filter Footer */}
            <div className="p-4 bg-slate-900 border-t border-white/5 flex justify-between items-center z-20">
                <button
                    onClick={() => { if (context) { context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); } }}
                    className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:bg-slate-700 transition lg:text-sm text-xs"
                >
                    <Eraser size={18} />
                    <span className="hidden md:inline">지우기</span>
                </button>

                <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className={`flex items-center space-x-2 px-8 py-3 rounded-xl transition font-bold lg:text-sm text-xs shadow-lg active:scale-95 border
                     ${showAnswer
                            ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                            : 'bg-yellow-600 text-white border-yellow-500 hover:bg-yellow-500'}`}
                >
                    <Eye size={18} />
                    <span>{showAnswer ? '정답 가리기' : '정답 확인'}</span>
                </button>
            </div>

        </div>
    );
}
