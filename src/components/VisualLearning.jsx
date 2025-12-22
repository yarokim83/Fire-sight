import React, { useState, useEffect } from 'react';
import {
    Droplets, Zap, Box, CircleDot, ArrowRight, ChevronRight,
    Settings, Gauge, Waves, Power, Bell, Radio, Cpu, Eye, EyeOff,
    Info, BookOpen, CheckCircle2, AlertTriangle, Globe, Lightbulb,
    Layers, Target, Ruler, ArrowUpDown, Flame, Volume2, Siren
} from 'lucide-react';

// =====================================================================
// DATA: 기계분야 (수계 소화설비)
// =====================================================================
const MECHANICAL_COMMON_NODES = [
    {
        id: 'water-source', label: '수원', icon: Waves, x: 10, y: 30,
        values: { capacity: '유효수량 산정' },
        nftc: { article: 'NFTC 공통 제4조', purpose: '소화설비가 일정 시간 동안 계속하여 방수할 수 있도록 충분한 양의 물을 확보하기 위함.', standard: '수조의 유효수량은 소화설비별로 정해진 기준에 따라 산정하며, 다른 설비와 겸용할 경우 각각의 유효수량을 합한 양 이상으로 한다.', commentary: '해설서에 따르면 유효수량 산정 시 소화펌프 흡입측 배관 직경의 2배 이상 수위를 확보해야 효율적인 흡입이 가능하다.', nfpa: 'NFPA 20에서는 수원의 신뢰성을 강조하며, 공공수도 사용 시 최소 압력 및 유량을 보장받아야 한다.' },
        tips: ['와류 방지를 위한 수면 깊이 확보', '겸용 시 유효수량 합산 필수']
    },
    {
        id: 'pump-unit', label: '가압송수장치', icon: Settings, x: 35, y: 30,
        values: { pressure: '0.17MPa 이상', flow: '130L/min × N' },
        nftc: { article: 'NFTC 공통 제5조', purpose: '수원의 물을 소화설비의 설계압력 및 설계유량으로 가압하여 송수하기 위함.', standard: '펌프의 성능은 체절운전 시 정격토출압력의 140%를 초과하지 않고, 정격토출량의 150%로 운전 시 정격토출압력의 65% 이상이어야 한다.', commentary: '성능시험배관은 펌프 토출측에서 분기하여 유량계, 개폐밸브를 거쳐 수조로 환수되도록 구성한다.', nfpa: 'NFPA 20은 펌프의 작동 신뢰성과 비상전원 확보를 매우 중시한다.' },
        tips: ['성능시험배관 필수 설치', '체절압력 140% 이하 확인']
    },
    {
        id: 'piping', label: '배관', icon: ArrowUpDown, x: 60, y: 30,
        values: { velocity: '6m/s 이하', material: 'KS D 3507' },
        nftc: { article: 'NFTC 공통 제6조', purpose: '가압된 소화수를 방수구 또는 헤드까지 안정적으로 공급하기 위함.', standard: '배관 내 유속은 주배관 6m/s 이하, 가지배관 10m/s 이하로 한다.', commentary: '해설서는 배관의 마찰손실 계산(Hazen-Williams 공식) 및 배관 지지대 간격을 상세히 다룬다.', nfpa: 'NFPA 13은 배관 스케줄(Schedule) 방식과 수리계산 방식을 모두 허용한다.' },
        tips: ['마찰손실 계산 철저', '지진 대비 신축이음 설치']
    },
    {
        id: 'control-valve', label: '제어밸브', icon: Gauge, x: 85, y: 30,
        values: { type: '개폐표시형', location: '바닥 0.8~1.5m' },
        nftc: { article: 'NFTC 공통 제7조', purpose: '배관 내 압력 및 유량을 제어하고, 점검 및 유지보수 시 구역별 차단을 가능하게 하기 위함.', standard: '제어밸브는 개폐여부를 확인할 수 있는 개폐표시형으로 하고, 바닥으로부터 0.8m 이상 1.5m 이하에 설치한다.', commentary: '해설서에서는 OS&Y 밸브와 버터플라이 밸브의 적용 차이를 설명한다.', nfpa: 'NFPA는 모든 제어밸브에 전기적 감시(Supervisory) 기능을 요구한다.' },
        tips: ['개폐표시형 의무', '탬퍼스위치 연동 권장']
    },
];

const MECHANICAL_SPECIFIC = {
    '옥내소화전': {
        code: 'NFTC 102', nodes: [
            {
                id: 'hydrant-box', label: '소화전함', icon: Box, x: 50, y: 70,
                values: { height: '1.5m 이하', hose: '40mm × 15m' },
                nftc: { article: 'NFTC 102 제7조', purpose: '화재 초기 재실자가 직접 소화활동을 할 수 있도록 소화전 및 호스를 수납하기 위함.', standard: '옥내소화전함은 바닥으로부터 1.5m 이하에 설치하고, 호스는 구경 40mm 이상, 길이 15m 이상을 비치한다.', commentary: '소화전함 상부에 표시등을 설치해야 하며, 방수압력은 0.17MPa~0.7MPa 범위를 유지해야 한다.', nfpa: 'NFPA 14는 Class I, II, III 시스템을 구분한다.' },
                tips: ['표시등 설치 필수', '방수압력 0.17~0.7MPa']
            }]
    },
    '스프링클러': {
        code: 'NFTC 103', nodes: [
            {
                id: 'sprinkler-head', label: '스프링클러헤드', icon: Target, x: 50, y: 70,
                values: { spacing: '2.1~2.3m', rth: 'RTI 50 이하' },
                nftc: { article: 'NFTC 103 제10조', purpose: '화재 시 열에 의해 자동으로 개방되어 물을 살수함으로써 화재를 진압하기 위함.', standard: '헤드 간 수평거리는 헤드 특성에 따라 2.1m ~ 2.3m 범위로 한다.', commentary: '해설서는 헤드 종류별 설치 기준을 상세히 다룬다. 특히 RTI와 K-Factor가 중요하다.', nfpa: 'NFPA 13은 위험도 분류에 따른 설계밀도 및 헤드 배치를 규정한다.' },
                tips: ['RTI/K-Factor 확인', '장애물 회피 배치']
            }]
    }
};

// =====================================================================
// DATA: 전기분야 (경보/피난설비)
// =====================================================================
const ELECTRICAL_COMMON_NODES = [
    {
        id: 'power-source', label: '전원', icon: Zap, x: 10, y: 30,
        values: { voltage: 'AC 220V', backup: '비상전원' },
        nftc: { article: 'NFTC 203 제5조', purpose: '자동화재탐지설비가 정상적으로 작동할 수 있도록 안정적인 전원을 공급하기 위함.', standard: '상용전원이 정전된 경우에도 자동으로 비상전원으로 전환되어 10분 이상 감시상태를 유지하고, 10분 이상 경보를 발할 수 있어야 한다.', commentary: '비상전원은 축전지 또는 자가발전설비로 하며, 축전지의 용량은 감시상태 60시간 + 경보 10분 이상을 유지할 수 있어야 한다.', nfpa: 'NFPA 72는 비상전원으로서 2차 전원(Secondary Power)의 요구사항을 상세히 규정한다.' },
        tips: ['비상전원 용량 확인', '자동 절환 스위치 필수']
    },
    {
        id: 'receiver', label: '수신기', icon: Cpu, x: 35, y: 30,
        values: { type: 'P형/R형', location: '관리실' },
        nftc: { article: 'NFTC 203 제4조', purpose: '감지기·발신기 또는 중계기에서 발하는 신호를 직접 수신하여 화재의 발생을 관계인에게 경보해 주기 위함.', standard: 'P형 수신기는 5회선 이하의 소규모 건물에, R형 수신기는 대규모 건물에 적합하다. 조작스위치는 바닥으로부터 0.8m~1.5m에 위치해야 한다.', commentary: '수신기는 화재 표시, 지구 표시, 회선 이상 표시 등의 기능을 갖추어야 한다. P형과 R형의 가장 큰 차이는 공통선 사용 여부이다.', nfpa: 'NFPA 72는 수신기(FACP: Fire Alarm Control Panel)의 지역 경보와 원격 경보 기능을 상세히 규정한다.' },
        tips: ['P형 vs R형 선택 기준', '표시창 확인 용이성']
    },
    {
        id: 'wiring', label: '배선', icon: ArrowUpDown, x: 60, y: 30,
        values: { type: '내화/내열', resistance: '50Ω 이하' },
        nftc: { article: 'NFTC 203 제10조', purpose: '감지기와 수신기 간의 신호를 안정적으로 전송하기 위함.', standard: '감지기 회로의 배선은 송배전식일 것. 감지기 회로의 도통시험을 할 수 있도록 회선 끝에 종단저항을 설치해야 한다.', commentary: '저항값은 설계에 따라 다르지만, 일반적으로 10kΩ이다. 배선의 절연저항은 1MΩ 이상이어야 한다.', nfpa: 'NFPA 72는 Class A(Loop), Class B(단선), Class X(병렬) 등 배선 방식을 구분한다.' },
        tips: ['내화배선 적용 구역 확인', '종단저항 위치 확인']
    },
    {
        id: 'alarm-device', label: '경보장치', icon: Volume2, x: 85, y: 30,
        values: { distance: '수평 25m 이하', volume: '90dB 이상' },
        nftc: { article: 'NFTC 203 제11조', purpose: '화재 발생 시 재실자에게 청각적으로 경보를 알려 대피를 유도하기 위함.', standard: '지구음향장치는 수평거리 25m 이하가 되도록 설치해야 한다. 음량은 부착된 음향장치의 중심으로부터 1m 떨어진 위치에서 90dB 이상이어야 한다.', commentary: '경종과 사이렌 중 선택할 수 있으며, 특정 구역에는 시각경보장치(스트로브)를 병행 설치해야 한다.', nfpa: 'NFPA 72는 음향/시각 경보장치의 설치 높이, 점멸 주기 등을 별도로 규정한다.' },
        tips: ['수평거리 25m 확인', '시각경보장치 병행']
    },
];

const ELECTRICAL_SPECIFIC = {
    '자동화재탐지설비': {
        code: 'NFTC 203', nodes: [
            {
                id: 'smoke-detector', label: '연기감지기', icon: Radio, x: 30, y: 70,
                values: { height: '20m 미만', type: '1종/2종/3종' },
                nftc: { article: 'NFTC 203 제7조', purpose: '연기를 감지하여 화재 초기에 신속히 경보를 발하기 위함.', standard: '연기감지기는 바닥면적 150㎡(특정소방대상물) 또는 50㎡(복도/통로)마다 1개 이상 설치해야 한다.', commentary: '감지기 부착높이에 따라 1종(4m 미만), 2종(4~20m), 3종(20m 이상)으로 구분된다. 이온화식과 광전식이 있다.', nfpa: 'NFPA 72는 감지기 간격(spacing)을 30ft 이하로 규정하며, 빔 디텍터 등 특수 감지기도 다룬다.' },
                tips: ['부착높이별 종별 선택', '환기구 근처 설치 금지']
            },
            {
                id: 'heat-detector', label: '정온식감지기', icon: Flame, x: 60, y: 70,
                values: { temp: '특종60℃/1종75℃', area: '50~70㎡' },
                nftc: { article: 'NFTC 203 제7조', purpose: '주위온도가 일정온도 이상이 되는 경우 화재를 감지하기 위함.', standard: '정온식감지기는 특종(60℃), 1종(75℃), 2종(90℃)로 구분되며, 주방 등 고온 환경에 적합하다.', commentary: '차동식감지기와 달리 급격한 온도변화가 아닌 절대온도에 반응한다. 보일러실, 주방 등에 주로 사용된다.', nfpa: 'NFPA 72는 정온식(Fixed Temperature)과 차동식(Rate-of-Rise)의 특성을 비교하여 적용 환경을 안내한다.' },
                tips: ['고온 환경에 적합', '주방은 정온식 사용']
            }]
    },
    '비상방송설비': {
        code: 'NFTC 202', nodes: [
            {
                id: 'amplifier', label: '증폭기', icon: Siren, x: 50, y: 70,
                values: { output: '10W 이상', backup: '비상전원' },
                nftc: { article: 'NFTC 202 제5조', purpose: '화재 시 음성으로 피난 안내를 하기 위한 증폭설비.', standard: '증폭기의 출력은 스피커 합계 출력의 1.5배 이상이어야 한다. 비상전원으로 20분 이상 작동 가능해야 한다.', commentary: '비상방송설비는 자동화재탐지설비와 연동하여 화재 신호 수신 시 자동으로 방송이 시작되어야 한다.', nfpa: 'NFPA 72는 음성경보(Voice Alarm)의 명료성(Intelligibility)을 중시하며, 0.5 이상의 STI를 권장한다.' },
                tips: ['자탐설비 연동 필수', '스피커 합계 출력 1.5배']
            }]
    }
};

// =====================================================================
// COMPONENT
// =====================================================================
export default function VisualLearning({ isExamMode, setIsExamMode, setMode, subject }) {
    const [activeTab, setActiveTab] = useState('common');
    const [selectedEquipment, setSelectedEquipment] = useState('');
    const [selectedNode, setSelectedNode] = useState(null);
    const [revealedNodes, setRevealedNodes] = useState(new Set());
    const [revealedValues, setRevealedValues] = useState(new Set());

    // Determine data based on subject
    const isMechanical = subject === 'mechanical';
    const commonNodes = isMechanical ? MECHANICAL_COMMON_NODES : ELECTRICAL_COMMON_NODES;
    const specificEquipments = isMechanical ? MECHANICAL_SPECIFIC : ELECTRICAL_SPECIFIC;
    const equipmentList = Object.keys(specificEquipments);

    // Set default equipment when subject changes
    useEffect(() => {
        setSelectedEquipment(equipmentList[0] || '');
        setActiveTab('common');
        setSelectedNode(null);
        setRevealedNodes(new Set());
        setRevealedValues(new Set());
    }, [subject]);

    // Reset revealed state when Exam Mode is toggled
    useEffect(() => {
        setRevealedNodes(new Set());
        setRevealedValues(new Set());
    }, [isExamMode, subject]);

    const specificData = specificEquipments[selectedEquipment];
    const specificNodes = specificData?.nodes || [];
    const allNodes = activeTab === 'common' ? commonNodes : [...commonNodes, ...specificNodes];

    // Theme
    const theme = isMechanical
        ? { accent: 'text-blue-400', bg: 'bg-blue-600', border: 'border-blue-500', glow: 'shadow-blue-500/30', line: 'bg-blue-500', nodeBg: 'bg-blue-900/50 hover:bg-blue-800/70', nodeActiveBg: 'bg-blue-700 ring-2 ring-blue-400', tabActive: 'bg-blue-600 text-white', tabInactive: 'bg-slate-800 text-slate-400 hover:bg-slate-700', icon: Droplets }
        : { accent: 'text-orange-400', bg: 'bg-orange-600', border: 'border-orange-500', glow: 'shadow-orange-500/30', line: 'bg-orange-500', nodeBg: 'bg-orange-900/50 hover:bg-orange-800/70', nodeActiveBg: 'bg-orange-700 ring-2 ring-orange-400', tabActive: 'bg-orange-600 text-white', tabInactive: 'bg-slate-800 text-slate-400 hover:bg-slate-700', icon: Zap };

    const handleNodeClick = (node) => {
        setSelectedNode(node);
        if (isExamMode) setRevealedNodes(prev => new Set(prev).add(node.id));
    };

    const handleValueReveal = (valueKey) => {
        if (isExamMode) setRevealedValues(prev => new Set(prev).add(`${selectedNode?.id}-${valueKey}`));
    };

    const getNodeLabel = (node) => !isExamMode ? node.label : (revealedNodes.has(node.id) ? node.label : '???');
    const getDisplayValue = (node, key, value) => {
        if (!isExamMode) return value;
        const valueId = `${node.id}-${key}`;
        return revealedValues.has(valueId) ? value : <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded cursor-pointer hover:bg-yellow-500/40" onClick={(e) => { e.stopPropagation(); handleValueReveal(key); }}>?</span>;
    };

    return (
        <div className="flex h-full w-full bg-slate-950 text-white overflow-hidden">
            {/* Main Diagram Area */}
            <div className="flex-1 relative p-6 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className={`text-xl font-bold ${theme.accent} flex items-center gap-2`}>
                                <theme.icon size={24} />
                                {isMechanical ? '수계 소화설비 계통도' : '경보·피난설비 계통도'}
                            </h2>
                            <p className="text-slate-500 text-xs mt-1">NFTC 2024 통합 해설서 기반</p>
                        </div>
                    </div>
                    {/* Sub Tabs */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setActiveTab('common')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'common' ? theme.tabActive : theme.tabInactive}`}>
                            📐 공통 기술기준
                        </button>
                        <button onClick={() => setActiveTab('specific')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'specific' ? theme.tabActive : theme.tabInactive}`}>
                            🔧 개별 설비기준
                        </button>
                        {activeTab === 'specific' && (
                            <div className="ml-4 flex items-center gap-2">
                                <span className="text-xs text-slate-500">설비 선택:</span>
                                <select value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)}
                                    className={`bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 ${theme.accent}`}>
                                    {equipmentList.map(eq => (<option key={eq} value={eq}>{eq} ({specificEquipments[eq].code})</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Diagram Canvas */}
                <div className="flex-1 relative bg-slate-900/50 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                    <div className="absolute top-4 left-4 text-xs font-mono text-slate-600 bg-slate-900/80 px-3 py-1 rounded border border-slate-800">
                        {activeTab === 'common' ? '공통 계통' : `${selectedEquipment} 계통 + 개별 구성요소`}
                    </div>
                    {/* SVG Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" style={{ stopColor: isMechanical ? '#3b82f6' : '#ea580c', stopOpacity: 0.2 }} />
                                <stop offset="50%" style={{ stopColor: isMechanical ? '#60a5fa' : '#fb923c', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: isMechanical ? '#3b82f6' : '#ea580c', stopOpacity: 0.2 }} />
                            </linearGradient>
                        </defs>
                        <line x1="15%" y1="30%" x2="90%" y2="30%" stroke="url(#flowGrad)" strokeWidth="4" strokeDasharray="10 5" className="animate-pulse" />
                        {activeTab === 'specific' && specificNodes.length > 0 && (
                            <>
                                <line x1="50%" y1="35%" x2="50%" y2="65%" stroke="url(#flowGrad)" strokeWidth="3" strokeDasharray="8 4" className="animate-pulse" />
                                <line x1="25%" y1="70%" x2="75%" y2="70%" stroke="url(#flowGrad)" strokeWidth="3" strokeDasharray="8 4" className="animate-pulse" />
                            </>
                        )}
                    </svg>
                    {/* Nodes */}
                    {allNodes.map((node) => {
                        const Icon = node.icon;
                        const isSelected = selectedNode?.id === node.id;
                        const isRevealed = revealedNodes.has(node.id);
                        const isSpecific = specificNodes.some(n => n.id === node.id);
                        return (
                            <button key={node.id} onClick={() => handleNodeClick(node)}
                                style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                                className={`absolute z-10 flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 min-w-[90px] group
                                    ${isSelected ? theme.nodeActiveBg : theme.nodeBg}
                                    ${isSpecific ? 'border-emerald-500/50' : theme.border} border-opacity-50 hover:border-opacity-100 shadow-xl hover:shadow-2xl ${theme.glow}`}>
                                {isSpecific && <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">+</div>}
                                <div className={`p-2 rounded-full mb-1 transition-colors ${isSelected ? theme.bg : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                                    <Icon size={20} className={isSelected ? 'text-white' : theme.accent} />
                                </div>
                                <span className={`text-[10px] font-bold text-center whitespace-nowrap ${isExamMode && !isRevealed ? 'text-slate-500 italic' : 'text-white'}`}>{getNodeLabel(node)}</span>
                            </button>
                        );
                    })}
                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-4 text-[10px] text-slate-500 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                        <div className="flex items-center gap-1"><div className={`w-6 h-1 ${theme.line} rounded animate-pulse`}></div><span>{isMechanical ? '배관 흐름' : '신호 흐름'}</span></div>
                        <div className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${theme.nodeBg} ${theme.border} border`}></div><span>공통 요소</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-500"></div><span>개별 설비</span></div>
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <div className={`w-[400px] bg-slate-900 border-l ${theme.border} border-opacity-30 p-5 flex flex-col shadow-2xl overflow-y-auto`}>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                    <BookOpen className={theme.accent} size={18} />
                    <h3 className="font-bold text-base text-white">NFTC 2024 기술해설</h3>
                </div>
                {selectedNode ? (
                    <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300 space-y-4 overflow-y-auto">
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${theme.nodeBg} ${theme.border} border`}>
                            <selectedNode.icon className={theme.accent} size={24} />
                            <div className="flex-1"><h4 className="font-bold text-white text-base">{selectedNode.label}</h4><p className="text-[10px] text-slate-500">{selectedNode.nftc?.article}</p></div>
                        </div>
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
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 text-xs font-bold mb-2" style={{ color: isMechanical ? '#60a5fa' : '#fb923c' }}><Target size={14} /> 설치 목적 및 기준</div>
                            <p className="text-xs text-slate-400 mb-2 italic">{selectedNode.nftc?.purpose}</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.nftc?.standard}</p>
                        </div>
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-2"><Lightbulb size={14} /> 기술적 해설</div>
                            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.nftc?.commentary}</p>
                        </div>
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-2"><Globe size={14} /> 국외 기준 비교 (NFPA)</div>
                            <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.nftc?.nfpa}</p>
                        </div>
                        {selectedNode.tips && (
                            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
                                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-2"><AlertTriangle size={14} /> 기술사 TIP</div>
                                <ul className="space-y-1">{selectedNode.tips.map((tip, i) => (<li key={i} className="flex items-start gap-2 text-xs text-amber-200/80"><CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {tip}</li>))}</ul>
                            </div>
                        )}
                        <button onClick={() => setMode && setMode('workbook')} className={`mt-auto w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all ${theme.bg} hover:opacity-90 shadow-lg`}>
                            <span>관련 문제 풀기</span><ChevronRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                        <div className="p-5 rounded-full bg-slate-800/50 mb-4 border border-slate-700"><Info size={36} className="opacity-30" /></div>
                        <p className="text-sm">좌측 계통도에서<br />구성요소를 선택하세요.</p>
                    </div>
                )}
                {isExamMode && (
                    <div className="mt-4 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[10px]"><span className="text-slate-500">암기 진행률:</span><span className={`font-bold ${theme.accent}`}>{revealedNodes.size + revealedValues.size} 항목</span></div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden"><div className={`h-full ${theme.bg} transition-all duration-500`} style={{ width: `${Math.min(100, ((revealedNodes.size + revealedValues.size) / (allNodes.length * 3)) * 100)}%` }} /></div>
                    </div>
                )}
            </div>
        </div>
    );
}
