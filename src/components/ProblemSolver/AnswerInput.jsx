import React, { useRef, useState, useEffect } from 'react';
import { Type, PenTool, Check, Eraser, RotateCcw } from 'lucide-react';

const AnswerInput = ({ state, actions }) => {
    const { inputMode, userAnswer } = state;
    const { setInputMode, setUserAnswer, handleSubmit } = actions;

    // 드로잉 상태 (UI 내부 관리)
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000'); // 기본 검정
    const [lineWidth, setLineWidth] = useState(2);

    // 1. [초기화] 캔버스 크기 설정 (모드가 'draw'로 바뀔 때만 실행)
    useEffect(() => {
        if (inputMode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const parent = canvas.parentElement;
            
            // 캔버스 크기를 부모 요소에 맞춤 (이때 내용이 초기화됨)
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            
            // 초기 스타일 설정 (검정색 등 기본값)
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = penColor; 
            ctx.lineWidth = lineWidth;
        }
        // 의존성 배열에서 penColor, lineWidth 제거 -> 색 바꿔도 리사이징 안 함
    }, [inputMode]); 

    // 2. [스타일 업데이트] 펜 색상/두께 변경 시 실행 (내용 유지됨)
    useEffect(() => {
        if (inputMode === 'draw' && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = penColor;
            ctx.lineWidth = lineWidth;
            // 선 모양은 항상 둥글게 유지
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }, [penColor, lineWidth, inputMode]);

    // 팜 리젝션 드로잉 로직
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

    return (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border-2 border-slate-700 focus-within:border-blue-500 transition-colors relative">
            {/* 툴바 */}
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
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
            <div className="relative w-full h-[400px] bg-white cursor-text">
                {inputMode === 'text' ? (
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="이곳에 답안을 서술하세요..."
                        className="w-full h-full p-6 text-slate-900 text-lg leading-relaxed outline-none resize-none placeholder:text-slate-400 font-sans"
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
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2">
                <button onClick={handleSubmit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0">
                    <Check size={20} /> {inputMode === 'draw' ? '정답 확인' : '제출'}
                </button>
            </div>
        </div>
    );
};

export default AnswerInput; 