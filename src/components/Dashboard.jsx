import React, { useState, useEffect } from 'react';
import {
    Clock, PenTool, BarChart, ChevronRight,
    Flame, Target, ArrowRight, Zap, Droplets, BookOpen, 
    Layers, Wind, DoorOpen, Plus
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

// 과목별 아이콘 및 색상 매핑
const SUBJECT_CONFIG = {
    '수계': { color: 'bg-blue-500', icon: Droplets },
    '가스계': { color: 'bg-emerald-500', icon: Wind },
    '경보': { color: 'bg-amber-500', icon: Zap },
    '피난': { color: 'bg-lime-500', icon: DoorOpen },
    '소화활동': { color: 'bg-red-500', icon: Flame },
    '공통': { color: 'bg-purple-500', icon: Layers },
    '기타': { color: 'bg-slate-500', icon: Layers }
};

export default function Dashboard({ setMode, subject, dDay }) {
    const [loading, setLoading] = useState(true);
    
    // [Real Data State]
    const [stats, setStats] = useState({
        totalProblems: 0,
        mastered: 0,
        reviewNeeded: 0,
        studyTime: "0h 0m"
    });

    const [subjectProgress, setSubjectProgress] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);

    // [Data Fetching]
    useEffect(() => {
        const q = query(collection(db, "workbook"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const problems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 1. 전체 통계 계산
            const total = problems.length;
            const mastered = problems.filter(p => p.lastScore === 100).length;
            const review = problems.filter(p => (p.studyCount || 0) > 0 && p.lastScore < 100).length;

            setStats(prev => ({
                ...prev,
                totalProblems: total,
                mastered: mastered,
                reviewNeeded: review
            }));

            // 2. 과목별 숙련도 계산
            const subjMap = {};
            Object.keys(SUBJECT_CONFIG).forEach(key => {
                if(key !== '기타') subjMap[key] = { total: 0, mastered: 0 };
            });

            problems.forEach(p => {
                const cat = p.category || p.subject || '기타';
                const safeCat = SUBJECT_CONFIG[cat] ? cat : '기타';
                
                if (!subjMap[safeCat]) subjMap[safeCat] = { total: 0, mastered: 0 };
                
                subjMap[safeCat].total += 1;
                if (p.lastScore === 100) subjMap[safeCat].mastered += 1;
            });

            const processedProgress = Object.entries(subjMap)
                .map(([name, data]) => {
                    const score = data.total === 0 ? 0 : Math.round((data.mastered / data.total) * 100);
                    return {
                        name,
                        score,
                        total: data.total,
                        ...SUBJECT_CONFIG[name]
                    };
                })
                .filter(item => item.total > 0)
                .sort((a, b) => b.total - a.total);

            setSubjectProgress(processedProgress);

            // 3. 최근 활동 (상위 3개)
            const recent = problems.slice(0, 3).map(p => {
                const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
                const now = new Date();
                const diffMin = Math.floor((now - date) / 60000);
                let timeStr = "";
                if (diffMin < 1) timeStr = "방금 전";
                else if (diffMin < 60) timeStr = `${diffMin}분 전`;
                else if (diffMin < 1440) timeStr = `${Math.floor(diffMin / 60)}시간 전`;
                else timeStr = `${Math.floor(diffMin / 1440)}일 전`;

                return {
                    id: p.id,
                    type: 'workbook',
                    title: p.title || "제목 없는 문제",
                    desc: (p.studyCount > 0) ? `최근 점수: ${p.lastScore}점` : "새로 등록된 문제",
                    date: timeStr,
                    icon: (p.studyCount > 0) ? PenTool : Plus,
                    color: (p.studyCount > 0) ? (p.lastScore === 100 ? 'text-emerald-400' : 'text-amber-400') : 'text-blue-400',
                    bg: (p.studyCount > 0) ? (p.lastScore === 100 ? 'bg-emerald-500/10' : 'bg-amber-500/10') : 'bg-blue-500/10'
                };
            });
            setRecentActivities(recent);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // [업데이트] 명언 30선
    const quotes = [
        "포기하지 않는 한 실패는 없다.",
        "오늘 걷지 않으면 내일은 뛰어야 한다.",
        "소방시설관리사, 당신의 이름 뒤에 붙을 자격.",
        "가장 큰 위험은 위험 없는 삶을 사는 것이다.",
        "기적은 노력의 또 다른 이름이다.",
        "성공은 매일 반복되는 작은 노력들의 합이다.",
        "지금 흘린 땀은 합격의 눈물이 된다.",
        "어제보다 나은 오늘, 오늘보다 빛날 2027년.",
        "고통은 지나가지만, 합격의 영광은 영원하다.",
        "늦었다고 생각할 때가 가장 빠른 때다.",
        "실력은 계단식으로 성장한다. 버티면 올라간다.",
        "나 자신을 믿는 것이 성공의 제1비결이다.",
        "중요한 것은 꺾이지 않는 마음이다.",
        "공부는 머리가 아니라 엉덩이로 하는 것이다.",
        "합격의 기쁨을 상상하며 오늘을 견뎌라.",
        "오늘의 힘듦은 내일의 스펙이 된다.",
        "꾸준함이 비범함을 만든다.",
        "내일의 나는 오늘의 내가 만든다.",
        "핑계로 성공한 사람은 없다.",
        "안전을 지키는 전문가, 그 무게를 견뎌라.",
        "시작이 반이다. 나머지는 끈기다.",
        "한계는 내 마음속에만 있다.",
        "꿈을 꾸기에 늦은 나이란 없다.",
        "1%의 재능과 99%의 노력이 만든 결과.",
        "인생에서 가장 멋진 일은 남들이 해내지 못할 거라 한 일을 해내는 것이다.",
        "흔들리지 않고 피는 꽃이 어디 있으랴.",
        "지금 자면 꿈을 꾸지만, 지금 공부하면 꿈을 이룬다.",
        "전문가란, 남들이 무시하는 기초를 탄탄히 한 사람이다.",
        "2027년 합격자 명단에 내 이름이 있다.",
        "노력은 배신하지 않는다. 다만 시간이 걸릴 뿐이다."
    ];
    
    const [quote, setQuote] = useState(quotes[0]);

    useEffect(() => {
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white p-4 md:p-6 overflow-y-auto w-full animate-in fade-in duration-500 pb-20">
            
            {/* 1. Hero Section & D-Day */}
            <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 shadow-2xl p-5 md:p-6 mb-6 overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-4 md:items-center">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                                <Target size={10} /> Target 2027
                            </span>
                            <span className="text-slate-500 text-[10px] font-mono">{new Date().toLocaleDateString()}</span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tight">
                            {dDay} <span className="text-base md:text-xl font-normal text-slate-400">Left</span>
                        </h1>
                        <p className="text-slate-300 font-light text-xs md:text-sm max-w-lg italic opacity-80">
                            "{quote}"
                        </p>
                    </div>

                    {/* Stats Compact View */}
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="flex-1 md:flex-none bg-slate-950/50 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-center min-w-[80px]">
                            <div className="text-xl font-bold text-white">
                                {loading ? '-' : stats.mastered}
                            </div>
                            <div className="text-[10px] text-slate-400">Mastered</div>
                        </div>
                        <div className="flex-1 md:flex-none bg-red-950/50 backdrop-blur-md p-3 rounded-xl border border-red-900/50 text-center min-w-[80px]">
                            <div className="text-xl font-bold text-red-400">
                                {loading ? '-' : stats.reviewNeeded}
                            </div>
                            <div className="text-[10px] text-red-300/70">Review</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subject Mastery Chart */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart size={18} className="text-slate-400" /> 과목별 숙련도
                        </h3>
                        <span className="text-xs text-slate-500 cursor-pointer hover:text-white">
                            Total: {stats.totalProblems} 문제
                        </span>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-10 text-slate-600 animate-pulse">데이터 분석 중...</div>
                    ) : subjectProgress.length > 0 ? (
                        <div className="space-y-5">
                            {subjectProgress.map((subj) => (
                                <div key={subj.name} className="group">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-300 font-bold flex items-center gap-2">
                                            <subj.icon size={14} className="text-slate-500" /> {subj.name}
                                        </span>
                                        <span className="text-slate-400 font-mono text-xs">
                                            {subj.score}% <span className="text-slate-600">({subj.total}문항)</span>
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${subj.color} rounded-full transition-all duration-1000 ease-out group-hover:brightness-110`} 
                                            style={{ width: `${subj.score}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                            <p className="text-sm">아직 등록된 문제가 없습니다.</p>
                            <button onClick={()=>setMode('smart-upload')} className="text-blue-400 text-xs mt-2 hover:underline">문제 등록하러 가기</button>
                        </div>
                    )}
                </div>

                {/* Recent & Daily Mission */}
                <div className="flex flex-col gap-6">
                    {/* Daily Mission Card */}
                    <div className="bg-gradient-to-b from-amber-500/10 to-slate-900 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden group cursor-pointer hover:border-amber-500/40 transition-all" onClick={() => setMode('workbook')}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={80} />
                        </div>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 mb-2 inline-block">
                            DAILY QUEST
                        </span>
                        <h4 className="text-lg font-bold text-white mb-1">오늘의 학습 시작</h4>
                        <p className="text-xs text-slate-400 mb-4">랜덤 문제를 통해 실력을 점검하세요.</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                            Start Mission <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* Recent Activity List */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex-1">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-slate-400" /> 최근 활동
                        </h3>
                        {loading ? (
                            <div className="text-center py-4 text-slate-700 text-xs">Loading...</div>
                        ) : recentActivities.length > 0 ? (
                            <div className="space-y-4">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => setMode('workbook')}>
                                        <div className={`p-2.5 rounded-xl ${activity.bg} ${activity.color} shrink-0`}>
                                            <activity.icon size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{activity.title}</p>
                                            <div className="flex justify-between items-center mt-0.5">
                                                <p className="text-xs text-slate-500">{activity.desc}</p>
                                                <p className="text-[10px] text-slate-600 font-mono">{activity.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-600 text-xs">
                                최근 활동 내역이 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}