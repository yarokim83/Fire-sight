
import React, { useState } from 'react';
import { Settings, Cpu, Terminal, BrainCircuit, X, Save, Sparkles, Loader2, RotateCcw, Check, Trash2 } from 'lucide-react';
import { useSmartUpload } from '../hooks/useSmartUpload';
import {
    UploadIntro, AnalysisLoading, ImageViewer, ProblemForm, DebugConsole,
    CropModal
} from './SmartUploadComponents';

const RECOMMENDED_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: '초고속, 최고 가성비 최신 모델 (인쇄체/OCR 권장)' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: '고정밀 최신 모델, 수식/손글씨 판독 최적' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', desc: '차세대 고성능 추론 모델 (베타)' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', desc: '경량 초고속 모델' }
];

export default function SmartUpload({ onSaveComplete, initialData }) {
    const {
        aiModel, setAiModel,
        splitProblems, setSplitProblems,
        isManualMode, isSaving, step, setStep,
        viewMode, setViewMode, formData, setFormData,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex,
        isAnalyzingAnswer, debugLogs, showDebug, setShowDebug,
        inputFileRef, inputAddRef,
        processIncomingFiles,
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState,
        updateGradingPoint, updateSearchTag,
        cropSrc, crop, setCrop, setCompletedCrop,
        isCropModalOpen, imgRef, onCropCancel,
        extractText, setExtractText,
        currentPageIndex, totalPagesIndex,
        goToNextPage, goToPrevPage,
        addCropToActiveProblem, nextProblem, finishExtraction,
        problemsQueueCount, currentProblemCrops,
        
        // 🔴 신규 추가 바인딩
        problemsList,
        saveSingleProblem,
        removeProblem,
        activeProblemIndex,
        setActiveProblemIndex
    } = useSmartUpload(initialData, onSaveComplete);

    const [showModelSettings, setShowModelSettings] = useState(false);
    const [tempModelName, setTempModelName] = useState(aiModel || '');

    // 🔴 [아이패드 대응 및 단축키 지원] 전역 클립보드 붙여넣기 이벤트 감지
    React.useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            let imageFile = null;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    imageFile = items[i].getAsFile();
                    break;
                }
            }

            if (imageFile) {
                // 붙여넣은 아이템이 이미지 파일인 경우, 기본 동작을 막고 업로드 시퀀스 작동
                e.preventDefault();
                const target = step === 3 ? viewMode : 'problem';
                processIncomingFiles([imageFile], target);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [step, viewMode, processIncomingFiles]);
    
    const activeUrls = viewMode === 'problem' ? problemPreviewUrls : answerPreviewUrls;

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden relative"> {/* 🔴 relative 추가 */}
            {/* 🟢 헤더 관제 센터 */}
            <header className="flex items-center justify-between p-4 bg-slate-900/40 border-b border-slate-800/50 backdrop-blur-md z-50 shrink-0">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="text-blue-500" size={20} />
                    <h1 className="text-sm font-black tracking-tighter uppercase">Ingestion Control</h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-slate-400">{aiModel}</span>
                    </div>

                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={`p-2 rounded-lg border transition-all ${
                            showDebug
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="추출 로그 확인"
                    >
                        <Terminal size={16} />
                    </button>

                    <button
                        onClick={() => {
                            setTempModelName(aiModel);
                            setShowModelSettings(!showModelSettings);
                        }}
                        className={`p-2 rounded-lg border transition-all ${
                            showModelSettings
                            ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="AI 모델 설정"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </header>

            {/* --- [모델 설정 팝오버] --- */}
            {showModelSettings && (
                <div className="absolute top-16 right-4 z-[100] w-80 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl p-5 animate-in fade-in slide-in-from-top-2 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            <Cpu size={14} className="text-amber-500" /> AI Model Config
                        </h4>
                        <button onClick={() => setShowModelSettings(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Recommended Models</label>
                        <div className="flex flex-col gap-2">
                            {RECOMMENDED_MODELS.map((m) => {
                                const isActive = tempModelName === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setTempModelName(m.id)}
                                        className={`w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-0.5 active:scale-[0.98] ${
                                            isActive
                                            ? 'bg-amber-500/10 border-amber-500/80 text-white shadow-lg shadow-amber-500/5'
                                            : 'bg-black/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                        }`}
                                    >
                                        <span className="text-xs font-bold">{m.name}</span>
                                        <span className="text-[9px] text-slate-500 font-medium">{m.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Custom Model ID</label>
                        <input
                            type="text"
                            value={tempModelName}
                            onChange={(e) => setTempModelName(e.target.value)}
                            className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-700"
                            placeholder="직접 모델 ID 입력 (e.g. gemini-1.5-flash-latest)"
                        />
                    </div>

                    <button
                        onClick={() => {
                            if (!tempModelName.trim()) {
                                alert('모델 ID를 입력하거나 선택해주세요.');
                                    return;
                            }
                            setAiModel(tempModelName.trim());
                            setShowModelSettings(false);
                            alert(`모델이 ${tempModelName.trim()}으로 변경되었습니다.`);
                        }}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                    >
                        <Save size={14} /> APPLY MODEL CHANGE
                    </button>
                </div>
            )}

            {/* --- [터미널 로그 창] --- */}
            <DebugConsole logs={debugLogs} show={showDebug} onClose={() => setShowDebug(false)} />

            {/* 🔴 [위치 이동] CropModal을 main 밖으로 빼내서 무조건 최상단에 뜨게 만듭니다! */}
            {/* 🔴 CropModal 연동 (지문/해설 크롭 분할, 페이지 이동 및 문항 종결 지원) */}
            {isCropModalOpen && (
                <CropModal
                    isOpen={isCropModalOpen}
                    src={cropSrc}
                    crop={crop}
                    setCrop={setCrop}
                    setCompletedCrop={setCompletedCrop}
                    imgRef={imgRef}
                    onCancel={onCropCancel}
                    extractText={extractText}
                    setExtractText={setExtractText}
                    
                    currentPage={currentPageIndex + 1}
                    totalPages={totalPagesIndex}
                    goToPrevPage={goToPrevPage}
                    goToNextPage={goToNextPage}
                    onAddProblemCrop={() => addCropToActiveProblem('problem')}
                    onAddAnswerCrop={() => addCropToActiveProblem('answer')}
                    onNextProblem={nextProblem}
                    onFinishExtraction={finishExtraction}
                    currentProblemIndex={problemsQueueCount + 1}
                    addedProblemsCount={problemsQueueCount}
                    addedProblemCropsCount={currentProblemCrops.problemFiles.length}
                    addedAnswerCropsCount={currentProblemCrops.answerFiles.length}
                    mode={viewMode}
                />
            )}

            {/* --- [기존 업로드 메인 영역] --- */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col min-h-0 mt-8">

                {step === 1 && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide py-12 px-8">
                        <UploadIntro
                            formData={formData} setFormData={setFormData}
                            isManualMode={isManualMode} inputFileRef={inputFileRef}
                            onUpload={handleInitialUpload} onViewMode={setViewMode} setStep={setStep}
                            processIncomingFiles={processIncomingFiles}
                            splitProblems={splitProblems} setSplitProblems={setSplitProblems}
                        />
                    </div>
                )}

                {/* 🔴 [긴급 복구 완료] 단수형(previewUrl)과 배열의 첫 번째 요소([0]) 전달 및 안전장치 추가 */}
                {step === 2 && !isManualMode && (
                    <div className="flex-1 flex items-center justify-center">
                        <AnalysisLoading previewUrl={problemPreviewUrls && problemPreviewUrls.length > 0 ? problemPreviewUrls[0] : null} />
                    </div>
                )}

                {step === 3 && (
                 <div className="flex-1 flex flex-col h-full overflow-y-auto lg:overflow-hidden animate-in slide-in-from-bottom-4 duration-1000">
                    {/* 🔴 [신규] 문항 탭 네비게이터 및 진척도 컨트롤러 */}
                    <div className="bg-slate-900/30 border-b border-white/5 px-8 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide snap-x flex-1">
                            {problemsList.map((prob, idx) => {
                                const isActive = activeProblemIndex === idx;
                                const isSaved = prob.isSaved;
                                return (
                                    <div 
                                        key={idx}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all snap-start select-none ${
                                            isActive
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer'
                                        }`}
                                        onClick={() => {
                                            setActiveProblemIndex(idx);
                                            setCurrentImageIndex(0);
                                        }}
                                    >
                                        {isSaved ? (
                                            <span className="bg-emerald-500 text-white p-0.5 rounded-full flex items-center justify-center"><Check size={10} strokeWidth={3} /></span>
                                        ) : (
                                            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px] font-bold font-mono">{idx + 1}</span>
                                        )}
                                        <span className="text-xs font-bold whitespace-nowrap">
                                            {prob.title ? (prob.title.length > 8 ? prob.title.slice(0, 8) + '...' : prob.title) : `문항 ${idx + 1}`}
                                        </span>
                                        {problemsList.length > 1 && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeProblem(idx);
                                                }}
                                                className="p-0.5 hover:bg-white/20 rounded-md transition-colors text-white/30 hover:text-rose-400 ml-1"
                                                title="이 문항 목록에서 제외"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 현황 요약 및 조작 버튼 */}
                        <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                                저장 완료: <span className="text-emerald-400">{problemsList.filter(p => p.isSaved).length}</span> / {problemsList.length} 문항
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => saveSingleProblem(activeProblemIndex)}
                                    disabled={problemsList[activeProblemIndex]?.isSaved}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 flex items-center gap-1.5 shadow-md ${
                                        problemsList[activeProblemIndex]?.isSaved
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500'
                                    }`}
                                >
                                    <Save size={12} />
                                    <span>{problemsList[activeProblemIndex]?.isSaved ? 'Saved' : 'Save Current'}</span>
                                </button>
                                <button
                                    onClick={() => removeProblem(activeProblemIndex)}
                                    className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 flex items-center gap-1.5 shadow-md"
                                >
                                    <Trash2 size={12} />
                                    <span>Exclude</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 p-6 md:p-12 flex-1 lg:min-h-0 lg:overflow-hidden overflow-y-auto lg:overflow-y-visible">
                            <div className="lg:w-[450px] flex flex-col gap-6 shrink-0 relative">
                                {isAnalyzingAnswer && (
                                    <div className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center animate-in fade-in">
                                        <div className="relative mb-6">
                                            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                            <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
                                        </div>
                                        <p className="text-blue-400 font-black tracking-[0.3em] text-[10px] uppercase">AI Extraction Active</p>
                                    </div>
                                )}
                                <ImageViewer
                                    viewMode={viewMode} setViewMode={setViewMode}
                                    activeUrls={activeUrls}
                                    currentIndex={currentImageIndex}
                                    setIndex={setCurrentImageIndex}
                                    problemCount={problemPreviewUrls.length}
                                    answerCount={answerPreviewUrls.length}
                                    onRemove={handleRemoveImage}
                                    onAdd={handleAddImages}
                                    inputAddRef={inputAddRef}
                                    processIncomingFiles={processIncomingFiles}
                                />
                            </div>
                            <div className="flex-1 flex flex-col min-w-0">
                                <ProblemForm
                                    formData={formData}
                                    setFormData={setFormData}
                                    isAnalyzingAnswer={isAnalyzingAnswer}
                                    updateGradingPoint={updateGradingPoint}
                                    updateSearchTag={updateSearchTag}
                                />
                            </div>
                        </div>
                        <footer className="p-8 border-t border-white/5 bg-white/[0.01] backdrop-blur-md flex justify-between items-center shrink-0">
                             <button
                                onClick={() => resetState(false)}
                                className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-rose-400 transition-all">
                                <RotateCcw size={20} />
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`group relative px-12 py-4 rounded-[1.25rem] font-black text-xs shadow-2xl flex items-center gap-3 transition-all transform active:scale-95 overflow-hidden uppercase tracking-[0.2em] ${isSaving ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.1)]'}`}>
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    <span>{isSaving ? 'Synchronizing...' : 'Save Database'}</span>
                                </button>
                            </div>
                        </footer>
                    </div>
                )}
            </main>

            {isSaving && (
                <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                        <Save className="absolute inset-0 m-auto text-emerald-400 animate-pulse" size={28} />
                    </div>
                    <h3 className="text-emerald-400 font-black tracking-[0.2em] text-[10px] uppercase mb-2">Saving Workbook Database</h3>
                    <p className="text-white font-bold text-sm">데이터베이스에 자료를 저장하고 있습니다...</p>
                    {problemsList && problemsList.length > 0 && (
                        <p className="text-white/40 text-xs mt-2 font-mono">
                            저장 완료: <span className="text-emerald-400 font-bold">{problemsList.filter(p => p.isSaved).length}</span> / {problemsList.length} 문항
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
