import React, { useRef, useEffect, useState } from 'react';
import { 
    Upload, ScanLine, Image as ImageIcon, CheckCircle2, 
    ChevronLeft, ChevronRight, FileText, Edit3, Trash2, 
    Plus, Sparkles, Layers, Terminal, BookOpen, Maximize2, X,
    Link 
} from 'lucide-react';

// 🔴 공통 상수 import
import { SUBJECT_LIST, PROBLEM_TYPES } from '/src/utils/constants';

// Step 1: 초기 선택 및 업로드 화면
export const UploadIntro = ({ formData, setFormData, isManualMode, inputFileRef, onUpload, onViewMode, setStep }) => (
    <div className="animate-in fade-in py-8">
        <div className="mb-8">
            <label className="block text-sm font-bold text-slate-400 mb-3 text-center">어떤 자료를 등록하시나요?</label>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button onClick={() => setFormData({ ...formData, type: 'workbook' })} className={`py-3 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'workbook' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}><CheckCircle2 size={16} /> 문제집 / 노트</button>
                <button onClick={() => setFormData({ ...formData, type: 'visual' })} className={`py-3 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'visual' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}><ImageIcon size={16} /> 도면 / 현장사진</button>
            </div>
        </div>
        
        <div className="max-w-sm mx-auto">
            <div 
                className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-800/30 transition-all group relative cursor-pointer bg-slate-950/30" 
                onClick={() => { 
                    if(inputFileRef.current) inputFileRef.current.value = null; 
                    inputFileRef.current.click(); 
                }}
            >
                <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" ref={inputFileRef} />
                <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors duration-300">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all shadow-lg ring-1 ring-slate-700 group-hover:ring-emerald-500/50">
                        {isManualMode ? <Edit3 size={28} /> : <Upload size={28} />}
                    </div>
                    <p className="font-bold text-lg">사진 업로드</p>
                    <p className="text-xs text-slate-500 mt-1">{isManualMode ? '직접 내용을 입력합니다' : 'Gemini AI가 내용을 분석합니다'}</p>
                </div>
            </div>
            
            {isManualMode && (
                <button onClick={() => { onViewMode('problem'); setStep(3); }} className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600">
                    <FileText size={16} /> 사진 없이 텍스트만 입력하기
                </button>
            )}
        </div>
    </div>
);

// Step 2: 분석 로딩 화면
export const AnalysisLoading = ({ previewUrl }) => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center animate-in fade-in">
        <div className="relative w-full max-w-sm aspect-video bg-slate-950 rounded-xl overflow-hidden mb-8 border border-slate-800 shadow-2xl">
            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-40 blur-sm" />}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_30px_rgba(52,211,153,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center flex-col text-emerald-400 font-mono text-sm bg-black/10 backdrop-blur-[1px]">
                <ScanLine size={48} className="mb-4 animate-pulse" />
                <span className="animate-pulse font-bold tracking-wider">ANALYZING IMAGE...</span>
            </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">이미지를 분석하고 있습니다</h3>
        <p className="text-slate-400 text-sm">문제 지문과 핵심 내용을 추출합니다.</p>
    </div>
);

// Step 3 (Left): 이미지 뷰어
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef 
}) => {
    const [isZoomed, setIsZoomed] = useState(false);

    const next = () => setIndex((currentIndex + 1) % activeUrls.length);
    const prev = () => setIndex((currentIndex - 1 + activeUrls.length) % activeUrls.length);
    
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            const activeEl = scrollRef.current.children[currentIndex + 1]; 
            if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [currentIndex]);

    return (
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">
            <div className="flex p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                <button onClick={() => setViewMode('problem')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${viewMode === 'problem' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Layers size={14} /> 문제 ({problemCount})
                </button>
                <button onClick={() => setViewMode('answer')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${viewMode === 'answer' ? 'bg-emerald-900/30 text-emerald-400 shadow-sm ring-1 ring-emerald-900/50' : 'text-slate-500 hover:text-slate-300'}`}>
                    <FileText size={14} /> 해설 ({answerCount})
                </button>
            </div>

            <div className={`aspect-[3/4] bg-slate-950 rounded-xl border overflow-hidden flex items-center justify-center relative group shadow-inner ${viewMode === 'answer' ? 'border-emerald-500/30' : 'border-slate-800'}`}>
                {activeUrls && activeUrls.length > 0 ? (
                    <>
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur p-1.5 rounded-lg text-white opacity-80 pointer-events-none z-10 flex items-center gap-1 text-xs font-bold shadow-md">
                            <Maximize2 size={14} /> <span>확대</span>
                        </div>

                        <img 
                            src={activeUrls[currentIndex]} 
                            alt="Preview" 
                            className="w-full h-full object-contain cursor-zoom-in active:scale-[0.98] transition-transform" 
                            onClick={() => setIsZoomed(true)} 
                        />
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemove(); }} 
                            className="absolute top-3 right-3 bg-red-600 text-white p-2.5 rounded-xl z-20 shadow-lg transform active:scale-90 transition-all hover:bg-red-500 border border-red-400/50"
                            title="현재 이미지 삭제"
                        >
                            <Trash2 size={18} />
                        </button>
                        
                        {activeUrls.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 bg-black/40 hover:bg-black/60 backdrop-blur text-white p-2 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                                <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 bg-black/40 hover:bg-black/60 backdrop-blur text-white p-2 rounded-full transition-colors"><ChevronRight size={24} /></button>
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 pointer-events-none">
                                    {currentIndex + 1} / {activeUrls.length}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                        <ImageIcon size={48} className="opacity-20" />
                        <span>이미지가 없습니다</span>
                    </div>
                )}
            </div>

            <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x px-1 min-h-[70px]">
                <div onClick={() => { if(inputAddRef.current) inputAddRef.current.value=null; inputAddRef.current.click(); }} className={`w-16 h-16 shrink-0 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors ${viewMode === 'answer' ? 'border-emerald-500/30 text-emerald-500' : 'border-slate-700 text-slate-500'}`}>
                    <input type="file" accept="image/*" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={20} />
                </div>
                {activeUrls && activeUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setIndex(idx)} className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all snap-start relative ${idx === currentIndex ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                        <img src={url} className="w-full h-full object-cover" alt={`thumb-${idx}`} />
                    </button>
                ))}
            </div>

            {isZoomed && activeUrls.length > 0 && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsZoomed(false)}>
                    <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors" onClick={() => setIsZoomed(false)}>
                        <X size={32} />
                    </button>
                    <img 
                        src={activeUrls[currentIndex]} 
                        alt="Zoomed" 
                        className="max-w-full max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95 duration-200" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>
    );
};

// Step 3 (Right): 입력 폼
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer }) => (
    <div className="flex-1 space-y-5 h-full overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Layers size={12} /> 과목 분류</label>
                <div className="relative">
                    <select 
                        value={formData.category} 
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-sm appearance-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    >
                        {SUBJECT_LIST.map((subject) => (
                            <option key={subject} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><BookOpen size={12} /> 문제 유형</label>
                <div className="relative">
                    <select 
                        value={formData.problemType} 
                        onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-sm appearance-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    >
                        {PROBLEM_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">제목</label>
            <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white font-bold rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-slate-600" placeholder="문제의 핵심 주제를 입력하세요" />
        </div>

        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">문제 지문 / 내용</label>
            <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-28 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed placeholder:text-slate-700" placeholder="문제 내용을 입력하세요..." />
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">정답 및 해설</label>
                {isAnalyzingAnswer && (
                    <span className="text-emerald-400 text-[10px] font-bold animate-pulse flex items-center gap-1 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <Sparkles size={10} /> Gemini 분석 중...
                    </span>
                )}
            </div>
            <textarea value={formData.modelAnswer || ''} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className={`w-full h-40 bg-slate-950 border text-slate-300 rounded-xl p-3 text-sm outline-none transition-all resize-none leading-relaxed placeholder:text-slate-700 ${isAnalyzingAnswer ? 'border-emerald-500/50 bg-emerald-950/10 ring-1 ring-emerald-500/20' : 'border-slate-800 focus:border-emerald-500'}`} placeholder="정답과 해설을 입력하세요..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">태그 (키워드)</label>
                {/* 🔴 [수정] value={formData.keywords || ''} 적용으로 AI 분석 결과 유실 방지 */}
                <input type="text" value={formData.keywords || ''} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-emerald-400 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-slate-700" placeholder="#화재안전기준, #설치기준" />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-blue-400 flex items-center gap-1 uppercase tracking-tight">
                    <Link size={12} /> 출처 / 참고
                </label>
                <input 
                    type="text" 
                    value={formData.source || ''} 
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition-all placeholder:text-slate-700 shadow-inner" 
                    placeholder="예: 2024 기출, NFSC 101" 
                />
            </div>
        </div>
    </div>
);

// 모바일 디버그 콘솔
export const DebugConsole = ({ logs, show, onClose, onClear }) => {
    const ref = useRef(null);
    useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
    if (!show) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-[100] h-52 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 border-b border-slate-800">
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-2">
                    <Terminal size={12} /> SYSTEM LOG CONSOLE
                </span>
                <div className="flex gap-3">
                    <button onClick={onClear} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">CLEAR</button>
                    <button onClick={onClose} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">CLOSE</button>
                </div>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                {logs.length === 0 && <div className="text-slate-600 italic px-1">시스템 대기 중...</div>}
                {logs.map((log, i) => (
                    <div key={i} className="text-emerald-400/80 break-all border-b border-slate-800/50 pb-1 flex gap-2">
                        <span className="opacity-50 select-none">&gt;</span>
                        <span>{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};