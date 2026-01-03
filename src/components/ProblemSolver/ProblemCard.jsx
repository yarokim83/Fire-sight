// src/components/ProblemSolver/ProblemCard.jsx
import React from 'react';
import { StickyNote, Edit3, Save, Trash2, Image as ImageIcon } from 'lucide-react';

const ProblemCard = ({ state, actions }) => {
    const { currentProblem, isEditMode, showMemo, memoText } = state;
    const { setIsEditMode, setShowMemo, setMemoText, handleSaveMemo, setCurrentProblem, handleSaveEdit, handleImageUpload } = actions;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
            {/* 툴바 */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button 
                    onClick={() => setShowMemo(!showMemo)} 
                    className={`p-2 rounded-lg transition-colors ${showMemo ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    title="나만의 메모"
                >
                    <StickyNote size={18} />
                </button>
                <button 
                    onClick={() => setIsEditMode(!isEditMode)} 
                    className={`p-2 rounded-lg transition-colors ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    title="문제 수정"
                >
                    <Edit3 size={18} />
                </button>
            </div>

            {/* 태그 영역 */}
            <div className="relative z-10 mb-4 flex gap-2">
                <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/30">
                    {currentProblem.subject || "서술형 연습"}
                </span>
                {currentProblem.problemType && (
                    <span className="inline-block px-3 py-1 bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-600">
                        {currentProblem.problemType === 'drawing' ? '도면' : (currentProblem.problemType === 'calculation' ? '계산' : '서술')}
                    </span>
                )}
            </div>

            {/* 이미지 표시 */}
            {currentProblem.imageUrl && !isEditMode && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-700 bg-black/50 relative z-10">
                    <img src={currentProblem.imageUrl} alt="Problem Reference" className="w-full max-h-80 object-contain mx-auto" />
                </div>
            )}

            {/* 문제 본문 (뷰어 vs 에디터) */}
            <div className="relative z-10">
                {isEditMode ? (
                    <div className="space-y-3 animate-in fade-in">
                        <input 
                            value={currentProblem.title}
                            onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-bold"
                            placeholder="문제 제목"
                        />
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer border border-slate-700 text-sm transition-colors">
                                <ImageIcon size={16} />
                                {currentProblem.imageUrl ? "이미지 변경" : "이미지 추가"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                            {currentProblem.imageUrl && (
                                <button onClick={() => setCurrentProblem({...currentProblem, imageUrl: null})} className="p-2 text-red-400 hover:bg-red-500/10 rounded">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <textarea 
                            value={currentProblem.question}
                            onChange={(e) => setCurrentProblem({...currentProblem, question: e.target.value})}
                            className="w-full h-32 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-200"
                            placeholder="문제 내용"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditMode(false)} className="px-3 py-1 text-slate-400 hover:text-white text-sm">취소</button>
                            <button onClick={handleSaveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 flex items-center gap-1">
                                <Save size={14} /> 저장
                            </button>
                        </div>
                    </div>
                ) : (
                    <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight whitespace-pre-wrap">
                        {currentProblem.question}
                    </h1>
                )}
            </div>

            {/* 메모장 */}
            {showMemo && (
                <div className="mt-6 bg-amber-100 rounded-xl border-l-4 border-amber-400 p-4 shadow-lg animate-in slide-in-from-top-2 text-slate-800 relative z-20">
                    <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                        <StickyNote size={18} /> 나만의 암기 비법
                    </h3>
                    <textarea
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        placeholder="암기 팁, 청킹 등을 적어두세요."
                        className="w-full h-24 bg-white/50 border border-amber-200 rounded p-3 text-sm focus:outline-none focus:bg-white transition-colors resize-none"
                    />
                    <div className="flex justify-end mt-2">
                        <button onClick={handleSaveMemo} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1">
                            <Save size={14} /> 메모 저장
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProblemCard;