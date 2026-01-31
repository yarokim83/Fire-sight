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
            
            {isManualMode && (
                <button onClick={() => { onViewMode('problem'); setStep(3); }} className="w-full mt-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 border border-slate-800 shadow-lg">
                    <FileText size={18} /> 사진 없이 직접 입력하기
                </button>
            )}
        </div>
    </div>
);

/** ---------------------------------------------------------
 * Step 2: 분석 로딩 화면
 * 기능: 스캔 애니메이션, OCR 진행 상태 시각화
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
                <div className="mt-4 flex gap-1">
                    {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
                </div>
            </div>
        </div>
        <h3 className="text-2xl font-black text-white mb-3">AI가 소방 지문을 읽고 있습니다</h3>
        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
            화재안전성능기준(NFPC)에 근거하여<br />
            핵심 수치와 필수 용어를 분류하는 중입니다.
        </p>
    </div>
);

/** ---------------------------------------------------------
 * Step 3 (Left): 이미지 뷰어
 * 기능: 다중 이미지 관리, 문제/해설 탭 전환, 확대 모달
 --------------------------------------------------------- */
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef 
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    
    const next = () => setIndex((currentIndex + 1) % activeUrls.length);
    const prev = () => setIndex((currentIndex - 1 + activeUrls.length) % activeUrls.length);

    return (
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col gap-5">
            {/* 상단 탭 전환 */}
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

            {/* 메인 이미지 영역 */}
            <div className={`aspect-[3/4] bg-slate-950 rounded-3xl border-2 overflow-hidden flex items-center justify-center relative group transition-colors ${viewMode === 'answer' ? 'border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-slate-800'}`}>
                {activeUrls && activeUrls.length > 0 ? (
                    <>
                        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-white/80 pointer-events-none z-20 flex items-center gap-2 text-[10px] font-black tracking-widest border border-white/10">
                            <Maximize2 size={12} /> SCANNER VIEW
                        </div>

                        <img 
                            src={activeUrls[currentIndex]} 
                            alt="Preview" 
                            className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-transform duration-500" 
                            onClick={() => setIsZoomed(true)} 
                        />
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); if(window.confirm("이 이미지를 삭제할까요?")) onRemove(); }} 
                            className="absolute top-4 right-4 bg-red-500/90 text-white p-3 rounded-2xl z-30 shadow-2xl opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95 border border-red-400/50"
                        >
                            <Trash2 size={20} />
                        </button>
                        
                        {activeUrls.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 bg-black/50 hover:bg-emerald-500 text-white p-3 rounded-2xl backdrop-blur-sm transition-all z-20 border border-white/5"><ChevronLeft size={24} /></button>
                                <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 bg-black/50 hover:bg-emerald-500 text-white p-3 rounded-2xl backdrop-blur-sm transition-all z-20 border border-white/5"><ChevronRight size={24} /></button>
                                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl px-5 py-2 rounded-2xl text-[10px] font-mono font-black text-emerald-400 border border-emerald-500/20 shadow-2xl">
                                    {currentIndex + 1} / {activeUrls.length} IMAGES
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <div className="text-slate-700 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                            <ImageIcon size={32} className="opacity-20" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">No Image Selected</span>
                    </div>
                )}
            </div>

            {/* 썸네일 리스트 */}
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x px-1 min-h-[85px]">
                <div 
                    onClick={() => inputAddRef.current.click()} 
                    className={`w-16 h-16 shrink-0 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${viewMode === 'answer' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10' : 'border-slate-700 text-slate-500 bg-slate-900/50 hover:bg-slate-800'}`}
                >
                    <input type="file" accept="image/*" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={24} />
                    <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Add</span>
                </div>
                {activeUrls && activeUrls.map((url, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setIndex(idx)} 
                        className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start relative ${idx === currentIndex ? 'border-emerald-500 ring-4 ring-emerald-500/10 scale-95' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
                    >
                        <img src={url} className="w-full h-full object-cover" alt={`thumb-${idx}`} />
                    </button>
                ))}
            </div>

            {/* 확대 모달 */}
            {isZoomed && activeUrls.length > 0 && (
                <div className="fixed inset-0 z-[9999] bg-black/98 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setIsZoomed(false)}>
                    <button className="absolute top-8 right-8 text-white/50 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all" onClick={() => setIsZoomed(false)}><X size={40} /></button>
                    <img 
                        src={activeUrls[currentIndex]} 
                        alt="Zoomed" 
                        className="max-w-full max-h-[95vh] object-contain shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 3 (Right): 입력 폼 (🔴 핵심: 데이터 분리 인터페이스)
 * 기능: 과목분류, 정밀 채점 포인트 편집(용어/수치), 태그 분리
 --------------------------------------------------------- */
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer, updateGradingPoint }) => {
    
    // 데이터 유효성 검사 (ReferenceError 방지)
    const terms = formData.gradingPoints?.mandatory_terms || [];
    const numbers = formData.gradingPoints?.mandatory_numbers || [];

    return (
        <div className="flex-1 space-y-6 h-full overflow-y-auto pr-2 pb-20 custom-scrollbar">
            {/* 1. 기본 분류 섹션 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest"><Layers size={12} className="text-emerald-500" /> Subject Category</label>
                    <select 
                        value={formData.category} 
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 text-sm font-bold appearance-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    >
                        {SUBJECT_LIST?.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest"><BookOpen size={12} className="text-blue-500" /> Exam Type</label>
                    <select 
                        value={formData.problemType} 
                        onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} 
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 text-sm font-bold appearance-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                    >
                        {PROBLEM_TYPES?.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. 제목 및 지문 섹션 */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Title</label>
                <input 
                    type="text" 
                    value={formData.title || ''} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 text-white font-black rounded-2xl p-4 text-base focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700" 
                    placeholder="문제 주제를 명확하게 입력하세요"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-emerald-500/80 flex justify-between">
                    Problem Content 
                    <span className="text-[8px] opacity-50 font-mono">Original Text</span>
                </label>
                <textarea 
                    value={formData.description || ''} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="w-full h-32 bg-slate-950 border border-slate-800 text-slate-300 rounded-2xl p-5 text-sm font-medium outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed shadow-inner" 
                    placeholder="지문 내용을 입력하거나 분석된 결과를 확인하세요..." 
                />
            </div>

            {/* 3. 모범 답안 및 해설 (AI 진행상태 포함) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Model Answer & Commentary</label>
                    {isAnalyzingAnswer && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <Sparkles size={12} className="text-emerald-400 animate-spin" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter animate-pulse">Syncing...</span>
                        </div>
                    )}
                </div>
                <textarea 
                    value={formData.modelAnswer || ''} 
                    onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} 
                    className={`w-full h-48 bg-slate-950 border text-slate-300 rounded-2xl p-5 text-sm font-medium outline-none transition-all resize-none leading-relaxed shadow-2xl ${isAnalyzingAnswer ? 'border-emerald-500/50 bg-emerald-950/10 ring-2 ring-emerald-500/5' : 'border-slate-800 focus:border-emerald-500'}`} 
                    placeholder="채점의 근거가 되는 해설을 상세히 입력하세요..." 
                />
            </div>

            {/* 4. 🔴 [분리 기능 1] 검색용 태그 매니저 */}
            <div className="p-6 bg-slate-950/80 rounded-3xl border border-slate-800 shadow-lg group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest">
                        <Hash size={14} className="text-emerald-500" /> Search Metadata
                    </label>
                    <span className="text-[9px] font-bold text-slate-600">쉼표(,)로 태그 구분</span>
                </div>
                <div className="relative">
                    <input 
                        type="text" 
                        value={formData.keywords || ''} 
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} 
                        className="w-full bg-slate-900 border border-slate-700 text-emerald-400 rounded-xl px-4 py-3 text-sm font-black focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700" 
                        placeholder="예: 2026기출, 제연설비, 3회독" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-mono">LIST_TAGS</div>
                </div>
            </div>

            {/* 5. 🔴 [분리 기능 2] AI 정밀 채점 포인트 에디터 */}
            <div className="p-6 bg-emerald-950/5 rounded-3xl border border-emerald-500/10 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.05)] space-y-6">
                <div className="flex justify-between items-center border-b border-emerald-500/10 pb-4">
                    <div className="flex flex-col">
                        <h4 className="text-[11px] font-black text-emerald-500 uppercase flex items-center gap-2 tracking-widest">
                            <Target size={16} /> Grading Criteria
                        </h4>
                        <span className="text-[9px] text-slate-500 font-medium mt-0.5">실제 답안 정확도 판별 기준</span>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'add')} className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">+ 용어</button>
                        <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'add')} className="text-[9px] font-black bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all">+ 수치</button>
                    </div>
                </div>

                {/* 필수 용어 편집 */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <Calculator size={12} className="text-emerald-500/50" /> Mandatory Terms <span className="text-[8px] text-emerald-600/50 ml-auto">(Weight: 40%)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {terms.length > 0 ? terms.map((term, i) => (
                            <div key={i} className="flex items-center gap-2 bg-emerald-900/30 px-3 py-2 rounded-xl border border-emerald-700/30 animate-in zoom-in-90 duration-300">
                                <input 
                                    value={term} 
                                    onChange={(e) => updateGradingPoint('mandatory_terms', 'update', e.target.value, i)} 
                                    className="bg-transparent border-none outline-none text-[11px] text-emerald-200 w-24 font-black placeholder:text-emerald-800"
                                    placeholder="용어 입력"
                                />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'remove', null, i)} className="text-emerald-700 hover:text-red-400 transition-colors"><X size={12} /></button>
                            </div>
                        )) : (
                            <div className="text-[10px] text-slate-600 italic py-2">용어 데이터가 없습니다. 해설지를 스캔하거나 추가하세요.</div>
                        )}
                    </div>
                </div>

                {/* 핵심 수치 편집 */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <AlertCircle size={12} className="text-blue-500/50" /> Mandatory Numbers <span className="text-[8px] text-blue-600/50 ml-auto">(Weight: 60%)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {numbers.length > 0 ? numbers.map((num, i) => (
                            <div key={i} className="flex items-center gap-2 bg-blue-900/30 px-3 py-2 rounded-xl border border-blue-700/30 animate-in zoom-in-90 duration-300">
                                <input 
                                    value={num} 
                                    onChange={(e) => updateGradingPoint('mandatory_numbers', 'update', e.target.value, i)} 
                                    className="bg-transparent border-none outline-none text-[11px] text-blue-200 w-20 font-black placeholder:text-blue-800"
                                    placeholder="수치 입력"
                                />
                                <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'remove', null, i)} className="text-blue-700 hover:text-red-400 transition-colors"><X size={12} /></button>
                            </div>
                        )) : (
                            <div className="text-[10px] text-slate-600 italic py-2">수치 데이터가 없습니다. 단위까지 포함하여 입력하세요.</div>
                        )}
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
                    className="w-full bg-slate-950 border border-slate-800 text-blue-400 rounded-2xl p-4 text-sm font-black focus:border-blue-500 transition-all outline-none shadow-inner placeholder:text-slate-700" 
                    placeholder="예: 2024년 기출, NFPC 101, 관리사 22회"
                />
            </div>
        </div>
    );
};

/** ---------------------------------------------------------
 * Debug Console
 * 기능: 시스템 동작 로그 시각화
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
                <div className="flex gap-4">
                    <button onClick={onClear} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-tighter">Clear Log</button>
                    <button onClick={onClose} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-tighter">Close Console</button>
                </div>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-5 font-mono text-[10px] space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
                {logs?.length === 0 && <div className="text-slate-700 italic px-1">Waiting for system actions...</div>}
                {logs?.map((log, i) => (
                    <div key={i} className="text-emerald-400/70 break-all border-b border-slate-800/30 pb-2 flex gap-3 leading-relaxed">
                        <span className="text-emerald-900 select-none">[{i+1}]</span>
                        <span className="flex-1">{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};