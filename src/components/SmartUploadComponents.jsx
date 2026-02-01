import React, { useRef, useEffect, useState } from 'react';
import { 
    Upload, ScanLine, Image as ImageIcon, CheckCircle2, 
    ChevronLeft, ChevronRight, FileText, Edit3, Trash2, 
    Plus, Sparkles, Layers, Terminal, BookOpen, Maximize2, X,
    Link, Hash, Target, Calculator, AlertCircle, Database
} from 'lucide-react';

import { SUBJECT_LIST, PROBLEM_TYPES } from '../utils/constants';

/** ---------------------------------------------------------
 * Step 1: 업로드 인트로 (콤팩트 중앙 정렬)
 --------------------------------------------------------- */
export const UploadIntro = ({ formData, setFormData, inputFileRef, onUpload }) => (
    <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-700 py-8">
        <div className="text-center mb-10">
            <h3 className="text-3xl font-semibold tracking-tight text-white mb-2">자료 등록 방식 선택</h3>
            <p className="text-white/30 text-sm font-medium">정밀 데이터 분류가 2027년 합격의 핵심 엔진입니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mb-10 px-4">
            <button 
                onClick={() => setFormData({ ...formData, type: 'workbook' })} 
                className={`group p-8 rounded-[2.5rem] border transition-all flex flex-col items-center text-center gap-4 ${formData.type === 'workbook' ? 'bg-white text-black border-white shadow-2xl scale-[1.02]' : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'}`}
            >
                <div className={`p-4 rounded-2xl ${formData.type === 'workbook' ? 'bg-black text-white' : 'bg-white/5 text-white/40 group-hover:scale-110 transition-transform'}`}>
                    <BookOpen size={32} />
                </div>
                <div>
                    <p className="font-bold text-lg">문제집 / 암기노트</p>
                    <p className="text-[11px] font-medium mt-1 opacity-60">NFPC 법령 및 기출 데이터</p>
                </div>
            </button>
            <button 
                onClick={() => setFormData({ ...formData, type: 'visual' })} 
                className={`group p-8 rounded-[2.5rem] border transition-all flex flex-col items-center text-center gap-4 ${formData.type === 'visual' ? 'bg-white text-black border-white shadow-2xl scale-[1.02]' : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'}`}
            >
                <div className={`p-4 rounded-2xl ${formData.type === 'visual' ? 'bg-black text-white' : 'bg-white/5 text-white/40 group-hover:scale-110 transition-transform'}`}>
                    <ImageIcon size={32} />
                </div>
                <div>
                    <p className="font-bold text-lg">도면 / 현장 사진</p>
                    <p className="text-[11px] font-medium mt-1 opacity-60">현장 정비 및 설비 시각자료</p>
                </div>
            </button>
        </div>
        
        <div 
            className="w-full max-w-sm h-48 border-2 border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
            onClick={() => inputFileRef.current.click()}
        >
            <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" ref={inputFileRef} />
            <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-all shadow-xl">
                <Upload size={22} className="text-white/40 group-hover:text-white" />
            </div>
            <p className="text-white/80 font-bold text-sm tracking-tight text-center">파일 드롭 또는 클릭</p>
        </div>
    </div>
);

/** ---------------------------------------------------------
 * Step 2: 분석 로딩 화면
 --------------------------------------------------------- */
export const AnalysisLoading = ({ previewUrl }) => (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in duration-700 min-h-[500px]">
        <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-[3rem] overflow-hidden mb-12 border border-white/10 shadow-[0_0_80px_rgba(255,255,255,0.05)]">
            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-40" />}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_30px_#60a5fa] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                <ScanLine size={64} className="mb-6 opacity-40 animate-pulse text-blue-400" />
                <span className="text-[10px] font-black tracking-[0.5em] opacity-40 animate-pulse uppercase">Syncing NFTC Standards...</span>
            </div>
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-white/90">AI가 데이터를 정밀 구조화하고 있습니다</h3>
    </div>
);

/** ---------------------------------------------------------
 * Step 3 (Main): 이미지 뷰어 (🔴 섹션 최대화 및 Zero-Scroll)
 --------------------------------------------------------- */
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef 
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const hasImages = Array.isArray(activeUrls) && activeUrls.length > 0;

    return (
        <div className="flex-1 h-full flex flex-col gap-4 animate-in fade-in min-h-0">
            {/* 탭 네비게이션 */}
            <div className="flex p-1.5 bg-white/5 backdrop-blur-3xl rounded-[1.25rem] border border-white/10 shrink-0">
                <button onClick={() => setViewMode('problem')} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${viewMode === 'problem' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>PROBLEM ({problemCount})</button>
                <button onClick={() => setViewMode('answer')} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${viewMode === 'answer' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>SOLUTION ({answerCount})</button>
            </div>

            {/* 메인 캔버스: 🔴 object-contain 적용으로 이미지 잘림 방지 */}
            <div className="flex-1 bg-slate-900/60 rounded-[3.5rem] border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center relative group shadow-2xl min-h-0">
                {hasImages ? (
                    <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); if(window.confirm("삭제하시겠습니까?")) onRemove(); }} className="absolute top-8 right-8 bg-rose-500/90 hover:bg-rose-600 text-white p-4 rounded-2xl z-[100] shadow-2xl transition-all active:scale-90 flex items-center justify-center">
                            <Trash2 size={24} strokeWidth={2.5} />
                        </button>
                        <img 
                            src={activeUrls[currentIndex]} 
                            className="max-w-full max-h-full object-contain p-2 transition-transform duration-500 origin-center bg-black/20" 
                            onClick={() => setIsZoomed(true)} 
                            alt="Scan Preview"
                        />
                        {activeUrls.length > 1 && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-3xl px-8 py-2.5 rounded-full text-[11px] font-black text-white tracking-[0.3em] border border-white/10 z-50">
                                {currentIndex + 1} / {activeUrls.length}
                            </div>
                        )}
                    </>
                ) : (
                    <div 
                        className="flex flex-col items-center justify-center gap-6 cursor-pointer group/upload p-10" 
                        onClick={() => inputAddRef.current.click()}
                    >
                        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] group-hover/upload:scale-110 transition-all border-4 border-white/10">
                            <Plus size={48} className="text-white" strokeWidth={3} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black text-blue-400 uppercase tracking-widest font-bold">Add {viewMode} Image</p>
                            <p className="text-[10px] text-white/20 mt-1 uppercase font-medium">Precision Acquisition Active</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 썸네일 스트립 (스크롤 없이 노출되도록 크기 최적화) */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x h-24 shrink-0">
                <div onClick={() => inputAddRef.current.click()} className="w-20 h-20 shrink-0 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-blue-500/10 text-white/20 transition-all">
                    <input type="file" accept="image/*" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={28} />
                </div>
                {hasImages && activeUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setIndex(idx)} className={`w-20 h-20 shrink-0 rounded-3xl overflow-hidden border-2 transition-all snap-start ${idx === currentIndex ? 'border-blue-500 scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-transparent opacity-30 hover:opacity-100'}`}>
                        <img src={url} className="w-full h-full object-cover" alt="" />
                    </button>
                ))}
            </div>

            {isZoomed && hasImages && (
                <div className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in" onClick={() => setIsZoomed(false)}>
                    <img src={activeUrls[currentIndex]} className="max-w-full max-h-full object-contain shadow-[0_0_100px_black] animate-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()} />
                    <button className="absolute top-12 right-12 text-white/20 hover:text-white" onClick={() => setIsZoomed(false)}><X size={48} /></button>
                </div>
            )}
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 3 (Right): 입력 폼 (🔴 섹션 최소화 및 내부 스크롤)
 --------------------------------------------------------- */
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer, updateGradingPoint }) => {
    
    // 유실 복구: 수치 및 용어 데이터 추출
    const terms = formData.gradingPoints?.mandatory_terms || [];
    const numbers = formData.gradingPoints?.mandatory_numbers || formData.numbers || [];

    const labelStyle = "text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4 mb-2 block";
    const inputStyle = "w-full bg-white/[0.04] border border-white/10 text-white/90 rounded-2xl p-5 text-[15px] font-medium focus:border-blue-500/50 focus:bg-white/[0.06] transition-all outline-none placeholder:text-white/10 shadow-inner";

    return (
        <div className="w-[380px] h-full flex flex-col min-h-0 space-y-6 overflow-y-auto pr-6 pb-24 scrollbar-hide shrink-0">
            
            {/* 분류 설정 */}
            <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className="space-y-1">
                    <label className={labelStyle}>Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={inputStyle}>
                        {SUBJECT_LIST?.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className={labelStyle}>Type</label>
                    <select value={formData.problemType} onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} className={inputStyle}>
                        {PROBLEM_TYPES?.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>

            {/* 제목 */}
            <div className="space-y-1 shrink-0">
                <label className={labelStyle}>Reference Title</label>
                <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={`${inputStyle} text-lg font-bold tracking-tight border-white/5 bg-white/[0.05]`} placeholder="지문 제목" />
            </div>

            {/* 지문 (유동적 높이) */}
            <div className="space-y-1 flex-1 min-h-[120px]">
                <label className={labelStyle}>Problem Content</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputStyle} h-full resize-none leading-relaxed text-slate-300 font-normal`} placeholder="소방 지문 원문" />
            </div>

            {/* 모범 답안 */}
            <div className="space-y-1 flex-1 min-h-[140px]">
                <div className="flex justify-between items-center pr-4">
                    <label className={labelStyle}>Solution Model</label>
                    {isAnalyzingAnswer && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-pulse">
                            <Sparkles size={11} className="text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Syncing</span>
                        </div>
                    )}
                </div>
                <textarea value={formData.modelAnswer || ''} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className={`${inputStyle} h-full resize-none border-white/5 bg-white/[0.02] text-emerald-50/70 font-semibold`} placeholder="모범 답안" />
            </div>

            {/* Grading Matrix (유실 복구: 칩 삭제 및 추가 로직 100% 보존) */}
            <div className="p-8 bg-white/[0.02] rounded-[3.5rem] border border-white/10 space-y-8 shadow-3xl shrink-0">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                        <Database size={20} className="text-blue-500" /> Matrix
                    </h4>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'add')} className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">+ TERM</button>
                        <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'add')} className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">+ NUM</button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Terms Chips */}
                    <div className="flex flex-wrap gap-3">
                        {terms.map((term, i) => (
                            <div key={i} className="flex items-center gap-2.5 bg-emerald-500/10 px-4 py-2.5 rounded-2xl border border-emerald-500/20 group/chip hover:bg-emerald-500/20 transition-all">
                                <input value={term} onChange={(e) => updateGradingPoint('mandatory_terms', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-[13px] text-emerald-100/90 w-28 font-bold placeholder:text-emerald-900/40" placeholder="용어" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'remove', null, i)} className="text-emerald-900 group-hover/chip:text-rose-500 transition-colors"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                    {/* Numbers Chips */}
                    <div className="flex flex-wrap gap-3">
                        {numbers.map((num, i) => (
                            <div key={i} className="flex items-center gap-2.5 bg-blue-500/10 px-4 py-2.5 rounded-2xl border border-blue-500/20 group/chip hover:bg-blue-500/20 transition-all shadow-lg">
                                <input value={num} onChange={(e) => updateGradingPoint('mandatory_numbers', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-[13px] text-blue-100 w-24 font-black placeholder:text-blue-900/40" placeholder="수치" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'remove', null, i)} className="text-blue-900 group-hover/chip:text-rose-500 transition-colors"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 출처 */}
            <div className="space-y-1 shrink-0">
                <label className={labelStyle}>Source</label>
                <input type="text" value={formData.source || ''} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className={inputStyle} placeholder="NFPC 101 제3조" />
            </div>
        </div>
    );
};

/** ---------------------------------------------------------
 * Debug Console (시스템 로그 무결성 보존)
 --------------------------------------------------------- */
export const DebugConsole = ({ logs, show, onClose }) => {
    const ref = useRef(null);
    useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
    if (!show) return null;
    return (
        <div className="fixed bottom-0 left-0 w-full bg-black/98 backdrop-blur-3xl border-t border-white/10 z-[1000] h-56 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center px-10 py-4 border-b border-white/5">
                <span className="text-[10px] font-black text-white/40 flex items-center gap-3 tracking-[0.5em] uppercase font-bold"><Terminal size={18} /> System Activity Log</span>
                <button onClick={onClose} className="text-[10px] font-bold text-white/20 hover:text-white transition-colors bg-white/5 px-5 py-2 rounded-xl border border-white/5 uppercase tracking-widest font-bold">Close System</button>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-12 font-mono text-[12px] space-y-4 scrollbar-hide">
                {logs?.map((log, i) => (
                    <div key={i} className="text-white/40 flex gap-8 leading-relaxed border-l border-white/5 pl-6">
                        <span className="text-white/10 select-none tabular-nums font-bold">[{String(i+1).padStart(2, '0')}]</span>
                        <span className="flex-1 tracking-tight font-medium">{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};