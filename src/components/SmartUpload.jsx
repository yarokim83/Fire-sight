import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, FileText, CheckCircle2, ScanLine, Save, ArrowRight, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function SmartUpload({ onSaveComplete }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Analyzing, 3: Edit, 4: Complete
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [meta, setMeta] = useState({
        type: 'workbook', // workbook | visual
        category: 'water',
        title: '',
        content: '', // Question or Description
        answer: '', // Model Answer (for workbook)
    });

    // Step 2: Simulated Analysis
    useEffect(() => {
        if (step === 2) {
            const timer = setTimeout(() => {
                // Auto-fill dummy OCR data
                setMeta(prev => ({
                    ...prev,
                    title: prev.title || 'AI 자동 추천 제목 (2025-12-23)',
                    content: prev.content || '이 문제의 정답과 해설을 서술하시오.',
                    answer: prev.answer || '여기에 정답이 자동으로 추출되어 입력됩니다.'
                }));
                setStep(3);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setStep(2);
        }
    };

    const handleSave = () => {
        const newItem = {
            id: `user-${Date.now()}`,
            type: meta.type,
            category: meta.category,
            title: meta.title,
            imageUrl: previewUrl, // In real app, upload to server/S3
            isCustom: true,
            createdAt: new Date().toISOString(),
            // Fields for Workbook
            question: meta.type === 'workbook' ? meta.content : undefined,
            modelAnswer: meta.type === 'workbook' ? meta.answer : undefined,
            keywords: [],
            // Fields for Visual
            description: meta.type === 'visual' ? meta.content : undefined,
            hotspots: []
        };

        // Save to LocalStorage
        const existingData = JSON.parse(localStorage.getItem('fireSight_customData') || '[]');
        localStorage.setItem('fireSight_customData', JSON.stringify([newItem, ...existingData]));

        // Notify parent or internal success state
        alert('보관함에 저장되었습니다!');
        if (onSaveComplete) onSaveComplete();
        else setStep(4); // Or verify step 4 UI
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Camera className="text-emerald-500" />
                Smart Upload
            </h2>

            <div className="max-w-2xl mx-auto w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">

                {/* Step 1: Upload */}
                {step === 1 && (
                    <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all group relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20">
                                <Upload size={32} />
                            </div>
                            <p className="text-lg font-bold">이미지를 드래그하거나 클릭하여 업로드</p>
                            <p className="text-sm text-slate-500 mt-2">문제집 사진, 도면 캡처 등</p>
                        </div>
                    </div>
                )}

                {/* Step 2: Analyzing */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center h-96 text-center">
                        <div className="relative w-full max-w-sm aspect-video bg-slate-800 rounded-lg overflow-hidden mb-6 border border-slate-700">
                            {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-contain opacity-50" />}
                            {/* Scanning Effect */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />
                            <div className="absolute inset-0 flex items-center justify-center text-emerald-400 font-mono text-sm bg-black/30 backdrop-blur-[1px]">
                                <ScanLine className="mr-2 animate-pulse" />
                                Analyzing Text...
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">AI가 이미지를 분석 중입니다</h3>
                        <p className="text-slate-400">문자 인식 및 카테고리 분류 중...</p>
                    </div>
                )}

                {/* Step 3: Review & Edit */}
                {step === 3 && (
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex gap-6 mb-6">
                            {/* Left: Image Preview */}
                            <div className="w-1/3 shrink-0">
                                <div className="aspect-[3/4] bg-black rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center">
                                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            </div>

                            {/* Right: Form */}
                            <div className="flex-1 space-y-4">
                                {/* Type Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">자료 유형</label>
                                    <div className="flex bg-slate-800 p-1 rounded-lg">
                                        {['workbook', 'visual'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setMeta({ ...meta, type: t })}
                                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${meta.type === t ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                                            >
                                                {t === 'workbook' ? '문제 (Workbook)' : '도면 (Visual)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">카테고리</label>
                                    <select
                                        value={meta.category}
                                        onChange={(e) => setMeta({ ...meta, category: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-colors"
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
                                        value={meta.title}
                                        onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Text Content (OCR Result) */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    {meta.type === 'workbook' ? '문제 내용 (OCR)' : '도면 설명'}
                                </label>
                                <textarea
                                    value={meta.content}
                                    onChange={(e) => setMeta({ ...meta, content: e.target.value })}
                                    className="w-full h-24 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none text-sm"
                                />
                            </div>

                            {meta.type === 'workbook' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">정답 / 해설</label>
                                    <textarea
                                        value={meta.answer}
                                        onChange={(e) => setMeta({ ...meta, answer: e.target.value })}
                                        className="w-full h-20 bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg p-3 outline-none focus:border-emerald-500 transition-colors resize-none text-sm"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors font-bold"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all active:scale-95"
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
