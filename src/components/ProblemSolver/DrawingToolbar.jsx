import React from 'react';
import { Eraser, RotateCcw, X } from 'lucide-react';

export default function DrawingToolbar({
    penColor, setPenColor,
    lineWidth, setLineWidth,
    isEraserMode, setIsEraserMode,
    clearCurrentCanvas,
    onClose
}) {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1e293b]/90 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-full flex items-center gap-2 md:gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto animate-in slide-in-from-bottom-5 z-[200]">
            
            {/* 1. 색상 팔레트 */}
            <div className="flex items-center gap-1.5 md:gap-2">
                {['#000000', '#ffffff', '#facc15', '#ef4444', '#3b82f6', '#10b981'].map(color => (
                    <button 
                        key={color} 
                        onClick={() => { setPenColor(color); setIsEraserMode(false); }}
                        title={`${color} 색상`}
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                            (!isEraserMode && penColor === color) 
                            ? 'border-blue-400 scale-125 shadow-[0_0_12px_rgba(59,130,246,0.6)]' 
                            : 'border-white/20 hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
            
            <div className="w-px h-5 bg-slate-600/50 mx-1 md:mx-2"></div>
            
            {/* 2. 선 굵기 조절 */}
            <div className="flex items-center gap-1">
                {[2, 4, 8].map(weight => (
                    <button 
                        key={weight}
                        onClick={() => { setLineWidth(weight); setIsEraserMode(false); }}
                        title={`굵기 ${weight}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            (!isEraserMode && lineWidth === weight) ? 'bg-slate-700/80 ring-1 ring-slate-500' : 'hover:bg-slate-800/50'
                        }`}
                    >
                        <div className="bg-slate-300 rounded-full" style={{ width: weight * 1.5, height: weight * 1.5 }} />
                    </button>
                ))}
            </div>
            
            <div className="w-px h-5 bg-slate-600/50 mx-1 md:mx-2"></div>
            
            {/* 3. 도구 액션 (텍스트 완전 제거, 아이콘만 남김!) */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => setIsEraserMode(!isEraserMode)} 
                    title="부분 지우개"
                    className={`p-2 rounded-full transition-all ${
                        isEraserMode 
                        ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] scale-110' 
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                    <Eraser size={18} strokeWidth={isEraserMode ? 2.5 : 2} />
                </button>
                <button 
                    onClick={clearCurrentCanvas} 
                    title="전체 삭제"
                    className="p-2 rounded-full text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                >
                    <RotateCcw size={18} />
                </button>
                
                {/* 오버레이(연습장) 모드일 때만 나오는 닫기 버튼 */}
                {onClose && (
                    <>
                        <div className="w-px h-4 bg-slate-600/50 mx-1"></div>
                        <button 
                            onClick={onClose} 
                            title="연습장 닫기"
                            className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
