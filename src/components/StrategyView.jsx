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
        <div className={`p-6 rounded-2xl border transition-all duration-300 group hover:shadow-lg ${className} bg-slate-900/40 border-slate-800 hover:border-slate-600 flex flex-col`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors shrink-0">
                    <Icon size={24} className="text-blue-400 group-hover:text-blue-300" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-slate-200 group-hover:text-white leading-tight">{title}</h3>
            </div>
            <div className="text-slate-400 leading-relaxed text-sm space-y-2 flex-1">
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
                    <p>소방시설관리사 2차 실기는 100% 주관식입니다. 눈으로 보는 공부가 아닌,</p>
                    <ul className="list-disc list-inside mt-2 text-slate-400/90 space-y-1">
                        <li><strong>백지에 직접 쓰는 인출(Recall)</strong> 연습에 집중</li>
                        <li>단순 암기가 아닌 키워드 인출 훈련</li>
                    </ul>
                </StrategyCard>

                {/* Section 2: 기출 제로 베이스 */}
                <StrategyCard title="기출 제로 베이스 : 확장 암기 전략" icon={BookOpen}>
                    <p className="font-semibold text-emerald-200 mb-2">"기출은 정답이 아닌 '범위'입니다."</p>
                    <p>이미 출제된 조문은 다시 나올 확률이 낮습니다. 기출 조문의 주변을 공략하세요.</p>
                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <span className="text-xs font-bold text-slate-500 block mb-1">EXAMPLE</span>
                        <div className="text-sm text-slate-300">
                            24회 기출(펌프 배관)의 옆집 조문인<br />
                            <strong className="text-emerald-400">유수검지장치실 설치기준(NFTC 103)</strong> 등을<br />
                            Workbook에 우선 등록하여 빈틈을 채우세요.
                        </div>
                    </div>
                </StrategyCard>

                {/* Section 3: 법령 개정 우선순위 */}
                <StrategyCard title="법령 개정 우선순위 : 최신성 유지" icon={AlertTriangle}>
                    <p className="font-semibold text-amber-200 mb-2">"최신 개정 사항은 A급 순위"</p>
                    <p>최근 대폭 개정된 <strong>NFPC(성능기준) 및 NFTC(기술기준)</strong>을 최우선순위로 관리하세요.</p>
                    <p className="mt-2 text-slate-400">
                        개정된 수치와 용어는 시험 출제 0순위입니다.<br />Reference 메뉴에서 이를 가장 먼저 확인하세요.
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
