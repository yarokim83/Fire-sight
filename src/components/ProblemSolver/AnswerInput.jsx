import React, { useRef, useState } from 'react';
import { Type, PenTool, Check, Eraser, RotateCcw } from 'lucide-react';
import SharedCanvas from './SharedCanvas'; // 🔴 우리가 만든 공통 도화지 불러오기! (경로 확인)

const AnswerInput = ({ state, actions }) => {
    const { inputMode, userAnswer } = state;
    const { setInputMode, setUserAnswer, handleSubmit } = actions;

    const sharedCanvasRef = useRef(null);
    
    // 🔴 연습장과 완전히 동일한 펜 상태 관리
    const [penColor, setPenColor] = useState('#000000'); // 하얀 도화지라 기본은 검은색
    const [lineWidth, setLineWidth] = useState(4); // 기본 굵기 4
    const [isEraserMode, setIsEraserMode] = useState(false);

    const clearCanvas = () => {
        if (sharedCanvasRef.current) sharedCanvasRef.current.clear();
    };

    const handleSubmitInternal = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (inputMode === 'draw' && sharedCanvasRef.current) {
            // 하얀 배경을 깔아서 이미지를 추출합니다.
            const imageDataUrl = sharedCanvasRef.current.getImageData('white');
            setUserAnswer(imageDataUrl);
        }
        handleSubmit();
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border-2 border-slate-800 focus-within:border-blue-500 transition-all relative group animate-in fade-in">
            {/* 상단 툴바 (텍스트 / 드로잉 모드 전환 전용) */}
            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between z-10">
                <div className="flex gap-3">
                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
                        <Type size={14} /> TEXT
                    </button>
                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
                        <PenTool size={14} /> DRAW
                    </button>
                </div>
            </div>

            {/* 입력 영역 */}
            <div className="relative w-full h-[450px] bg-white">
                {inputMode === 'text' ? (
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="이곳에 답안을 서술하세요..."
                        className="w-full h-full p-8 text-slate-900 text-xl font-bold leading-relaxed outline-none resize-none placeholder:text-slate-300 font-sans border-none shadow-inner"
                        spellCheck="false"
                    />
                ) : (
                    <div className="absolute inset-0">
                        {/* 🔴 무적의 공통 캔버스 장착 */}
                        <SharedCanvas 
                            ref={sharedCanvasRef}
                            penColor={penColor}
                            lineWidth={lineWidth}
                            isEraserMode={isEraserMode}
                            className="bg-slate-50 rounded-b-[2rem]"
                        />

                        {/* 🔴 연습장(Overlay)과 100% 똑같은 다크 테마 플로팅 툴바! */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-5 py-3 rounded-[1.5rem] flex gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)] pointer-events-auto items-center animate-in slide-in-from-bottom-5">
                            <div className="flex gap-2.5 border-r border-slate-700 pr-4">
                                {['#000000', '#ef4444', '#3b82f6', '#10b981', '#facc15'].map(color => (
                                    <button 
                                        key={color} 
                                        onClick={() => { setPenColor(color); setIsEraserMode(false); }}
                                        className={`w-7 h-7 rounded-full border-2 transition-transform ${(!isEraserMode && penColor === color) ? 'border-amber-400 scale-125 shadow-lg' : 'border-slate-600 hover:scale-110'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            
                            <div className="flex gap-2.5 border-r border-slate-700 pr-4 items-center">
                                {[2, 4, 8].map(weight => (
                                    <button 
                                        key={weight}
                                        onClick={() => setLineWidth(weight)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${lineWidth === weight ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                                    >
                                        <div className="bg-white rounded-full" style={{ width: weight * 2, height: weight * 2 }} />
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex gap-2.5">
                                <button 
                                    onClick={() => setIsEraserMode(!isEraserMode)} 
                                    className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black tracking-widest ${isEraserMode ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                >
                                    <Eraser size={16} /> 부분 지우개
                                </button>
                                <button onClick={clearCanvas} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black tracking-widest" title="전체 지우기">
                                    <RotateCcw size={16} /> 전체 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 우측 하단 제출 버튼 (툴바와 겹치지 않게 배치) */}
                <div className="absolute bottom-6 right-6 z-30">
                    <button 
                        onClick={handleSubmitInternal} 
                        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-[1.2rem] font-black shadow-2xl hover:shadow-blue-500/40 transition-all transform active:scale-95 pointer-events-auto"
                        style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                    >
                        <Check size={20} /> {inputMode === 'draw' ? '정답 확인' : '제출하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnswerInput;