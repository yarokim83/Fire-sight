import React, { useRef, useEffect, useState } from 'react';
import { 
    Upload, ScanLine, Image as ImageIcon, CheckCircle2, 
    ChevronLeft, ChevronRight, FileText, Edit3, Trash2, 
    Plus, Sparkles, Layers, Terminal, BookOpen, Maximize2, X,
    Link, Hash, Target, Calculator, AlertCircle
} from 'lucide-react';

// 🔴 공통 상수 (프로젝트 경로 확인 필수)
import { SUBJECT_LIST, PROBLEM_TYPES } from '../utils/constants';

/** ---------------------------------------------------------
 * Step 1: 업로드 인트로 화면 (Apple Bento Style)
 --------------------------------------------------------- */
export const UploadIntro = ({ formData, setFormData, isManualMode, inputFileRef, onUpload, onViewMode, setStep }) => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 py-12">
        <div className="text-center mb-12">
            <h3 className="text-3xl font-semibold tracking-tight text-white mb-2">자료 등록 방식 선택</h3>
            <p className="text-white/30 text-sm font-medium">정밀한 데이터 분류가 2027년 합격의 핵심입니다.</p>
        </div>

        <div className="mb-12">
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto bg-white/5 p-2 rounded-[2rem] border border-white/10 shadow-2xl">
                <button 
                    onClick={() => setFormData({ ...formData, type: 'workbook' })} 
                    className={`py-5 px-4 rounded-[1.5rem] text-sm font-semibold transition-all flex flex-col items-center gap-3 ${formData.type === 'workbook' ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                >
                    <BookOpen size={22} /> 문제집 / 암기노트
                </button>
                <button 
                    onClick={() => setFormData({ ...formData, type: 'visual' })} 
                    className={`py-5 px-4 rounded-[1.5rem] text-sm font-semibold transition-all flex flex-col items-center gap-3 ${formData.type === 'visual' ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                >
                    <ImageIcon size={22} /> 도면 / 현장 사진
                </button>
            </div>
        </div>
        
        <div className="max-w-sm mx-auto">
            <div 
                className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-white/10 rounded-[3rem] hover:border-white/30 hover:bg-white/5 transition-all group relative cursor-pointer bg-white/[0.02] overflow-hidden" 
                onClick={() => { if(inputFileRef.current) inputFileRef.current.value = null; inputFileRef.current.click(); }}
            >
                <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" ref={inputFileRef} />
                <div className="relative z-10 flex flex-col items-center text-white/20 group-hover:text-white/80 transition-all duration-500">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all shadow-2xl">
                        <Upload size={32} />
                    </div>
                    <p className="font-bold text-xl mb-1 tracking-tight">사진 업로드</p>
                    <p className="text-xs font-medium opacity-50">Gemini 1.5 Pro AI 정밀 분석</p>
                </div>
            </div>
        </div>
    </div>
);

/** ---------------------------------------------------------
 * Step 2: 분석 로딩 화면
 --------------------------------------------------------- */
export const AnalysisLoading = ({ previewUrl }) => (
    <div className="flex flex-col items-center justify-center h-[550px] animate-in fade-in duration-700">
        <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-[3rem] overflow-hidden mb-12 border border-white/10 shadow-[0_0_80px_rgba(255,255,255,0.05)]">
            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-20 blur-[1px]" />}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_30px_white] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                <ScanLine size={64} className="mb-6 opacity-40 animate-pulse" />
                <span className="text-xs font-bold tracking-[0.4em] opacity-40 animate-pulse uppercase">Extracting NFPC Data...</span>
            </div>
        </div>
        <h3 className="text-2xl font-semibold tracking-tight text-white/90">AI가 소방 지문을 읽고 있습니다</h3>
    </div>
);

/** ---------------------------------------------------------
 * Step 3 (Left): 이미지 뷰어 (🔴 수정 모드 이미지 노출 및 아이패드 삭제 버튼 보장)
 --------------------------------------------------------- */
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef 
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    
    // 이미지가 실제로 존재하는지 여부 확인 (배열 타입 체크 보강)
    const hasImages = Array.isArray(activeUrls) && activeUrls.length > 0;

    const next = () => setIndex((currentIndex + 1) % (activeUrls.length || 1));
    const prev = () => setIndex((currentIndex - 1 + (activeUrls.length || 1)) % (activeUrls.length || 1));

    return (
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-6 animate-in fade-in">
            {/* 상단 탭 (문제/해설) */}
            <div className="flex p-1.5 bg-white/5 backdrop-blur-3xl rounded-2xl border border-white/10">
                <button 
                    onClick={() => setViewMode('problem')} 
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${viewMode === 'problem' ? 'bg-white/10 text-white shadow-lg' : 'text-white/30'}`}
                >
                    문제 ({problemCount})
                </button>
                <button 
                    onClick={() => setViewMode('answer')} 
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${viewMode === 'answer' ? 'bg-white/10 text-white shadow-lg' : 'text-white/30'}`}
                >
                    해설 ({answerCount})
                </button>
            </div>

            {/* 메인 이미지 캔버스 */}
            <div className="aspect-[3/4] bg-white/[0.02] rounded-[3rem] border border-white/10 overflow-hidden flex items-center justify-center relative group shadow-2xl">
                {hasImages ? (
                    <>
                        {/* 🔴 [수정 완료] 아이패드 대응 상시 노출 및 레이어 간섭 방지 */}
                        <button 
                            type="button"
                            onClick={(e) => { 
                                e.stopPropagation(); // 🔴 클릭 이벤트가 이미지 확대(Zoom)로 번지는 현상 차단
                                if(window.confirm("이 이미지를 삭제하시겠습니까?")) onRemove(); 
                            }} 
                            className="absolute top-6 right-6 bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-2xl z-[100] shadow-2xl transition-all active:scale-90 flex items-center justify-center pointer-events-auto"
                        >
                            <Trash2 size={22} strokeWidth={2.5} />
                        </button>
                        
                        <img 
                            src={activeUrls[currentIndex]} 
                            className="w-full h-full object-contain cursor-zoom-in transition-transform duration-700" 
                            onClick={() => setIsZoomed(true)} 
                        />
                        
                        {/* 페이지 컨트롤 */}
                        {activeUrls.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 bg-black/30 hover:bg-white/10 text-white p-4 rounded-2xl backdrop-blur-xl transition-all z-50">〈</button>
                                <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 bg-black/30 hover:bg-white/10 text-white p-4 rounded-2xl backdrop-blur-xl transition-all z-50">〉</button>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-3xl px-5 py-2 rounded-full text-[10px] font-bold text-white tracking-widest border border-white/10">
                                    {currentIndex + 1} / {activeUrls.length}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div 
                        className="flex flex-col items-center gap-4 text-white/10 cursor-pointer hover:text-white/20 transition-colors" 
                        onClick={() => inputAddRef.current.click()}
                    >
                        <Plus size={48} strokeWidth={1} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">No Image</span>
                    </div>
                )}
            </div>

            {/* 하단 썸네일 스트립 */}
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-1 h-24">
                <div onClick={() => inputAddRef.current.click()} className="w-16 h-16 shrink-0 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 text-white/20 transition-all">
                    <input type="file" accept="image/*" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={24} />
                </div>
                {hasImages && activeUrls.map((url, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setIndex(idx)} 
                        className={`w-16 h-16 shrink-0 rounded-2xl overflow-hidden border-2 transition-all snap-start ${idx === currentIndex ? 'border-white scale-90 shadow-2xl' : 'border-transparent opacity-30 hover:opacity-100'}`}
                    >
                        <img src={url} className="w-full h-full object-cover" alt="" />
                    </button>
                ))}
            </div>

            {/* 확대 모달 */}
            {isZoomed && hasImages && (
                <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setIsZoomed(false)}>
                    <img src={activeUrls[currentIndex]} className="max-w-full max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()} />
                    <button className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors" onClick={() => setIsZoomed(false)}><X size={48} /></button>
                </div>
            )}
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 3 (Right): 입력 폼 (수치 유실 방지 로직 유지)
 --------------------------------------------------------- */
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer, updateGradingPoint }) => {
    
    // 수치 유실 방지를 위한 데이터 루트 바인딩
    const terms = formData.gradingPoints?.mandatory_terms || [];
    const numbers = formData.gradingPoints?.mandatory_numbers || formData.numbers || [];

    const inputStyle = "w-full bg-white/[0.03] border border-white/10 text-white/90 rounded-[1.25rem] p-4 text-[15px] font-medium focus:border-white/30 transition-all outline-none placeholder:text-white/10 shadow-inner";

    return (
        <div className="flex-1 space-y-8 h-full overflow-y-auto pr-4 pb-32 scrollbar-hide">
            {/* Subject & Type Grid */}
            <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Subject</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={inputStyle}>
                        {SUBJECT_LIST?.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Exam Type</label>
                    <select value={formData.problemType} onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} className={inputStyle}>
                        {PROBLEM_TYPES?.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Main Title</label>
                <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={`${inputStyle} text-lg font-semibold tracking-tight`} />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Problem Content</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputStyle} h-32 resize-none leading-relaxed`} />
            </div>

            {/* Model Answer & AI Sync Status */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Certified Model Solution</label>
                    {isAnalyzingAnswer && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5 animate-pulse">
                            <Sparkles size={12} className="text-white/60" />
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">AI Syncing</span>
                        </div>
                    )}
                </div>
                <textarea value={formData.modelAnswer || ''} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className={`${inputStyle} h-52 resize-none leading-relaxed border-white/5 bg-white/[0.02]`} />
            </div>

            {/* Grading Criteria Card */}
            <div className="p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/10 space-y-8 shadow-2xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-white/90 tracking-tight">Grading Criteria</h4>
                        <p className="text-[10px] font-medium text-white/20">정밀 채점을 위한 키워드와 수치를 등록하세요</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'add')} className="text-[10px] font-bold bg-white/5 text-white/60 px-4 py-2 rounded-xl border border-white/5 hover:bg-white hover:text-black transition-all">+ TERM</button>
                        <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'add')} className="text-[10px] font-bold bg-white/5 text-white/60 px-4 py-2 rounded-xl border border-white/5 hover:bg-white hover:text-black transition-all">+ NUMBER</button>
                    </div>
                </div>

                <div className="space-y-4">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2"><Target size={12} /> Mandatory Terms</span>
                    <div className="flex flex-wrap gap-2">
                        {terms.map((term, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/5">
                                <input value={term} onChange={(e) => updateGradingPoint('mandatory_terms', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-xs text-white/80 w-24 font-medium" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'remove', null, i)} className="text-white/20 hover:text-rose-500"><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2"><Calculator size={12} /> Critical Numbers</span>
                    <div className="flex flex-wrap gap-2">
                        {numbers.map((num, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10 shadow-xl">
                                <input value={num} onChange={(e) => updateGradingPoint('mandatory_numbers', 'update', e.target.value, i)} className="bg-transparent border-none outline-none text-xs text-white w-20 font-bold" />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'remove', null, i)} className="text-white/20 hover:text-rose-500"><X size={12} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Source Reference */}
            <div className="space-y-2 p-1">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Source Reference</label>
                <input type="text" value={formData.source || ''} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className={inputStyle} placeholder="예: 2026년 기출, NFPC 101" />
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
        <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-3xl border-t border-white/10 z-[100] h-64 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center px-8 py-4 border-b border-white/5">
                <span className="text-[10px] font-black text-white/40 flex items-center gap-2 tracking-[0.3em] uppercase"><Terminal size={14} /> System Console</span>
                <button onClick={onClose} className="text-[10px] font-bold text-white/20 hover:text-white transition-colors">CLOSE</button>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-3 scrollbar-hide">
                {logs?.map((log, i) => (
                    <div key={i} className="text-white/40 flex gap-4 leading-relaxed">
                        <span className="text-white/10 select-none">[{i+1}]</span>
                        <span className="flex-1 tracking-tight">{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};