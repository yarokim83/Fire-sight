import React from 'react';
import { Camera, Wifi, WifiOff, Loader2, Save, Terminal, RotateCcw } from 'lucide-react';
import { useSmartUpload } from '../hooks/useSmartUpload'; 
import { UploadIntro, AnalysisLoading, ImageViewer, ProblemForm, DebugConsole } from './SmartUploadComponents'; 

export default function SmartUpload({ onSaveComplete, initialData, defaultCategory = '수계' }) {
    const {
        isOnline, isManualMode, setIsManualMode, isSaving, step, setStep,
        viewMode, setViewMode, formData, setFormData,
        problemPreviewUrls, answerPreviewUrls, currentImageIndex, setCurrentImageIndex,
        isAnalyzing, isAnalyzingAnswer, debugLogs, showDebug, setShowDebug, setDebugLogs,
        inputFileRef, inputAddRef,
        handleInitialUpload, handleAddImages, handleRemoveImage, handleSave, resetState
    } = useSmartUpload(initialData, onSaveComplete);
a
    // 뷰어에 보여줄 현재 URL 목록 계산
    const activeUrls = viewMode === 'problem' ? problemPreviewUrls : answerPreviewUrls;

    return (
        <div className="flex flex-col h-full bg-slate-950 p-4 md:p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300 pb-48 scrollbar-hide">
            
            {/* --- 헤더 --- */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Camera className="text-emerald-500" /> 
                    <span className="hidden md:inline">문제 스마트 등록</span>
                    <span className="md:hidden">문제 등록</span>
                </h2>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setShowDebug(!showDebug)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-slate-500 border border-slate-800 hover:text-emerald-400 transition-colors">
                        <Terminal size={12} /> <span className="hidden sm:inline">로그</span>
                    </button>
                    <button onClick={() => setIsManualMode(!isManualMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isManualMode ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50'}`}>
                        {isManualMode ? <WifiOff size={14} /> : <Wifi size={14} />} 
                        <span className="hidden sm:inline">{isManualMode ? '수동 모드' : 'AI 분석'}</span>
                        <span className="sm:hidden">{isManualMode ? '수동' : 'AI'}</span>
                    </button>
                    {step > 1 && (
                        <button onClick={() => resetState(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="초기화">
                            <RotateCcw size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* --- 메인 컨텐츠 영역 --- */}
            <div className="max-w-5xl mx-auto w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-4 md:p-8 shadow-2xl relative">
                
                {/* Step 1: 시작 화면 */}
                {step === 1 && (
                    <UploadIntro 
                        formData={formData} setFormData={setFormData}
                        isManualMode={isManualMode} inputFileRef={inputFileRef}
                        onUpload={handleInitialUpload} onViewMode={setViewMode} setStep={setStep}
                    />
                )}

                {/* Step 2: 분석 중 화면 */}
                {step === 2 && !isManualMode && (
                    <AnalysisLoading previewUrl={problemPreviewUrls[0]} />
                )}

                {/* Step 3: 편집 화면 */}
                {step === 3 && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col lg:flex-row gap-6 mb-6">
                            {/* 왼쪽: 이미지 뷰어 */}
                            <ImageViewer 
                                viewMode={viewMode} setViewMode={setViewMode}
                                activeUrls={activeUrls} currentIndex={currentImageIndex} setIndex={setCurrentImageIndex}
                                problemCount={problemPreviewUrls.length} answerCount={answerPreviewUrls.length}
                                onRemove={handleRemoveImage} onAdd={handleAddImages} inputAddRef={inputAddRef}
                            />
                            {/* 오른쪽: 입력 폼 (이곳에서 출처 정보를 입력받습니다) */}
                            <ProblemForm 
                                formData={formData} setFormData={setFormData}
                                isAnalyzingAnswer={isAnalyzingAnswer}
                            />
                        </div>
                        
                        {/* 하단: 저장 버튼 */}
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-800/50">
                            <button onClick={() => resetState(false)} className="px-5 py-2.5 text-slate-500 hover:text-white transition-colors font-bold text-sm">취소</button>
                            <button onClick={handleSave} disabled={isSaving} className={`px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform active:scale-95 ${isSaving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 hover:shadow-emerald-900/40'}`}>
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {isSaving ? '저장 중...' : (isOnline ? '저장하기' : '로컬 저장')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- 디버그 콘솔 --- */}
            <DebugConsole logs={debugLogs} show={showDebug} onClose={() => setShowDebug(false)} onClear={() => setDebugLogs([])} />
        </div>
    );
}