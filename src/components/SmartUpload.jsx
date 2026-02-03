import React from 'react';
import { Camera, Wifi, WifiOff, Loader2, Save, Terminal, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useSmartUpload } from '../hooks/useSmartUpload'; 
import { 
    UploadIntro, AnalysisLoading, ImageViewer, ProblemForm, DebugConsole,
    CropModal 
} from './SmartUploadComponents'; 

export default function SmartUpload({ onSaveComplete, initialData, defaultCategory = '수계' }) {
    const {
        isOnline, isManualMode, setIsManualMode, isSaving, step, setStep,
        viewMode, setViewMode, formData, setFormData,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex,
        isAnalyzing, isAnalyzingAnswer, debugLogs, showDebug, setShowDebug, setDebugLogs,
        inputFileRef, inputAddRef,
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState,
        updateGradingPoint, updateSearchTag,
        // 🔴 [데이터 유실 방지] 순차 진행 상태 및 큐 데이터 수신 배선
        cropSrc, crop, setCrop, completedCrop, setCompletedCrop, 
        isCropModalOpen, imgRef, onCropConfirm, onCropCancel,
        currentCropTotal, currentCropIndex 
    } = useSmartUpload(initialData, onSaveComplete);

    // 뷰어에 전달할 URL 리스트 (실시간 계산 및 유실 방지)
    const activeUrls = viewMode === 'problem' ? problemPreviewUrls : answerPreviewUrls;

    return (
        <div className="flex flex-col h-full bg-black text-white p-6 md:p-10 overflow-hidden w-full animate-in fade-in duration-1000">
            
            {/* 🔴 [업데이트] 이미지 영역 지정 모달 (멀티 이미지 진행도 연동) */}
            <CropModal 
                isOpen={isCropModalOpen}
                src={cropSrc}
                crop={crop}
                setCrop={setCrop}
                setCompletedCrop={setCompletedCrop}
                imgRef={imgRef}
                onConfirm={onCropConfirm}
                onCancel={onCropCancel}
                totalCount={currentCropTotal}    // 🔴 전체 이미지 수 전달 (예: 3)
                currentIndex={currentCropIndex}  // 🔴 현재 진행 번호 전달 (예: 1)
            />

            {/* 1. Header: Apple Typography Style */}
            <div className="flex justify-between items-center mb-10 shrink-0">
                <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white/90 flex items-center gap-3">
                        <Camera className="text-white" size={32} /> 
                        <span>Smart Upload</span>
                    </h2>
                    <p className="text-white/30 text-sm font-medium tracking-tight ml-1">
                        {initialData ? '기존 소방 시설 데이터를 정밀 수정합니다.' : 'AI 분석을 통해 NFPC 기준을 자동 추출합니다.'}
                    </p>
                </div>

                {/* 컨트롤 그룹 (유리 질감) */}
                <div className="flex gap-3 items-center">
                    <button 
                        onClick={() => setShowDebug(!showDebug)} 
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white/70 transition-all shadow-xl"
                    >
                        <Terminal size={20} />
                    </button>
                    
                    <button 
                        onClick={() => setIsManualMode(!isManualMode)} 
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-2xl ${isManualMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-white text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
                    >
                        {isManualMode ? <WifiOff size={16} /> : <Wifi size={16} />} 
                        <span className="tracking-widest uppercase">{isManualMode ? 'Manual' : 'AI Engine'}</span>
                    </button>

                    {step > 1 && (
                        <button 
                            onClick={() => resetState(false)} 
                            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-rose-400 transition-all"
                        >
                            <RotateCcw size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Main Workspace Area: Apple Studio Style */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col min-h-0">
                
                {/* 배경 은은한 광채 효과 */}
                <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-white/[0.01] rounded-full blur-[120px] pointer-events-none" />

                {/* Step 1: 시작 화면 */}
                {step === 1 && (
                    <div className="flex-1 overflow-y-auto scrollbar-hide py-12 px-8">
                        <UploadIntro 
                            formData={formData} setFormData={setFormData}
                            isManualMode={isManualMode} inputFileRef={inputFileRef}
                            onUpload={handleInitialUpload} onViewMode={setViewMode} setStep={setStep}
                        />
                    </div>
                )}

                {/* Step 2: 분석 중 화면 (문제 지문 초기 분석) */}
                {step === 2 && !isManualMode && (
                    <div className="flex-1 flex items-center justify-center">
                        <AnalysisLoading previewUrl={problemPreviewUrls[0]} />
                    </div>
                )}

                {/* Step 3: 편집 화면 (고성능 워크스테이션 레이아웃) */}
                {step === 3 && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom-4 duration-1000">
                        <div className="flex flex-col lg:flex-row gap-12 p-8 md:p-12 flex-1 min-h-0 overflow-hidden">
                            
                            {/* 왼쪽: 이미지 뷰어 및 추출 로딩 피드백 */}
                            <div className="lg:w-[450px] flex flex-col gap-6 shrink-0 relative">
                                
                                {/* 🔴 [업데이트] 해설 추출 중 전용 오버레이: 멀티 이미지 병합 중임을 명시적으로 표시 */}
                                {isAnalyzingAnswer && (
                                    <div className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center animate-in fade-in">
                                        <div className="relative mb-6">
                                            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                            <Sparkles className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={24} />
                                        </div>
                                        <p className="text-blue-400 font-black tracking-[0.3em] text-[10px] uppercase">AI Extraction Active</p>
                                        <p className="text-white/40 text-[9px] mt-2 font-mono italic">Syncing with NFPC Standards...</p>
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
                                    onAdd={handleAddImages} // 🔴 크롭 모달이 연결된 훅의 함수와 결속
                                    inputAddRef={inputAddRef}
                                />
                            </div>

                            {/* 오른쪽: 입력 폼 (검색 태그 및 매트릭스 통합) */}
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
                        
                        {/* 3. 하단 액션바: Apple's Floating Footer Style */}
                        <footer className="p-8 border-t border-white/5 bg-white/[0.01] backdrop-blur-md flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2 text-white/20 text-xs font-bold tracking-widest uppercase font-mono">
                                <ShieldCheck size={14} className="text-emerald-500/50" /> System Verified for 2027 Success
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => resetState(false)} 
                                    className="px-8 py-4 text-white/30 hover:text-rose-400 transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    Abort
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={isSaving} 
                                    className={`
                                        group relative px-12 py-4 rounded-[1.25rem] font-black text-xs shadow-2xl flex items-center gap-3 transition-all transform active:scale-95 overflow-hidden uppercase tracking-[0.2em]
                                        ${isSaving 
                                            ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                            : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.1)]'}
                                    `}
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    <span>{isSaving ? 'Synchronizing...' : (isOnline ? 'Commit to Cloud' : 'Save Local')}</span>
                                </button>
                            </div>
                        </footer>
                    </div>
                )}
            </main>

            {/* --- 디버그 콘솔 --- */}
            <DebugConsole logs={debugLogs} show={showDebug} onClose={() => setShowDebug(false)} />
        </div>
    );
}