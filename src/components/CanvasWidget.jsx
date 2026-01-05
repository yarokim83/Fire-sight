import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Eraser, X, Minus, RefreshCw, Palette } from 'lucide-react';

export default function CanvasWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [color, setColor] = useState('#ef4444'); // 기본 빨강
    const [lineWidth, setLineWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const canvasRef = useRef(null);
    const contextRef = useRef(null);

    // 캔버스 초기화 및 리사이징
    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const context = canvas.getContext("2d");
            context.lineCap = "round";
            context.strokeStyle = color;
            context.lineWidth = lineWidth;
            contextRef.current = context;
        }
    }, [isOpen, window.innerWidth, window.innerHeight]);

    // 색상 변경 감지
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = color;
            contextRef.current.lineWidth = lineWidth;
        }
    }, [color, lineWidth]);

    // 그리기 시작
    const startDrawing = ({ nativeEvent }) => {
        if (!isOpen) return;
        
        // 터치/마우스 좌표 통합
        const { clientX, clientY } = getCoordinates(nativeEvent);
        
        contextRef.current.beginPath();
        contextRef.current.moveTo(clientX, clientY);
        setIsDrawing(true);
    };

    // 그리는 중
    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !isOpen) return;
        
        const { clientX, clientY } = getCoordinates(nativeEvent);
        
        contextRef.current.lineTo(clientX, clientY);
        contextRef.current.stroke();
    };

    // 그리기 끝
    const stopDrawing = () => {
        if (contextRef.current) contextRef.current.closePath();
        setIsDrawing(false);
    };

    // 좌표 추출 헬퍼 (마우스/터치 호환)
    const getCoordinates = (event) => {
        if (event.touches && event.touches.length > 0) {
            return {
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY
            };
        }
        return {
            clientX: event.offsetX || event.clientX,
            clientY: event.offsetY || event.clientY
        };
    };

    // 지우기 (전체 삭제)
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border-2 border-white/20"
                title="연습장 켜기"
            >
                <PenTool size={24} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] touch-none">
            {/* 1. 그리기 영역 (투명 캔버스) */}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 bg-transparent cursor-crosshair touch-none"
                style={{ touchAction: 'none' }} // 스크롤 방지
            />

            {/* 2. 툴바 (플로팅) */}
            <div className="absolute bottom-6 right-6 flex flex-col items-center gap-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10 fade-in">
                {/* 닫기 */}
                <button onClick={() => setIsOpen(false)} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white transition-colors mb-2">
                    <X size={20} />
                </button>

                {/* 지우개 (전체 삭제) */}
                <button onClick={clearCanvas} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-900/50 hover:text-red-400 transition-colors" title="모두 지우기">
                    <RefreshCw size={20} />
                </button>

                <div className="h-px w-full bg-slate-700 my-1"></div>

                {/* 색상 팔레트 */}
                <div className="flex flex-col gap-3">
                    <button onClick={() => {setColor('#ef4444'); setLineWidth(3);}} className={`w-8 h-8 rounded-full bg-red-500 border-2 ${color === '#ef4444' ? 'border-white scale-110' : 'border-transparent'}`} />
                    <button onClick={() => {setColor('#3b82f6'); setLineWidth(3);}} className={`w-8 h-8 rounded-full bg-blue-500 border-2 ${color === '#3b82f6' ? 'border-white scale-110' : 'border-transparent'}`} />
                    <button onClick={() => {setColor('#ffffff'); setLineWidth(3);}} className={`w-8 h-8 rounded-full bg-white border-2 ${color === '#ffffff' ? 'border-blue-500 scale-110' : 'border-transparent'}`} />
                    <button onClick={() => {setColor('#fbbf24'); setLineWidth(5);}} className={`w-8 h-8 rounded-full bg-amber-400 border-2 ${color === '#fbbf24' ? 'border-white scale-110' : 'border-transparent'}`} title="형광펜" />
                </div>
            </div>

            {/* 상단 안내 메시지 */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 py-2 rounded-full text-white text-xs pointer-events-none">
                ✏️ 연습장 모드 (스크롤 잠금됨)
            </div>
        </div>
    );
}