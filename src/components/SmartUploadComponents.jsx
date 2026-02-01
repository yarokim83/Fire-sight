import React, { useRef, useEffect, useState } from 'react';
import { 
    Upload, ScanLine, Image as ImageIcon, Trash2, 
    Plus, Sparkles, Terminal, BookOpen, X,
    Target, Calculator, Database, Maximize2,
    CheckCircle2, Hash, Tags // 🔴 아이콘 부품 완비
} from 'lucide-react';

import { SUBJECT_LIST, PROBLEM_TYPES } from '../utils/constants';

/** ---------------------------------------------------------
 * Step 1: 업로드 인트로 (콤팩트 중앙 정렬)
 --------------------------------------------------------- */
export const UploadIntro = ({ formData, setFormData, inputFileRef, onUpload }) => (
    <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500 py-6">
        <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">자료 등록 방식 선택</h3>
            <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-black">Data Ingestion System</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8 px-4">
            <button 
                onClick={() => setFormData({ ...formData, type: 'workbook' })} 
                className={`group p-6 rounded-[2.5rem] border transition-all flex flex-col items-center gap-3 ${formData.type === 'workbook' ? 'bg-white text-black shadow-2xl scale-[1.02]' : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'}`}
            >
                <div className={`p-4 rounded-2xl ${formData.type === 'workbook' ? 'bg-black text-white shadow-lg' : 'bg-white/5 text-white/40'}`}>
                    <BookOpen size={28} />
                </div>
                <p className="font-black text-sm uppercase tracking-tighter">Workbook</p>
            </button>
            <button 
                onClick={() => setFormData({ ...formData, type: 'visual' })} 
                className={`group p-6 rounded-[2.5rem] border transition-all flex flex-col items-center gap-3 ${formData.type === 'visual' ? 'bg-white text-black shadow-2xl scale-[1.02]' : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'}`}
            >
                <div className={`p-4 rounded-2xl ${formData.type === 'visual' ? 'bg-black text-white shadow-lg' : 'bg-white/5 text-white/40'}`}>
                    <ImageIcon size={28} />
                </div>
                <p className="font-black text-sm uppercase tracking-tighter">Visual Asset</p>
            </button>
        </div>
        
        <div 
            className="w-full max-w-sm h-40 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
            onClick={() => inputFileRef.current.click()}
        >
            <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" ref={inputFileRef} />
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-all shadow-xl">
                <Upload size={20} className="text-white/40 group-hover:text-white" />
            </div>
            <p className="text-white/80 font-black text-[11px] tracking-widest uppercase">Tap to Upload Problem</p>
        </div>
    </div>
);

/** ---------------------------------------------------------
 * Step 2: 분석 로딩 화면
 --------------------------------------------------------- */
export const AnalysisLoading = ({ previewUrl }) => (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in">
        <div className="relative w-full max-w-sm aspect-video bg-black rounded-[2.5rem] overflow-hidden mb-6 border border-white/10 shadow-2xl">
            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-30 blur-[1px]" />}
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-blue-400 shadow-[0_0_20px_#60a5fa] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                <ScanLine size={48} className="mb-4 text-blue-400/60 animate-pulse" />
                <span className="text-[9px] font-black tracking-[0.4em] opacity-40 uppercase">Syncing NFPC Standards...</span>
            </div>
        </div>
        <h3 className="text-xl font-bold text-white/90">데이터를 정밀 구조화하고 있습니다</h3>
    </div>
);

/** ---------------------------------------------------------
 * Step 3 (Left): 이미지 뷰어 (섹션 최대화 및 Zero-Scroll)
 --------------------------------------------------------- */
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef 
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const hasImages = Array.isArray(activeUrls) && activeUrls.length > 0;

    return (
        <div className="flex-1 h-full flex flex-col gap-3 animate-in fade-in min-h-0">
            <div className="flex p-1.5 bg-white/5 backdrop-blur-3xl rounded-xl border border-white/10 shrink-0">
                <button onClick={() => setViewMode('problem')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${viewMode === 'problem' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20'}`}>PROBLEM ({problemCount})</button>
                <button onClick={() => setViewMode('answer')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${viewMode === 'answer' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20'}`}>SOLUTION ({answerCount})</button>
            </div>

            <div className="flex-1 bg-slate-900/60 rounded-[3rem] border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center relative group min-h-0 shadow-inner">
                {hasImages ? (
                    <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); if(window.confirm("삭제하시겠습니까?")) onRemove(); }} className="absolute top-4 right-4 bg-rose-500/80 hover:bg-rose-600 text-white p-2.5 rounded-xl z-[100] shadow-xl transition-all active:scale-90 flex items-center justify-center">
                            <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                        <img 
                            src={activeUrls[currentIndex]} 
                            className="max-w-full max-h-full object-contain p-2 transition-transform duration-500 origin-center bg-black/20" 
                            onClick={() => setIsZoomed(true)} 
                            alt=""
                        />
                        {activeUrls.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-1.5 rounded-full text-[9px] font-black text-white border border-white/10 shadow-xl tracking-widest uppercase">
                                {currentIndex + 1} / {activeUrls.length}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 cursor-pointer group/upload p-10" onClick={() => inputAddRef.current.click()}>
                        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] group-hover/upload:scale-105 transition-all border-4 border-white/5">
                            <Plus size={40} className="text-white" strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Add {viewMode} Asset</p>
                    </div>
                )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x h-16 shrink-0">
                <div onClick={() => inputAddRef.current.click()} className="w-14 h-14 shrink-0 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-blue-500/10 text-white/20 transition-all">
                    <input type="file" accept="image/*" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={20} />
                </div>
                {hasImages && activeUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setIndex(idx)} className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start ${idx === currentIndex ? 'border-blue-500 scale-95 shadow-md' : 'border-transparent opacity-40'}`}>
                        <img src={url} className="w-full h-full object-cover" alt="" />
                    </button>
                ))}
            </div>

            {isZoomed && hasImages && (
                <div className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in" onClick={() => setIsZoomed(false)}>
                    <img src={activeUrls[currentIndex]} className="max-w-full max-h-full object-contain shadow-[0_0_100px_black] animate-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()} />
                    <button className="absolute top-10 right-10 text-white/20 hover:text-white" onClick={() => setIsZoomed(false)}><X size={48} /></button>
                </div>
            )}
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 3 (Right): 입력 폼 (🔴 검색 태그 인터페이스 추가 및 Zero-Loss)
 --------------------------------------------------------- */
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer, updateGradingPoint, updateSearchTag }) => {
    
    // 데이터 바인딩 무결성 (검색용 태그 포함)
    const searchTags = formData.searchTags || [];
    const terms = formData.gradingPoints?.mandatory_terms || [];
    const numbers = formData.gradingPoints?.mandatory_numbers || formData.numbers || [];

    const inputStyle = "w-full bg-white/[0.04] border border-white/10 text-white/90 rounded-xl p-3 text-[13px] font-medium focus:border-blue-500/50 transition-all outline-none placeholder:text-white/5 shadow-inner";
    const labelStyle = "text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ml-2 mb-1 block";

    return (
        <div className="w-[380px] h-full flex flex-col gap-4 min-h-0 overflow-y-auto pr-3 pb-24 scrollbar-hide shrink-0">
            
            {/* 1. 기본 분류 및 제목 */}
            <div className="space-y-3 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={inputStyle}>
                        {SUBJECT_LIST?.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={formData.problemType} onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} className={inputStyle}>
                        {PROBLEM_TYPES?.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
                <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={`${inputStyle} text-base font-bold bg-white/[0.06] border-white/5`} placeholder="지문 제목" />
            </div>

            {/* 2. 🔴 [신규] 문제 검색 전용 메타데이터 (Search Tags) */}
            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-3 shrink-0 shadow-lg">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
                        <Hash size={12} /> Search Metadata
                    </h4>
                    <button type="button" onClick={() => updateSearchTag('add')} className="p-1 hover:bg-indigo-500/20 rounded-md transition-colors">
                        <Plus size={14} className="text-indigo-400" />
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {searchTags.map((tag, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 group/tag hover:bg-indigo-500/20 transition-all">
                            <input 
                                value={tag} 
                                onChange={(e) => updateSearchTag('update', e.target.value, i)}
                                className="bg-transparent border-none outline-none text-[11px] text-indigo-100/90 w-16 font-bold placeholder:text-indigo-900/40"
                                placeholder="태그"
                            />
                            <button onClick={() => updateSearchTag('remove', null, i)}>
                                <X size={12} className="text-indigo-900 group-hover/tag:text-rose-400 transition-colors" />
                            </button>
                        </div>
                    ))}
                    {searchTags.length === 0 && <p className="text-[10px] text-white/5 italic ml-1">추출된 검색 태그가 없습니다.</p>}
                </div>
            </div>
            
            {/* 3. 지문 원문 (슬림화) */}
            <div className="shrink-0">
                <label className={labelStyle}>Problem Original Content</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputStyle} h-24 resize-none leading-relaxed text-slate-300 font-normal`} placeholder="소방 지문 원문" />
            </div>

            {/* 4. 정답 모델 */}
            <div className="flex-1 flex flex-col min-h-[140px] space-y-2">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={10} /> Model Solution
                    </span>
                    {isAnalyzingAnswer && <Sparkles size={11} className="text-emerald-400 animate-pulse" />}
                </div>
                <textarea value={formData.modelAnswer || ''} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className={`${inputStyle} h-full resize-none border-white/5 bg-white/[0.02] text-emerald-50/70 font-semibold`} placeholder="정답 모델" />
            </div>

            {/* 5. Grading Matrix (채점용 태그) */}
            <div className="p-5 bg-white/[0.02] rounded-[2.5rem] border border-white/10 space-y-5 shrink-0 shadow-xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2 font-black tracking-tighter"><Database size={14} className="text-blue-500" /> MATRIX TAGS</h4>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'add')} className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">+ TERM</button>
                        <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'add')} className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">+ NUM</button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        {terms.map((term, i) => (
                            <div key={i} className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 group/chip hover:bg-emerald-500/20 transition-all shadow-md">
                                <input value={term} onChange={(e) => updateGradingPoint('mandatory_terms', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-[13px] text-emerald-100/90 w-24 font-black placeholder:text-emerald-900/40" placeholder="용어 입력" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'remove', null, i)} className="text-emerald-900 group-hover/chip:text-rose-500 transition-colors"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {numbers.map((num, i) => (
                            <div key={i} className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 group/chip hover:bg-blue-500/20 transition-all shadow-lg">
                                <input value={num} onChange={(e) => updateGradingPoint('mandatory_numbers', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-[13px] text-blue-100 w-20 font-black placeholder:text-blue-900/40" placeholder="수치" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'remove', null, i)} className="text-blue-900 group-hover/chip:text-rose-500 transition-colors"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 6. 출처 */}
            <div className="shrink-0">
                <input type="text" value={formData.source || ''} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className={inputStyle} placeholder="출처 (예: NFPC 101 제3조)" />
            </div>
        </div>
    );
};

/** ---------------------------------------------------------
 * Debug Console
 --------------------------------------------------------- */
export const DebugConsole = ({ logs, show, onClose }) => {
    const ref = useRef(null);
    useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
    if (!show) return null;
    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/98 backdrop-blur-3xl border-t border-white/10 z-[1000] h-40 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-8 py-3 border-b border-white/5">
                <span className="text-[10px] font-black text-white/40 flex items-center gap-3 tracking-[0.3em] uppercase"><Terminal size={14} /> System Activity Log</span>
                <button onClick={onClose} className="text-[9px] font-bold text-white/20 hover:text-white transition-colors bg-white/5 px-4 py-1.5 rounded-lg border border-white/5">CLOSE SYSTEM</button>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-3 scrollbar-hide">
                {logs?.map((log, i) => (
                    <div key={i} className="text-white/40 flex gap-4 leading-relaxed border-l border-white/5 pl-4">
                        <span className="text-white/10 select-none tabular-nums font-bold">[{String(i+1).padStart(2, '0')}]</span>
                        <span className="flex-1 tracking-tight font-medium">{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};