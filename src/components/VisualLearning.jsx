import React, { useState, useEffect } from 'react';
import {
    Droplets, Zap, Box, CircleDot, ArrowRight, ArrowLeft, ChevronRight,
    Settings, Gauge, Waves, Power, Bell, Radio, Cpu, Eye, EyeOff,
    Info, BookOpen, CheckCircle2, AlertTriangle, Globe, Lightbulb,
    Layers, Target, Ruler, ArrowUpDown, Flame, Volume2, Siren,
    Grid, Wind, Activity, Image as ImageIcon, LayoutGrid, Trash2
} from 'lucide-react';
import VisualDetail from './VisualDetail';
import { sprinklerVisualData } from '../data/sprinklerData';

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
// TOPIC MENU DATA
// =====================================================================
const TOPICS = [
    {
        id: 'water',
        label: '수계 소화설비',
        labelEn: 'Water Based Systems',
        desc: '스프링클러, 옥내소화전 등 물을 이용한 소화설비의 계통과 원리를 학습합니다.',
        count: 12, // Dummy count
        icon: Droplets,
        color: 'blue',
        progress: 75,
        targetSubject: 'mechanical'
    },
    {
        id: 'gas',
        label: '가스/제연 설비',
        labelEn: 'Gas & Smoke Control',
        desc: '이산화탄소, 할론 소화설비 및 거실/부속실 제연설비의 작동 흐름을 이해합니다.',
        count: 8,
        icon: Wind,
        color: 'slate',
        progress: 30, // Mock Progress
        targetSubject: 'mechanical' // For now mapped to mechanical context
    },
    {
        id: 'alarm',
        label: '경보/전기 설비',
        labelEn: 'Alarm & Electrical',
        desc: '자동화재탐지설비, 비상방송, 유도등 등 전기적 신호 전달 체계를 분석합니다.',
        count: 15,
        icon: Bell,
        color: 'amber',
        progress: 60,
        targetSubject: 'electrical'
    },
    {
        id: 'basic',
        label: '기계/전기 기초',
        labelEn: 'Basic Engineering',
        desc: '유체역학 기초, 전압강하 계산, 시퀀스 회로 등 소방 엔지니어링의 기초를 다집니다.',
        count: 5,
        icon: Activity, // Updated to Activity as Ruler substitute
        color: 'emerald', // Green
        progress: 15,
        targetSubject: 'mechanical' // General
    }
];

// =====================================================================
// COMPONENT
// =====================================================================
export default function VisualLearning({ isExamMode, setIsExamMode, setMode, subject: initialSubject }) {
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'list', 'canvas'
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedDiagram, setSelectedDiagram] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [customData, setCustomData] = useState([]);

    const [deletedDefaultIds, setDeletedDefaultIds] = useState([]);

    useEffect(() => {
        try {
            const savedCustom = localStorage.getItem('fireSight_customData');
            if (savedCustom) {
                const parsed = JSON.parse(savedCustom);
                const visuals = Array.isArray(parsed) ? parsed.filter(item => item?.type === 'visual') : [];
                setCustomData(visuals);
            }
        } catch (error) {
            console.error("Failed to parse custom visual data:", error);
            localStorage.removeItem('fireSight_customData'); // 데이터 오염 감지 시 초기화
            setCustomData([]);
        }

        try {
            const savedDeleted = JSON.parse(localStorage.getItem('fireSight_deletedDefault') || '[]');
            setDeletedDefaultIds(Array.isArray(savedDeleted) ? savedDeleted : []);
        } catch (error) {
            console.error("Failed to parse deleted default IDs:", error);
            localStorage.removeItem('fireSight_deletedDefault');
            setDeletedDefaultIds([]);
        }
    }, []);

    // Merge built-in and custom data, then filter out soft-deleted default items
    const allVisualData = [...sprinklerVisualData, ...customData].filter(item => !deletedDefaultIds.includes(item.id));

    // define derived lists
    const MECHANICAL_TOPICS = TOPICS.filter(t => t.targetSubject === 'mechanical');
    const ELECTRICAL_TOPICS = TOPICS.filter(t => t.targetSubject === 'electrical');

    // Filter topics based on subject prop or fallback
    const activeTopics = initialSubject === 'electrical' ? ELECTRICAL_TOPICS : MECHANICAL_TOPICS;

    const handleTopicClick = (topic) => {
        // Filter data for this topic
        const topicItems = allVisualData.filter(item => item.category === topic.id);

        if (topicItems.length > 0) {
            setSelectedTopic(topic);
            setViewMode('list');
            // Simplified theme set
            const isMech = topic.targetSubject === 'mechanical';
            setSelectedTheme({
                color: isMech ? 'blue' : 'orange',
                icon: topic.icon
            });
        } else {
            alert("🚧 데이터 준비 중입니다 (Upload via Smart Upload!)");
        }
    };

    const handleDiagramSelect = (diagram) => {
        setSelectedDiagram(diagram);
        setViewMode('canvas');
    };

    const handleBackToDashboard = () => {
        setViewMode('dashboard');
        setSelectedTopic(null);
        setSelectedDiagram(null);
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedDiagram(null);
    };

    const handleDeleteItem = (e, item) => {
        e.stopPropagation(); // prevent card click

        if (window.confirm("이 학습 자료를 정말 삭제하시겠습니까? (삭제 후 복구 불가)")) {
            try {
                if (item.isCustom) {
                    // Custom Data: Hard Delete
                    const saved = JSON.parse(localStorage.getItem('fireSight_customData') || '[]');
                    const updated = Array.isArray(saved) ? saved.filter(d => d.id !== item.id) : [];
                    localStorage.setItem('fireSight_customData', JSON.stringify(updated));
                    setCustomData(prev => prev.filter(d => d.id !== item.id));
                } else {
                    // Default Data: Soft Delete
                    const savedDeleted = JSON.parse(localStorage.getItem('fireSight_deletedDefault') || '[]');
                    const updated = Array.isArray(savedDeleted) ? [...savedDeleted, item.id] : [item.id];
                    localStorage.setItem('fireSight_deletedDefault', JSON.stringify(updated));
                    setDeletedDefaultIds(updated);
                }
            } catch (error) {
                console.error("삭제 동기화 중 에러 발생:", error);
                alert("데이터 삭제 중 오류가 발생했습니다. 저장소를 초기화합니다.");
                localStorage.removeItem('fireSight_customData');
                localStorage.removeItem('fireSight_deletedDefault');
                window.location.reload();
            }
        }
    };

    // RENDER: DASHBOARD
    if (viewMode === 'dashboard') {
        return (
            <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto w-full animate-in fade-in duration-500">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <LayoutGrid className="text-blue-500" /> 설비별 도면 학습
                    </h2>
                    <p className="text-slate-400">학습할 설비 분류를 선택하세요.</p>
                </div>
                {/* Topic Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeTopics.map(topic => (
                        <button key={topic.id} onClick={() => handleTopicClick(topic)}
                            className={`group relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl text-left
                            ${topic.subject === 'mechanical' ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50' : 'bg-slate-900 border-slate-800 hover:border-orange-500/50'}`}>

                            {/* Icon & Title */}
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${topic.subject === 'mechanical' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                    <topic.icon size={28} />
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${topic.subject === 'mechanical' ? 'text-blue-500 border-blue-500/20 bg-blue-500/10' : 'text-orange-500 border-orange-500/20 bg-orange-500/10'}`}>
                                    {topic.subject === 'mechanical' ? '기계분야' : '전기분야'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{topic.label}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{topic.desc}</p>

                            {/* Progress Bar (Mock) */}
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${topic.color.replace('text-', 'bg-')}`} style={{ width: `${Math.random() * 60 + 10}%` }}></div>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 text-right">진도율 {Math.floor(Math.random() * 60 + 10)}%</div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // RENDER: LIST VIEW
    if (viewMode === 'list') {
        const ThemeIcon = selectedTheme?.icon || Droplets;
        const highlightColor = selectedTheme?.color === 'orange' ? 'text-orange-500' : 'text-blue-500';

        return (
            <div className="flex flex-col h-full bg-slate-950 p-6 overflow-y-auto w-full animate-in fade-in duration-300">
                <button onClick={handleBackToDashboard} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 w-fit font-bold text-sm transition-colors">
                    <ArrowLeft size={18} /> 도면 목록으로 돌아가기
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <ThemeIcon className={highlightColor} /> {selectedTopic?.label} 상세 도면
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allVisualData
                        .filter(item => item.category === selectedTopic.id)
                        .map(item => (
                            <button key={item.id} onClick={() => handleDiagramSelect(item)}
                                className="flex flex-col text-left bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg group">
                                {/* Thumbnail Placeholder */}
                                <div className="h-48 bg-slate-800 relative overflow-hidden group-hover:opacity-90 transition-opacity">
                                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                                        {item.isCustom && (
                                            <div className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded shadow-lg border border-emerald-500/50">
                                                🆕 My
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => handleDeleteItem(e, item)}
                                            className={`p-1 bg-slate-900/80 rounded-lg backdrop-blur border border-slate-700 transition-colors shadow-lg ${item.isCustom ? 'text-slate-400 hover:text-red-500 hover:border-red-500/50' : 'text-slate-600 hover:text-red-400'}`}
                                            title="삭제하기"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    {item.imageUrl && !item.imageUrl.includes('placeholder') ? (
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                                            <ImageIcon size={48} />
                                        </div>
                                    )}
                                    {/* Label Badge */}
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                        {item.category.toUpperCase()} SYSTEM
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-4">{item.description}</p>
                                    <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
                                        <span>학습 시작하기</span> <ArrowRight size={14} />
                                    </div>
                                </div>
                            </button>
                        ))}
                </div>
            </div>
        );
    }

    // RENDER: CANVAS VIEW Using VisualDetail
    if (viewMode === 'canvas' && selectedDiagram) {
        return (
            <div className="h-full w-full bg-slate-950">
                <VisualDetail
                    data={selectedDiagram}
                    onBack={handleBackToList}
                />
            </div>
        );
    }

    // Fallback
    return null;
}
// Helper to keep icon consistent
function GalleryIconHelper() {
    return <ImageIcon size={12} />;
}
