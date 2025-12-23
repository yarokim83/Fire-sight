import React, { useState, useEffect } from 'react';
import { Target, Zap, BookOpen, AlertTriangle, Calendar, PenTool, CheckCircle2, Save } from 'lucide-react';

export default function StrategyView() {
    const [memo, setMemo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const savedMemo = localStorage.getItem('fireSight_strategyMemo');
        if (savedMemo) {
            setMemo(savedMemo);
        }
    }, []);

    const handleMemoChange = (e) => {
        const text = e.target.value;
        setMemo(text);
        setIsSaving(true);
        localStorage.setItem('fireSight_strategyMemo', text);

        // Visual feedback for auto-save
        setTimeout(() => setIsSaving(false), 800);
    };

    const StrategyCard = ({ title, icon: Icon, children, className = "" }) => (
        <div className={`p-6 rounded-2xl border transition-all duration-300 group hover:shadow-lg ${className} bg-slate-900/40 border-slate-800 hover:border-slate-600`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                    <Icon size={24} className="text-blue-400 group-hover:text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-200 group-hover:text-white">{title}</h3>
            </div>
            <div className="text-slate-400 leading-relaxed text-sm space-y-2">
                {children}
            </div>
        </div>
    );

    return (
        <div className="p-8 h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                    <Target className="text-red-500" size={32} />
                    합격 전략 <span className="text-lg font-normal text-slate-500">Winning Strategy 2027</span>
                </h2>
                <p className="text-slate-400 max-w-2xl">
                    기계적인 암기가 아닌, 시험의 본질을 꿰뚫는 전략적 학습이 필요합니다.
                    <br />흔들릴 때마다 다시 돌아와 방향을 잡으세요.
                </p>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Section 1: 2027 합격 원칙 */}
                <StrategyCard
                    title="2027 합격 원칙 : 인출 중심 학습"
                    icon={Zap}
                    className="border-blue-500/30 bg-blue-900/10 hover:border-blue-500/50"
                >
                    <p className="font-semibold text-blue-200 mb-2">"쓰지 못하면 모르는 것이다."</p>
                    <p>소방시설관리사 2차는 100% 주관식/서술형 시험입니다. 눈으로 보고 고르는 공부는 실제 시험장에서 무용지물입니다.</p>
                    <ul className="list-disc list-inside mt-2 text-slate-400/90 space-y-1">
                        <li>강의 듣는 시간 줄이기</li>
                        <li><strong>백지에 직접 쓰는 인출(Recall)</strong> 연습에 화력 집중</li>
                        <li>키워드 중심의 구조화된 답안 작성 훈련</li>
                    </ul>
                </StrategyCard>

                {/* Section 2: 기출 제로 베이스 */}
                <StrategyCard title="기출 제로 베이스 : 확장 암기 전략" icon={BookOpen}>
                    <p className="font-semibold text-emerald-200 mb-2">"기출은 정답이 아닌 가이드라인"</p>
                    <p>이미 출제된 조문이 똑같이 나올 확률은 극히 낮습니다. 기출 조문을 중심으로 범위를 확장해야 합니다.</p>
                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <span className="text-xs font-bold text-slate-500 block mb-1">ACTION PLAN</span>
                        <div className="flex gap-2 text-sm text-slate-300">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span>기출 조문의 <strong>주변 조항(Context)</strong> 확인</span>
                        </div>
                        <div className="flex gap-2 text-sm text-slate-300 mt-1">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            <span><strong>단서 조항 및 예외 규정</strong> 우선 암기</span>
                        </div>
                    </div>
                </StrategyCard>

                {/* Section 3: 법령 개정 우선순위 */}
                <StrategyCard title="법령 개정 우선순위 : 최신성 유지" icon={AlertTriangle}>
                    <p className="font-semibold text-amber-200 mb-2">"개정 사항은 무조건 A급"</p>
                    <p>2024~2025년에 대폭 개정된 <strong>NFPC(성능기준) 및 NFTC(기술기준)</strong>은 기출 여부와 관계없이 출제 0순위입니다.</p>
                    <p className="mt-2 text-slate-400">
                        Reference 메뉴에서 <span className="text-amber-400 border-b border-amber-500/50">최신 개정 수치와 용어</span>를 가장 먼저 확인하고 Workbook에 등록하세요.
                    </p>
                </StrategyCard>

                {/* Section 4: 2단계 단권화 로드맵 */}
                <StrategyCard title="2단계 단권화 로드맵" icon={Calendar}>
                    <div className="space-y-4">
                        <div className="relative pl-4 border-l-2 border-slate-700">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-blue-500"></div>
                            <h4 className="font-bold text-blue-300">1년차 : Curation (선별)</h4>
                            <p className="text-sm mt-1">방대한 법령집에서 핵심 문제를 선별하여 Workbook으로 이관하고, 나만의 단권화 DB를 구축하는 시기입니다.</p>
                        </div>
                        <div className="relative pl-4 border-l-2 border-slate-700">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-purple-500"></div>
                            <h4 className="font-bold text-purple-300">2년차 : Recall (반복)</h4>
                            <p className="text-sm mt-1">구축된 Workbook 데이터를 복습 주기(SRS) 알고리즘에 따라 시험 당일까지 무한 반복 인출하며 완성도를 높입니다.</p>
                        </div>
                    </div>
                </StrategyCard>
            </div>

            {/* Personal Memo Section */}
            <div className="mt-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative group focus-within:border-blue-500/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        <PenTool size={20} className="text-slate-500" />
                        나만의 필승 메모
                    </h3>
                    <span className={`text-xs font-mono transition-opacity duration-300 ${isSaving ? 'opacity-100 text-blue-400' : 'opacity-0'}`}>
                        <Save size={12} className="inline mr-1" />
                        Saving...
                    </span>
                </div>
                <textarea
                    value={memo}
                    onChange={handleMemoChange}
                    placeholder="이곳에 나만의 암기 비법, 다짐, 혹은 취약한 조문을 자유롭게 메모하세요. (자동 저장됩니다)"
                    className="w-full h-40 bg-transparent text-slate-300 placeholder-slate-600 resize-none focus:outline-none text-base leading-relaxed custom-scrollbar"
                />
            </div>
        </div>
    );
}
