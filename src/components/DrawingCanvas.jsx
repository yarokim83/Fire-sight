import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Trash2, X } from 'lucide-react';

const DrawingCanvas = ({ width, height, isActive, onClose }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [context, setContext] = useState(null);

    // Initial Setup
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#f59e0b'; // Amber-500 for high visibility
        ctx.lineWidth = 3;
        setContext(ctx);

        // Handle resize if needed, though usually fixed by parent container
        const handleResize = () => {
            // Optional: Implement robust resize logic if needed
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const startDrawing = (e) => {
        if (!context) return;
        const { x, y } = getCoordinates(e);
        context.beginPath();
        context.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || !context) return;
        e.preventDefault(); // Prevent scrolling on touch
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
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    // If not active, don't render or render hidden to preserve state? 
    // Requirement says "Overlay on top". If inactive, it should be pointer-events-none or hidden.
    // To preserve drawing, we should keep it rendered but hidden/transparent.

    return (
        <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${isActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="w-full h-full touch-none cursor-crosshair" // touch-none is critical for preventing scrolling
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />

            {/* Canvas Controls */}
            {isActive && (
                <div className="absolute top-2 right-2 flex gap-2">
                    <button
                        onClick={clearCanvas}
                        className="p-2 bg-slate-800/80 backdrop-blur text-slate-300 rounded-full border border-slate-600 shadow-lg hover:bg-slate-700 active:scale-95"
                    >
                        <Trash2 size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800/80 backdrop-blur text-slate-300 rounded-full border border-slate-600 shadow-lg hover:bg-slate-700 active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DrawingCanvas;
