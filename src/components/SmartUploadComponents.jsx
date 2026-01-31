import React, { useRef, useEffect, useState } from 'react';
import { 
    Upload, ScanLine, Image as ImageIcon, CheckCircle2, 
    ChevronLeft, ChevronRight, FileText, Edit3, Trash2, 
    Plus, Sparkles, Layers, Terminal, BookOpen, Maximize2, X,
    Link, Hash, Target, Calculator, AlertCircle
} from 'lucide-react';

// 🔴 공통 상수 import (상대 경로 확인 필수)
import { SUBJECT_LIST, PROBLEM_TYPES } from '../utils/constants';

/** ---------------------------------------------------------
 * Step 1: 업로드 인트로 화면
 * 기능: 유형 선택(문제집/현장), 파일 선택 UI
 --------------------------------------------------------- */
export const UploadIntro = ({ formData, setFormData, isManualMode, inputFileRef, onUpload, onViewMode, setStep }) => (
    <div className="animate-in fade-in py-12">
        <div className="text-center mb-10">
            <h3 className="text-xl font-black text-white mb-2">자료 등록 방식 선택</h3>
            <p className="text-slate-500 text-sm">2027년 합격을 위한 첫 걸음, 정확한 분류가 생명입니다.</p>
        </div>

        <div className="mb-10">
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-inner">
                <button 
                    onClick={() => setFormData({ ...formData, type: 'workbook' })} 
                    className={`py-4 px-4 rounded-xl text-sm font-black transition-all flex flex-col items-center gap-2 ${formData.type === 'workbook' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <BookOpen size={20} /> 문제집 / 암기노트
                </button>
                <button 
                    onClick={() => setFormData({ ...formData, type: 'visual' })} 
                    className={`py-4 px-4 rounded-xl text-sm font-black transition-all flex flex-col items-center gap-2 ${formData.type === 'visual' ? 'bg-slate-800 text-white shadow-lg ring-1 ring-slate-700' : 'text-slate-600 hover:text-slate-400'}`}
                >
                    <ImageIcon size={20} /> 도면 / 현장 사진
                </button>
            </div>
        </div>
        
        <div className="max-w-sm mx-auto">
            <div 
                className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-slate-700 rounded-3xl hover:border-emerald-500/50 hover:bg-slate-800/30 transition-all group relative cursor-pointer bg-slate-950/30 overflow-hidden" 
                onClick={() => { if(inputFileRef.current) inputFileRef.current.value = null; inputFileRef.current.click(); }}
            >
                <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" ref={inputFileRef} />
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors duration-300">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all shadow-2xl ring-1 ring-slate-700 group-hover:ring-emerald-500/50">
                        {isManualMode ? <Edit3 size={32} /> : <Upload size={32} />}
                    </div>
                    <p className="font-black text-xl mb-1">사진 업로드하기</p>
                    <p className="text-xs text-slate-500 font-medium">Gemini 1.5 Pro가 텍스트를 정밀 분석합니다</p>
                </div>
            </div>
        </div>
    </div>
);

/** ---------------------------------------------------------
 * Step 2: 분석 로딩 화면
 * 기능: 스캔 애니메이션 시각화
 --------------------------------------------------------- */
export const AnalysisLoading = ({ previewUrl }) => (
    <div className="flex flex-col items-center justify-center h-[500px] text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative w-full max-w-md aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden mb-10 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-30 blur-[2px]" />}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_40px_rgba(52,211,153,1)] animate-[scan_2.5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center flex-col text-emerald-400 font-mono">
                <div className="relative mb-6">
                    <ScanLine size={64} className="animate-pulse" />
                    <Sparkles size={24} className="absolute -top-2 -right-2 animate-bounce text-amber-400" />
                </div>
                <span className="text-sm font-black tracking-[0.2em] animate-pulse">EXTRACTING FIRE DATA...</span>
            </div>
        </div>
        <h3 className="text-2xl font-black text-white mb-3">AI가 소방 지문을 읽고 있습니다</h3>
    </div>
);

/** ---------------------------------------------------------
 * Step 3 (Left): 이미지 뷰어
 * 기능: 문제/해설 탭 전환 및 이미지 관리
 --------------------------------------------------------- */
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef 
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const next = () => setIndex((currentIndex + 1) % (activeUrls.length || 1));
    const prev = () => setIndex((currentIndex - 1 + (activeUrls.length || 1)) % (activeUrls.length || 1));

    return (
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-5">
            <div className="flex p-1.5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                <button 
                    onClick={() => setViewMode('problem')} 
                    className={`flex-1 py-3 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all ${viewMode === 'problem' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Layers size={16} /> 문제 ({problemCount})
                </button>
                <button 
                    onClick={() => setViewMode('answer')} 
                    className={`flex-1 py-3 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all ${viewMode === 'answer' ? 'bg-emerald-900/30 text-emerald-400 shadow-lg ring-1 ring-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <FileText size={16} /> 해설 ({answerCount})
                </button>
            </div>

            <div className={`aspect-[3/4] bg-slate-950 rounded-3xl border-2 overflow-hidden flex items-center justify-center relative group transition-colors ${viewMode === 'answer' ? 'border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-slate-800'}`}>
                {activeUrls && activeUrls.length > 0 ? (
                    <>
                        <img src={activeUrls[currentIndex]} className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform duration-500" onClick={() => setIsZoomed(true)} />
                        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="absolute top-4 right-4 bg-red-500/90 text-white p-3 rounded-2xl z-30 shadow-2xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20} /></button>
                        {activeUrls.length > 1 && (
                            <>
                                <button onClick={prev} className="absolute left-3 bg-black/50 hover:bg-emerald-500 text-white p-3 rounded-2xl backdrop-blur-sm transition-all z-20">〈</button>
                                <button onClick={next} className="absolute right-3 bg-black/50 hover:bg-emerald-500 text-white p-3 rounded-2xl backdrop-blur-sm transition-all z-20">〉</button>
                            </>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-700">
                        <ImageIcon size={32} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                    </div>
                )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x px-1 min-h-[85px]">
                <div onClick={() => inputAddRef.current.click()} className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 text-slate-500 transition-all">
                    <input type="file" accept="image/*" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={24} />
                    <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Add</span>
                </div>
                {activeUrls && activeUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setIndex(idx)} className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start ${idx === currentIndex ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-transparent opacity-40'}`}><img src={url} className="w-full h-full object-cover" alt="" /></button>
                ))}
            </div>

            {isZoomed && activeUrls.length > 0 && (
                <div className="fixed inset-0 z-[9999] bg-black/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsZoomed(false)}>
                    <img src={activeUrls[currentIndex]} className="max-w-full max-h-[95vh] object-contain shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 3 (Right): 입력 폼 (🔴 수치 유실 근본 해결 및 고도화 버전)
 --------------------------------------------------------- */
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer, updateGradingPoint }) => {
    
    // 🔴 [근본 해결] 루트 레벨의 numbers 데이터까지 강제 바인딩 (유실 방지)
    const terms = formData.gradingPoints?.mandatory_terms || [];
    const numbers = formData.gradingPoints?.mandatory_numbers || formData.numbers || [];

    return (
        <div className="flex-1 space-y-6 h-full overflow-y-auto pr-2 pb-20 scrollbar-hide">
            {/* 1. 카테고리 분류 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest"><Layers size={12} className="text-emerald-500" /> Subject</label>
                    <select 
                        value={formData.category} 
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 text-sm font-bold focus:border-emerald-500 transition-all outline-none"
                    >
                        {SUBJECT_LIST?.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest"><BookOpen size={12} className="text-blue-500" /> Type</label>
                    <select 
                        value={formData.problemType} 
                        onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 text-sm font-bold focus:border-emerald-500 transition-all outline-none"
                    >
                        {PROBLEM_TYPES?.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. 제목 및 지문 */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Title</label>
                <input 
                    type="text" 
                    value={formData.title || ''} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 text-white font-black rounded-2xl p-4 text-base focus:border-emerald-500 outline-none transition-all shadow-inner" 
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-emerald-500/80">Problem Content</label>
                <textarea 
                    value={formData.description || ''} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="w-full h-32 bg-slate-950 border border-slate-800 text-slate-300 rounded-2xl p-5 text-sm font-medium outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed" 
                />
            </div>

            {/* 3. 모범 답안 및 해설 */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model Answer & Commentary</label>
                    {isAnalyzingAnswer && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                            <Sparkles size={12} className="text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">Syncing...</span>
                        </div>
                    )}
                </div>
                <textarea 
                    value={formData.modelAnswer || ''} 
                    onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} 
                    className={`w-full h-48 bg-slate-950 border text-slate-300 rounded-2xl p-5 text-sm font-medium outline-none transition-all resize-none leading-relaxed shadow-2xl ${isAnalyzingAnswer ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 focus:border-emerald-500'}`} 
                />
            </div>

            {/* 4. 검색 메타데이터 */}
            <div className="p-6 bg-slate-950/80 rounded-3xl border border-slate-800 shadow-lg group">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-4 tracking-widest">
                    <Hash size={14} className="text-emerald-500" /> Search Keywords (쉼표 구분)
                </label>
                <input 
                    type="text" 
                    value={formData.keywords || ''} 
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} 
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl px-4 py-3 text-sm font-black focus:border-emerald-500 outline-none transition-all" 
                />
            </div>

            {/* 5. 🔴 AI 정밀 채점 포인트 에디터 (수치 보정 테마 적용) */}
            <div className="p-6 bg-slate-900/80 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <h4 className="text-[11px] font-black text-emerald-500 uppercase flex items-center gap-2 tracking-widest"><Target size={16} /> Grading Criteria</h4>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'add')} className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">+ 용어</button>
                        <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'add')} className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all">+ 수치</button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <Calculator size={12} className="text-emerald-500/50" /> Mandatory Terms (40%)
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {terms.length > 0 ? terms.map((term, i) => (
                            <div key={i} className="flex items-center gap-2 bg-emerald-900/30 px-3 py-2 rounded-xl border border-emerald-700/30 animate-in zoom-in-90">
                                <input value={term} onChange={(e) => updateGradingPoint('mandatory_terms', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-[11px] text-emerald-200 w-24 font-black" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'remove', null, i)} className="text-emerald-700 hover:text-red-400 transition-colors"><X size={12} /></button>
                            </div>
                        )) : <div className="text-[10px] text-slate-700 italic px-1">등록된 용어가 없습니다.</div>}
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <AlertCircle size={12} className="text-amber-400" /> Mandatory Numbers (60%)
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {numbers.length > 0 ? numbers.map((num, i) => (
                            <div key={i} className="flex items-center gap-2 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20 animate-in zoom-in-90">
                                <input value={num} onChange={(e) => updateGradingPoint('mandatory_numbers', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-[11px] text-amber-200 w-20 font-black placeholder:text-amber-800" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'remove', null, i)} className="text-amber-700 hover:text-red-400 transition-colors"><X size={12} /></button>
                            </div>
                        )) : <div className="text-[10px] text-slate-700 italic px-1">등록된 수치가 없습니다.</div>}
                    </div>
                </div>
            </div>

            {/* 6. 출처 및 참조 */}
            <div className="space-y-2 p-1">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest"><Link size={14} className="text-blue-400" /> Source Reference</label>
                <input 
                    type="text" 
                    value={formData.source || ''} 
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 text-blue-400 rounded-2xl p-4 text-sm font-black focus:border-blue-500 transition-all outline-none" 
                    placeholder="예: 2026년 기출, NFPC 101"
                />
            </div>
        </div>
    );
};

/** ---------------------------------------------------------
 * Debug Console
 --------------------------------------------------------- */
export const DebugConsole = ({ logs, show, onClose, onClear }) => {
    const ref = useRef(null);
    useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
    if (!show) return null;
    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-[100] h-60 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center px-6 py-3 bg-slate-900/50 border-b border-slate-800">
                <span className="text-[10px] font-black text-emerald-500 flex items-center gap-2 tracking-widest">
                    <Terminal size={14} /> SYSTEM LOG CONSOLE
                </span>
                <button onClick={onClose} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors">CLOSE</button>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-5 font-mono text-[10px] space-y-2">
                {logs?.map((log, i) => <div key={i} className="text-emerald-400/70 break-all leading-relaxed flex gap-2"><span className="text-emerald-900">[{i+1}]</span><span>{log}</span></div>)}
            </div>
        </div>
    );
};