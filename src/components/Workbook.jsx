import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Eye, PenTool, CheckCircle2 } from 'lucide-react';

const QUESTIONS = {
    id: 1,
    q: "Q. 옥내소화전 펌프의 체절운전 시험 순서를 쓰시오.",
    a: "1. 펌프 토출측 개폐밸브 폐쇄\n2. 성능시험배관 개폐밸브 폐쇄\n3. 릴리프 밸브 조절볼트 잠금\n4. 펌프 수동 기동\n5. 체절압력(140% 이하) 확인\n6. 릴리프 밸브 서서히 개방하여 작동 압력을 확인"
};

export default function Workbook() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showAnswer, setShowAnswer] = useState(false);
    const [context, setContext] = useState(null);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && containerRef.current) {
            const parent = containerRef.current;

            const initCanvas = () => {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.strokeStyle = '#FACC15'; // Yellow-400
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                setContext(ctx);
            };

            initCanvas();

            const handleResize = () => {
                const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.putImageData(imageData, 0, 0);
                ctx.strokeStyle = '#FACC15';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                setContext(ctx);
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const getCoordinates = (event) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        context?.beginPath();
        context?.moveTo(x, y);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        context?.lineTo(x, y);
        context?.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        context?.closePath();
    };

    const clearCanvas = () => {
        if (context && canvasRef.current) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 p-4">
            {/* 1. Header: Question */}
            <div className="bg-slate-800 p-4 rounded-t-xl border-b border-slate-700 shadow-sm flex items-start gap-3">
                <div className="bg-orange-600 text-white font-bold px-3 py-1 rounded text-sm md:text-base shrink-0 mt-1">
                    TEST
                </div>
                <h2 className="text-lg md:text-xl font-semibold text-white leading-relaxed">
                    {QUESTIONS.q}
                </h2>
            </div>

            {/* 2. Main Canvas Area */}
            <div ref={containerRef} className="flex-1 relative bg-slate-800 rounded-b-xl overflow-hidden border border-t-0 border-slate-700 shadow-inner">

                {/* Grid Background (Radial) */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                />

                {/* Answer Overlay (Behind Canvas) */}
                <div className={`absolute inset-0 p-8 flex flex-col justify-start pointer-events-none transition-opacity duration-500 ${showAnswer ? 'opacity-100' : 'opacity-0'}`}>
                    <div
                        className="text-[#4ADE80] font-mono text-xl md:text-2xl leading-loose select-none whitespace-pre-line"
                        style={{ textShadow: '0 0 10px rgba(74, 222, 128, 0.2)' }}
                    >
                        {QUESTIONS.a}
                    </div>

                    <div className="mt-auto flex items-center text-emerald-500/50 text-sm border-t border-emerald-500/20 pt-4">
                        <CheckCircle2 className="mr-2" size={16} />
                        <span>자가 채점 모드: 녹색 정답 위에 덧쓰며 확인해보세요.</span>
                    </div>
                </div>

                {/* Canvas (Top Layer) */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-cell touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {/* Placeholder Helper */}
                {!isDrawing && !showAnswer && (
                    <div className="absolute bottom-4 right-4 text-slate-600 text-sm pointer-events-none animate-pulse">
                        <PenTool className="inline mr-1" size={14} />
                        Write your answer here
                    </div>
                )}
            </div>

            {/* 3. Footer: Controls */}
            <div className="mt-4 flex justify-between items-center">
                <div className="text-slate-500 text-sm hidden md:block">
                    Use Apple Pencil or Mouse
                </div>
                <div className="flex space-x-3 w-full md:w-auto justify-end">
                    <button
                        onClick={clearCanvas}
                        className="flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all font-medium active:scale-95 touch-manipulation"
                    >
                        <Eraser size={20} />
                        <span>지우기</span>
                    </button>

                    <button
                        onClick={() => setShowAnswer(!showAnswer)}
                        className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl transition-all font-bold shadow-lg active:scale-95 touch-manipulation min-w-[140px] ${showAnswer
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                : 'bg-orange-600 text-white hover:bg-orange-500'
                            }`}
                    >
                        <Eye size={20} />
                        <span>{showAnswer ? '정답 숨기기' : '정답 확인'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
