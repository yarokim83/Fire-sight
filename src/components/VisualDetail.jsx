import React, { useState } from 'react';
import { ArrowLeft, Maximize2, X, CheckCircle2, BookOpen, Download, Trash2 } from 'lucide-react';

const VisualDetail = ({ data, onBack }) => {
    const [isImageModalOpen, setImageModalOpen] = useState(false);

    const components = data?.hotspots || [];

    // 📥 이미지 다운로드 핸들러
    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = data.imageUrl;
        link.download = `${data.title}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 🗑️ 자료 삭제 핸들러 (추가된 기능)
    const handleDelete = () => {
        // 1. 삭제 확인
        if (!window.confirm(`'${data.title}' 자료를 정말 삭제하시겠습니까?`)) return;

        // 2. 삭제 로직
        if (data.isCustom) {
            // Hard Delete
            const storedData = JSON.parse(localStorage.getItem('fireSight_customData') || '[]');
            const updatedData = storedData.filter(item => item.id !== data.id);
            localStorage.setItem('fireSight_customData', JSON.stringify(updatedData));
        } else {
            // Soft Delete (Hide Default)
            const deletedDefaults = JSON.parse(localStorage.getItem('fireSight_deletedDefault') || '[]');
            const updated = [...deletedDefaults, data.id];
            localStorage.setItem('fireSight_deletedDefault', JSON.stringify(updated));
        }

        alert("삭제되었습니다.");
        window.location.reload();
    };

    if (!data) return null;

    return (
        <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
            {/* 1. 상단 헤더 */}
            <div className="shrink-0 p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-100">{data.title}</h1>
                        <p className="text-xs text-slate-500">핵심 구성요소 {components.length}개</p>
                    </div>
                </div>

                {/* 우측 상단 컨트롤: 삭제 버튼 추가 */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDelete}
                        className={`p-2 rounded-full transition-all ${data.isCustom
                            ? "text-slate-500 hover:text-red-500 hover:bg-red-500/10"
                            : "text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                            }`}
                        title={data.isCustom ? "자료 삭제" : "기본 자료는 삭제 불가"}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* 2. 메인 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto lg:overflow-hidden">
                <div className="flex flex-col lg:flex-row h-full">

                    {/* [좌측] 도면 이미지 영역 */}
                    <div className="lg:w-1/2 p-4 flex flex-col bg-slate-900/50">
                        <div className="relative group w-full h-64 lg:h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">

                            <img
                                src={data.imageUrl}
                                alt="System Diagram"
                                className="max-w-full max-h-full object-contain p-2 select-none"
                                style={{ WebkitTouchCallout: 'default' }}
                                onError={(e) => { e.target.src = "https://placehold.co/800x600/1e293b/ffffff?text=No+Image"; }}
                            />

                            {/* 이미지 컨트롤 버튼 그룹 */}
                            <div className="absolute top-3 right-3 flex gap-2 transition-opacity">
                                <button
                                    onClick={handleDownload}
                                    title="이미지 저장"
                                    className="p-2 bg-black/60 text-white rounded-lg backdrop-blur hover:bg-emerald-600 transition-colors"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={() => setImageModalOpen(true)}
                                    title="크게 보기"
                                    className="p-2 bg-black/60 text-white rounded-lg backdrop-blur hover:bg-black/80"
                                >
                                    <Maximize2 size={18} />
                                </button>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                            <BookOpen size={14} className="inline mr-2 text-emerald-500" />
                            {data.description}
                        </p>
                    </div>

                    {/* [우측] 부품 리스트 영역 */}
                    <div className="lg:w-1/2 p-4 lg:overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950">
                        <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">
                            Component List
                        </h3>
                        <div className="space-y-3">
                            {components.map((item, index) => (
                                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                {index + 1}
                                            </span>
                                            <h4 className="font-bold text-slate-200">{item.label}</h4>
                                        </div>
                                        <CheckCircle2 size={16} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                    <p className="text-sm text-slate-400 pl-8 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}

                            {components.length === 0 && (
                                <div className="text-center py-10 text-slate-500">
                                    등록된 구성요소 정보가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* [모달] 이미지 크게 보기 */}
            {isImageModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImageModalOpen(false)}>
                    <button className="absolute top-5 right-5 text-slate-400 hover:text-white z-50">
                        <X size={32} />
                    </button>
                    <img
                        src={data.imageUrl}
                        alt="Full Preview"
                        className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl"
                        style={{ WebkitTouchCallout: 'default' }}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(e); }}
                        className="absolute bottom-10 bg-emerald-600 text-white px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-emerald-500"
                    >
                        <Download size={20} /> 이미지 저장하기
                    </button>
                </div>
            )}
        </div>
    );
};

export default VisualDetail;
