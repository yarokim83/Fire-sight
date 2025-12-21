import React, { useState, useEffect } from 'react';
import {
    Droplets, Zap, Box, CircleDot, ArrowRight, ChevronRight, ChevronDown,
    Settings, Gauge, Waves, Power, Bell, Radio, Cpu, Eye, EyeOff,
    Info, BookOpen, CheckCircle2, AlertTriangle, Globe, Lightbulb,
    Layers, Target, Thermometer, Ruler, ArrowUpDown, Flame
} from 'lucide-react';

// =====================================================================
// DATA: NFTC 2024 통합 해설서 기반 데이터
// =====================================================================

// --- 공통 기술기준 (모든 수계 설비에 적용) ---
const COMMON_NODES = [
    {
        id: 'water-source',
        label: '수원',
        icon: Waves,
        x: 10, y: 30,
        values: { capacity: '유효수량 산정' },
        nftc: {
            article: 'NFTC 공통 제4조',
            purpose: '소화설비가 일정 시간 동안 계속하여 방수할 수 있도록 충분한 양의 물을 확보하기 위함.',
            standard: '수조의 유효수량은 소화설비별로 정해진 기준에 따라 산정하며, 다른 설비와 겸용할 경우 각각의 유효수량을 합한 양 이상으로 한다.',
            commentary: '해설서에 따르면 유효수량 산정 시 소화펌프 흡입측 배관 직경의 2배 이상 수위를 확보해야 효율적인 흡입이 가능하다. 흡입배관이 수면 아래 충분히 잠기지 않으면 와류(Vortex) 현상으로 공기가 유입될 수 있다.',
            nfpa: 'NFPA 20에서는 수원의 신뢰성(Reliability)을 강조하며, 공공수도 사용 시 최소 압력 및 유량을 보장받아야 한다고 규정한다. 국내 기준과 달리 성능 중심의 접근 방식을 취한다.'
        },
        tips: ['와류 방지를 위한 수면 깊이 확보', '겸용 시 유효수량 합산 필수']
    },
    {
        id: 'pump-unit',
        label: '가압송수장치',
        icon: Settings,
        x: 35, y: 30,
        values: { pressure: '0.17MPa 이상', flow: '130L/min × N' },
        nftc: {
            article: 'NFTC 공통 제5조',
            purpose: '수원의 물을 소화설비의 설계압력 및 설계유량으로 가압하여 송수하기 위함.',
            standard: '펌프의 성능은 체절운전 시 정격토출압력의 140%를 초과하지 않고, 정격토출량의 150%로 운전 시 정격토출압력의 65% 이상이어야 한다.',
            commentary: '성능시험배관은 펌프 토출측에서 분기하여 유량계, 개폐밸브를 거쳐 수조로 환수되도록 구성한다. 시험 시 NPSH(유효흡입수두)도 함께 확인해야 한다.',
            nfpa: 'NFPA 20은 펌프의 작동 신뢰성과 비상전원 확보를 매우 중시한다. 특히 Jockey Pump의 역할과 압력 스위치 설정값에 대해 상세히 규정한다.'
        },
        tips: ['성능시험배관 필수 설치', '체절압력 140% 이하 확인', 'NPSH 여유 확보']
    },
    {
        id: 'piping',
        label: '배관',
        icon: ArrowUpDown,
        x: 60, y: 30,
        values: { velocity: '6m/s 이하', material: 'KS D 3507' },
        nftc: {
            article: 'NFTC 공통 제6조',
            purpose: '가압된 소화수를 방수구 또는 헤드까지 안정적으로 공급하기 위함.',
            standard: '배관 내 유속은 주배관 6m/s 이하, 가지배관 10m/s 이하로 한다. 동결 우려 장소에는 보온 조치를 해야 한다.',
            commentary: '해설서는 배관의 마찰손실 계산(Hazen-Williams 공식) 및 배관 지지대 간격을 상세히 다룬다. 신축배관장치(플렉시블 조인트)는 지진 대비에 필수적이다.',
            nfpa: 'NFPA 13은 배관 스케줄(Schedule) 방식과 수리계산 방식을 모두 허용한다. 유속 제한은 국내와 유사하나, 배관 재질 선정에 더 많은 옵션을 제공한다.'
        },
        tips: ['마찰손실 계산 철저', '지진 대비 신축이음 설치', '동파 방지 보온']
    },
    {
        id: 'alarm-valve',
        label: '제어밸브',
        icon: Gauge,
        x: 85, y: 30,
        values: { type: '개폐표시형', location: '바닥 0.8~1.5m' },
        nftc: {
            article: 'NFTC 공통 제7조',
            purpose: '배관 내 압력 및 유량을 제어하고, 점검 및 유지보수 시 구역별 차단을 가능하게 하기 위함.',
            standard: '제어밸브는 개폐여부를 확인할 수 있는 개폐표시형으로 하고, 바닥으로부터 0.8m 이상 1.5m 이하에 설치한다.',
            commentary: '해설서에서는 OS&Y(Outside Screw & Yoke) 밸브와 버터플라이 밸브의 적용 차이를 설명한다. 또한, 탬퍼 스위치 연동의 중요성을 강조한다.',
            nfpa: 'NFPA는 모든 제어밸브에 전기적 감시(Supervisory) 기능을 요구하며, 개방/폐쇄 상태를 수신기에서 모니터링하도록 규정한다.'
        },
        tips: ['개폐표시형 의무', '탬퍼스위치 연동 권장', '점검 및 유지보수 편의 고려']
    },
];

// --- 개별 설비 기준 (설비별 특수 구성요소) ---
const EQUIPMENT_SPECIFIC = {
    '옥내소화전': {
        code: 'NFTC 102',
        nodes: [
            {
                id: 'hydrant-box',
                label: '소화전함',
                icon: Box,
                x: 50, y: 70,
                values: { height: '1.5m 이하', hose: '40mm × 15m' },
                nftc: {
                    article: 'NFTC 102 제7조',
                    purpose: '화재 초기 재실자가 직접 소화활동을 할 수 있도록 소화전 및 호스를 수납하기 위함.',
                    standard: '옥내소화전함은 바닥으로부터 1.5m 이하에 설치하고, 호스는 구경 40mm 이상, 길이 15m 이상을 비치한다.',
                    commentary: '소화전함 상부에 표시등을 설치해야 하며, 함 내부에는 호스, 관창(노즐), 소화전밸브가 있어야 한다. 방수압력은 0.17MPa~0.7MPa 범위를 유지해야 한다.',
                    nfpa: 'NFPA 14는 Class I, II, III 시스템을 구분하며, 옥내소화전 설비는 주로 Class II(호스 보관함) 또는 Class III(호스+옥외 소화전 연결)에 해당한다.'
                },
                tips: ['표시등 설치 필수', '방수압력 0.17~0.7MPa', '호스 접결 용이성 확인']
            },
        ]
    },
    '스프링클러': {
        code: 'NFTC 103',
        nodes: [
            {
                id: 'sprinkler-head',
                label: '스프링클러헤드',
                icon: Target,
                x: 50, y: 70,
                values: { spacing: '2.1~2.3m', rth: 'RTI 50 이하(조기반응형)' },
                nftc: {
                    article: 'NFTC 103 제10조',
                    purpose: '화재 시 열에 의해 자동으로 개방되어 물을 살수함으로써 화재를 진압 또는 제어하기 위함.',
                    standard: '헤드 간 수평거리는 헤드 특성에 따라 2.1m ~ 2.3m 범위로 하며, 헤드와 벽 사이 거리는 헤드 간 거리의 1/2 이하로 한다.',
                    commentary: '해설서는 헤드 종류별(표준형, 조기반응형, 측벽형 등) 설치 기준을 상세히 다룬다. 특히 반응지수(RTI)와 방수특성(K-Factor)의 중요성을 강조한다.',
                    nfpa: 'NFPA 13은 위험도 분류(Light/Ordinary/Extra Hazard)에 따른 설계밀도 및 헤드 배치를 규정한다. 국내 기준보다 설계 밀도 산정이 더 체계적이다.'
                },
                tips: ['RTI/K-Factor 확인', '장애물 회피 배치', '설계밀도 산정']
            },
            {
                id: 'alarm-check-valve',
                label: '알람체크밸브',
                icon: Bell,
                x: 85, y: 70,
                values: { delay: '5~60초 이내' },
                nftc: {
                    article: 'NFTC 103 제8조',
                    purpose: '스프링클러 헤드 개방 시 배관 내 유수를 감지하여 경보를 발하기 위함.',
                    standard: '알람체크밸브는 유수검지장치로서, 헤드 개방 후 5초~60초 이내에 신호를 발하여 경보를 울려야 한다.',
                    commentary: '해설서에서는 습식/건식/준비작동식 유수검지장치의 작동 원리와 각 방식별 장단점을 비교 설명한다. 압력스위치와 리타딩챔버의 역할이 중요하다.',
                    nfpa: 'NFPA 13은 유수검지장치 외에도 Waterflow Indicator(유수표시기)를 별도로 규정하여 층별 또는 구역별 감시에 활용하도록 한다.'
                },
                tips: ['리타딩챔버로 오경보 방지', '압력스위치 작동 확인', '습식 vs 건식 선택']
            },
        ]
    }
};

// =====================================================================
// COMPONENT
// =====================================================================
export default function VisualLearning({ isExamMode, setIsExamMode, setMode, subject }) {
    const [activeTab, setActiveTab] = useState('common'); // 'common' | 'specific'
    const [selectedEquipment, setSelectedEquipment] = useState('옥내소화전');
    const [selectedNode, setSelectedNode] = useState(null);
    const [revealedNodes, setRevealedNodes] = useState(new Set());
    const [revealedValues, setRevealedValues] = useState(new Set());

    // Determine nodes based on tab
    const baseNodes = COMMON_NODES;
    const specificData = EQUIPMENT_SPECIFIC[selectedEquipment];
    const specificNodes = specificData?.nodes || [];
    const allNodes = activeTab === 'common' ? baseNodes : [...baseNodes, ...specificNodes];

    // Theme (Mechanical only for now, as this is water-based)
    const theme = {
        accent: 'text-blue-400',
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        glow: 'shadow-blue-500/30',
        line: 'bg-blue-500',
        nodeBg: 'bg-blue-900/50 hover:bg-blue-800/70',
        nodeActiveBg: 'bg-blue-700 ring-2 ring-blue-400',
        tabActive: 'bg-blue-600 text-white',
        tabInactive: 'bg-slate-800 text-slate-400 hover:bg-slate-700'
    };

    // Reset on tab/equipment change
    useEffect(() => {
        setSelectedNode(null);
        setRevealedNodes(new Set());
        setRevealedValues(new Set());
    }, [activeTab, selectedEquipment, subject]);

    const handleNodeClick = (node) => {
        setSelectedNode(node);
        if (isExamMode) {
            setRevealedNodes(prev => new Set(prev).add(node.id));
        }
    };

    const handleValueReveal = (valueKey) => {
        if (isExamMode) {
            setRevealedValues(prev => new Set(prev).add(`${selectedNode?.id}-${valueKey}`));
        }
    };

    const getNodeLabel = (node) => {
        if (!isExamMode) return node.label;
        return revealedNodes.has(node.id) ? node.label : '???';
    };

    const getDisplayValue = (node, key, value) => {
        if (!isExamMode) return value;
        const valueId = `${node.id}-${key}`;
        return revealedValues.has(valueId) ? value : <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded cursor-pointer hover:bg-yellow-500/40" onClick={(e) => { e.stopPropagation(); handleValueReveal(key); }}>?</span>;
    };

    return (
        <div className="flex h-full w-full bg-slate-950 text-white overflow-hidden">

            {/* Main Diagram Area */}
            <div className="flex-1 relative p-6 overflow-hidden flex flex-col">

                {/* Header with Sub-Tabs */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className={`text-xl font-bold ${theme.accent} flex items-center gap-2`}>
                                <Layers size={24} />
                                NFTC 2024 통합 해설서 기반 계통도
                            </h2>
                            <p className="text-slate-500 text-xs mt-1">화재안전기술기준 · 기술해설 · 국외기준 비교</p>
                        </div>

                        {/* Exam Mode Toggle */}
                        <button
                            onClick={() => {
                                setIsExamMode(!isExamMode);
                                setRevealedNodes(new Set());
                                setRevealedValues(new Set());
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border
                                ${isExamMode
                                    ? `${theme.bg} text-white ${theme.border} shadow-lg ${theme.glow}`
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                        >
                            {isExamMode ? <EyeOff size={16} /> : <Eye size={16} />}
                            {isExamMode ? '시험모드 ON' : '학습모드'}
                        </button>
                    </div>

                    {/* Sub Tabs: 공통 / 개별 설비 */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('common')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'common' ? theme.tabActive : theme.tabInactive}`}
                        >
                            📐 공통 기술기준
                        </button>
                        <button
                            onClick={() => setActiveTab('specific')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'specific' ? theme.tabActive : theme.tabInactive}`}
                        >
                            🔧 개별 설비기준
                        </button>

                        {activeTab === 'specific' && (
                            <div className="ml-4 flex items-center gap-2">
                                <span className="text-xs text-slate-500">설비 선택:</span>
                                <select
                                    value={selectedEquipment}
                                    onChange={(e) => setSelectedEquipment(e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Object.keys(EQUIPMENT_SPECIFIC).map(eq => (
                                        <option key={eq} value={eq}>{eq} ({EQUIPMENT_SPECIFIC[eq].code})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Diagram Canvas */}
                <div className="flex-1 relative bg-slate-900/50 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">

                    {/* Section Labels */}
                    <div className="absolute top-4 left-4 text-xs font-mono text-slate-600 bg-slate-900/80 px-3 py-1 rounded border border-slate-800">
                        {activeTab === 'common' ? '공통 계통 (수원 → 펌프 → 배관 → 밸브)' : `${selectedEquipment} 계통 + 개별 구성요소`}
                    </div>

                    {/* SVG Flow Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
                                <stop offset="50%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
                            </linearGradient>
                        </defs>

                        {/* Common horizontal line */}
                        <line x1="15%" y1="30%" x2="90%" y2="30%" stroke="url(#flowGrad)" strokeWidth="4" strokeDasharray="10 5" className="animate-pulse" />

                        {/* Vertical line to specific nodes if in specific tab */}
                        {activeTab === 'specific' && specificNodes.length > 0 && (
                            <>
                                <line x1="60%" y1="35%" x2="60%" y2="65%" stroke="url(#flowGrad)" strokeWidth="3" strokeDasharray="8 4" className="animate-pulse" />
                                <line x1="50%" y1="70%" x2="90%" y2="70%" stroke="url(#flowGrad)" strokeWidth="3" strokeDasharray="8 4" className="animate-pulse" />
                            </>
                        )}
                    </svg>

                    {/* Node Buttons */}
                    {allNodes.map((node) => {
                        const Icon = node.icon;
                        const isSelected = selectedNode?.id === node.id;
                        const isRevealed = revealedNodes.has(node.id);
                        const isSpecific = specificNodes.some(n => n.id === node.id);

                        return (
                            <button
                                key={node.id}
                                onClick={() => handleNodeClick(node)}
                                style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                                className={`absolute z-10 flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 min-w-[90px] group
                                    ${isSelected ? theme.nodeActiveBg : theme.nodeBg}
                                    ${isSpecific ? 'border-emerald-500/50' : theme.border} border-opacity-50 hover:border-opacity-100
                                    shadow-xl hover:shadow-2xl ${theme.glow}`}
                            >
                                {isSpecific && <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">+</div>}
                                <div className={`p-2 rounded-full mb-1 transition-colors ${isSelected ? theme.bg : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                    <Icon size={20} className={isSelected ? 'text-white' : theme.accent} />
                                </div>
                                <span className={`text-[10px] font-bold text-center whitespace-nowrap transition-all
                                    ${isExamMode && !isRevealed ? 'text-slate-500 italic' : 'text-white'}`}>
                                    {getNodeLabel(node)}
                                </span>
                            </button>
                        );
                    })}

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-4 text-[10px] text-slate-500 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-1">
                            <div className={`w-6 h-1 ${theme.line} rounded animate-pulse`}></div>
                            <span>배관 흐름</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded ${theme.nodeBg} ${theme.border} border`}></div>
                            <span>공통 요소</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-500"></div>
                            <span>개별 설비</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================== Side Panel ==================== */}
            <div className={`w-[420px] bg-slate-900 border-l ${theme.border} border-opacity-30 p-5 flex flex-col shadow-2xl overflow-y-auto`}>

                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                    <BookOpen className={theme.accent} size={18} />
                    <h3 className="font-bold text-base text-white">NFTC 2024 기술해설</h3>
                </div>

                {selectedNode ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300 space-y-4 overflow-y-auto">

                        {/* Node Header */}
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${theme.nodeBg} ${theme.border} border`}>
                            <selectedNode.icon className={theme.accent} size={24} />
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-base">{selectedNode.label}</h4>
                                <p className="text-[10px] text-slate-500">{selectedNode.nftc?.article}</p>
                            </div>
                        </div>

                        {/* Key Values */}
                        {selectedNode.values && (
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(selectedNode.values).map(([key, val]) => (
                                    <div key={key} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                                        <p className="text-[9px] text-slate-500 uppercase mb-1">{key}</p>
                                        <p className="text-xs font-bold text-white">{getDisplayValue(selectedNode, key, val)}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ① 설치 목적 및 기준 */}
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-blue-400 font-bold mb-2">
                                <Target size={14} /> 설치 목적 및 기준 (NFTC 본문)
                            </div>
                            <p className="text-xs text-slate-400 mb-2 italic">{selectedNode.nftc?.purpose}</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.nftc?.standard}</p>
                        </div>

                        {/* ② 기술적 해설 */}
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-2">
                                <Lightbulb size={14} /> 기술적 해설 (해설서 핵심)
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.nftc?.commentary}</p>
                        </div>

                        {/* ③ 국외 기준 비교 */}
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-2">
                                <Globe size={14} /> 국외 기준 비교 (NFPA 등)
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.nftc?.nfpa}</p>
                        </div>

                        {/* 기술사 코멘트 */}
                        {selectedNode.tips && (
                            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-2">
                                    <AlertTriangle size={14} /> 기술사 TIP: 시험 출제 포인트
                                </div>
                                <ul className="space-y-1">
                                    {selectedNode.tips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-amber-200/80">
                                            <CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Action */}
                        <button
                            onClick={() => setMode && setMode('workbook')}
                            className={`mt-auto w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all ${theme.bg} hover:opacity-90 shadow-lg`}
                        >
                            <span>관련 문제 풀기</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                        <div className={`p-5 rounded-full bg-slate-800/50 mb-4 border border-slate-700`}>
                            <Info size={36} className="opacity-30" />
                        </div>
                        <p className="text-sm">좌측 계통도에서<br />구성요소를 선택하세요.</p>
                        <p className="text-[10px] mt-2 text-slate-600">NFTC 기준 및 해설이 표시됩니다.</p>
                    </div>
                )}

                {/* Exam Mode Stats */}
                {isExamMode && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">암기 확인 진행률:</span>
                            <span className={`font-bold ${theme.accent}`}>{revealedNodes.size + revealedValues.size} 항목</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div
                                className={`h-full ${theme.bg} transition-all duration-500`}
                                style={{ width: `${Math.min(100, ((revealedNodes.size + revealedValues.size) / (allNodes.length * 3)) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
