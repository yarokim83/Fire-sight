import React, { useState, useMemo, useEffect } from 'react';
import {
    Calculator, Activity, Settings, Gauge, Droplets, ArrowRight,
    CheckCircle2, AlertTriangle, Info, ChevronRight, ChevronDown,
    Ruler, Zap, Target, HelpCircle, BookOpen, RotateCcw, Play
} from 'lucide-react';

// =====================================================================
// CONSTANTS: NFTC 2024 부록 A 기반 기술 데이터
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
    { material: '동관', c: 150 },
];

const SAMPLE_SCENARIO = {
    title: '옥내소화전 + 스프링클러 겸용 건물',
    description: 'B2~10F 복합 건물의 통합 수원 및 펌프 용량 산정',
    data: {
        hydrantCount: 5,
        hydrantFlow: 130, // L/min per hydrant
        hydrantTime: 20, // minutes
        sprinklerCount: 30,
        sprinklerFlow: 80, // L/min per head
        sprinklerTime: 20, // minutes
        pipeLength: 120, // m
        pipeDiameter: 65, // mm
        cFactor: 120,
        staticHead: 45, // m
        frictionFactor: 1.2, // safety factor
    }
};

// =====================================================================
// CALCULATION FUNCTIONS
// =====================================================================
const calculateHazenWilliams = (Q, C, d, L) => {
    // Q: L/min, d: mm, L: m
    // Returns pressure loss in MPa
    if (!Q || !C || !d || !L || d <= 0) return 0;
    const Qm3s = Q / 60000; // L/min to m³/s
    const dM = d / 1000; // mm to m
    // Hazen-Williams: h = 10.67 * L * Q^1.852 / (C^1.852 * d^4.87)
    const hLoss = 10.67 * L * Math.pow(Qm3s, 1.852) / (Math.pow(C, 1.852) * Math.pow(dM, 4.87));
    return (hLoss * 0.00981).toFixed(4); // m to MPa
};

const calculatePumpPower = (Q, H, efficiency, transferCoeff = 1.1) => {
    // Q: L/min, H: m (total head), efficiency: 0~1
    // Returns kW
    if (!Q || !H || !efficiency || efficiency <= 0) return 0;
    const Qm3s = Q / 60000;
    const power = (9.8 * Qm3s * H * transferCoeff) / efficiency;
    return power.toFixed(2);
};

const selectPipeSchedule = (pressure) => {
    for (const sch of PIPE_SCHEDULES) {
        if (pressure <= sch.maxPressure) return sch;
    }
    return PIPE_SCHEDULES[PIPE_SCHEDULES.length - 1];
};

// =====================================================================
// COMPONENT
// =====================================================================
export default function Workbook({ isExamMode, subject }) {
    const [activeTab, setActiveTab] = useState('calculator'); // 'calculator' | 'stepByStep'
    const [currentStep, setCurrentStep] = useState(0);

    // Calculator Inputs
    const [calcInputs, setCalcInputs] = useState({
        flowRate: 650, // L/min
        pipeDiameter: 65, // mm
        pipeLength: 100, // m
        cFactor: 120,
        staticHead: 40, // m
        efficiency: 0.7, // 70%
    });

    // Step-by-Step Design Flow Inputs & Results
    const [designData, setDesignData] = useState({
        // Step 1: Water Source
        hydrantCount: 5,
        hydrantFlowRate: 130,
        sprinklerHeadCount: 30,
        sprinklerFlowRate: 80,
        operationTime: 20,
        waterSourceResult: null,
        // Step 2: Pump Capacity
        staticHead: 45,
        frictionHead: 0,
        designPressure: 0.17,
        pumpCapacityResult: null,
        // Step 3: Pipe Sizing
        selectedDiameter: 65,
        pipeScheduleResult: null,
    });

    const [stepStatus, setStepStatus] = useState([null, null, null]); // null | 'correct' | 'incorrect'

    // Theme
    const theme = {
        accent: 'text-blue-400',
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        glow: 'shadow-blue-500/30',
    };

    // Real-time Calculation Results
    const frictionLoss = useMemo(() => {
        return calculateHazenWilliams(
            calcInputs.flowRate,
            calcInputs.cFactor,
            calcInputs.pipeDiameter,
            calcInputs.pipeLength
        );
    }, [calcInputs]);

    const totalHead = useMemo(() => {
        const friction = parseFloat(frictionLoss) / 0.00981; // MPa to m
        return (calcInputs.staticHead + friction).toFixed(2);
    }, [calcInputs.staticHead, frictionLoss]);

    const pumpPower = useMemo(() => {
        return calculatePumpPower(
            calcInputs.flowRate,
            parseFloat(totalHead),
            calcInputs.efficiency
        );
    }, [calcInputs.flowRate, totalHead, calcInputs.efficiency]);

    const recommendedSchedule = useMemo(() => {
        const pressureMPa = parseFloat(frictionLoss) + 0.17; // Add design pressure
        return selectPipeSchedule(pressureMPa);
    }, [frictionLoss]);

    // Step-by-Step Calculations
    const calculateWaterSource = () => {
        const hydrantVolume = designData.hydrantCount * designData.hydrantFlowRate * designData.operationTime;
        const sprinklerVolume = designData.sprinklerHeadCount * designData.sprinklerFlowRate * designData.operationTime;
        const total = hydrantVolume + sprinklerVolume;
        setDesignData(prev => ({ ...prev, waterSourceResult: { hydrant: hydrantVolume, sprinkler: sprinklerVolume, total } }));
        // Check if correct (simplified: total > 0)
        setStepStatus(prev => {
            const newStatus = [...prev];
            newStatus[0] = total > 50000 ? 'correct' : 'incorrect';
            return newStatus;
        });
    };

    const calculatePumpCapacity = () => {
        const totalFlow = designData.hydrantCount * designData.hydrantFlowRate + designData.sprinklerHeadCount * designData.sprinklerFlowRate;
        const frictionHead = parseFloat(calculateHazenWilliams(totalFlow, 120, 65, 100)) / 0.00981;
        const totalHead = designData.staticHead + frictionHead + (designData.designPressure * 10.2);
        const power = calculatePumpPower(totalFlow, totalHead, 0.65);
        setDesignData(prev => ({
            ...prev,
            frictionHead: frictionHead.toFixed(2),
            pumpCapacityResult: { totalFlow, totalHead: totalHead.toFixed(2), power }
        }));
        setStepStatus(prev => {
            const newStatus = [...prev];
            newStatus[1] = parseFloat(power) > 5 ? 'correct' : 'incorrect';
            return newStatus;
        });
    };

    const calculatePipeSizing = () => {
        const pressureMPa = (parseFloat(designData.frictionHead) * 0.00981) + designData.designPressure;
        const schedule = selectPipeSchedule(pressureMPa);
        setDesignData(prev => ({ ...prev, pipeScheduleResult: schedule }));
        setStepStatus(prev => {
            const newStatus = [...prev];
            newStatus[2] = schedule.schedule === '40' ? 'correct' : 'incorrect';
            return newStatus;
        });
    };

    const resetDesign = () => {
        setDesignData({
            hydrantCount: 5, hydrantFlowRate: 130, sprinklerHeadCount: 30, sprinklerFlowRate: 80, operationTime: 20, waterSourceResult: null,
            staticHead: 45, frictionHead: 0, designPressure: 0.17, pumpCapacityResult: null,
            selectedDiameter: 65, pipeScheduleResult: null,
        });
        setStepStatus([null, null, null]);
        setCurrentStep(0);
    };

    // Input Component
    const InputField = ({ label, value, onChange, unit, min = 0, max = 9999, step = 1, tooltip }) => (
        <div className="mb-3">
            <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                {label}
                {tooltip && (
                    <span className="group relative">
                        <HelpCircle size={12} className="text-slate-600 cursor-help" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            {tooltip}
                        </span>
                    </span>
                )}
            </label>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    min={min}
                    max={max}
                    step={step}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {unit && <span className="text-xs text-slate-500 w-16">{unit}</span>}
            </div>
        </div>
    );

    // Gauge Component
    const GaugeDisplay = ({ label, value, unit, min, max, threshold, thresholdLabel }) => {
        const percentage = Math.min(100, Math.max(0, ((parseFloat(value) - min) / (max - min)) * 100));
        const thresholdPercent = ((threshold - min) / (max - min)) * 100;
        const isOverThreshold = parseFloat(value) > threshold;

        return (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className={`text-lg font-bold ${isOverThreshold ? 'text-red-400' : 'text-emerald-400'}`}>
                        {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
                    </span>
                </div>
                <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${isOverThreshold ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${percentage}%` }}
                    />
                    {/* Threshold Marker */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                        style={{ left: `${thresholdPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>{min}</span>
                    <span className="text-amber-400">{thresholdLabel}: {threshold}</span>
                    <span>{max}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full bg-slate-950 text-white overflow-hidden">

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={`text-xl font-bold ${theme.accent} flex items-center gap-2`}>
                            <Calculator size={24} />
                            수리계산 및 설계 실습
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">NFTC 2024 부록 A 기반 · Hazen-Williams 공식 적용</p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('calculator')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'calculator' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            🧮 통합 계산기
                        </button>
                        <button
                            onClick={() => setActiveTab('stepByStep')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'stepByStep' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            📋 단계별 설계
                        </button>
                    </div>
                </div>

                {/* ==================== Tab: Calculator ==================== */}
                {activeTab === 'calculator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Input Panel */}
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800">
                                <Settings size={16} className={theme.accent} />
                                변수 입력
                            </div>

                            <InputField
                                label="유량 (Q)" value={calcInputs.flowRate}
                                onChange={(v) => setCalcInputs(prev => ({ ...prev, flowRate: v }))}
                                unit="L/min" tooltip="소화전 개수 × 130 또는 스프링클러 설계유량"
                            />
                            <InputField
                                label="배관 내경 (d)" value={calcInputs.pipeDiameter}
                                onChange={(v) => setCalcInputs(prev => ({ ...prev, pipeDiameter: v }))}
                                unit="mm" tooltip="배관 호칭경에 따른 실제 내경"
                            />
                            <InputField
                                label="배관 길이 (L)" value={calcInputs.pipeLength}
                                onChange={(v) => setCalcInputs(prev => ({ ...prev, pipeLength: v }))}
                                unit="m" tooltip="주배관 + 가지배관 총 길이"
                            />

                            <div className="mb-3">
                                <label className="text-xs text-slate-400 mb-1 block">조도 계수 (C)</label>
                                <select
                                    value={calcInputs.cFactor}
                                    onChange={(e) => setCalcInputs(prev => ({ ...prev, cFactor: parseInt(e.target.value) }))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    {C_FACTORS.map(cf => (
                                        <option key={cf.c} value={cf.c}>{cf.material} (C={cf.c})</option>
                                    ))}
                                </select>
                            </div>

                            <InputField
                                label="정적 양정 (Static Head)" value={calcInputs.staticHead}
                                onChange={(v) => setCalcInputs(prev => ({ ...prev, staticHead: v }))}
                                unit="m" tooltip="수조 수면에서 최고 방수구까지 수직 높이"
                            />
                            <InputField
                                label="펌프 효율" value={calcInputs.efficiency}
                                onChange={(v) => setCalcInputs(prev => ({ ...prev, efficiency: v }))}
                                unit="(0~1)" step={0.05} min={0.1} max={1} tooltip="일반적으로 0.6 ~ 0.75"
                            />
                        </div>

                        {/* Results Panel */}
                        <div className="space-y-4">

                            {/* Hazen-Williams Result */}
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800">
                                    <Activity size={16} className="text-emerald-400" />
                                    Hazen-Williams 배관 마찰손실
                                </div>
                                <GaugeDisplay
                                    label="마찰손실 압력 (ΔP)"
                                    value={frictionLoss}
                                    unit="MPa"
                                    min={0} max={1}
                                    threshold={0.3}
                                    thresholdLabel="권장 한계"
                                />
                                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 font-mono">
                                    h = 10.67 × L × Q<sup>1.852</sup> / (C<sup>1.852</sup> × d<sup>4.87</sup>)
                                </div>
                            </div>

                            {/* Pump Power Result */}
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800">
                                    <Zap size={16} className="text-amber-400" />
                                    펌프 동력 산정
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                        <p className="text-xs text-slate-500 mb-1">총 양정</p>
                                        <p className="text-2xl font-bold text-white">{totalHead}<span className="text-xs text-slate-400 ml-1">m</span></p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                        <p className="text-xs text-slate-500 mb-1">축동력</p>
                                        <p className="text-2xl font-bold text-emerald-400">{pumpPower}<span className="text-xs text-slate-400 ml-1">kW</span></p>
                                    </div>
                                </div>
                            </div>

                            {/* Pipe Schedule Recommendation */}
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800">
                                    <Ruler size={16} className="text-cyan-400" />
                                    배관 스케줄 판정
                                </div>
                                <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                                    <div>
                                        <p className="text-xs text-cyan-400">권장 Schedule</p>
                                        <p className="text-xl font-bold text-white">Sch. {recommendedSchedule.schedule}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">최소 두께</p>
                                        <p className="text-sm font-mono text-white">{recommendedSchedule.thickness} mm</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== Tab: Step-by-Step ==================== */}
                {activeTab === 'stepByStep' && (
                    <div className="space-y-6">

                        {/* Scenario Header */}
                        <div className="bg-gradient-to-r from-blue-900/30 to-slate-900 rounded-2xl p-5 border border-blue-500/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Target size={18} className={theme.accent} />
                                        {SAMPLE_SCENARIO.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">{SAMPLE_SCENARIO.description}</p>
                                </div>
                                <button onClick={resetDesign} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300">
                                    <RotateCcw size={14} /> 초기화
                                </button>
                            </div>
                        </div>

                        {/* Step Progress */}
                        <div className="flex items-center gap-2">
                            {['수원 산정', '펌프 용량', '배관 선정'].map((step, idx) => (
                                <React.Fragment key={idx}>
                                    <button
                                        onClick={() => setCurrentStep(idx)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border
                                            ${currentStep === idx
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : stepStatus[idx] === 'correct'
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    : stepStatus[idx] === 'incorrect'
                                                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                    >
                                        {stepStatus[idx] === 'correct' && <CheckCircle2 size={14} />}
                                        {stepStatus[idx] === 'incorrect' && <AlertTriangle size={14} />}
                                        {!stepStatus[idx] && <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">{idx + 1}</span>}
                                        {step}
                                    </button>
                                    {idx < 2 && <ArrowRight size={16} className="text-slate-600 shrink-0" />}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Step Content */}
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">

                            {/* Step 1: Water Source */}
                            {currentStep === 0 && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Droplets className={theme.accent} /> Step 1: 수원 유효수량 산정
                                    </h4>
                                    <p className="text-xs text-slate-400">NFTC 공통 제4조: 겸용 시 각 설비의 유효수량을 합산</p>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-xl">
                                        <InputField label="옥내소화전 개수" value={designData.hydrantCount} onChange={v => setDesignData(p => ({ ...p, hydrantCount: v }))} unit="개" />
                                        <InputField label="소화전 방수량" value={designData.hydrantFlowRate} onChange={v => setDesignData(p => ({ ...p, hydrantFlowRate: v }))} unit="L/min" />
                                        <InputField label="스프링클러 헤드 수" value={designData.sprinklerHeadCount} onChange={v => setDesignData(p => ({ ...p, sprinklerHeadCount: v }))} unit="개" />
                                        <InputField label="헤드당 방수량" value={designData.sprinklerFlowRate} onChange={v => setDesignData(p => ({ ...p, sprinklerFlowRate: v }))} unit="L/min" />
                                        <InputField label="작동 시간" value={designData.operationTime} onChange={v => setDesignData(p => ({ ...p, operationTime: v }))} unit="분" />
                                    </div>

                                    <button onClick={calculateWaterSource} className={`w-full py-3 rounded-xl font-bold text-white ${theme.bg} flex items-center justify-center gap-2`}>
                                        <Play size={16} /> 계산 실행
                                    </button>

                                    {designData.waterSourceResult && (
                                        <div className={`p-4 rounded-xl border ${stepStatus[0] === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <p className="text-sm font-bold text-white mb-2">계산 결과</p>
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div><p className="text-[10px] text-slate-400">옥내소화전</p><p className="text-lg font-bold text-white">{(designData.waterSourceResult.hydrant / 1000).toFixed(1)} m³</p></div>
                                                <div><p className="text-[10px] text-slate-400">스프링클러</p><p className="text-lg font-bold text-white">{(designData.waterSourceResult.sprinkler / 1000).toFixed(1)} m³</p></div>
                                                <div><p className="text-[10px] text-slate-400">총 유효수량</p><p className={`text-lg font-bold ${stepStatus[0] === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>{(designData.waterSourceResult.total / 1000).toFixed(1)} m³</p></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Pump Capacity */}
                            {currentStep === 1 && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Settings className={theme.accent} /> Step 2: 펌프 용량 결정
                                    </h4>
                                    <p className="text-xs text-slate-400">NFTC 공통 제5조: 체절압력 140% 이하, 150% 유량 시 65% 압력 이상</p>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-xl">
                                        <InputField label="정적 양정" value={designData.staticHead} onChange={v => setDesignData(p => ({ ...p, staticHead: v }))} unit="m" />
                                        <InputField label="설계 방수압력" value={designData.designPressure} onChange={v => setDesignData(p => ({ ...p, designPressure: v }))} unit="MPa" step={0.01} />
                                    </div>

                                    <button onClick={calculatePumpCapacity} className={`w-full py-3 rounded-xl font-bold text-white ${theme.bg} flex items-center justify-center gap-2`}>
                                        <Play size={16} /> 계산 실행
                                    </button>

                                    {designData.pumpCapacityResult && (
                                        <div className={`p-4 rounded-xl border ${stepStatus[1] === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <p className="text-sm font-bold text-white mb-2">계산 결과</p>
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div><p className="text-[10px] text-slate-400">총 유량</p><p className="text-lg font-bold text-white">{designData.pumpCapacityResult.totalFlow} L/min</p></div>
                                                <div><p className="text-[10px] text-slate-400">총 양정</p><p className="text-lg font-bold text-white">{designData.pumpCapacityResult.totalHead} m</p></div>
                                                <div><p className="text-[10px] text-slate-400">필요 동력</p><p className={`text-lg font-bold ${stepStatus[1] === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>{designData.pumpCapacityResult.power} kW</p></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Pipe Selection */}
                            {currentStep === 2 && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        <Ruler className={theme.accent} /> Step 3: 배관 관경 선정
                                    </h4>
                                    <p className="text-xs text-slate-400">NFTC 공통 제6조: 주배관 6m/s 이하, 가지배관 10m/s 이하</p>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-xl">
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">배관 내경 선택</label>
                                            <select
                                                value={designData.selectedDiameter}
                                                onChange={(e) => setDesignData(p => ({ ...p, selectedDiameter: parseInt(e.target.value) }))}
                                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                            >
                                                <option value={50}>50mm (2")</option>
                                                <option value={65}>65mm (2.5")</option>
                                                <option value={80}>80mm (3")</option>
                                                <option value={100}>100mm (4")</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button onClick={calculatePipeSizing} className={`w-full py-3 rounded-xl font-bold text-white ${theme.bg} flex items-center justify-center gap-2`}>
                                        <Play size={16} /> 스케줄 판정
                                    </button>

                                    {designData.pipeScheduleResult && (
                                        <div className={`p-4 rounded-xl border ${stepStatus[2] === 'correct' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                            <p className="text-sm font-bold text-white mb-2">판정 결과</p>
                                            <div className="flex items-center justify-center gap-8">
                                                <div className="text-center">
                                                    <p className="text-[10px] text-slate-400">권장 Schedule</p>
                                                    <p className={`text-2xl font-bold ${stepStatus[2] === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>Sch. {designData.pipeScheduleResult.schedule}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] text-slate-400">최소 두께</p>
                                                    <p className="text-2xl font-bold text-white">{designData.pipeScheduleResult.thickness} mm</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* NFTC Reference Link */}
                        {stepStatus[currentStep] === 'incorrect' && (
                            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-start gap-3">
                                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-sm font-bold text-amber-400">계산 오류 또는 기준 미달</p>
                                    <p className="text-xs text-amber-200/70 mt-1">해설서의 관련 기준을 다시 확인하세요.</p>
                                    <button className="mt-2 text-xs text-blue-400 underline hover:text-blue-300">
                                        📖 NFTC 공통 기술기준 바로가기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ==================== Side Reference Panel ==================== */}
            <div className={`w-80 bg-slate-900 border-l ${theme.border} border-opacity-30 p-5 flex flex-col shadow-2xl overflow-y-auto`}>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                    <BookOpen className={theme.accent} size={18} />
                    <h3 className="font-bold text-sm text-white">기술 해설</h3>
                </div>

                {/* Hazen-Williams Formula Explanation */}
                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <p className="text-xs font-bold text-blue-400 mb-2">Hazen-Williams 공식</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            배관 내 마찰손실 수두를 계산하는 경험식으로, 소방설비 설계에서 가장 널리 사용됩니다.
                            조도계수 C는 배관 재질과 사용 연수에 따라 달라집니다.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <p className="text-xs font-bold text-emerald-400 mb-2">펌프 동력 산정</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            P = (9.8 × Q × H × K) / η <br />
                            여기서 K는 전달계수(보통 1.1~1.2), η는 펌프 효율입니다.
                            모터 선정 시에는 여유율을 고려하여 1단계 위 용량을 선택합니다.
                        </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <p className="text-xs font-bold text-amber-400 mb-2">⚠️ 시험 출제 포인트</p>
                        <ul className="text-[10px] text-slate-400 space-y-1">
                            <li>• 겸용 수원: 각 설비 유효수량 합산</li>
                            <li>• 체절압력: 정격토출압력의 140% 이하</li>
                            <li>• 150% 유량 시 65% 압력 이상 유지</li>
                            <li>• 주배관 유속 6m/s 이하</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
