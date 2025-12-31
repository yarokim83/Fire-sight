
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Camera, ScanLine, Save, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { analyzeImage } from '../utils/gemini';
import { saveCustomProblem } from '../utils/db';

export default function SmartUpload({ onSaveComplete, initialData }) {
    const [step, setStep] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [formData, setFormData] = useState({
        type: 'workbook',
        category: 'water',
        title: '',
        description: '',
        modelAnswer: '',
        keywords: '',
        problemType: 'descriptive',
        answer: '',
        reference: '',
        solution: '',
        finalAnswer: '',
        unit: ''
    });
    
    const inputFileRef = useRef(null);

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
                setPreviewUrl(url);
                setStep(3);
            }
        }
    }, [initialData]);

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStep(2);
        setIsAnalyzing(true);

        try {
            const result = await analyzeImage(file, formData.type);
            
            setFormData(prev => ({
                ...prev,
                title: result.title || '',
                description: result.content || '',
                modelAnswer: result.answer || '',
                keywords: Array.isArray(result.tags) ? result.tags.join(', ') : '',
                ...(formData.type === 'workbook' && { answer: result.answer })
            }));
            setStep(3);

        } catch (error) {
            alert(`🚨 분석 실패 원인:\n${error.message}`);
            console.error("AI Analysis Failed", error);
            setStep(3);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title) {
            alert("제목을 입력해주세요.");
            return;
        }
        
        const newItem = {
            id: `custom-${Date.now()}`,
            ...formData,
            imageUrl: previewUrl,
            isCustom: true,
            createdAt: new Date().toISOString()
        };

        try {
            await saveCustomProblem(newItem);
            alert('보관함에 저장되었습니다!');
            if (onSaveComplete) onSaveComplete();
            resetState();
        } catch (error) {
            console.error("Storage Error:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };
    
    const resetState = () => {
        setStep(1);
        setPreviewUrl('');
        setSelectedFile(null);
        setIsAnalyzing(false);
        setFormData({
            type: 'workbook', category: 'water', title: '', description: '',
            modelAnswer: '', keywords: '', problemType: 'descriptive',
            answer: '', reference: '', solution: '', finalAnswer: '', unit: ''
        });
    }

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

            <div className="max-w-2xl mx-auto w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">

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
                             <label className="block text-sm font-bold text-slate-400 mb-3 text-center">2. 사진 업로드</label>
                             <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group relative cursor-pointer bg-slate-950/50" onClick={() => inputFileRef.current.click()}>
                                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" ref={inputFileRef} />
                                <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                                    <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 shadow-lg">
                                        <Upload size={24} />
                                    </div>
                                    <p className="font-bold">파일 선택 또는 드래그 & 드롭</p>
                                    <p className="text-xs text-slate-500 mt-1">문제집, 도면, 필기 노트 등</p>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {(step === 2 || isAnalyzing) && (
                    <div className="flex flex-col items-center justify-center h-80 text-center animate-in fade-in">
                        <div className="relative w-full max-w-sm aspect-video bg-slate-950 rounded-lg overflow-hidden mb-6 border border-slate-700 shadow-inner">
                            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-50" />}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />
                            <div className="absolute inset-0 flex items-center justify-center flex-col text-emerald-400 font-mono text-xs bg-black/20 backdrop-blur-[1px]">
                                <ScanLine size={32} className="mb-2 animate-pulse" />
                                <span>AI Processing...</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Gemini AI가 이미지를 분석하고 있습니다...</h3>
                        <p className="text-slate-500 text-sm">{formData.type === 'workbook' ? '문제 유형, 지문, 정답을 추론합니다.' : '도면의 구조와 핵심 특징을 요약합니다.'}</p>
                    </div>
                )}
                
                {step === 3 && !isAnalyzing && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                            <div className="w-full md:w-1/3 shrink-0">
                               <div className="aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={resetState}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">카테고리</label>
                                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors">
                                        <option value="water">수계 소화설비</option>
                                        <option value="gas">가스/제연 설비</option>
                                        <option value="alarm">경보/전기 설비</option>
                                        <option value="basic">기계/전기 기초</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">제목</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="AI가 생성한 제목" className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700" />
                                </div>
                                
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                        {formData.type === 'workbook' ? '문제 지문' : '도면 설명'}
                                    </label>
                                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full h-28 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none" placeholder={formData.type === 'workbook' ? "문제의 지문" : "도면 또는 자료에 대한 설명"} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
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
