import React, { useState, useMemo, useEffect } from 'react';
import {
    Calculator, Activity, Settings, Gauge, Droplets, ArrowRight,
    CheckCircle2, AlertTriangle, Info, ChevronRight, Zap,
    Ruler, Target, HelpCircle, BookOpen, RotateCcw, Play, Cable, Radio,
    LayoutGrid, Wind, Bell, PenTool
} from 'lucide-react';
import ProblemSolver from './ProblemSolver';
import { sprinklerProblems } from '../data/sprinklerData';

// =====================================================================
// CONSTANTS: 기계분야 (수리계산)
// =====================================================================
const PIPE_SCHEDULES = [
    { schedule: '10S', thickness: 1.65, maxPressure: 1.0 },
    { schedule: '20', thickness: 2.11, maxPressure: 1.5 },
    { schedule: '40', thickness: 2.77, maxPressure: 2.5 },
    { schedule: '80', thickness: 3.73, maxPressure: 4.0 },
];
const C_FACTORS = [
    { material: '스테인리스강관', c: 140 },
    { material: '배관용 탄소강관 (신품)', c: 120 },
    { material: '배관용 탄소강관 (10년 사용)', c: 100 },
    { material: '주철관', c: 100 },
];

// =====================================================================
// CONSTANTS: 전기분야 (전선 굵기, 감지기 설계)
// =====================================================================
const WIRE_SIZES = [
    { size: '0.9mm', resistance: 28.5, current: 5 },
    { size: '1.2mm', resistance: 15.9, current: 8 },
    { size: '1.6mm', resistance: 9.0, current: 12 },
    { size: '2.0mm', resistance: 5.7, current: 17 },
    { size: '2.6mm', resistance: 3.4, current: 23 },
];
const DETECTOR_SPECS = {
    smoke: { type: '연기감지기', area: { special: 150, corridor: 50 }, height: { '1종': 4, '2종': 20, '3종': 20 } },
    heat: { type: '정온식감지기', area: { special: 70, ordinary: 90 }, temp: { '특종': 60, '1종': 75, '2종': 90 } },
};

// =====================================================================
// TOPIC MENU DATA
// =====================================================================
const TOPICS = [
    {
        id: 'water',
        label: '수계 소화설비',
        labelEn: 'Water Based Systems',
        desc: '유효수량, 펌프 동력, 배관 마찰손실 등 핵심 수리계산 문제를 풀이합니다.',
        icon: Droplets,
        color: 'blue',
        solved: 20,
        total: 20,
        targetSubject: 'mechanical'
    },
    {
        id: 'gas',
        label: '가스/제연 설비',
        labelEn: 'Gas & Smoke Control',
        desc: '소화약제량 산정 및 제연 풍량 계산 등 특수 설비 계산을 실습합니다.',
        icon: Wind,
        color: 'slate',
        solved: 5,
        total: 15,
        targetSubject: 'mechanical'
    },
    {
        id: 'alarm',
        label: '경보/전기 설비',
        labelEn: 'Alarm & Electrical',
        desc: '전압강하, 축전지 용량, 감지기 소요 개수 산정 등 전기 분야 필수 계산입니다.',
        icon: Bell,
        color: 'amber',
        solved: 18,
        total: 25,
        targetSubject: 'electrical'
    },
    {
        id: 'basic',
        label: '기계/전기 기초',
        labelEn: 'Basic Engineering',
        desc: '단위 변환, 기초 유체역학, 옴의 법칙 등 공학 기초 문제를 다룹니다.',
        icon: Ruler,
        color: 'emerald',
        solved: 3,
        total: 10,
        targetSubject: 'mechanical'
    }
];

// =====================================================================
// CALCULATION FUNCTIONS (Preserved for future use)
// =====================================================================
const calculateHazenWilliams = (Q, C, d, L) => {
    if (!Q || !C || !d || !L || d <= 0) return 0;
    const Qm3s = Q / 60000; const dM = d / 1000;
    const hLoss = 10.67 * L * Math.pow(Qm3s, 1.852) / (Math.pow(C, 1.852) * Math.pow(dM, 4.87));
    return (hLoss * 0.00981).toFixed(4);
};
const calculatePumpPower = (Q, H, efficiency, transferCoeff = 1.1) => {
    if (!Q || !H || !efficiency || efficiency <= 0) return 0;
    const Qm3s = Q / 60000;
    return ((9.8 * Qm3s * H * transferCoeff) / efficiency).toFixed(2);
};
const selectPipeSchedule = (pressure) => {
    for (const sch of PIPE_SCHEDULES) { if (pressure <= sch.maxPressure) return sch; }
    return PIPE_SCHEDULES[PIPE_SCHEDULES.length - 1];
};
const calculateWireVoltDrop = (current, length, wireResistance) => {
    if (!current || !length || !wireResistance) return 0;
    return (current * (wireResistance / 1000) * length * 2).toFixed(2);
};
const calculateDetectorCount = (area, perDetector) => {
    if (!area || !perDetector) return 0;
    return Math.ceil(area / perDetector);
};

// =====================================================================
// COMPONENT
// =====================================================================
export default function Workbook({ isExamMode, subject: initialSubject }) {
    // STATE
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'list' | 'solver'
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [customData, setCustomData] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('fireSight_customData');
        if (saved) {
            const parsed = JSON.parse(saved);
            const problems = parsed.filter(item => item.type === 'workbook');
            setCustomData(problems);
        }
    }, []);

    const allProblems = [...sprinklerProblems, ...customData];

    // Initial Subject Handling (Optional)
    const activeTopics = initialSubject === 'electrical'
        ? TOPICS.filter(t => t.targetSubject === 'electrical')
        : TOPICS.filter(t => t.targetSubject === 'mechanical');

    // Navigation Handler
    const handleTopicClick = (topic) => {
        const topicProblems = allProblems.filter(p => p.category === topic.id);
        if (topicProblems.length > 0) {
            setSelectedTopic(topic);
            setViewMode('list');
        } else {
            alert("🚧 데이터 준비 중입니다. (Smart Upload로 문제를 추가해보세요!)");
        }
    };

    const handleProblemSelect = (problem) => {
        setSelectedProblem(problem);
        setViewMode('solver');
    };

    const handleBackToDashboard = () => {
        setViewMode('dashboard');
        setSelectedTopic(null);
        setSelectedProblem(null);
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedProblem(null);
    };

    // Derived Theme
    const isMechanical = selectedTopic?.targetSubject === 'mechanical' || initialSubject === 'mechanical';
    const theme = isMechanical
        ? { accent: 'text-blue-400', bg: 'bg-blue-600', border: 'border-blue-500', icon: Droplets }
        : { accent: 'text-orange-400', bg: 'bg-orange-600', border: 'border-orange-500', icon: Zap };


    // RENDER: DASHBOARD
    if (viewMode === 'dashboard') {
        const totalSolved = TOPICS.reduce((acc, t) => acc + t.solved, 0);
        const totalCount = TOPICS.reduce((acc, t) => acc + t.total, 0);
        const totalProgress = Math.round((totalSolved / totalCount) * 100);

        return (
            <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto animate-in fade-in duration-500">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <Calculator className="text-emerald-500" /> 실전 문제 풀이 (Workbook)
                    </h2>
                    <p className="text-slate-400">유형별 문제 풀이를 통해 실전 감각을 키우세요.</p>
                </div>

                {/* Main Progress Card (Optional, kept minimal) */}
                <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 font-bold">Total Progress</span>
                        <span className="text-2xl font-bold text-white">{totalProgress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                        <div className="h-full bg-emerald-500" style={{ width: `${totalProgress}%` }}></div>
                    </div>
                </div>

                {/* Topic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {activeTopics.map(topic => (
                        <button key={topic.id} onClick={() => handleTopicClick(topic)}
                            className={`group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl text-left
                            ${topic.color === 'blue' ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50' :
                                    topic.color === 'amber' ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50' :
                                        topic.color === 'emerald' ? 'bg-slate-900 border-slate-800 hover:border-emerald-500/50' :
                                            'bg-slate-900 border-slate-800 hover:border-slate-500/50'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl bg-${topic.color}-500/10 text-${topic.color}-500`}>
                                    <topic.icon size={28} />
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-500 block mb-1">진행률</span>
                                    <span className={`text-lg font-bold text-${topic.color}-400`}>
                                        {Math.round((topic.solved / topic.total) * 100)}%
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-white transition-colors">{topic.label}</h3>
                            <p className="text-slate-500 text-sm mb-6 h-10 line-clamp-2">{topic.desc}</p>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                                <PenTool size={14} /> <span>{topic.solved} / {topic.total} 문제 해결</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // RENDER: LIST VIEW
    if (viewMode === 'list') {
        return (
            <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto animate-in fade-in duration-300">
                <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 w-fit font-bold text-sm transition-colors">
                    <ArrowRight className="rotate-180" size={18} /> 문제 목록으로 돌아가기
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <selectedTopic.icon className={theme.accent} /> {selectedTopic.label} 문제 리스트
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    {allProblems.filter(p => p.category === selectedTopic.id).map((problem, index) => (
                        <button key={problem.id} onClick={() => handleProblemSelect(problem)}
                            className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-all text-left group shadow-lg"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${problem.type === 'descriptive' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {problem.type === 'descriptive' ? '서술형 (Descriptive)' : '객관식 (Multiple Choice)'}
                                </span>
                                <span className="text-slate-500 text-xs font-mono">Q{index + 1}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 group-hover:text-white mb-2 line-clamp-1">{problem.question}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <PenTool size={14} /> <span>문제 풀기 Start</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // RENDER: SOLVER VIEW
    if (viewMode === 'solver' && selectedProblem) {
        return (
            <div className="h-full w-full">
                <ProblemSolver
                    topicId={selectedTopic?.id}
                    problems={[selectedProblem]} // Pass as array containing the single selected problem
                    onBack={handleBackToList}
                    onComplete={handleBackToList}
                />
            </div>
        );
    }

    return null;
}
