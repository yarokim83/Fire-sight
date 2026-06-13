import React, { useRef, useEffect, useState } from 'react';
import { 
    Upload, ScanLine, Image as ImageIcon, Trash2, 
    Plus, Sparkles, Terminal, BookOpen, X,
    Target, Calculator, Database, Maximize2,
    CheckCircle2, Hash, Tags, Crop, Check,
    ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize,
    ClipboardPaste, Save
} from 'lucide-react';

import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { SUBJECT_LIST, PROBLEM_TYPES } from '../utils/constants';
import { detectContentBounds } from '../utils/canvasUtils';

/** ---------------------------------------------------------
 * Step 1.5: 이미지 영역 지정 모달 (Crop Modal - Full View & Zoom)
 * 🔴 [최종 정비] 초기 전체 화면 로드 및 정밀 줌을 지원하는 고해상도 엔진입니다.
 --------------------------------------------------------- */
export const CropModal = ({ 
    isOpen, src, crop, setCrop, setCompletedCrop, imgRef, 
    onCancel, extractText, setExtractText,
    
    currentPage, totalPages, goToPrevPage, goToNextPage,
    onAddProblemCrop, onAddAnswerCrop, onNextProblem, onFinishExtraction,
    currentProblemIndex, addedProblemsCount, addedProblemCropsCount, addedAnswerCropsCount,
    mode = 'problem'
}) => {
    const [zoom, setZoom] = useState(100); // 초기값 100% (전체 보기)
    const [cropMode, setCropMode] = useState(mode || 'problem'); // 🔴 내부 로컬 크롭 모드 ('problem' 또는 'answer')

    useEffect(() => {
        if (mode) {
            setCropMode(mode);
        }
    }, [mode]);
    
    if (!isOpen || !src) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 50));
    const handleResetZoom = () => setZoom(100);

    const handleAutoFit = () => {
        if (imgRef.current) {
            const detected = detectContentBounds(imgRef.current, cropMode);
            setCrop(detected);
            setCompletedCrop(detected);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black/98 backdrop-blur-2xl flex flex-col animate-in fade-in duration-300 font-sans">
            {/* 상단 컨트롤 센터: 반응형으로 높이 및 간격 조절 */}
            <div className="bg-slate-900/90 border-b border-white/10 shrink-0 px-4 py-3 xl:py-0 xl:h-20 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 xl:gap-4 relative">
                {/* 1. 왼쪽 타이틀 영역 & 상태 배지 */}
                <div className="flex items-center justify-between xl:justify-start gap-3 w-full xl:w-auto shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 lg:p-3 bg-blue-600 rounded-xl lg:rounded-2xl shadow-lg shadow-blue-600/20">
                            <Maximize size={22} className="text-white" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm lg:text-base font-black text-white tracking-tight">정밀 멀티 크롭</h3>
                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-black">
                                    Page {currentPage} / {totalPages}
                                </span>
                                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-black animate-pulse">
                                    문제 {currentProblemIndex} 크롭 중
                                </span>
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                    지문 {addedProblemCropsCount}장, 해설 {addedAnswerCropsCount}장 수집됨
                                </span>
                                {addedProblemsCount > 0 && (
                                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                        이전 완료 문항: {addedProblemsCount}개
                                    </span>
                                )}
                            </div>
                            <p className="text-white/30 text-[8px] lg:text-[10px] uppercase font-black font-mono tracking-widest mt-0.5">PSA Precision Multi-Crop & Demarcation System</p>
                        </div>
                    </div>
                </div>

                {/* 2. 중앙 페이지 네비게이션 및 줌 컨트롤러 */}
                <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0 my-1 xl:my-0 xl:absolute xl:left-1/2 xl:-translate-x-1/2">
                    {/* PDF 페이지 이동 버튼 */}
                    <button 
                        onClick={goToPrevPage} 
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-black transition-all bg-black/40 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:text-white/60"
                        title="이전 페이지 이동"
                    >
                        ◀ Prev
                    </button>
                    <span className="text-[10px] font-black font-mono text-white/40 px-1">PAGE {currentPage}</span>
                    <button 
                        onClick={goToNextPage} 
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-black transition-all bg-black/40 text-white/60 hover:text-white disabled:opacity-20 disabled:hover:text-white/60"
                        title="다음 페이지 이동"
                    >
                        Next ▶
                    </button>
                    
                    <div className="w-[1px] h-4 bg-white/15 mx-1" />
                    
                    <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-xl text-white/60 transition-all hover:text-white"><ZoomOut size={14} /></button>
                    <div className="flex items-center gap-2 px-1">
                        <input 
                            type="range" min="50" max="300" value={zoom} 
                            onChange={(e) => setZoom(Number(e.target.value))} 
                            className="w-16 sm:w-24 accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[9px] font-black text-blue-400 font-mono w-8">{zoom}%</span>
                    </div>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-xl text-white/60 transition-all hover:text-white"><ZoomIn size={14} /></button>
                    
                    <div className="w-[1px] h-4 bg-white/15 mx-1" />
                    
                    <button onClick={handleResetZoom} className="p-2 hover:bg-white/10 rounded-xl text-white/40 transition-all hover:text-blue-400" title="화면 맞춤">
                        <RotateCcw size={14} />
                    </button>
                    <button onClick={handleAutoFit} className="p-2 hover:bg-white/10 rounded-xl text-amber-500/70 hover:text-amber-400 transition-all" title="스마트 영역 자동 검출">
                        <Sparkles size={14} />
                    </button>
                </div>

                {/* 3. 오른쪽 버튼 액션 영역 (지문크롭, 해설크롭, 다음문제, 추출종료) */}
                <div className="flex flex-wrap items-center justify-center xl:justify-end gap-1.5 md:gap-2 w-full xl:w-auto shrink-0 pb-1 xl:pb-0">
                    {/* [수정] 추출 모드 선택 탭 (텍스트 추출 vs 이미지만 저장) */}
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0">
                        <button 
                            onClick={() => setExtractText(true)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                extractText 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-500/30' 
                                : 'text-white/40 hover:text-white/70'
                            }`}
                            title="텍스트를 분석하여 추출합니다 (OCR ON)"
                        >
                            <ScanLine size={12} />
                            <span>텍스트 추출</span>
                        </button>
                        <button 
                            onClick={() => setExtractText(false)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                !extractText 
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 border border-amber-500/30' 
                                : 'text-white/40 hover:text-white/70'
                            }`}
                            title="텍스트 분석 없이 이미지만 저장합니다 (OCR SKIP)"
                        >
                            <ImageIcon size={12} />
                            <span>이미지만 저장</span>
                        </button>
                    </div>
                    
                    {/* 🔴 [신규] 수집 대상(지문/해설) 선택 토글 탭 */}
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl shrink-0">
                        <button 
                            onClick={() => setCropMode('problem')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                cropMode === 'problem' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-500/30' 
                                : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            <Upload size={12} />
                            <span>지문 (Problem)</span>
                        </button>
                        <button 
                            onClick={() => setCropMode('answer')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                cropMode === 'answer' 
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 border border-emerald-500/30' 
                                : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            <Plus size={12} />
                            <span>해설 (Solution)</span>
                        </button>
                    </div>

                    {/* 🔴 [신규] 단일 크롭 영역 추가 버튼 (cropMode에 따라 다이내믹하게 작동) */}
                    <button 
                        onClick={() => {
                            if (cropMode === 'problem') {
                                onAddProblemCrop();
                                // 편의성: 지문 추가 후 자동으로 해설 수집 모드로 스위칭
                                setCropMode('answer');
                            } else {
                                onAddAnswerCrop();
                            }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 uppercase tracking-widest active:scale-95 shadow-lg ${
                            cropMode === 'problem'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/30 shadow-blue-600/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-emerald-600/20'
                        }`}
                        title={`현재 크롭 영역을 ${cropMode === 'problem' ? '지문' : '정답/해설'} 이미지로 추가 등록`}
                    >
                        <Crop size={14} />
                        <span>선택 영역 추가 (+ Add Crop)</span>
                    </button>
                    
                    <div className="hidden xl:block w-[1px] h-6 bg-white/10 mx-1" />

                    <button 
                        onClick={onNextProblem}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white transition-all text-xs font-black flex items-center gap-1.5 uppercase tracking-widest active:scale-95 shadow-lg shadow-amber-500/20"
                        title="현재까지 크롭한 지문/해설을 현재 문제로 묶고, 다음 문제 크롭으로 이동"
                    >
                        <Check size={14} strokeWidth={3} />
                        <span>다음 문제 ⏩</span>
                    </button>

                    <button 
                        onClick={onFinishExtraction}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all text-xs font-black flex items-center gap-1.5 uppercase tracking-widest active:scale-95 shadow-2xl shadow-rose-600/20"
                        title="크롭 작업을 모두 마치고, 등록된 모든 문제의 백그라운드 AI 추출을 시작"
                    >
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                        <span>추출 종료 🏁</span>
                    </button>

                    <button 
                        onClick={onCancel} 
                        className="px-3 py-2.5 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 transition-all text-xs font-bold border border-white/5 uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {/* 🔴 [수리 핵심] 이미지 캔버스 구역: 줌 수치에 따른 정밀 맵핑 */}
            <div className="flex-1 relative overflow-auto p-12 scrollbar-hide flex items-start justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent">
                <div 
                    className="transition-all duration-300 ease-out origin-top shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                    style={{ 
                        width: zoom === 100 ? 'auto' : `${zoom}%`, 
                        maxWidth: zoom === 100 ? '100%' : 'none'
                    }}
                >
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        className="rounded-lg border border-white/10 overflow-hidden"
                    >
                        <img
                            ref={imgRef}
                            src={src}
                            alt="Target Exam Sheet"
                            className="block"
                            style={{ 
                                width: '100%', 
                                height: 'auto',
                                maxHeight: zoom === 100 ? 'calc(100vh - 240px)' : 'none',
                                objectFit: 'contain'
                            }}
                        />
                    </ReactCrop>
                </div>
            </div>
            
            <div className="h-12 bg-black/80 flex items-center justify-center gap-6 text-[9px] text-white/20 uppercase font-black tracking-[0.5em] border-t border-white/5">
                <span>Precision Acquisition Active</span>
                <div className="w-1.5 h-1.5 bg-blue-500/40 rounded-full animate-pulse" />
                <span>2027 Fire Manager Edition</span>
            </div>
        </div>
    );
};

/** ---------------------------------------------------------
 * DropZoneItem (아이패드 Split View 터치 드롭 및 드래그 피드백 대응)
 --------------------------------------------------------- */
const DropZoneItem = ({ title, subtitle, target, accept, onDropFiles, icon, themeColor }) => {
    const Icon = icon;
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handlePasteFromClipboard = async (e) => {
        e.stopPropagation();
        try {
            if (!navigator.clipboard || !navigator.clipboard.read) {
                alert("이 브라우저/환경에서는 클립보드 읽기 API를 지원하지 않습니다. 최신 Safari 또는 Chrome 브라우저를 사용해 주세요.");
                return;
            }
            const clipboardItems = await navigator.clipboard.read();
            let imageBlob = null;
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        imageBlob = await item.getType(type);
                        break;
                    }
                }
                if (imageBlob) break;
            }

            if (imageBlob) {
                const file = new File([imageBlob], `clipboard-${Date.now()}.png`, { type: imageBlob.type });
                onDropFiles([file], target);
            } else {
                alert("클립보드에 복사된 이미지가 없습니다. 이미지를 캡처 후 '복사'한 다음 눌러주세요.");
            }
        } catch (err) {
            console.error("클립보드 이미지 붙여넣기 실패:", err);
            alert("클립보드 읽기 권한이 거부되었거나 이미지를 가져올 수 없습니다. 브라우저의 클립보드 접근 권한 설정을 확인해 주세요.");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(f => 
                f.type.startsWith('image/') || f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
            );
            if (files.length > 0) {
                onDropFiles(files, target);
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onDropFiles(e.target.files, target);
        }
    };

    const activeTheme = themeColor === 'blue' 
        ? {
            border: isDragOver ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] bg-blue-500/10 scale-[1.02]' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5',
            iconBg: 'bg-blue-600',
            textColor: 'text-blue-400'
          }
        : {
            border: isDragOver ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-emerald-500/10 scale-[1.02]' : 'border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5',
            iconBg: 'bg-emerald-600',
            textColor: 'text-emerald-400'
          };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 h-44 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group active:scale-[0.98] ${activeTheme.border}`}
        >
            <input 
                type="file" 
                multiple 
                accept={accept} 
                onChange={handleFileChange} 
                className="hidden" 
                ref={fileInputRef} 
            />
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xl ${activeTheme.iconBg}`}>
                <Icon size={24} className="text-white" />
            </div>
            <p className="text-white font-bold text-sm tracking-tight">{title}</p>
            <p className={`text-[10px] uppercase font-black tracking-widest mt-1 ${activeTheme.textColor}`}>{subtitle}</p>
            <button 
                type="button"
                onClick={handlePasteFromClipboard}
                className="mt-3 px-3 py-1 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg text-[10px] font-black text-white/80 border border-white/10 flex items-center gap-1.5 transition-all shadow-md z-[50]"
            >
                <ClipboardPaste size={12} className={activeTheme.textColor} />
                클립보드 붙여넣기 📋
            </button>
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 1: 업로드 인트로 (콤팩트 중앙 정렬 & 2분할 드롭존)
 --------------------------------------------------------- */
export const UploadIntro = ({ formData, setFormData, processIncomingFiles, splitProblems, setSplitProblems }) => (
    <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-500 py-6">
        <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">자료 등록 방식 선택</h3>
            <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-black">Data Ingestion System</p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-6 px-4">
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

        {/* 🔴 [신규] PDF/다중 이미지 등록 시 개별 문항 분리 저장 토글 */}
        <div className="flex items-center gap-2.5 mb-8 bg-slate-900 border border-white/10 px-5 py-3 rounded-2xl shadow-lg hover:border-blue-500/50 transition-all select-none cursor-pointer" onClick={() => setSplitProblems(!splitProblems)}>
            <input 
                type="checkbox" 
                id="splitProblems" 
                checked={splitProblems} 
                onChange={(e) => setSplitProblems(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
            />
            <label htmlFor="splitProblems" className="text-xs font-bold text-slate-300 cursor-pointer tracking-tight">
                각 페이지를 개별 문항으로 분리 저장 (PDF / 다중 이미지)
            </label>
        </div>
        
        {/* 2분할 프리미엄 드롭존 (지문용 / 해설용) */}
        <div className="flex gap-6 w-full max-w-2xl px-4">
            <DropZoneItem 
                title="지문 드래그 또는 탭" 
                subtitle="Problem Dropzone" 
                target="problem" 
                accept="image/*,application/pdf"
                onDropFiles={processIncomingFiles}
                icon={Upload}
                themeColor="blue"
            />
            <DropZoneItem 
                title="해설 드래그 또는 탭" 
                subtitle="Solution Dropzone" 
                target="answer" 
                accept="image/*,application/pdf"
                onDropFiles={processIncomingFiles}
                icon={Plus}
                themeColor="emerald"
            />
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
                <span className="text-[9px] font-black tracking-[0.4em] opacity-40 uppercase text-center px-4">Parsing Fire Protection Standards...</span>
            </div>
        </div>
        <h3 className="text-xl font-bold text-white/90">데이터를 정밀 구조화하고 있습니다</h3>
    </div>
);

/** ---------------------------------------------------------
 * Step 3 (Left): 이미지 뷰어 (Zero-Scroll 최적화)
 --------------------------------------------------------- */
export const ImageViewer = ({ 
    viewMode, setViewMode, activeUrls, currentIndex, setIndex, 
    problemCount, answerCount, onRemove, onAdd, inputAddRef,
    processIncomingFiles
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    const hasImages = Array.isArray(activeUrls) && activeUrls.length > 0;

    const handlePasteFromClipboard = async (e) => {
        e.stopPropagation();
        try {
            if (!navigator.clipboard || !navigator.clipboard.read) {
                alert("이 브라우저/환경에서는 클립보드 읽기 API를 지원하지 않습니다. 최신 Safari 또는 Chrome 브라우저를 사용해 주세요.");
                return;
            }
            const clipboardItems = await navigator.clipboard.read();
            let imageBlob = null;
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        imageBlob = await item.getType(type);
                        break;
                    }
                }
                if (imageBlob) break;
            }

            if (imageBlob) {
                const file = new File([imageBlob], `clipboard-${Date.now()}.png`, { type: imageBlob.type });
                processIncomingFiles([file], viewMode);
            } else {
                alert("클립보드에 복사된 이미지가 없습니다. 이미지를 캡처 후 '복사'한 다음 눌러주세요.");
            }
        } catch (err) {
            console.error("클립보드 이미지 붙여넣기 실패:", err);
            alert("클립보드 읽기 권한이 거부되었거나 이미지를 가져올 수 없습니다. 브라우저의 클립보드 접근 권한 설정을 확인해 주세요.");
        }
    };

    return (
        <div className="flex-1 h-full flex flex-col gap-3 animate-in fade-in min-h-0">
            <div className="flex p-1.5 bg-white/5 backdrop-blur-3xl rounded-xl border border-white/10 shrink-0">
                <button onClick={() => setViewMode('problem')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${viewMode === 'problem' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>PROBLEM ({problemCount})</button>
                <button onClick={() => setViewMode('answer')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${viewMode === 'answer' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}>SOLUTION ({answerCount})</button>
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
                            alt="Scan Preview"
                        />
                        {activeUrls.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-1.5 rounded-full text-[9px] font-black text-white border border-white/10 shadow-xl tracking-widest uppercase">
                                {currentIndex + 1} / {activeUrls.length}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 p-10">
                        <div 
                            className="flex flex-col items-center justify-center gap-3 cursor-pointer group/upload" 
                            onClick={() => inputAddRef.current.click()}
                        >
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] group-hover/upload:scale-105 transition-all border-4 border-white/5">
                                <Plus size={32} className="text-white" strokeWidth={3} />
                            </div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest font-bold">Add {viewMode} Asset</p>
                        </div>
                        <button 
                            type="button"
                            onClick={handlePasteFromClipboard}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-[10px] font-black text-white/80 border border-white/10 flex items-center gap-1.5 transition-all shadow-md mt-2"
                        >
                            <ClipboardPaste size={12} className="text-blue-400" />
                            클립보드 붙여넣기 📋
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x h-16 shrink-0">
                <div onClick={() => inputAddRef.current.click()} className="w-14 h-14 shrink-0 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-blue-500/10 text-white/20 transition-all">
                    <input type="file" accept="image/*,application/pdf" multiple onChange={onAdd} className="hidden" ref={inputAddRef} />
                    <Plus size={20} />
                </div>
                <div onClick={handlePasteFromClipboard} className="w-14 h-14 shrink-0 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-blue-500/10 text-white/20 transition-all" title="클립보드 붙여넣기">
                    <ClipboardPaste size={20} />
                </div>
                {hasImages && activeUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setIndex(idx)} className={`w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all snap-start ${idx === currentIndex ? 'border-blue-500 scale-95 shadow-md' : 'border-transparent opacity-40 hover:opacity-100'}`}>
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
 * FormItemInput (로컬 상태를 유지하여 리렌더링 및 포커스 유실 방지)
 * 🔴 [최적화] 타이핑할 때마다 부모 상태를 리렌더링하지 않고 Blur/Enter 시점에 동기화
 --------------------------------------------------------- */
const FormItemInput = ({ initialValue, onUpdate, onRemove, className, inputClassName, placeholder, deleteBtnClassName, deleteIconSize = 14 }) => {
    const [value, setValue] = useState(initialValue || '');
    const [prevInitialValue, setPrevInitialValue] = useState(initialValue);

    if (initialValue !== prevInitialValue) {
        setValue(initialValue || '');
        setPrevInitialValue(initialValue);
    }

    const handleBlur = () => {
        if (value !== initialValue) {
            onUpdate(value);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    };

    return (
        <div className={className}>
            <input 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={inputClassName}
                placeholder={placeholder}
            />
            <button type="button" onClick={onRemove} className={deleteBtnClassName}>
                <X size={deleteIconSize} />
            </button>
        </div>
    );
};

/** ---------------------------------------------------------
 * Step 3 (Right): 입력 폼 (검색 태그 및 채점 매트릭스)
 * --------------------------------------------------------- */
export const ProblemForm = ({ formData, setFormData, isAnalyzingAnswer, updateGradingPoint, updateSearchTag }) => {
    
    const searchTags = formData.searchTags || [];
    const terms = formData.gradingPoints?.mandatory_terms || [];
    const numbers = formData.gradingPoints?.mandatory_numbers || formData.numbers || [];

    const inputStyle = "w-full bg-white/[0.04] border border-white/10 text-white/90 rounded-xl p-3 text-[13px] font-medium focus:border-blue-500/50 transition-all outline-none placeholder:text-white/5 shadow-inner";
    const labelStyle = "text-[9px] font-black text-white/20 uppercase tracking-[0.2em] ml-2 mb-1 block";

    return (
        <div className="w-full lg:w-[380px] lg:h-full lg:overflow-y-auto overflow-visible h-auto flex flex-col gap-4 pr-3 pb-12 lg:pb-24 scrollbar-hide font-sans lg:shrink-0">
            
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

            {/* 검색 메타데이터 (Indigo) */}
            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-3 shrink-0 shadow-lg">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-indigo-400 flex items-center gap-2 uppercase tracking-widest font-bold">
                        <Hash size={12} /> Search Metadata
                    </h4>
                    <button type="button" onClick={() => updateSearchTag('add')} className="p-1 hover:bg-indigo-500/20 rounded-md transition-colors">
                        <Plus size={14} className="text-indigo-400" />
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {searchTags.map((tag, i) => (
                        <FormItemInput 
                            key={i}
                            initialValue={tag}
                            onUpdate={(val) => updateSearchTag('update', val, i)}
                            onRemove={() => updateSearchTag('remove', null, i)}
                            className="flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 group/tag hover:bg-indigo-500/20 transition-all shadow-sm"
                            inputClassName="bg-transparent border-none outline-none text-[11px] text-indigo-100/90 w-16 font-black"
                            placeholder="태그"
                            deleteBtnClassName="group-hover/tag:text-rose-400 text-indigo-900 transition-colors"
                            deleteIconSize={12}
                        />
                    ))}
                    {searchTags.length === 0 && <p className="text-[10px] text-white/5 italic ml-1">No metadata Tags.</p>}
                </div>
            </div>
            
            <div className="flex flex-col shrink-0 mt-2">
                <label className={labelStyle}>Original Content</label>
                <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputStyle} min-h-[140px] resize-y leading-[1.8] text-slate-200 font-medium tracking-wide`} placeholder="소방 지문 원문" />
            </div>

            <div className="flex-1 flex flex-col min-h-[220px] space-y-2 mt-2">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2 font-bold">
                        <CheckCircle2 size={10} /> Model Solution
                    </span>
                    {isAnalyzingAnswer && <Sparkles size={11} className="text-emerald-400 animate-pulse" />}
                </div>
                <textarea value={formData.modelAnswer || ''} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className={`${inputStyle} min-h-[280px] resize-y overflow-y-auto border-white/20 bg-white/[0.02] text-emerald-100 font-medium leading-[1.8] tracking-wide shadow-xl relative z-50`} placeholder="정답 모델" />
            </div>

            {/* 채점 매트릭스 (Emerald) */}
            <div className="p-5 bg-white/[0.02] rounded-[2.5rem] border border-white/10 space-y-5 shrink-0 shadow-xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2 font-black tracking-tighter"><Database size={14} className="text-blue-500" /> MATRIX TAGS</h4>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => updateGradingPoint('mandatory_terms', 'add')} className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">+ TERM</button>
                        <button type="button" onClick={() => updateGradingPoint('mandatory_numbers', 'add')} className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">+ NUM</button>
                    </div>
                </div>

                <div className="flex flex-col gap-4 font-bold">
                    <div className="flex flex-wrap gap-2">
                        {terms.map((term, i) => (
                            <FormItemInput 
                                key={i}
                                initialValue={term}
                                onUpdate={(val) => updateGradingPoint('mandatory_terms', 'update', val, i)}
                                onRemove={() => updateGradingPoint('mandatory_terms', 'remove', null, i)}
                                className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 group/chip hover:bg-emerald-500/20 transition-all shadow-md"
                                inputClassName="bg-transparent border-none outline-none text-[13px] text-emerald-100/90 w-24 font-bold"
                                placeholder="용어 입력"
                                deleteBtnClassName="text-emerald-900 group-hover/chip:text-rose-500 transition-colors"
                                deleteIconSize={14}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {numbers.map((num, i) => (
                            <FormItemInput 
                                key={i}
                                initialValue={num}
                                onUpdate={(val) => updateGradingPoint('mandatory_numbers', 'update', val, i)}
                                onRemove={() => updateGradingPoint('mandatory_numbers', 'remove', null, i)}
                                className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 group/chip hover:bg-blue-500/20 transition-all shadow-lg"
                                inputClassName="bg-transparent border-none outline-none text-[13px] text-blue-100 w-20 font-black"
                                placeholder="수치"
                                deleteBtnClassName="text-blue-900 group-hover/chip:text-rose-500 transition-colors"
                                deleteIconSize={14}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="shrink-0 pb-10">
                <input type="text" value={formData.source || ''} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className={inputStyle} placeholder="Official Reference (e.g. NFPC 101)" />
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
                <span className="text-[10px] font-black text-white/40 flex items-center gap-3 tracking-[0.3em] uppercase font-mono font-bold"><Terminal size={14} /> System Activity Log</span>
                <button onClick={onClose} className="text-[9px] font-bold text-white/20 hover:text-white transition-colors bg-white/5 px-4 py-1.5 rounded-lg border border-white/5 tracking-widest font-black uppercase">Close</button>
            </div>
            <div ref={ref} className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-3 scrollbar-hide">
                {logs?.map((log, i) => (
                    <div key={i} className="text-white/40 flex gap-4 leading-relaxed border-l border-white/5 pl-4 transition-opacity">
                        <span className="text-white/10 select-none tabular-nums font-bold">[{String(i+1).padStart(2, '0')}]</span>
                        <span className="flex-1 tracking-tight font-medium opacity-80">{log}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};