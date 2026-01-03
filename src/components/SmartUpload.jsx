import React, { useState, useEffect, useRef } from 'react';
import { Upload, Camera, ScanLine, Save, X, Image as ImageIcon, CheckCircle2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { analyzeImage } from '../utils/gemini';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function SmartUpload({ onSaveComplete, initialData }) {
    const [step, setStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // [NEW] 다중 이미지 및 답안 이미지 상태
    const [previewUrls, setPreviewUrls] = useState([]); // 문제 이미지들
    const [answerPreviewUrl, setAnswerPreviewUrl] = useState(''); // 답안 이미지
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // 슬라이더 인덱스
    
    // AI 분석 데이터 보관
    const [analyzedData, setAnalyzedData] = useState(null);

    const [formData, setFormData] = useState({
        type: 'workbook',
        category: '수계', // [FIX] NFTC 기본값
        title: '',
        description: '',
        modelAnswer: '',
        keywords: '',
        problemType: 'descriptive', // [NEW] 문제 유형 (descriptive, drawing, calculation)
        answer: '',
        reference: '',
        images: [], // [NEW] Base64 문자열 배열
        answerImage: null // [NEW] 답안 이미지 Base64
    });
    
    const inputFileRef = useRef(null);
    const inputAnswerRef = useRef(null);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                type: initialData.type || 'workbook',
                title: initialData.title || '',
                description: initialData.content || '',
                reference: initialData.source || ''
            }));
            // 공유받은 이미지가 있다면 처리 (단일 이미지 가정)
            if (initialData.image || initialData.imageUrl) {
                const url = initialData.image || initialData.imageUrl;
                setPreviewUrls([url]);
                setStep(3);
            }
        }
    }, [initialData]);

    // [NEW] 다중 이미지 선택 핸들러
    const handleImageSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 미리보기 URL 생성
        const newUrls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newUrls]);
        setStep(2);
        setIsAnalyzing(true);

        // 첫 번째 이미지만 AI 분석에 사용 (비용 절감 및 대표성)
        const fileToAnalyze = files[0];

        try {
            // 파일을 Base64로 변환하여 저장 (나중에 DB 저장용)
            const base64Promises = files.map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            });
            const base64Images = await Promise.all(base64Promises);
            setFormData(prev => ({ ...prev, images: [...prev.images, ...base64Images] }));

            // Gemini AI 분석 수행
            const result = await analyzeImage(fileToAnalyze, formData.type);
            setAnalyzedData(result); 
            
            setFormData(prev => ({
                ...prev,
                title: result.title || '',
                description: result.content || '',
                modelAnswer: result.answer || '',
                keywords: Array.isArray(result.tags) ? result.tags.map(t => t.startsWith('#') ? t : `#${t}`).join(', ') : '',
                ...(formData.type === 'workbook' && { answer: result.answer })
            }));
            setStep(3);

        } catch (error) {
            alert(`🚨 분석 실패 (이미지는 등록됨):\n${error.message}`);
            console.error("AI Analysis Failed", error);
            setStep(3);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // [NEW] 답안지/해설 이미지 별도 업로드
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

    const handleSave = async () => {
        if (!db) {
            alert("🚨 긴급: DB 연결 실패");
            return;
        }

        if (!formData.title && !formData.description) {
            alert("❌ 제목이나 내용을 입력해주세요.");
            return;
        }

        try {
            const tagArray = formData.keywords
                .split(',')
                .map(tag => tag.trim().replace(/^#/, ''))
                .filter(tag => tag.length > 0);

            const saveData = {
                title: formData.title || "제목 없음",
                content: formData.description || "",
                answer: formData.modelAnswer || "",
                category: formData.category,
                problemType: formData.problemType, // [NEW] 저장 필드 추가
                tags: tagArray,
                createdAt: serverTimestamp(),
                type: 'workbook',
                
                // [NEW] 이미지 데이터 저장
                imageUrl: formData.images.length > 0 ? formData.images[0] : null, // 썸네일용 대표 이미지
                images: formData.images, // 전체 이미지 배열
                answerImageUrl: formData.answerImage || null // 답안 이미지
            };

            await addDoc(collection(db, "workbook"), saveData);
            alert("✅ 보관함에 저장되었습니다!");
            if(onSaveComplete) onSaveComplete(); 

        } catch (error) {
            console.error("🔥 저장 실패:", error);
            alert(`🚨 저장 실패 원인:\n${error.message}`);
        }
    };
    
    const resetState = () => {
        setStep(1);
        setPreviewUrls([]);
        setAnswerPreviewUrl('');
        setCurrentImageIndex(0);
        setIsAnalyzing(false);
        setAnalyzedData(null);
        setFormData({
            type: 'workbook', category: '수계', title: '', description: '',
            modelAnswer: '', keywords: '', problemType: 'descriptive',
            answer: '', reference: '', images: [], answerImage: null
        });
    }

    // 슬라이더 네비게이션
    const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % previewUrls.length);
    const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + previewUrls.length) % previewUrls.length);

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Camera className="text-emerald-500" />
                    Smart Upload
                </h2>
                {step > 1 && (
                     <button onClick={resetState} className="mb-6 text-sm text-slate-400 hover:text-white transition-colors">다시 시작</button>
                )}
            </div>

            <div className="max-w-4xl mx-auto w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">

                {step === 1 && (
                    <div className="animate-in fade-in">
                         <div>
                            <label className="block text-sm font-bold text-slate-400 mb-3 text-center">1. 분석 모드 선택</label>
                            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 mb-6">
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'workbook' })}
                                    className={`py-2.5 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'workbook' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <CheckCircle2 size={16} /> 문제집 분석
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, type: 'visual' })}
                                    className={`py-2.5 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.type === 'visual' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <ImageIcon size={16} /> 도면/자료 분석
                                </button>
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-bold text-slate-400 mb-3 text-center">2. 사진 업로드 (다중 선택 가능)</label>
                             <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group relative cursor-pointer bg-slate-950/50" onClick={() => inputFileRef.current.click()}>
                                <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" ref={inputFileRef} />
                                <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 shadow-lg">
                                        <Upload size={24} />
                                    </div>
                                    <p className="font-bold">파일 선택 (여러 장 가능)</p>
                                    <p className="text-xs text-slate-500 mt-1">문제집, 도면, 필기 노트 등</p>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {(step === 2 || isAnalyzing) && (
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
                        <p className="text-slate-500 text-sm">첫 번째 이미지를 기준으로 내용을 분석합니다.</p>
                    </div>
                )}
                
                {step === 3 && !isAnalyzing && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col lg:flex-row gap-6 mb-6">
                            {/* 좌측: 이미지 슬라이더 */}
                            <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-4">
                               <div className="aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                                    {previewUrls.length > 0 && (
                                        <img src={previewUrls[currentImageIndex]} alt={`Preview ${currentImageIndex}`} className="w-full h-full object-contain" />
                                    )}
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
                                
                                {/* [NEW] 답안 이미지 업로드 영역 */}
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

                            {/* 우측: 입력 폼 */}
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
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="AI가 생성한 제목" className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700" />
                                </div>
                                
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {formData.type === 'workbook' ? '문제 지문' : '도면 설명'}
                                    </label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-24 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder={formData.type === 'workbook' ? "문제의 지문" : "도면 또는 자료에 대한 설명"} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {formData.type === 'workbook' ? '정답 및 해설' : '핵심 포인트 요약'}
                                    </label>
                                    <textarea value={formData.modelAnswer} onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })} className="w-full h-24 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder={formData.type === 'workbook' ? "문제에 대한 정답 및 해설" : "자료의 핵심 내용 요약"} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">키워드 태그 (쉼표로 구분)</label>
                                    <input type="text" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })} placeholder="#교차회로, #감지기, #수신기" className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-800">
                            <button onClick={resetState} className="px-5 py-2.5 text-slate-500 hover:text-white transition-colors font-bold text-sm">취소</button>
                            <button onClick={handleSave} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all transform active:scale-95">
                                <Save size={18} />
                                보관함에 저장
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