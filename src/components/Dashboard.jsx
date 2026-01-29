import React, { useState, useEffect, useCallback } from 'react';
import {
    Clock, PenTool, BarChart, ChevronRight,
    Flame, Target, ArrowRight, Zap, Droplets, BookOpen, 
    Layers, Wind, DoorOpen, Plus
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

// 1. [정규화] 6대 과목 설정 (기능 유지)
const SUBJECT_CONFIG = {
    '수계소화설비': { color: 'bg-blue-500', icon: Droplets, keywords: ['수계'] },
    '가스계소화설비': { color: 'bg-emerald-500', icon: Wind, keywords: ['가스계'] },
    '경보설비': { color: 'bg-amber-500', icon: Zap, keywords: ['경보'] },
    '피난구조설비': { color: 'bg-lime-500', icon: DoorOpen, keywords: ['피난', '안전구역', '건축법'] },
    '소화활동설비': { color: 'bg-red-500', icon: Flame, keywords: ['소화활동', '제연'] },
    '소방시설 공통': { color: 'bg-purple-500', icon: Layers, keywords: ['공통', '법령', '기타'] }
};

export default function Dashboard({ setMode, dDay }) {
    const [loading, setLoading] = useState(true);
    const [quote, setQuote] = useState("");
    
    const [stats, setStats] = useState({
        totalProblems: 0,
        mastered: 0,
        reviewNeeded: 0,
    });

    const [subjectProgress, setSubjectProgress] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);

    // 🔴 [확장] 소방시설관리사 합격을 위한 명언 50선 (기능 추가)
    const quotes = [
        "포기하지 않는 한 실패는 없다.", "오늘 걷지 않으면 내일은 뛰어야 한다.",
        "소방시설관리사, 당신의 이름 뒤에 붙을 자격.", "기적은 노력의 또 다른 이름이다.",
        "실력은 계단식으로 성장한다. 버티면 올라간다.", "안전을 지키는 전문가, 그 무게를 견뎌라.",
        "2027년 합격자 명단에 내 이름이 있다.", "노력은 배신하지 않는다. 다만 시간이 걸릴 뿐이다.",
        "지금 흘린 땀은 합격의 눈물이 된다.", "어제보다 나은 오늘, 오늘보다 빛날 2027년.",
        "고통은 지나가지만, 합격의 영광은 영원하다.", "공부는 머리가 아니라 엉덩이로 하는 것이다.",
        "합격의 기쁨을 상상하며 오늘을 견뎌라.", "오늘의 힘듦은 내일의 스펙이 된다.",
        "꾸준함이 비범함을 만든다.", "한계는 내 마음속에만 있다.",
        "꿈을 꾸기에 늦은 나이란 없다.", "전문가란 남들이 무시하는 기초를 탄탄히 한 사람이다.",
        "시작이 반이다. 나머지는 끈기다.", "나 자신을 믿는 것이 성공의 제1비결이다.",
        "중요한 것은 꺾이지 않는 마음이다.", "매일 조금씩, 그러나 절대 멈추지 마라.",
        "성공은 준비된 자에게 찾아오는 우연이다.", "당신의 노력이 누군가의 생명을 구하는 기술이 된다.",
        "가장 어두운 밤도 결국 지나가고 해는 뜬다.", "할 수 있다고 믿는 사람만이 해낼 수 있다.",
        "지치면 쉬어가되, 포기하지는 마라.", "오늘의 1시간이 1년 뒤의 인생을 바꾼다.",
        "남들보다 늦게 시작했다면, 남들보다 더 멀리 가라.", "기술사 부럽지 않은 관리사의 자부심을 가져라.",
        "아들을 위해, 그리고 나 자신을 위해 오늘을 이겨내라.", "공부하는 아빠의 뒷모습은 최고의 교육이다.",
        "NFPC 기준 하나가 당신의 실력이 된다.", "화재안전기준을 씹어 삼키는 열정을 가져라.",
        "현장의 경험에 이론을 더해 무적의 관리사가 되라.", "시험지 앞에서의 당당함은 오늘의 오답 노트에서 나온다.",
        "어려운 문제는 당신을 시험하는 것이 아니라 성장시키는 것이다.", "2027년, 신항만의 기술 전문가로 우뚝 서라.",
        "단 한 줄의 법령도 소홀히 하지 마라.", "반복은 천재를 이기는 유일한 방법이다.",
        "당신의 합격은 이미 결정되어 있다. 과정만 남았을 뿐.", "작은 습관이 모여 위대한 운명을 만든다.",
        "남들이 쉴 때 한 페이지를 더 넘겨라.", "소방의 미래는 당신의 손끝에 달려 있다.",
        "오늘의 인내는 달콤한 합격 통보로 돌아온다.", "실패를 두려워 말고 무관심을 두려워하라.",
        "계획만 세우지 말고 행동으로 증명하라.", "당신은 생각보다 훨씬 더 강한 사람이다.",
        "마지막 1분을 버티는 자가 승리한다.", "2027년 합격, 그것은 당신의 숙명이다."
    ];

    // 데이터 패칭 및 분류 로직 (기존 로직 유지)
    useEffect(() => {
        const q = query(collection(db, "workbook"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const problems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const total = problems.length;
            const mastered = problems.filter(p => (p.recentScore || p.lastScore) >= 100).length;
            const review = problems.filter(p => (p.recentScore || p.lastScore || 0) < 100 && (p.studyCount || 0) > 0).length;

            setStats({ totalProblems: total, mastered, reviewNeeded: review });

            const subjMap = {};
            Object.keys(SUBJECT_CONFIG).forEach(key => {
                subjMap[key] = { total: 0, scoreSum: 0 };
            });

            problems.forEach(p => {
                const rawCategory = (p.category || p.subject || '소방시설 공통').trim();
                let matchedKey = '소방시설 공통';
                for (const [key, config] of Object.entries(SUBJECT_CONFIG)) {
                    if (rawCategory === key || config.keywords.some(kw => rawCategory.includes(kw))) {
                        matchedKey = key;
                        break;
                    }
                }
                subjMap[matchedKey].total += 1;
                subjMap[matchedKey].scoreSum += (p.recentScore || p.lastScore || 0);
            });

            const processedProgress = Object.entries(subjMap)
                .map(([name, data]) => {
                    const avgScore = data.total === 0 ? 0 : Math.round(data.scoreSum / data.total);
                    return {
                        name,
                        score: avgScore,
                        total: data.total,
                        ...SUBJECT_CONFIG[name]
                    };
                })
                .sort((a, b) => b.total - a.total);

            setSubjectProgress(processedProgress);

            const recent = problems.slice(0, 3).map(p => {
                const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
                const diffMin = Math.floor((new Date() - date) / 60000);
                let timeStr = diffMin < 1 ? "방금 전" : diffMin < 60 ? `${diffMin}분 전` : diffMin < 1440 ? `${Math.floor(diffMin/60)}시간 전` : `${Math.floor(diffMin/1440)}일 전`;

                return {
                    id: p.id,
                    title: p.title || "제목 없음",
                    desc: p.studyCount > 0 ? `최근 점수: ${p.recentScore || p.lastScore}점` : "새로 등록됨",
                    date: timeStr,
                    icon: p.studyCount > 0 ? PenTool : Plus,
                    color: (p.recentScore || p.lastScore) === 100 ? 'text-emerald-400' : 'text-blue-400',
                    bg: (p.recentScore || p.lastScore) === 100 ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                };
            });
            setRecentActivities(recent);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white p-4 md:p-6 overflow-y-auto w-full animate-in fade-in duration-500 pb-20">
            
            {/* 히어로 섹션 & D-Day */}
            <div className="relative rounded-3xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 shadow-2xl p-6 mb-6 overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-4 md:items-center">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                                <Target size={10} /> Target 2027
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tight">
                            {dDay} <span className="text-base md:text-xl font-normal text-slate-400">Left</span>
                        </h1>
                        <p className="text-slate-300 font-light text-xs md:text-sm max-w-lg italic opacity-80">"{quote}"</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="flex-1 md:flex-none bg-slate-950/50 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-center min-w-[90px]">
                            <div className="text-xl font-bold text-white">{loading ? '-' : stats.mastered}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Mastered</div>
                        </div>
                        <div className="flex-1 md:flex-none bg-red-950/50 backdrop-blur-md p-3 rounded-xl border border-red-900/50 text-center min-w-[90px]">
                            <div className="text-xl font-bold text-red-400">{loading ? '-' : stats.reviewNeeded}</div>
                            <div className="text-[10px] text-red-300/70 uppercase tracking-tighter">Review</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 과목별 숙련도 차트 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart size={18} className="text-slate-400" /> 과목별 숙련도
                        </h3>
                        <span className="text-xs text-slate-500">Total: {stats.totalProblems} Problems</span>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-10 text-slate-600 animate-pulse">데이터 로드 중...</div>
                    ) : (
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
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${subj.color} rounded-full transition-all duration-1000 ease-out`} 
                                            style={{ width: `${subj.score}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6">
                    {/* 데일리 퀘스트 카드 */}
                    <div className="bg-gradient-to-b from-amber-500/10 to-slate-900 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden group cursor-pointer hover:border-amber-500/40 transition-all" onClick={() => setMode('workbook')}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap size={60} /></div>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 mb-2 inline-block">DAILY QUEST</span>
                        <h4 className="text-lg font-bold text-white mb-1">학습 세션 시작</h4>
                        <p className="text-xs text-slate-400 mb-4">오늘의 학습 분량을 완료하세요.</p>
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">Start Now <ArrowRight size={14} /></div>
                    </div>

                    {/* 최근 활동 리스트 */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex-1">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><Clock size={18} className="text-slate-400" /> 최근 활동</h3>
                        {recentActivities.length > 0 ? (
                            <div className="space-y-4">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => setMode('workbook')}>
                                        <div className={`p-2.5 rounded-xl ${activity.bg} ${activity.color} shrink-0`}><activity.icon size={18} /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{activity.title}</p>
                                            <div className="flex justify-between items-center mt-0.5">
                                                <p className="text-[10px] text-slate-500 uppercase font-black">{activity.desc}</p>
                                                <p className="text-[10px] text-slate-600 font-mono">{activity.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-600 text-xs">최근 내역이 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}