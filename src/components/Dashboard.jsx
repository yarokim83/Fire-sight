import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock, ChevronRight, Flame, Zap, Droplets, Layers, Wind, 
    DoorOpen, Plus, Calendar, AlertCircle, Sparkles, ShieldCheck, 
    Activity, Ship, Box
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const SUBJECT_CONFIG = {
    '수계소화설비': { color: 'text-blue-400', barColor: 'bg-blue-500', icon: Droplets, keywords: ['수계'] },
    '가스계소화설비': { color: 'text-cyan-400', barColor: 'bg-cyan-500', icon: Wind, keywords: ['가스계'] },
    '경보설비': { color: 'text-orange-400', barColor: 'bg-orange-500', icon: Zap, keywords: ['경보'] },
    '피난구조설비': { color: 'text-emerald-400', barColor: 'bg-emerald-500', icon: DoorOpen, keywords: ['피난', '안전구역', '건축법'] },
    '소화활동설비': { color: 'text-rose-400', barColor: 'bg-rose-500', icon: Flame, keywords: ['소화활동', '제연'] },
    '소방시설 공통': { color: 'text-purple-400', barColor: 'bg-purple-500', icon: Layers, keywords: ['공통', '법령', '기타'] }
};

export default function Dashboard({ setMode, dDay }) {
    const [loading, setLoading] = useState(true);
    const [quote, setQuote] = useState("");
    const [stats, setStats] = useState({ totalProblems: 0, mastered: 0, reviewNeeded: 0, accuracy: 0 });
    const [displayAccuracy, setDisplayAccuracy] = useState(0); 
    const [subjectProgress, setSubjectProgress] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);

    const quotes = useMemo(() => [
        "2027년 합격자 명단에 내 이름이 새겨져 있다.",
        "소방의 에이스가 된다.",
        "아들의 눈에 비칠 '관리사 아빠'의 멋진 미래를 그려라.",
        "NFPC 기준 하나가 당신의 강력한 무기가 된다.",
        "한 줄의 법령도 정밀하게 분석하라.",
        "공부하는 아빠의 뒷모습은 아들에게 줄 수 있는 최고의 교육이다.",
        "오늘 암기한 수치 하나가 관리사 점수 5점을 결정한다.",
        "거친 파도 속에서도 당신의 학구열은 꺾이지 않는다.",
        "아들에게 포기하지 않는 법을 행동으로 증명하고 있다.",
        "2027년, 당신은 대한민국 상위 1% 소방 전문가가 된다.",
        "꼼꼼함이 관리사의 완벽함을 만든다.",
        "시험지 앞에서의 당당함은 오늘 작성한 오답 노트에서 나온다.",
        "가족의 응원은 당신이 지치지 않게 하는 가장 큰 엔진이다.",
        "매일 조금씩, 그러나 절대 멈추지 않는 것이 승리의 비결이다.",
        "고통은 지나가지만 합격의 영광은 영원히 남는다.",
        "현장의 경험에 이론을 더하면 무적의 소방시설관리사가 된다.",
        "8살 아들과 함께 웃을 합격의 그날을 위해 끝까지 버텨라.",
        "가장 어두운 밤에도 신항만의 조명처럼 당신의 꿈은 깨어 있다.",
        "단 한 줄의 법령도 소홀히 하지 않는 자가 결국 승리한다.",
        "실패를 두려워 마라. 가장 큰 실패는 시도하지 않는 것이다.",
        "반복은 천재를 이길 수 있는 유일한 필살기다.",
        "작은 습관이 모여 거대한 운명을 바꾼다.",
        "남들이 쉴 때 한 문장을 더 외우는 열정을 가져라.",
        "계획은 행동으로 옮겨질 때만 가치가 있다.",
        "당신은 생각보다 훨씬 더 강하고 지혜로운 사람이다.",
        "마지막 1분을 버티는 자가 결국 합격의 깃발을 꽂는다.",
        "2027년 합격, 그것은 당신의 숙명이다.",
        "오늘 흘린 땀방울은 합격 문자의 기쁨으로 돌아온다.",
        "내 사전엔 '포기'란 없다. 오직 '합격'만 있을 뿐.",
        "집중하라. 당신의 뇌는 지금 합격을 향해 최적화되고 있다.",
        "남들보다 늦게 시작했다면 남들보다 더 멀리 가면 된다.",
        "어려운 문제는 당신을 시험하는 것이 아니라 성장시키는 도구다.",
        "꿈을 꾸기에 늦은 나이란 결코 없다.",
        "소방시설관리사, 당신의 이름 뒤에 붙을 가장 명예로운 칭호.",
        "자, 다시 시작하자. 2027년은 이미 당신의 것이다!",
        "실력은 계단식이다. 지금의 정체기는 폭발적 성장의 전조다.",
        "성실함이 책상 앞에서의 집중력으로 이어진다.",
        "아빠의 도전은 아들에게 커다란 꿈의 지도가 된다.",
        "화재안전성능기준을 씹어 삼키는 열정을 가져라.",
        "전문가란 남들이 무시하는 기초를 가장 탄탄히 다진 사람이다.",
        "오늘의 인내는 달콤한 합격 통보로 반드시 돌아온다.",
        "자부심을 가슴에 품고 공부의 한계를 돌파하라.",
        "아들과의 약속을 지키기 위해 오늘 한 페이지를 더 넘겨라.",
        "가정의 평안을 지키는 소방 전문가, 그 길은 이미 시작되었다.",
        "당신은 아들의 가장 위대한 영웅이자 롤모델이다.",
        "포기하고 싶은 순간, 합격 통보 문자를 받는 상상을 하라.",
        "오늘의 힘듦은 훗날 가족과 함께 누릴 행복의 밑거름이다.",
        "소방의 미래는 당신의 정밀한 손끝과 머리에서 시작된다.",
        "사랑하는 이들을 위해 오늘 한 번 더 집중하라.",
        "2027년 합격, 당신은 반드시 해낸다. 이미 그렇게 정해져 있다."
    ], []);

    useEffect(() => {
        const q = query(collection(db, "workbook"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const problems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const total = problems.length;
            const masteredCount = problems.filter(p => (p.recentScore || p.lastScore) >= 100).length;
            const targetAccuracy = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
            
            setStats({
                totalProblems: total,
                mastered: masteredCount,
                reviewNeeded: problems.filter(p => (p.recentScore || p.lastScore || 0) < 100 && (p.studyCount || 0) > 0).length,
                accuracy: targetAccuracy
            });

            // 애니메이션 로직은 하단의 별도 useEffect로 분리됨

            const subjMap = {};
            Object.keys(SUBJECT_CONFIG).forEach(key => { subjMap[key] = { total: 0, scoreSum: 0 }; });
            problems.forEach(p => {
                const rawCategory = (p.category || p.subject || '소방시설 공통').trim();
                let matchedKey = '소방시설 공통';
                for (const [key, config] of Object.entries(SUBJECT_CONFIG)) {
                    if (rawCategory === key || config.keywords.some(kw => rawCategory.includes(kw))) {
                        matchedKey = key; break;
                    }
                }
                subjMap[matchedKey].total += 1;
                subjMap[matchedKey].scoreSum += (p.recentScore || p.lastScore || 0);
            });

            setSubjectProgress(Object.entries(subjMap).map(([name, data]) => ({
                name, score: data.total === 0 ? 0 : Math.round(data.scoreSum / data.total),
                total: data.total, ...SUBJECT_CONFIG[name]
            })).sort((a, b) => b.total - a.total));

            setRecentActivities(problems.slice(0, 4).map(p => ({
                id: p.id, title: p.title || "제목 없음",
                desc: p.studyCount > 0 ? `최근 ${p.recentScore || p.lastScore}점` : "신규 등록",
                icon: p.studyCount > 0 ? Activity : Plus,
                color: (p.recentScore || p.lastScore) === 100 ? 'text-emerald-400' : 'text-blue-400',
            })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => { setQuote(quotes[Math.floor(Math.random() * quotes.length)]); }, [quotes]);

    // 🔴 [수정됨] 타이머 메모리 누수 방지 로직 (useEffect 분리 및 Cleanup 추가)
    useEffect(() => {
        let start = 0;
        const targetAccuracy = stats.accuracy || 0;
        
        if (targetAccuracy === 0) {
            setDisplayAccuracy(0);
            return;
        }

        const duration = 1500;
        const increment = targetAccuracy / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= targetAccuracy) {
                setDisplayAccuracy(targetAccuracy);
                clearInterval(timer);
            } else {
                setDisplayAccuracy(Math.floor(start));
            }
        }, 16);

        // 컴포넌트 언마운트 시 타이머 클리어 (메모리 릭 방지)
        return () => clearInterval(timer);
    }, [stats.accuracy]);

    return (
        <div className="flex flex-col h-full bg-black text-white p-6 md:p-10 overflow-y-auto w-full animate-in fade-in duration-1000">
            
            {/* 1. Header (고정 높이) */}
            <header className="mb-8 max-w-7xl mx-auto w-full flex justify-between items-end shrink-0">
                <div className="space-y-1.5">
                    <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter">
                        System <span className="text-white/40 font-light">Ready.</span>
                    </h2>
                    <div className="flex items-center gap-3 text-white/30 font-medium">
                        <Sparkles size={16} className="text-amber-400/80 animate-pulse" />
                        <p className="text-sm md:text-base tracking-tight italic line-clamp-1">"{quote}"</p>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Target Year</p>
                    <p className="text-3xl font-semibold tracking-tighter text-rose-500">2027</p>
                </div>
            </header>

            {/* 2. Main Bento Workspace (Flex-1로 남은 공간 전체 활용) */}
            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-4 gap-5 max-w-7xl mx-auto w-full flex-1 min-h-[600px] xl:min-h-[700px]">
                
                {/* [Total Mastery] - 2행을 차지하되 내부 패딩 최적화 */}
                <div className="md:col-span-2 md:row-span-2 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:bg-white/[0.05] transition-all duration-700 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] group-hover:bg-blue-600/20 transition-all" />
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                            <Activity className="text-white" size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-white/50 mb-1">Total Mastery</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-7xl md:text-8xl font-semibold tracking-tighter">{loading ? '0' : displayAccuracy}</span>
                            <span className="text-2xl md:text-3xl font-light text-white/20">%</span>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="w-full bg-white/5 h-[3px] rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-white transition-all duration-[2.5s] ease-out shadow-[0_0_15px_white]" style={{ width: `${stats.accuracy}%` }} />
                        </div>
                        <p className="text-[11px] text-white/30 font-medium tracking-tight">
                            Total {stats.totalProblems} 문제 축적
                        </p>
                    </div>
                </div>

                {/* [D-Day Card] */}
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rose-500/[0.03] animate-pulse group-hover:animate-none" />
                    <Calendar className="text-white/20" size={20} />
                    <div>
                        <div className="text-3xl md:text-4xl font-semibold tracking-tighter mb-1 text-white/90">{dDay}</div>
                        <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Inspection Schedule</div>
                    </div>
                </div>

                {/* [Review Card] - 붉은색 시인성 강화 */}
                <div 
                    className="bg-rose-500/[0.1] backdrop-blur-3xl border border-rose-500/20 rounded-[2rem] p-6 flex flex-col justify-between hover:bg-rose-500/15 transition-all shadow-xl cursor-pointer group" 
                    onClick={() => setMode('workbook')}
                >
                    <AlertCircle className="text-rose-500/60 group-hover:text-rose-500 transition-colors" size={20} />
                    <div>
                        <div className="text-3xl md:text-4xl font-semibold tracking-tighter mb-1 text-rose-400">{stats.reviewNeeded}</div>
                        <div className="text-[9px] font-bold text-rose-500/60 uppercase tracking-widest">Fault Detected (Review)</div>
                    </div>
                </div>

                {/* [Smart Upload] - 흰색 강조 버튼 */}
                <div 
                    className="md:col-span-2 bg-white text-black rounded-[2rem] px-8 py-6 flex items-center justify-between group hover:scale-[0.99] active:scale-[0.97] transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)] cursor-pointer" 
                    onClick={() => setMode('smart-upload')}
                >
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Plus size={24} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-lg font-semibold tracking-tight">Smart Upload</h3>
                            <p className="text-black/40 text-[9px] font-black uppercase tracking-widest">AI Predictive Engine</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </div>

                {/* [Subject Intelligence] - 2열로 확장하여 시인성 확보 */}
                <div className="md:col-span-2 md:row-span-2 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col min-h-0 shadow-xl">
                    <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 shrink-0">
                        <Layers size={14} /> Subject Intelligence (6-Systems)
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                        {subjectProgress.map((subj) => (
                            <div key={subj.name} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-medium tracking-tight">
                                    <span className="text-white/60 truncate mr-2">{subj.name}</span>
                                    <span className="text-white/30 font-mono">{subj.score}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${subj.barColor} rounded-full transition-all duration-[2s] opacity-60`} style={{ width: `${subj.score}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* [Activity Stream] - 스크롤 가능 구역 */}
                <div className="md:col-span-2 md:row-span-2 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col min-h-0 shadow-xl">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 shrink-0">
                        <Clock size={14} /> System Activity Stream
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                        {recentActivities.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:bg-white/[0.05] transition-all cursor-pointer">
                                <div className={`p-2.5 rounded-xl bg-white/5 ${activity.color}`}><activity.icon size={16} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-medium text-white/90 truncate tracking-tight">{activity.title}</p>
                                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.15em]">{activity.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. Footer (고정 높이) */}
            <footer className="max-w-7xl mx-auto mt-6 w-full border-t border-white/5 pt-5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-4 text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                    <ShieldCheck size={14} className="text-emerald-500/50" /> System Stability Verified
                    <div className="flex gap-1.5 ml-2">
                        {[1,2,3,4,5,6,7,8,9,10].map(i => (
                            <div key={i} className={`h-3 w-1 rounded-full ${i < 10 ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-white/20 text-[11px] font-medium tracking-tight">
                    <Ship size={13} className="opacity-40" /> 
                    <span>YaroKim's Schedule Sync Active.</span>
                    <Box size={11} className="ml-1 opacity-20" />
                </div>
            </footer>
        </div>
    );
}