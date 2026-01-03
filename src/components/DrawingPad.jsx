
import React, { useRef, useEffect, useState } from 'react';
import { PenLine, Eraser, Save, X } from 'lucide-react';

const DrawingPad = ({ onSave, onCancel, initialDrawing }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#FFFFFF'); // 흰색 펜
    const [lineWidth, setLineWidth] = useState(2);

    // Canvas 초기화 및 기존 그림 로드
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // DPI 스케일링 (레티나 디스플레이 대응)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        // 배경 설정
        ctx.fillStyle = '#1E293B'; // slate-800
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 기존 드로잉이 있으면 로드
        if (initialDrawing) {
            const image = new Image();
            image.onload = () => {
                ctx.drawImage(image, 0, 0, canvas.width / dpr, canvas.height / dpr);
            };
            image.src = initialDrawing;
        }

    }, [initialDrawing]);

    const getCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        return {
            x: (e.clientX - rect.left),
            y: (e.clientY - rect.top)
        };
    }

    const startDrawing = (e) => {
        // 팜 리젝션: 'pen' 또는 'mouse' 입력만 허용
        if (e.pointerType === 'touch') {
            return;
        }
        setIsDrawing(true);
        const { x, y } = getCoords(e);
        const context = canvasRef.current.getContext('2d');
        context.beginPath();
        context.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        
        // 터치 이벤트는 무시
        if (e.pointerType === 'touch') {
            return;
        }

        const { x, y } = getCoords(e);
        const context = canvasRef.current.getContext('2d');
        context.lineTo(x, y);
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            const context = canvasRef.current.getContext('2d');
            context.closePath();
            setIsDrawing(false);
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        context.fillStyle = '#1E293B'; // 배경색
        context.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    };
    
    const handleSave = () => {
        const canvas = canvasRef.current;
        // 배경을 포함하여 이미지 데이터 생성
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-4xl h-[80vh] bg-slate-800 rounded-2xl shadow-2xl flex flex-col p-4 border border-slate-700">
                {/* 툴바 */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <PenLine className="text-blue-400" size={20} />
                        <h3 className="text-lg font-bold text-white">자유로운 필기</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleClear} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                            <Eraser size={16} /> 지우기
                        </button>
                        <button onClick={onCancel} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-red-500/80 text-slate-300 hover:text-white rounded-lg text-sm transition-colors">
                            <X size={16} /> 취소
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
                            <Save size={16} /> 저장하고 닫기
                        </button>
                    </div>
                </div>
                
                {/* 캔버스 */}
                <div className="flex-grow w-full h-full rounded-lg overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing} // 캔버스 밖으로 나가면 드로잉 중지
                        className="w-full h-full cursor-crosshair"
                        // 팜 리젝션의 핵심: 터치로 인한 스크롤, 줌 등 방지
                        style={{ touchAction: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default DrawingPad;
