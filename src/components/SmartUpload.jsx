
import React, { useState } from 'react';
import { Settings, Cpu, Terminal, BrainCircuit, X, Save, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { useSmartUpload } from '../hooks/useSmartUpload';
import {
    UploadIntro, AnalysisLoading, ImageViewer, ProblemForm, DebugConsole,
    CropModal
} from './SmartUploadComponents';

export default function SmartUpload({ onSaveComplete, initialData }) {
    const {
        aiModel, setAiModel,
        isManualMode, isSaving, step, setStep,
        viewMode, setViewMode, formData, setFormData,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex,
        isAnalyzingAnswer, debugLogs, showDebug, setShowDebug,
        inputFileRef, inputAddRef,
        processIncomingFiles,
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState,
        updateGradingPoint, updateSearchTag,
        cropSrc, crop, setCrop, setCompletedCrop,
        isCropModalOpen, imgRef, onCropConfirm, onCropSkip, onCropCancel,
        currentCropTotal, currentCropIndex,
        extractText, setExtractText
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
                <div className="absolute top-16 right-4 z-[100] w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">AI Model Config</h4>
                        <button onClick={() => setShowModelSettings(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-slate-500 font-bold mb-1.5 block">ENTER GEMINI MODEL ID</label>
                            <input
                                type="text"
                                value={tempModelName}
                                onChange={(e) => setTempModelName(e.target.value)}
                                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500/50 transition-all"
                                placeholder="e.g. gemini-3.1-pro-preview"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setAiModel(tempModelName);
                                setShowModelSettings(false);
                                alert(`모델이 ${tempModelName}으로 변경되었습니다.`);
                            }}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                        >
                            <Save size={14} /> APPLY MODEL CHANGE
                        </button>
                    </div>
                </div>
            )}

            {/* --- [터미널 로그 창] --- */}
            <DebugConsole logs={debugLogs} show={showDebug} onClose={() => setShowDebug(false)} />

            {/* 🔴 [위치 이동] CropModal을 main 밖으로 빼내서 무조건 최상단에 뜨게 만듭니다! */}
            {isCropModalOpen && (
                <CropModal
                    isOpen={isCropModalOpen}
                    src={cropSrc}
                    crop={crop}
                    setCrop={setCrop}
                    setCompletedCrop={setCompletedCrop}
                    imgRef={imgRef}
                    onConfirm={onCropConfirm}
                    onSkip={onCropSkip}
                    onCancel={onCropCancel}
                    totalCount={currentCropTotal}
                    currentIndex={currentCropIndex}
                    extractText={extractText}
                    setExtractText={setExtractText}
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
                     <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom-4 duration-1000">
                        <div className="flex flex-col lg:flex-row gap-12 p-8 md:p-12 flex-1 min-h-0 overflow-hidden">
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
        </div>
    );
}
