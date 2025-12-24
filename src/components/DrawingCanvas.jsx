import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Trash2, X, PenTool, Circle } from 'lucide-react';

const DrawingCanvas = ({ width, height, isActive, onClose }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    // Tools: 'pen' | 'eraser'
    const [tool, setTool] = useState('pen');
    // Pen Size: 2 (Thin) | 5 (Thick)
    const [penSize, setPenSize] = useState(2);

    // Initial Setup & Responsive Sizing
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
        canvas.style.touchAction = 'none';

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            // Only update if dimensions actually changed to avoid clearing canvas unnecessarily
            // Note: resizing clearing canvas is native behavior. 
            // TO DO: Implement save/restore of image data if we want to preserve drawing on resize.
            // For now, we accept clear on rotate for simplicity, or we can try to save.

            // Allow some tolerance or debouncing if needed, but direct match is best for crispness
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                // Save current drawing
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                canvas.width = rect.width;
                canvas.height = rect.height;

                // Restore context settings lost on resize
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.lineWidth = 20;
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = '#f59e0b';
                    ctx.lineWidth = penSize;
                }

                // Attempt to restore image - scaling is complex, so we just put it back at 0,0
                // This might look cropped or framed if resizing drastically.
                ctx.putImageData(imageData, 0, 0);
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            // updateSize(); // Causing flicker or clear loop? 
            // Use requestAnimationFrame to smooth it
            window.requestAnimationFrame(updateSize);
        });

        resizeObserver.observe(container);
        updateSize(); // Initial size

        return () => resizeObserver.disconnect();
    }, [tool, penSize]); // Re-bind if tool changes? No, context is stable. But we need tool state for restore.

    // Update Context settings when tool or size changes
    useEffect(() => {
        if (!context) return;

        if (tool === 'eraser') {
            context.globalCompositeOperation = 'destination-out';
            context.lineWidth = 20; // Eraser is always thick
        } else {
            context.globalCompositeOperation = 'source-over';
            context.strokeStyle = '#f59e0b'; // Amber-500
            context.lineWidth = penSize;
        }
    }, [context, tool, penSize]);

    const startDrawing = (e) => {
        if (!context) return;
        const { x, y } = getCoordinates(e);
        context.beginPath();
        context.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || !context) return;
        // e.preventDefault(); // Handled by CSS touch-action: none
        const { x, y } = getCoordinates(e);
        context.lineTo(x, y);
        context.stroke();
    };

    const stopDrawing = () => {
        if (context) context.closePath();
        setIsDrawing(false);
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Touch events
        if (e.touches && e.touches[0]) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }

        // Mouse events
        return {
            x: e.nativeEvent.offsetX,
            y: e.nativeEvent.offsetY
        };
    };

    const clearCanvas = () => {
        if (context && canvasRef.current) {
            // Reset composite op to ensure clearRect works if in eraser mode (though clearRect ignores composite op usually, safer to be sure)
            const currentOp = context.globalCompositeOperation;
            context.globalCompositeOperation = 'destination-out';
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            context.globalCompositeOperation = currentOp;
        }
    };

    return (
        <div className={`absolute inset-0 z-20 transition-opacity duration-300 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-full h-full touch-none cursor-crosshair bg-transparent"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />

            {/* Floating Toolbar */}
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
