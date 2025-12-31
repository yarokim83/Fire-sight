import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Trash2, X, PenTool, Circle } from 'lucide-react';

const DrawingCanvas = ({ width, height, isActive, onClose }) => {
    const canvasRef = useRef(null);
    const [tool, setTool] = useState('pen');
    const [penSize, setPenSize] = useState(2);
    
    // React State로 좌표를 관리하면 느려지므로 Ref 변수 사용
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // =================================================================
    // 1. 캔버스 초기화 (Retina/Hi-DPI 디스플레이 대응)
    // =================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { desynchronized: true }); // 지연 시간 감소 옵션
        
        // 아이패드 Retina 디스플레이 대응 (픽셀 밀도에 맞춰 캔버스 크기 뻥튀기)
        const dpr = window.devicePixelRatio || 1;
        
        // 실제 렌더링 사이즈
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // 화면에 보여지는 사이즈 (CSS)
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // 모든 그리기 작업에 스케일 적용
        ctx.scale(dpr, dpr);
        
        // 선 스타일 기본 설정
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 저장된 설정 적용 (리사이즈 시 초기화 방지 로직 필요시 추가)
        updateContextStyle(ctx, tool, penSize);

    }, [width, height]); // 화면 크기가 바뀔 때만 재설정

    // =================================================================
    // 2. 도구 변경 시 스타일 업데이트
    // =================================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        updateContextStyle(ctx, tool, penSize);
    }, [tool, penSize]);

    const updateContextStyle = (ctx, currentTool, currentSize) => {
        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20; 
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#f59e0b'; // Amber-500
            ctx.lineWidth = currentSize;
        }
    };

    // =================================================================
    // 3. 고성능 드로잉 로직 (Pointer Events + 곡선 보정)
    // =================================================================
    
    const getCoordinates = (e) => {
        // TouchEvent와 MouseEvent 통합 처리
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        if (!isActive) return;
        e.preventDefault(); // 스크롤 방지
        
        isDrawing.current = true;
        const { x, y } = getCoordinates(e);
        lastPos.current = { x, y };
    };

    const draw = (e) => {
        if (!isDrawing.current || !isActive) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // [핵심 1] Coalesced Events: 브라우저가 놓친 펜의 중간 좌표들까지 모두 가져옴
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

        events.forEach((event) => {
            const { x, y } = getCoordinates(event);
            
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            
            // [핵심 2] 부드러운 곡선 처리 (Quadratic Curve)
            // 단순히 lineTo를 쓰면 각져 보임. 중간 지점을 제어점으로 사용.
            // 여기서는 성능을 위해 짧은 구간은 lineTo, 긴 구간만 곡선 처리하거나
            // 단순히 촘촘한 이벤트 덕분에 lineTo로도 충분할 수 있으나,
            // 더 부드럽게 하려면 아래 방식을 씁니다.
            
            // *단순 방식 (반응속도 최우선)*
            ctx.lineTo(x, y);
            ctx.stroke();

            lastPos.current = { x, y };
        });
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        // 선 끊김 방지를 위해 마지막 점 처리 등을 할 수 있음
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    };

    return (
        <div className={`absolute inset-0 z-20 transition-opacity duration-300 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <canvas
                ref={canvasRef}
                className="block touch-none cursor-crosshair bg-transparent"
                // [핵심 3] Pointer Events 사용 (Mouse/Touch/Pen 통합 및 정밀도 향상)
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                // 터치 제스처 충돌 방지
                style={{ touchAction: 'none' }}
            />

            {/* Floating Toolbar (기존 디자인 유지) */}
            {isActive && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">

                    {/* Pen Mode (Thin) */}
                    <button
                        onClick={() => { setTool('pen'); setPenSize(2); }}
                        className={`p-3 rounded-full transition-all ${tool === 'pen' && penSize === 2 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <PenTool size={18} strokeWidth={2} />
                    </button>

                    {/* Pen Mode (Thick) */}
                    <button
                        onClick={() => { setTool('pen'); setPenSize(5); }}
                        className={`p-3 rounded-full transition-all ${tool === 'pen' && penSize === 5 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Circle size={14} fill="currentColor" stroke="none" />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    {/* Eraser */}
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-3 rounded-full transition-all ${tool === 'eraser' ? 'bg-slate-600 text-white shadow-lg ring-2 ring-slate-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Eraser size={20} />
                    </button>

                    {/* Clear */}
                    <button
                        onClick={clearCanvas}
                        className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-all"
                    >
                        <Trash2 size={20} />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DrawingCanvas;