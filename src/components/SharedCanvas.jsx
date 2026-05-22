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
    const pointsRef = useRef([]);

    useImperativeHandle(ref, () => ({
        clear: () => {
            const canvas = internalCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        },
        getImageData: (bgColor = 'transparent') => {
            const canvas = internalCanvasRef.current;
            if (!canvas) return null;
            const dpr = window.devicePixelRatio || 1;
            
            // 논리 크기로 다운샘플링하여 용량 최적화 및 기존 기능 호환성 유지
            const logicalWidth = canvas.width / dpr;
            const logicalHeight = canvas.height / dpr;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = logicalWidth;
            tempCanvas.height = logicalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (bgColor !== 'transparent') {
                tempCtx.fillStyle = bgColor;
                tempCtx.fillRect(0, 0, logicalWidth, logicalHeight);
            }
            
            // 물리 크기의 canvas를 논리 크기의 tempCanvas에 리사이즈하여 복사
            tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, logicalWidth, logicalHeight);
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

    // 리사이즈 로직 (High-DPI 반영 및 2중 스케일링 방지)
    useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        
        const updateSize = () => {
            if (!parent || parent.clientWidth === 0) return;
            const dpr = window.devicePixelRatio || 1;
            
            // 1. 기존 캔버스 내용을 물리 해상도 그대로 복사하여 임시 캔버스에 보관
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (canvas.width > 0 && canvas.height > 0) {
                tempCtx.drawImage(canvas, 0, 0);
            }
            
            // 2. 물리 픽셀 크기 설정 (dpr 적용)
            const nextWidth = parent.clientWidth * dpr;
            const nextHeight = parent.clientHeight * dpr;
            
            canvas.width = nextWidth;
            canvas.height = nextHeight;
            
            // 3. CSS 크기는 논리 픽셀로 지정하여 기존 레이아웃 완벽 유지
            canvas.style.width = `${parent.clientWidth}px`;
            canvas.style.height = `${parent.clientHeight}px`;
            
            // 4. 복원: transform 초기화 상태(물리 픽셀 기준)에서 1:1로 그림 복사
            const ctx = canvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (tempCanvas.width > 0 && tempCanvas.height > 0) {
                ctx.drawImage(tempCanvas, 0, 0);
            }
            
            // 5. 드로잉용 scale 지정 및 선 모양 둥글게 초기화
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };
        
        const observer = new ResizeObserver(updateSize);
        observer.observe(parent); 
        updateSize();
        
        return () => observer.disconnect();
    }, []);

    const startDrawing = (e) => {
        // Palm Rejection: 펜과 마우스만 드로잉 허용
        if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        
        activePointerId.current = e.pointerId;
        setIsDrawing(true);

        const canvas = internalCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // 캔버스 크기 배율과 화면 client 크기의 차이를 반영하여 스케일링된 펜 좌표 획득
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pressure = e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5;

        pointsRef.current = [{ x, y, pressure }];

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';

        // 단일 탭 대비 시작점에 작은 원 렌더링
        const strokeWidth = isEraserMode 
            ? lineWidth * 3 
            : (e.nativeEvent.pointerType === 'pen' ? lineWidth * (0.6 + pressure * 0.8) : lineWidth);
            
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        ctx.arc(x, y, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEraserMode ? 'rgba(0,0,0,1)' : penColor;
        ctx.fill();
    };

    const draw = (e) => {
        if (!isDrawing || e.pointerId !== activePointerId.current) return;
        
        const canvas = internalCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // 120Hz/240Hz 하드웨어 주사율 지원을 위한 Coalesced Events 수집
        let events = [];
        if (e.nativeEvent && typeof e.nativeEvent.getCoalescedEvents === 'function') {
            events = e.nativeEvent.getCoalescedEvents();
        }
        if (!events || events.length === 0) {
            events = [e];
        }

        ctx.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
        ctx.strokeStyle = penColor;

        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            const x = ev.clientX - rect.left;
            const y = ev.clientY - rect.top;
            const pressure = ev.pressure !== undefined && ev.pressure !== 0 ? ev.pressure : 0.5;

            const pts = pointsRef.current;
            if (pts.length > 0) {
                const lastPt = pts[pts.length - 1];
                const dx = x - lastPt.x;
                const dy = y - lastPt.y;
                // 0.2 픽셀 미만의 미세 움직임은 무시하여 리소스 낭비 방지
                if (dx * dx + dy * dy < 0.2) {
                    continue;
                }
            }

            pts.push({ x, y, pressure });

            if (pts.length === 2) {
                const p0 = pts[0];
                const p1 = pts[1];
                const avgPressure = (p0.pressure + p1.pressure) / 2;
                const strokeWidth = isEraserMode 
                    ? lineWidth * 3 
                    : (e.nativeEvent.pointerType === 'pen' ? lineWidth * (0.6 + avgPressure * 0.8) : lineWidth);

                ctx.lineWidth = strokeWidth;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            } else if (pts.length >= 3) {
                const p_prev2 = pts[pts.length - 3];
                const p_prev1 = pts[pts.length - 2];
                const p_curr = pts[pts.length - 1];

                // 중점(Midpoint)을 활용한 매끄러운 2차 베지에 곡선 보간
                const mid1 = {
                    x: (p_prev2.x + p_prev1.x) / 2,
                    y: (p_prev2.y + p_prev1.y) / 2
                };
                const mid2 = {
                    x: (p_prev1.x + p_curr.x) / 2,
                    y: (p_prev1.y + p_curr.y) / 2
                };

                const avgPressure = p_prev1.pressure;
                const strokeWidth = isEraserMode 
                    ? lineWidth * 3 
                    : (e.nativeEvent.pointerType === 'pen' ? lineWidth * (0.6 + avgPressure * 0.8) : lineWidth);

                ctx.lineWidth = strokeWidth;
                ctx.beginPath();
                ctx.moveTo(mid1.x, mid1.y);
                ctx.quadraticCurveTo(p_prev1.x, p_prev1.y, mid2.x, mid2.y);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = (e) => {
        if (e.pointerId !== activePointerId.current) return;
        
        if (isDrawing) {
            const canvas = internalCanvasRef.current;
            const ctx = canvas.getContext('2d');
            const pts = pointsRef.current;

            ctx.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
            ctx.strokeStyle = penColor;

            if (pts.length >= 2) {
                // 마지막 중점에서 최종 포인트까지 획 마무리
                const lastPt = pts[pts.length - 1];
                const prevPt = pts[pts.length - 2];
                
                let startX, startY;
                if (pts.length >= 3) {
                    const prevPrevPt = pts[pts.length - 3];
                    startX = (prevPrevPt.x + prevPt.x) / 2;
                    startY = (prevPrevPt.y + prevPt.y) / 2;
                } else {
                    startX = prevPt.x;
                    startY = prevPt.y;
                }

                const avgPressure = (prevPt.pressure + lastPt.pressure) / 2;
                const strokeWidth = isEraserMode 
                    ? lineWidth * 3 
                    : (e.nativeEvent.pointerType === 'pen' ? lineWidth * (0.6 + avgPressure * 0.8) : lineWidth);

                ctx.lineWidth = strokeWidth;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(lastPt.x, lastPt.y);
                ctx.stroke();
            }
            
            setIsDrawing(false);
            activePointerId.current = null;
            pointsRef.current = [];
        }
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