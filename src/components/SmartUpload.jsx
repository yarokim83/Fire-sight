import React, { useState, useEffect, useRef } from 'react';
import { 
    Upload, Camera, ScanLine, Save, X, Image as ImageIcon, 
    CheckCircle2, ChevronLeft, ChevronRight, FileText, 
    Wifi, WifiOff, Edit3, Loader2 // Loader2 아이콘 추가
} from 'lucide-react';
import { analyzeImage } from '../utils/gemini';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function SmartUpload({ onSaveComplete, initialData }) {
    // 온라인 상태 및 모드 설정
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isManualMode, setIsManualMode] = useState(!navigator.onLine);
    
    // [NEW] 중복 저장 방지용 로딩 상태
    const [isSaving, setIsSaving] = useState(false);

    const [step, setStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // 이미지 관련 상태
    const [previewUrls, setPreviewUrls] = useState([]); 
    const [answerPreviewUrl, setAnswerPreviewUrl] = useState(''); 
    const [currentImageIndex, setCurrentImageIndex] = useState(0); 
    
    // 폼 데이터
    const [formData, setFormData] = useState({
        type: 'workbook',
        category: '수계', 
        title: '',
        description: '',
        modelAnswer: '',
        keywords: '',
        problemType: 'descriptive',
        answer: '',
        reference: '',
        images: [], 
        answerImage: null
    });
    
    const inputFileRef = useRef(null);
    const inputAnswerRef = useRef(null);

    // ... (useEffect 등 기존 로직 동일) ...

    useEffect(() => {
        const handleStatusChange = () => {
            const online = navigator.onLine;
            setIsOnline(online);
            if (!online) setIsManualMode(true);
        };
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                type: initialData.type || 'workbook',
                title: initialData.title || '',
                description: initialData.content || '',
                reference: initialData.source || ''
            }));
            if (initialData.image || initialData.imageUrl) {
                const url = initialData.image || initialData.imageUrl;
                setPreviewUrls([url]);
                setStep(3);
            }
        }
    }, [initialData]);

    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newUrls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newUrls]);

        const base64Promises = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        });
        const newBase64Images = await Promise.all(base64Promises);
        
        if (isManualMode) {
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newBase64Images],
                title: prev.title || `수동 기록 (${new Date().toLocaleTimeString()})`,
            }));
            setStep(3);
        } else {
            setStep(2);
            setIsAnalyzing(true);
            const fileToAnalyze = files[0];

            try {
                const result = await analyzeImage(fileToAnalyze, formData.type);
                setFormData(prev => ({
                    ...prev,
                    title: result.title || '',
                    description: result.content || '',
                    modelAnswer: result.answer || '',
                    keywords: Array.isArray(result.tags) ? result.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(', ') : '',
                    images: [...prev.images, ...newBase64Images],
                    ...(prev.type === 'workbook' && { answer: result.answer })
                }));
                setStep(3);
            } catch (error) {
                alert(`🚨 분석 실패 (수동 입력 모드로 전환됩니다):\n${error.message}`);
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, ...newBase64Images],
                    title: "분석 실패 (직접 입력 필요)"
                }));
                setStep(3);
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const handleAnswerImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAnswerPreviewUrl(URL.createObjectURL(file));
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, answerImage: reader.result }));
        };
        reader.readAsDataURL(file);
    };

    // [핵심 수정] 저장 핸들러에 '저장 중(isSaving)' 잠금 장치 추가
    const handleSave = async () => {
        // 1. 이미 저장 중이라면 함수 종료 (중복 클릭 방지)
        if (isSaving) return;

        if (!formData.title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }

        // 2. 저장 시작 상태로 변경 (버튼 비활성화됨)
        setIsSaving(true);

        try {
            const tagArray = formData.keywords
                .split(',')
                .map(tag => tag.trim().replace(/^#/, ''))
                .filter(tag => tag.length > 0);

            const saveData = {
                ...formData,
                title: formData.title || "제목 없음",
                content: formData.description || "",
                answer: formData.modelAnswer || "", 
                tags: tagArray,
                createdAt: serverTimestamp(),
                imageUrl: formData.images.length > 0 ? formData.images[0] : null,
                images: formData.images,
                answerImageUrl: formData.answerImage || null,
                isManual: isManualMode
            };

            await addDoc(collection(db, "workbook"), saveData);
            
            const msg = isOnline ? "✅ 보관함에 저장되었습니다!" : "💾 오프라인 저장 완료! (연결 시 동기화됨)";
            alert(msg);
            
            if(onSaveComplete) onSaveComplete(); 

        } catch (error) {
            console.error("🔥 저장 실패:", error);
            alert(`저장 실패: ${error.message}`);
        } finally {
            // 3. 성공하든 실패하든 저장 상태 해제
            setIsSaving(false);
        }
    };
    
    const resetState = () => {
        setStep(1);
        setPreviewUrls([]);
        setAnswerPreviewUrl('');
        setCurrentImageIndex(0);
        setIsAnalyzing(false);
        setFormData({
            type: 'workbook', category: '수계', title: '', description: '',
            modelAnswer: '', keywords: '', problemType: 'descriptive',
            answer: '', reference: '', images: [], answerImage: null
        });
        if (inputFileRef.current) inputFileRef.current.value = '';
        if (inputAnswerRef.current) inputAnswerRef.current.value = '';
    };

    const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % previewUrls.length);
    const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + previewUrls.length) % previewUrls.length);

    const startTextOnlyMode = () => {
        setPreviewUrls([]);
        setFormData(prev => ({ ...prev, images: [], title: '텍스트 문제' }));
        setStep(3);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 p-4 md:p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Camera className="text-emerald-500" />
                    문제 등록
                </h2>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsManualMode(!isManualMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                            ${isManualMode 
                                ? 'bg-slate-800 text-slate-300 border-slate-600' 
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            }`}
                    >
                        {isManualMode ? <WifiOff size={14} /> : <Wifi size={14} />}
                        {isManualMode ? '수동 (오프라인)' : 'AI 자동 분석'}
                    </button>

                    {step > 1 && (
                        <button onClick={resetState} className="text-xs text-slate-400 hover:text-white px-2">취소</button>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-2xl">

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="animate-in fade-in">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-400 mb-3 text-center">1. 유형 선택</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'workbook' })}
                                    className={`py-2.5 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'workbook' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <CheckCircle2 size={16} /> 문제집
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'visual' })}
                                    className={`py-2.5 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'visual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <ImageIcon size={16} /> 도면/자료
                                </button>
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-bold text-slate-400 mb-3 text-center">2. 자료 등록</label>
                             <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group relative cursor-pointer bg-slate-950/50" onClick={() => inputFileRef.current.click()}>
                                <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={inputFileRef} />
                                <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 shadow-lg">
                                        {isManualMode ? <Edit3 size={24}/> : <Upload size={24} />}
                                    </div>
                                    <p className="font-bold">
                                        {isManualMode ? '사진 선택 (AI 분석 건너뜀)' : '사진 선택 (AI 자동 분석)'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">여러 장 선택 가능</p>
                                </div>
                             </div>

                             {isManualMode && (
                                <button 
                                    onClick={startTextOnlyMode}
                                    className="w-full mt-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText size={16} /> 사진 없이 글자만 입력하기
                                </button>
                             )}
                        </div>
                    </div>
                )}

                {/* Step 2: Analysis */}
                {step === 2 && !isManualMode && (
                    <div className="flex flex-col items-center justify-center h-80 text-center animate-in fade-in">
                        <div className="relative w-full max-w-sm aspect-video bg-slate-950 rounded-lg overflow-hidden mb-6 border border-slate-700 shadow-inner">
                            {previewUrls.length > 0 && <img src={previewUrls[0]} alt="Analyzing" className="w-full h-full object-contain opacity-50" />}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />
                            <div className="absolute inset-0 flex items-center justify-center flex-col text-emerald-400 font-mono text-xs bg-black/20 backdrop-blur-[1px]">
                                <ScanLine size={32} className="mb-2 animate-pulse" />
                                <span>AI Processing...</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Gemini AI가 이미지를 분석하고 있습니다...</h3>
                        <p className="text-slate-500 text-sm">잠시만 기다려주세요.</p>
                    </div>
                )}
                
                {/* Step 3: Editor */}
                {step === 3 && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col lg:flex-row gap-6 mb-6">
                            {previewUrls.length > 0 && (
                                <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-4">
                                    <div className="aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                                            <img src={previewUrls[currentImageIndex]} alt={`Preview ${currentImageIndex}`} className="w-full h-full object-contain" />
                                            {previewUrls.length > 1 && (
                                                <>
                                                    <button onClick={prevImage} className="absolute left-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"><ChevronLeft size={20} /></button>
                                                    <button onClick={nextImage} className="absolute right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"><ChevronRight size={20} /></button>
                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 px-2 py-0.5 rounded-full text-xs text-white">
                                                        {currentImageIndex + 1} / {previewUrls.length}
                                                    </div>
                                                </>
                                            )}
                                    </div>
                                    
                                    <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><FileText size={12}/> 답안지/해설 사진</span>
                                            <button onClick={() => inputAnswerRef.current.click()} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-300 hover:text-white border border-slate-700">추가</button>
                                            <input type="file" accept="image/*" onChange={handleAnswerImageSelect} className="hidden" ref={inputAnswerRef} />
                                        </div>
                                        {answerPreviewUrl ? (
                                            <div className="h-20 rounded border border-slate-700 overflow-hidden relative group">
                                                <img src={answerPreviewUrl} className="w-full h-full object-cover" alt="Answer" />
                                                <button onClick={() => {setAnswerPreviewUrl(''); setFormData(p=>({...p, answerImage: null}))}} className="absolute top-1 right-1 bg-red-500/80 text-white p-0.5 rounded opacity-0 group-hover:opacity-100"><X size={12}/></button>
                                            </div>
                                        ) : (
                                            <div className="h-20 rounded border border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs">
                                                등록된 이미지 없음
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">과목 분류 (NFTC)</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors">
                                            <option value="수계">수계 소화설비</option>
                                            <option value="가스계">가스계/제연 설비</option>
                                            <option value="경보">경보/전기 설비</option>
                                            <option value="피난">피난 구조 설비</option>
                                            <option value="소화활동">소화활동 설비</option>
                                            <option value="공통">소방 공통/기타</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">문제 유형</label>
                                        <select value={formData.problemType} onChange={(e) => setFormData({ ...formData, problemType: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors">
                                            <option value="descriptive">서술형</option>
                                            <option value="drawing">도면/도시기호</option>
                                            <option value="calculation">계산형</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">제목</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="문제 제목" className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700" />
                                </div>
                                
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {formData.type === 'workbook' ? '문제 지문' : '도면 설명'}
                                    </label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-24 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder={formData.type === 'workbook' ? "문제의 지문 입력" : "설명 입력"} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {formData.type === 'workbook' ? '정답 및 해설' : '핵심 포인트 요약'}
                                    </label>
                                    <textarea value={formData.modelAnswer} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className="w-full h-24 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder="정답 및 해설 입력" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">키워드 (쉼표 구분)</label>
                                    <input type="text" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} placeholder="#키워드1, #키워드2" className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-800">
                            <button onClick={resetState} className="px-5 py-2.5 text-slate-500 hover:text-white transition-colors font-bold text-sm">취소</button>
                            
                            {/* [핵심] 저장 버튼에 isSaving 상태 연결하여 비활성화 */}
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving} // 저장 중일 때 클릭 불가
                                className={`px-6 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all transform active:scale-95
                                    ${isSaving 
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18} />}
                                {isSaving ? '저장 중...' : (isOnline ? '보관함에 저장' : '오프라인 저장')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style jsx>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}