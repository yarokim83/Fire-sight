import React, { useState, useMemo, useEffect } from 'react';
import {
    Calculator, Activity, Settings, Gauge, Droplets, ArrowRight,
    CheckCircle2, AlertTriangle, Info, ChevronRight, Zap,
    Ruler, Target, HelpCircle, BookOpen, RotateCcw, Play, Cable, Radio
} from 'lucide-react';

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
// CALCULATION FUNCTIONS
// =====================================================================
// Mechanical
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
// Electrical
const calculateWireVoltDrop = (current, length, wireResistance) => {
    // V = I * R * L * 2 (왕복)
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
export default function Workbook({ isExamMode, subject }) {
    const [activeTab, setActiveTab] = useState('calculator');
    const [currentStep, setCurrentStep] = useState(0);
    const isMechanical = subject === 'mechanical';

    // Mechanical Inputs
    const [mechInputs, setMechInputs] = useState({ flowRate: 650, pipeDiameter: 65, pipeLength: 100, cFactor: 120, staticHead: 40, efficiency: 0.7 });
    // Electrical Inputs
    const [elecInputs, setElecInputs] = useState({ current: 0.5, wireLength: 100, wireSize: '1.2mm', floorArea: 500, detectorType: 'smoke', spaceType: 'special' });

    // Theme
    const theme = isMechanical
        ? { accent: 'text-blue-400', bg: 'bg-blue-600', border: 'border-blue-500', icon: Droplets }
        : { accent: 'text-orange-400', bg: 'bg-orange-600', border: 'border-orange-500', icon: Zap };

    // Mechanical Calculations
    const frictionLoss = useMemo(() => calculateHazenWilliams(mechInputs.flowRate, mechInputs.cFactor, mechInputs.pipeDiameter, mechInputs.pipeLength), [mechInputs]);
    const totalHead = useMemo(() => (mechInputs.staticHead + parseFloat(frictionLoss) / 0.00981).toFixed(2), [mechInputs.staticHead, frictionLoss]);
    const pumpPower = useMemo(() => calculatePumpPower(mechInputs.flowRate, parseFloat(totalHead), mechInputs.efficiency), [mechInputs.flowRate, totalHead, mechInputs.efficiency]);
    const recommendedSchedule = useMemo(() => selectPipeSchedule(parseFloat(frictionLoss) + 0.17), [frictionLoss]);

    // Electrical Calculations
    const selectedWire = useMemo(() => WIRE_SIZES.find(w => w.size === elecInputs.wireSize) || WIRE_SIZES[1], [elecInputs.wireSize]);
    const voltDrop = useMemo(() => calculateWireVoltDrop(elecInputs.current, elecInputs.wireLength, selectedWire.resistance), [elecInputs, selectedWire]);
    const detectorSpec = useMemo(() => DETECTOR_SPECS[elecInputs.detectorType], [elecInputs.detectorType]);
    const detectorArea = useMemo(() => detectorSpec?.area?.[elecInputs.spaceType] || 100, [detectorSpec, elecInputs.spaceType]);
    const detectorCount = useMemo(() => calculateDetectorCount(elecInputs.floorArea, detectorArea), [elecInputs.floorArea, detectorArea]);
    const voltDropOk = parseFloat(voltDrop) < 5; // 5V 이하 권장

    // Input Component
    const InputField = ({ label, value, onChange, unit, min = 0, step = 1, tooltip }) => (
        <div className="mb-3">
            <label className="flex items-center gap-1 text-xs text-slate-400 mb-1">{label}
                {tooltip && <span className="group relative"><HelpCircle size={12} className="text-slate-600 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 bg-slate-800 text-[10px] text-slate-300 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">{tooltip}</span>
                </span>}
            </label>
            <div className="flex items-center gap-2">
                <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} min={min} step={step}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                {unit && <span className="text-xs text-slate-500 w-16">{unit}</span>}
            </div>
        </div>
    );

    // Gauge Component
    const GaugeDisplay = ({ label, value, unit, min, max, threshold, thresholdLabel, isGood }) => {
        const percentage = Math.min(100, Math.max(0, ((parseFloat(value) - min) / (max - min)) * 100));
        const thresholdPercent = ((threshold - min) / (max - min)) * 100;
        return (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className={`text-lg font-bold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>{value} <span className="text-xs font-normal text-slate-500">{unit}</span></span>
                </div>
                <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${isGood ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400" style={{ left: `${thresholdPercent}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>{min}</span><span className="text-amber-400">{thresholdLabel}: {threshold}</span><span>{max}</span></div>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full bg-slate-950 text-white overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={`text-xl font-bold ${theme.accent} flex items-center gap-2`}>
                            <Calculator size={24} />
                            {isMechanical ? '수리계산 및 설계 실습' : '전기설계 및 감지기 배치'}
                        </h2>
                        <p className="text-slate-500 text-xs mt-1">{isMechanical ? 'NFTC 2024 부록 A 기반 · Hazen-Williams 공식' : 'NFTC 203 기반 · 전압강하/감지기 산정'}</p>
                    </div>
                    <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                        <button onClick={() => setActiveTab('calculator')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'calculator' ? theme.bg + ' text-white' : 'text-slate-400 hover:text-white'}`}>
                            🧮 {isMechanical ? '통합 계산기' : '전선 계산기'}
                        </button>
                        <button onClick={() => setActiveTab('stepByStep')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'stepByStep' ? theme.bg + ' text-white' : 'text-slate-400 hover:text-white'}`}>
                            📋 {isMechanical ? '단계별 설계' : '감지기 배치'}
                        </button>
                    </div>
                </div>

                {/* ==================== MECHANICAL CONTENT ==================== */}
                {isMechanical && activeTab === 'calculator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800"><Settings size={16} className={theme.accent} /> 변수 입력</div>
                            <InputField label="유량 (Q)" value={mechInputs.flowRate} onChange={(v) => setMechInputs(p => ({ ...p, flowRate: v }))} unit="L/min" tooltip="소화전 개수 × 130" />
                            <InputField label="배관 내경 (d)" value={mechInputs.pipeDiameter} onChange={(v) => setMechInputs(p => ({ ...p, pipeDiameter: v }))} unit="mm" />
                            <InputField label="배관 길이 (L)" value={mechInputs.pipeLength} onChange={(v) => setMechInputs(p => ({ ...p, pipeLength: v }))} unit="m" />
                            <div className="mb-3"><label className="text-xs text-slate-400 mb-1 block">조도 계수 (C)</label>
                                <select value={mechInputs.cFactor} onChange={(e) => setMechInputs(p => ({ ...p, cFactor: parseInt(e.target.value) }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                    {C_FACTORS.map(cf => (<option key={cf.c} value={cf.c}>{cf.material} (C={cf.c})</option>))}
                                </select>
                            </div>
                            <InputField label="정적 양정" value={mechInputs.staticHead} onChange={(v) => setMechInputs(p => ({ ...p, staticHead: v }))} unit="m" />
                            <InputField label="펌프 효율" value={mechInputs.efficiency} onChange={(v) => setMechInputs(p => ({ ...p, efficiency: v }))} unit="(0~1)" step={0.05} />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800"><Activity size={16} className="text-emerald-400" /> Hazen-Williams 마찰손실</div>
                                <GaugeDisplay label="마찰손실 압력 (ΔP)" value={frictionLoss} unit="MPa" min={0} max={1} threshold={0.3} thresholdLabel="권장 한계" isGood={parseFloat(frictionLoss) < 0.3} />
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800"><Zap size={16} className="text-amber-400" /> 펌프 동력</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center"><p className="text-xs text-slate-500 mb-1">총 양정</p><p className="text-2xl font-bold text-white">{totalHead}<span className="text-xs text-slate-400 ml-1">m</span></p></div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center"><p className="text-xs text-slate-500 mb-1">축동력</p><p className="text-2xl font-bold text-emerald-400">{pumpPower}<span className="text-xs text-slate-400 ml-1">kW</span></p></div>
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800"><Ruler size={16} className="text-cyan-400" /> 배관 스케줄 판정</div>
                                <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                                    <div><p className="text-xs text-cyan-400">권장 Schedule</p><p className="text-xl font-bold text-white">Sch. {recommendedSchedule.schedule}</p></div>
                                    <div className="text-right"><p className="text-xs text-slate-400">최소 두께</p><p className="text-sm font-mono text-white">{recommendedSchedule.thickness} mm</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== ELECTRICAL CONTENT ==================== */}
                {!isMechanical && activeTab === 'calculator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800"><Cable size={16} className={theme.accent} /> 전압강하 계산</div>
                            <InputField label="회로 전류 (I)" value={elecInputs.current} onChange={(v) => setElecInputs(p => ({ ...p, current: v }))} unit="A" step={0.1} tooltip="감지기 회로는 보통 0.3~0.5A" />
                            <InputField label="배선 길이 (L)" value={elecInputs.wireLength} onChange={(v) => setElecInputs(p => ({ ...p, wireLength: v }))} unit="m" tooltip="수신기에서 종단 감지기까지 거리" />
                            <div className="mb-3"><label className="text-xs text-slate-400 mb-1 block">전선 굵기</label>
                                <select value={elecInputs.wireSize} onChange={(e) => setElecInputs(p => ({ ...p, wireSize: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                    {WIRE_SIZES.map(w => (<option key={w.size} value={w.size}>{w.size} (저항: {w.resistance}Ω/km)</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                                <div className="flex items-center gap-2 text-sm font-bold text-white mb-4 pb-3 border-b border-slate-800"><Activity size={16} className={voltDropOk ? 'text-emerald-400' : 'text-red-400'} /> 전압강하 결과</div>
                                <GaugeDisplay label="전압강하 (Vd)" value={voltDrop} unit="V" min={0} max={10} threshold={5} thresholdLabel="NFTC 권장" isGood={voltDropOk} />
                                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 font-mono">Vd = I × R × L × 2 (왕복)</div>
                            </div>
                            <div className={`p-4 rounded-xl border ${voltDropOk ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                <div className="flex items-center gap-2"><CheckCircle2 size={18} className={voltDropOk ? 'text-emerald-400' : 'text-red-400'} />
                                    <span className={`font-bold ${voltDropOk ? 'text-emerald-400' : 'text-red-400'}`}>{voltDropOk ? '기준 충족: 전선 굵기 적정' : '기준 미달: 전선 굵기 상향 필요'}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">NFTC 권장: 전압강하 5V 이하 (회로 전압의 10% 이내)</p>
                            </div>
                        </div>
                    </div>
                )}

                {!isMechanical && activeTab === 'stepByStep' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-orange-900/30 to-slate-900 rounded-2xl p-5 border border-orange-500/20">
                            <h3 className="font-bold text-white flex items-center gap-2"><Radio size={18} className={theme.accent} /> 감지기 배치 설계</h3>
                            <p className="text-xs text-slate-400 mt-1">NFTC 203 제7조 기준 감지기 개수 산정</p>
                        </div>
                        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">감지기 종류</label>
                                    <select value={elecInputs.detectorType} onChange={(e) => setElecInputs(p => ({ ...p, detectorType: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                        <option value="smoke">연기감지기</option>
                                        <option value="heat">정온식감지기</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">공간 유형</label>
                                    <select value={elecInputs.spaceType} onChange={(e) => setElecInputs(p => ({ ...p, spaceType: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                                        <option value="special">특정소방대상물 (150㎡)</option>
                                        <option value="corridor">복도/통로 (50㎡)</option>
                                    </select>
                                </div>
                            </div>
                            <InputField label="바닥면적" value={elecInputs.floorArea} onChange={(v) => setElecInputs(p => ({ ...p, floorArea: v }))} unit="㎡" />
                            <div className="mt-6 p-6 bg-orange-500/10 rounded-xl border border-orange-500/30 text-center">
                                <p className="text-xs text-orange-400 mb-2">필요 감지기 개수</p>
                                <p className="text-5xl font-bold text-white">{detectorCount}<span className="text-lg text-slate-400 ml-2">개</span></p>
                                <p className="text-xs text-slate-500 mt-3">= {elecInputs.floorArea}㎡ ÷ {detectorArea}㎡/개 = {(elecInputs.floorArea / detectorArea).toFixed(2)} → 올림</p>
                            </div>
                        </div>
                    </div>
                )}

                {isMechanical && activeTab === 'stepByStep' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-900/30 to-slate-900 rounded-2xl p-5 border border-blue-500/20">
                            <h3 className="font-bold text-white flex items-center gap-2"><Target size={18} className={theme.accent} /> 옥내소화전 + 스프링클러 겸용 설계</h3>
                            <p className="text-xs text-slate-400 mt-1">수원 산정 → 펌프 용량 → 배관 선정</p>
                        </div>
                        <div className="text-center text-slate-500 py-12">
                            <Droplets size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-sm">상단 [통합 계산기] 탭에서 수리계산을 진행하세요.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Side Panel */}
            <div className={`w-80 bg-slate-900 border-l ${theme.border} border-opacity-30 p-5 flex flex-col shadow-2xl overflow-y-auto`}>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800"><BookOpen className={theme.accent} size={18} /><h3 className="font-bold text-sm text-white">기술 해설</h3></div>
                <div className="space-y-4">
                    {isMechanical ? (
                        <>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"><p className="text-xs font-bold text-blue-400 mb-2">Hazen-Williams 공식</p><p className="text-[10px] text-slate-400 leading-relaxed">배관 내 마찰손실 수두를 계산하는 경험식으로, 소방설비 설계에서 가장 널리 사용됩니다.</p></div>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"><p className="text-xs font-bold text-emerald-400 mb-2">펌프 동력 산정</p><p className="text-[10px] text-slate-400 leading-relaxed">P = (9.8 × Q × H × K) / η<br />K: 전달계수(1.1~1.2), η: 펌프 효율</p></div>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"><p className="text-xs font-bold text-orange-400 mb-2">전압강하 계산</p><p className="text-[10px] text-slate-400 leading-relaxed">Vd = I × R × L × 2 (왕복)<br />전압강하는 회로 전압의 10% 이내(약 5V)로 유지해야 합니다.</p></div>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"><p className="text-xs font-bold text-emerald-400 mb-2">감지기 바닥면적</p><p className="text-[10px] text-slate-400 leading-relaxed">연기감지기: 특정 150㎡, 복도 50㎡<br />정온식: 특종 70㎡, 1종 90㎡</p></div>
                        </>
                    )}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"><p className="text-xs font-bold text-amber-400 mb-2">⚠️ 시험 출제 포인트</p>
                        <ul className="text-[10px] text-slate-400 space-y-1">
                            {isMechanical ? (
                                <><li>• 겸용 수원: 각 설비 유효수량 합산</li><li>• 체절압력: 정격토출압력의 140% 이하</li><li>• 주배관 유속 6m/s 이하</li></>
                            ) : (
                                <><li>• 종단저항: 회선 끝 10kΩ 설치</li><li>• 감지기 부착높이별 종별 선택</li><li>• 경종 수평거리 25m 이하</li></>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
