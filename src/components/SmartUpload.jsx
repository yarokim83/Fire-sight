import React, { useState, useEffect } from 'react';
import { Upload, Camera, ScanLine, Save, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';

export default function SmartUpload({ onSaveComplete }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Analyzing, 3: Form
    const [previewUrl, setPreviewUrl] = useState('');
    const [base64Image, setBase64Image] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        type: 'visual', // visual | workbook
        category: 'water',
        title: '',
        description: '', // Used for both description (Visual) and question (Workbook)
        // 2027 Exam Fields
        problemType: 'descriptive', // descriptive, short, calculation
        modelAnswer: '',
        keywords: '',
        answer: '',
        reference: '',
        solution: '',
        finalAnswer: '',
        unit: ''
    });

    // Step 2: AI Analysis with Gemini Service
    useEffect(() => {
        if (step === 2 && selectedFile) {
            analyzeImage(selectedFile)
                .then(result => {
                    setFormData(prev => ({
                        ...prev,
                        // Update fields from AI result
                        type: result.type, // 'workbook' from mock
                        problemType: result.problemType,
                        title: result.title,
                        description: result.description,
                        modelAnswer: result.modelAnswer,
                        keywords: result.keywords,
                        answer: result.answer,
                        reference: result.reference,
                        solution: result.solution,
                        finalAnswer: result.finalAnswer,
                        unit: result.unit
                    }));
                    setStep(3);
                })
                .catch(err => {
                    console.error("AI Analysis Failed", err);
                    alert(`AI 분석에 실패했습니다. (${err.message})\n직접 입력해주세요.`);
                    setStep(3);
                });
        }
    }, [step, selectedFile]);

    // Handle File Upload & Convert to Base64
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Create preview immediately
            setPreviewUrl(URL.createObjectURL(file));
            setStep(2);

            // Convert to Base64 for Storage
            const reader = new FileReader();
            reader.onloadend = () => {
                setBase64Image(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle Save to LocalStorage
    const handleSave = () => {
        if (!formData.title) {
            alert("제목을 입력해주세요.");
            return;
        }

        const newItem = {
            id: `custom-${Date.now()}`,
            type: formData.type,
            category: formData.category, // water, gas, alarm, basic
            title: formData.title,
            imageUrl: base64Image, // Persistent Base64 Data
            description: formData.description,
            // Map common fields to specific component needs
            question: formData.type === 'workbook' ? formData.description : undefined, // For Workbook

            // 2027 Exam Specific Fields
            problemType: formData.type === 'workbook' ? formData.problemType : undefined,
            modelAnswer: formData.type === 'workbook' ? formData.modelAnswer : undefined,
            keywords: formData.type === 'workbook' ? formData.keywords : undefined,
            answer: formData.type === 'workbook' ? formData.answer : undefined,
            reference: formData.type === 'workbook' ? formData.reference : undefined,
            solution: formData.type === 'workbook' ? formData.solution : undefined,
            finalAnswer: formData.type === 'workbook' ? formData.finalAnswer : undefined,
            unit: formData.type === 'workbook' ? formData.unit : undefined,

            isCustom: true,
            createdAt: new Date().toISOString()
        };

        try {
            const existingData = JSON.parse(localStorage.getItem('fireSight_customData') || '[]');
            const updatedData = [newItem, ...existingData];
            localStorage.setItem('fireSight_customData', JSON.stringify(updatedData));

            alert('보관함에 저장되었습니다!');
            if (onSaveComplete) onSaveComplete();
        } catch (error) {
            console.error("Storage Error:", error);
            alert("저장 용량이 부족하거나 오류가 발생했습니다. (이미지 크기를 줄여주세요)");
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Camera className="text-emerald-500" />
                Smart Upload
            </h2>

            <div className="max-w-2xl mx-auto w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group relative cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 shadow-lg">
                                <Upload size={28} />
                            </div>
                            <p className="text-lg font-bold">자료 사진 촬영 / 업로드</p>
                            <p className="text-sm text-slate-500 mt-2">문제집, 도면, 필기 노트 등</p>
                        </div>
                    </div>
                )}

                {/* Step 2: Analyzing (Scan Effect) */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center h-80 text-center">
                        <div className="relative w-full max-w-sm aspect-video bg-slate-950 rounded-lg overflow-hidden mb-6 border border-slate-700 shadow-inner">
                            {previewUrl && <img src={previewUrl} alt="Analyzing" className="w-full h-full object-contain opacity-50" />}
                            {/* Scanning Laser */}
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />

                            <div className="absolute inset-0 flex items-center justify-center flex-col text-emerald-400 font-mono text-xs bg-black/20 backdrop-blur-[1px]">
                                <ScanLine size={32} className="mb-2 animate-pulse" />
                                <span>AI Processing...</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Gemini AI가 문제를 정밀 분석 중입니다...</h3>
                        <p className="text-slate-500 text-sm">문제 유형, 지문, 정답을 추론 중입니다.</p>
                    </div>
                )}

                {/* Step 3: Edit Form */}
                {step === 3 && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                            {/* Preview */}
                            <div className="w-full md:w-1/3 shrink-0">
                                <div className="aspect-[3/4] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center relative group">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setStep(1)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="flex-1 space-y-4">
                                {/* Type Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">자료 유형</label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                        <button
                                            onClick={() => setFormData({ ...formData, type: 'visual' })}
                                            className={`py-2 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2
                                                ${formData.type === 'visual' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <ImageIcon size={14} /> 도면 (Visual)
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, type: 'workbook' })}
                                            className={`py-2 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2
                                                ${formData.type === 'workbook' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <CheckCircle2 size={14} /> 문제 (Workbook)
                                        </button>
                                    </div>
                                </div>

                                {/* Category Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">카테고리</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors appearance-none"
                                    >
                                        <option value="water">수계 소화설비</option>
                                        <option value="gas">가스/제연 설비</option>
                                        <option value="alarm">경보/전기 설비</option>
                                        <option value="basic">기계/전기 기초</option>
                                    </select>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">제목</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="제목을 입력하세요"
                                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description / Content */}
                        {/* PROBLEM TYPE SELECTOR (Only for Workbook) */}
                        {formData.type === 'workbook' && (
                            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">문제 유형 (2027 개편)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['descriptive', 'short', 'calculation'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFormData({ ...formData, problemType: type })}
                                            className={`p-2 rounded text-xs font-bold border transition-all
                                                ${formData.problemType === type
                                                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg'
                                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            {type === 'descriptive' && '서술형 (논술)'}
                                            {type === 'short' && '단답형 (기입)'}
                                            {type === 'calculation' && '실무 계산형'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description / Content (Common) */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                {formData.type === 'workbook' ? '문제 지문 (Question)' : '도면 설명'}
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full h-24 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-4 outline-none focus:border-emerald-500 transition-colors resize-none leading-relaxed placeholder:text-slate-700"
                                placeholder={formData.type === 'workbook' ? "문제를 입력하세요" : "AI가 인식한 내용이 여기에 표시됩니다."}
                            />
                        </div>

                        {/* TYPE SPECIFIC FIELDS */}
                        {formData.type === 'workbook' && (
                            <div className="space-y-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800/50">

                                {/* A. Descriptive */}
                                {formData.problemType === 'descriptive' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">모범 답안 (Model Answer)</label>
                                            <textarea
                                                value={formData.modelAnswer || ''}
                                                onChange={(e) => setFormData({ ...formData, modelAnswer: e.target.value })}
                                                className="w-full h-24 bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500"
                                                placeholder="채점 기준이 될 모범 답안을 작성하세요."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">핵심 키워드 (채점 기준)</label>
                                            <input
                                                type="text"
                                                value={formData.keywords || ''}
                                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500"
                                                placeholder="#교차회로 #2m이상 (쉼표 또는 공백으로 구분)"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* B. Short Answer */}
                                {formData.problemType === 'short' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">정답 (Answer)</label>
                                            <input
                                                type="text"
                                                value={formData.answer || ''}
                                                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500"
                                                placeholder="단답형 정답을 입력하세요."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">관련 기준 (Reference)</label>
                                            <input
                                                type="text"
                                                value={formData.reference || ''}
                                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500"
                                                placeholder="예: NFTC 103 제5조"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* C. Calculation */}
                                {formData.problemType === 'calculation' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">풀이 과정 (Solution Process)</label>
                                            <textarea
                                                value={formData.solution || ''}
                                                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                                                className="w-full h-24 bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500"
                                                placeholder="상세 풀이 과정을 입력하세요."
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">최종 정답</label>
                                                <input
                                                    type="text"
                                                    value={formData.finalAnswer || ''}
                                                    onChange={(e) => setFormData({ ...formData, finalAnswer: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500"
                                                    placeholder="숫자 입력"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">단위</label>
                                                <input
                                                    type="text"
                                                    value={formData.unit || ''}
                                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-3 outline-none focus:border-emerald-500 text-center"
                                                    placeholder="예: m"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setStep(1)}
                                className="px-5 py-2.5 text-slate-500 hover:text-white transition-colors font-bold text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all transform active:scale-95"
                            >
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
