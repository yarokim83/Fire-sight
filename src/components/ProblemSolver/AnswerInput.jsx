import React, { useRef, useState, useEffect } from 'react';
import { Type, PenTool, Check, Eraser, RotateCcw } from 'lucide-react';

const AnswerInput = ({ state, actions }) => {
    const { inputMode, userAnswer } = state;
    const { setInputMode, setUserAnswer, handleSubmit } = actions;

    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);

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

    useEffect(() => {
        if (inputMode === 'draw' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = penColor;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }, [penColor, lineWidth, inputMode]);

    const startDrawing = (e) => {
        if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);
    
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleSubmitInternal = (e) => {
        // e.stopPropagation()을 통해 이벤트 전파를 막아 다른 레이어의 간섭을 방지합니다.
        e.preventDefault();
        e.stopPropagation();

        if (inputMode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const originalCompositeOperation = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = originalCompositeOperation;

            const imageDataUrl = canvas.toDataURL('image/png');
            setUserAnswer(imageDataUrl);
        }
        handleSubmit();
    };

    return (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative flex flex-col">
            {/* 툴바 */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between z-10">
                <div className="flex gap-2">
                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                        <Type size={14} /> 텍스트
                    </button>
                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                        <PenTool size={14} /> 드로잉
                    </button>
                </div>
                {inputMode === 'draw' && (
                    <div className="flex items-center gap-2">
                         <button onClick={() => {setPenColor('#000000'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-black border-2 ${penColor === '#000000' ? 'border-blue-500' : 'border-slate-300'}`}></button>
                         <button onClick={() => {setPenColor('#ef4444'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-red-500 border-2 ${penColor === '#ef4444' ? 'border-blue-500' : 'border-slate-300'}`}></button>
                         <button onClick={() => {setPenColor('#3b82f6'); setLineWidth(2)}} className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${penColor === '#3b82f6' ? 'border-blue-500' : 'border-slate-300'}`}></button>
                         <div className="w-px h-4 bg-slate-300 mx-1"></div>
                         <button onClick={() => {setPenColor('#ffffff'); setLineWidth(20)}} className={`p-1 rounded hover:bg-slate-200 ${penColor === '#ffffff' ? 'bg-slate-200 text-blue-600' : 'text-slate-500'}`} title="지우개"><Eraser size={16} /></button>
                         <button onClick={clearCanvas} className="p-1 rounded hover:bg-slate-200 text-slate-500" title="전체 지우기"><RotateCcw size={16} /></button>
                    </div>
                )}
            </div>

            {/* 입력 영역 */}
            <div className="relative w-full h-[400px] bg-white">
                {inputMode === 'text' ? (
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="이곳에 답안을 서술하세요..."
                        className="w-full h-full p-6 text-slate-900 text-lg leading-relaxed outline-none resize-none placeholder:text-slate-400 font-sans border-none"
                        spellCheck="false"
                    />
                ) : (
                    <canvas
                        ref={canvasRef}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                        className="w-full h-full touch-none cursor-crosshair bg-slate-50"
                        style={{ touchAction: 'none' }}
                    />
                )}
                
                {/* 제출 버튼: 입력 영역 내부에 절대 위치로 배치하되, z-index를 높여 최상단에 둡니다. */}
                <div className="absolute bottom-6 right-6 z-30">
                    <button 
                        onClick={handleSubmitInternal} 
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-2xl hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-95 pointer-events-auto"
                        style={{ cursor: 'pointer', webkitTapHighlightColor: 'transparent' }}
                    >
                        <Check size={24} /> {inputMode === 'draw' ? '정답 확인' : '제출'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnswerInput;