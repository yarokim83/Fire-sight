import React, { useState, useMemo, useEffect } from 'react';
import {
    Calculator, Activity, Settings, Gauge, Droplets, ArrowRight,
    CheckCircle2, AlertTriangle, Info, ChevronRight, Zap,
    Ruler, Target, HelpCircle, BookOpen, RotateCcw, Play, Cable, Radio,
    LayoutGrid, Wind, Bell, PenTool, Trash2
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
import DrawingCanvas from './DrawingCanvas'; // [NEW] Import

// ... existing imports ...

export default function Workbook({ isExamMode, subject: initialSubject, initialFilter }) {
    // STATE
    const [viewMode, setViewMode] = useState('dashboard');
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [customData, setCustomData] = useState([]);

    // [NEW] Canvas State
    const [activeCanvasId, setActiveCanvasId] = useState(null); // ID of the problem engaging canvas

    // ... (rest of state/effects) ...

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
                        <div key={problem.id}
                            onClick={() => {
                                // Only navigate if canvas is NOT active
                                if (activeCanvasId !== problem.id) handleProblemSelect(problem);
                            }}
                            className="relative bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-all text-left group shadow-lg cursor-pointer overflow-hidden"
                        >
                            {/* [NEW] Canvas Overlay */}
                            <DrawingCanvas
                                width={800} // Approximate, ideally responsive but CSS handles scale
                                height={400}
                                isActive={activeCanvasId === problem.id}
                                onClose={(e) => {
                                    e.stopPropagation();
                                    setActiveCanvasId(null);
                                }}
                            />

                            <div className="flex items-start justify-between mb-3 relative z-0">
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        {/* Type Badge */}
                                        <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider 
                                            ${problem.problemType === 'calculation' ? 'bg-orange-500/20 text-orange-400' :
                                                problem.problemType === 'short' ? 'bg-indigo-500/20 text-indigo-400' :
                                                    problem.type === 'descriptive' || problem.problemType === 'descriptive' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {problem.problemType === 'calculation' ? '실무형' :
                                                problem.problemType === 'short' ? '단답형' :
                                                    problem.type === 'descriptive' || problem.problemType === 'descriptive' ? '서술형' : '객관식'}
                                        </span>

                                        {/* Keywords Badge */}
                                        {problem.problemType === 'descriptive' && problem.keywords && (
                                            <div className="flex gap-1">
                                                {problem.keywords.split(/[\s,]+/).filter(k => k).map((k, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700">
                                                        {k.startsWith('#') ? k : `#${k}`}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 items-start transition-opacity z-20">
                                    {/* [NEW] Pen Toggle Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveCanvasId(problem.id);
                                        }}
                                        className="p-2 bg-slate-800 text-amber-500 hover:bg-slate-700 rounded-full border border-slate-700 shadow-md transition-all active:scale-95"
                                        title="펜으로 쓰기 (Apple Pencil)"
                                    >
                                        <PenTool size={16} />
                                    </button>

                                    {problem.isCustom && (
                                        <>
                                            <span className="px-2 py-1 bg-blue-600/30 text-blue-300 text-[10px] font-bold rounded border border-blue-500/30">
                                                🆕 My
                                            </span>
                                            <button
                                                onClick={(e) => handleDeleteItem(e, problem)}
                                                className="p-1.5 bg-slate-800 text-slate-500 hover:text-red-500 rounded border border-slate-700 hover:border-red-500/50 transition-colors"
                                                title="삭제하기"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-end relative z-0">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-white mb-2 line-clamp-2 leading-relaxed">
                                        <span className="text-slate-500 text-sm font-mono mr-2">Q{index + 1}.</span>
                                        {problem.question}
                                    </h3>

                                    {/* 2027 Exam: Interactive Elements */}
                                    <div className="flex gap-3 mt-3" onClick={e => e.stopPropagation()}>
                                        {/* Short Answer: Check Answer */}
                                        {problem.problemType === 'short' && problem.answer && (
                                            <details className="text-sm">
                                                <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 select-none">
                                                    <CheckCircle2 size={14} /> 정답 확인
                                                </summary>
                                                <div className="mt-2 p-2 bg-indigo-950/30 border border-indigo-500/30 rounded text-indigo-200">
                                                    {problem.answer} <span className="text-slate-500 text-xs ml-2">({problem.reference})</span>
                                                </div>
                                            </details>
                                        )}

                                        {/* Calculation: View Solution */}
                                        {problem.problemType === 'calculation' && problem.solution && (
                                            <details className="text-sm w-full">
                                                <summary className="cursor-pointer text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 select-none">
                                                    <Calculator size={14} /> 풀이 보기
                                                </summary>
                                                <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded text-slate-300 font-mono text-xs whitespace-pre-wrap">
                                                    {problem.solution}
                                                    <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-orange-400">
                                                        <span>답: {problem.finalAnswer} {problem.unit}</span>
                                                    </div>
                                                </div>
                                            </details>
                                        )}

                                        {/* Descriptive: Model Answer (Optional) */}
                                        {problem.problemType === 'descriptive' && problem.modelAnswer && (
                                            <details className="text-sm w-full">
                                                <summary className="cursor-pointer text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 select-none">
                                                    <BookOpen size={14} /> 모범 답안
                                                </summary>
                                                <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">
                                                    {problem.modelAnswer}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                </div>

                                {/* Start Button Label */}
                                <div className="items-center gap-2 text-sm text-slate-500 hidden md:flex shrink-0">
                                    <PenTool size={14} /> <span>문제 풀기 Start</span>
                                </div>
                            </div>
                        </div>
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
