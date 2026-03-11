import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const SharedCanvas = forwardRef(({ 
    penColor = '#000000', 
    lineWidth = 2, 
    isEraserMode = false,
    className = "",
    style = {}
}, ref) => {
    const internalCanvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const activePointerId = useRef(null);

    useImperativeHandle(ref, () => ({
        clear: () => {
            const canvas = internalCanvasRef.current;
            if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        },
        getImageData: (bgColor = 'transparent') => {
            const canvas = internalCanvasRef.current;
            if (!canvas) return null;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (bgColor !== 'transparent') { tempCtx.fillStyle = bgColor; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); }
            tempCtx.drawImage(canvas, 0, 0);
            return tempCanvas.toDataURL('image/png');
        }
    }));

    // 🔴 [핵심 방어막] React의 한계를 넘어 브라우저 터치 스크롤/드래그 강제 차단!
    useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;

        const preventBehavior = (e) => { e.preventDefault(); };
        
        // 브라우저 기본 터치 제스처 완벽 차단
        canvas.addEventListener('touchstart', preventBehavior, { passive: false });
        canvas.addEventListener('touchmove', preventBehavior, { passive: false });
        canvas.addEventListener('touchend', preventBehavior, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', preventBehavior);
            canvas.removeEventListener('touchmove', preventBehavior);
            canvas.removeEventListener('touchend', preventBehavior);
        };
    }, []);

    // 리사이즈 로직
    useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        const updateSize = () => {
            if (!parent || parent.clientWidth === 0) return;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width || parent.clientWidth;
            tempCanvas.height = canvas.height || parent.clientHeight;
            const tempCtx = tempCanvas.getContext('2d');
            if (canvas.width > 0 && canvas.height > 0) tempCtx.drawImage(canvas, 0, 0);
            canvas.width = parent.clientWidth; canvas.height = parent.clientHeight;
            canvas.getContext('2d').drawImage(tempCanvas, 0, 0);
        };
        const observer = new ResizeObserver(updateSize);
        observer.observe(parent); updateSize();
        return () => observer.disconnect();
    }, []);

    const startDrawing = (e) => {
        if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        activePointerId.current = e.pointerId;
        const ctx = internalCanvasRef.current.getContext('2d');
        const rect = internalCanvasRef.current.getBoundingClientRect();

        ctx.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = isEraserMode ? lineWidth * 3 : lineWidth;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || e.pointerId !== activePointerId.current) return;
        const ctx = internalCanvasRef.current.getContext('2d');
        const rect = internalCanvasRef.current.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        if (e.pointerId === activePointerId.current) { setIsDrawing(false); activePointerId.current = null; }
    };

    return (
        <canvas
            ref={internalCanvasRef}
            onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing} onPointerCancel={stopDrawing} onDragStart={(e) => e.preventDefault()}
            className={`cursor-crosshair ${className}`}
            style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', display: 'block', ...style }}
        />
    );
});

SharedCanvas.displayName = 'SharedCanvas';
export default SharedCanvas;