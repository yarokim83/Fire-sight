import React, { useState, useEffect } from 'react';
import {
    Clock, PenTool, BarChart, Calendar, ChevronRight,
    Flame, Target, ArrowRight, Zap, Droplets, BookOpen, AlertCircle
} from 'lucide-react';

export default function Dashboard({ setMode, subject }) {
    // D-Day Calculation
    const calculateDday = () => {
        const targetDate = new Date('2025-09-20');
        const today = new Date();
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? 'D-Day' : `D+${Math.abs(diffDays)}`);
    };

    const dDay = calculateDday();

    // Mock Data for Recent Activity
    const recentActivities = [
        { id: 1, type: 'pdf', title: '소방시설법 시행령 별표 4', desc: '어제 읽음', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', mode: 'reference' },
        { id: 2, type: 'workbook', title: '스프링클러 수리계산', desc: '방금 전', icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10', mode: 'workbook' },
    ];

    // Handler for navigation
    const handleNavigate = (targetMode) => {
        if (targetMode) setMode(targetMode);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white p-6 overflow-y-auto w-full animate-in fade-in duration-500">
            {/* 1. Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-2xl p-8 mb-8 group">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-red-500/20 duration-700"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1">
                                <Flame size={12} /> 제23회 소방시설관리사
                            </span>
                            <span className="text-slate-500 text-xs">2025.09.20 (Sat)</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-2 leading-tight">
                            {dDay}
                        </h1>
                        <p className="text-slate-400 font-light text-lg">
                            남은 시간은 충분합니다. <strong className="text-slate-200">오늘도 한 걸음 더.</strong>
                        </p>
                    </div>

                    <div className="bg-slate-950/50 backdrop-blur-sm p-4 rounded-xl border border-slate-700 flex items-center gap-4 min-w-[300px]">
                        <div className="p-3 bg-slate-800 rounded-lg">
                            <Target size={24} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Current Goal</p>
                            <p className="font-bold text-slate-200">NFTC 화재안전기술기준 완전 정복</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Study Time */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm mb-1">Today's Focus</p>
                            <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">2h 30m</h3>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="mt-4 overflow-hidden h-1.5 bg-slate-800 rounded-full">
                        <div className="h-full w-2/3 bg-blue-500"></div>
                    </div>
                </div>

                {/* Problems Solved */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm mb-1">Problems Solved</p>
                            <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">12 <span className="text-sm font-normal text-slate-500">/ 20</span></h3>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <PenTool size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
                        ))}
                    </div>
                </div>

                {/* Total Progress */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm mb-1">Total Progress</p>
                            <h3 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">34%</h3>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <BarChart size={20} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500 flex justify-between">
                        <span>Yesterday 32%</span>
                        <span className="text-purple-400">+2%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 3. Recent Activity (2 Cols) */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <Calendar size={18} className="text-slate-400" /> 최근 학습 활동
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {recentActivities.map((activity) => {
                            const Icon = activity.icon;
                            return (
                                <button
                                    key={activity.id}
                                    onClick={() => handleNavigate(activity.mode)}
                                    className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl hover:bg-slate-800 transition-all hover:scale-[1.01] group text-left w-full"
                                >
                                    <div className={`p-3 rounded-xl ${activity.bg} ${activity.color}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors">{activity.title}</h4>
                                        <p className="text-sm text-slate-500">{activity.desc}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                                        <ChevronRight size={20} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 4. Daily Mission (1 Col) */}
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <Zap size={18} className="text-amber-400" /> 오늘의 추천 퀘스트
                    </h3>
                    <div className="bg-gradient-to-b from-amber-500/10 to-slate-900 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Target size={100} />
                        </div>

                        <div className="relative z-10 flex flex-col h-full">
                            <span className="inline-block px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-bold rounded mb-3 w-fit border border-amber-500/20">
                                DAILY MISSION
                            </span>
                            <h4 className="text-xl font-bold text-white mb-2 leading-tight">
                                가스계 소화설비<br />
                                <span className="text-amber-400">약제량 계산</span> 마스터하기
                            </h4>
                            <p className="text-sm text-slate-400 mb-6 flex-1">
                                최근 출제 빈도가 높아진 할론/CO2 약제량 공식을 완벽하게 정리해보세요.
                            </p>

                            <button
                                onClick={() => handleNavigate('workbook')}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                도전하기 <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
