import React, { useState, useMemo } from 'react';
import { Info, BookOpen, ClipboardCheck, ArrowRight, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';

const HOTSPOTS = [
    // --- 기계분야 (Mechanical) ---
    {
        id: 1, subject: 'mechanical', x: 50, y: 80, label: "01. 주펌프 (Main PV)",
        desc: "[기술기준] 정격토출량 150% 운전 시 정격압력 65% 이상.",
        examDesc: "1. 펌프 기동/정지 압력 셋팅\n2. 커플링/베어링 상태 및 회전방향\n3. 누수 및 이음 발생 여부",
        defect: "결함 예시: 커플링 볼트 체결 불량 및 베어링 소음 발생"
    },
    {
        id: 2, subject: 'mechanical', x: 58, y: 80, label: "02. 충압펌프 (Jockey PV)",
        desc: "[기술기준] 정격토출압력은 주펌프와 동등 이상일 것.",
        examDesc: "1. 잦은 기동 여부 확인 (누수 의심)\n2. 정지 압력 설정 상태 확인",
        defect: "결함 예시: 잦은 기동(Interval < 1min)으로 인한 과열"
    },
    {
        id: 3, subject: 'mechanical', x: 65, y: 38, label: "03. 성능시험배관",
        desc: "[기술기준] 정격토출량 175% 측정 가능 유량계.",
        examDesc: "1. 유량조절밸브 조작 용이성\n2. 유량계 지시치 흔들림 및 파손 여부",
        defect: "결함 예시: 유량계 수직 설치 위반 (수평 설치 원칙)"
    },
    {
        id: 4, subject: 'mechanical', x: 28, y: 70, label: "04. 릴리프 밸브",
        desc: "[기술기준] 체절압력 미만에서 개방 (수온상승방지).",
        examDesc: "1. 릴리프 밸브 개방 압력 확인\n2. 배수 처리 및 배관 고정 상태",
        defect: "결함 예시: 릴리프 밸브 개방 고착으로 인한 펌프 압력 저하"
    },
    {
        id: 5, subject: 'mechanical', x: 45, y: 65, label: "05. 물올림장치",
        desc: "[기술기준] 유효수량 100L 이상, 급수배관 15mm.",
        examDesc: "1. 감수 경보 장치(저수위) 작동\n2. 볼탭에 의한 자동 급수 여부",
        defect: "결함 예시: 저수위 감지 센서 고장 및 볼탭 작동 불량"
    },
    {
        id: 6, subject: 'mechanical', x: 25, y: 45, label: "06. 기동용수압개폐장치",
        desc: "[기술기준] 용적 100L 이상, 릴리프밸브 설치.",
        examDesc: "1. 공기 교체 및 수위 확인\n2. 압력스위치 Range/Diff 설정 확인",
        defect: "결함 예시: 챔버 내부 공기압 부족으로 인한 펌프 헌팅"
    },
    {
        id: 7, subject: 'mechanical', x: 10, y: 85, label: "07. 수원 (수조)",
        desc: "[기술기준] N × 2.6㎥ (30층↑: N×5.2㎥).\n옥상수조 1/3 이상 확보.",
        examDesc: "1. 수위계 작동 상태\n2. 수조 청소 상태 및 사다리 고정",
        defect: "결함 예시: 수조 내부 이물질 퇴적 및 사다리 부식"
    },
    {
        id: 8, subject: 'mechanical', x: 90, y: 85, label: "08. 송수구",
        desc: "[기술기준] 0.5~1m 높이, 쌍구형, 마개 씌울 것.",
        examDesc: "1. 이물질 막힘 여부\n2. 자동배수밸브 잔류수 배출 확인",
        defect: "결함 예시: 송수구 마개 분실 및 자동배수밸브 고착"
    },
    {
        id: 9, subject: 'mechanical', x: 45, y: 56, label: "09. 배관 (체크/개폐밸브)",
        desc: "[기술기준] 펌프 토출측 체크밸브 및 개폐표시형 밸브.",
        examDesc: "1. 체크밸브 누수 및 스윙 작동\n2. 탬퍼스위치 작동 여부 확인",
        defect: "결함 예시: 스몰렌스키 체크밸브 역류 발생"
    },

    // --- 전기분야 (Electrical) ---
    {
        id: 10, subject: 'electrical', x: 80, y: 15, label: "10. 감시제어반 (수신반)",
        desc: "[기술기준] 상시 사람이 근무하는 장소, 전용회로.",
        examDesc: "1. 펌프 기동/정지 수동 조작\n2. 도통시험 및 각종 표시등 점등 확인",
        defect: "결함 예시: 펌프 기동 표시등 미점등 (전구 단선)"
    },
    {
        id: 11, subject: 'electrical', x: 15, y: 20, label: "11. 동력제어반 (MCC)",
        desc: "[기술기준] 펌프실 인근 설치, 전용실 구획 권장.",
        examDesc: "1. 펌프 기동 표시등(적색) 점등\n2. 비상전원 절환 및 차단기 용량",
        defect: "결함 예시: Y-Δ 기동 시 마그네트 접점 불량"
    },
    {
        id: 12, subject: 'electrical', x: 90, y: 40, label: "12. 옥내소화전함(전기)",
        desc: "[기술기준] 표시등 적색, 상시 점등.",
        examDesc: "1. 위치표시등 점등 상태\n2. 펌프 기동확인표시등 점등 여부",
        defect: "결함 예시: 위치표시등 소등 및 발신기 응답 없음"
    },
    {
        id: 13, subject: 'electrical', x: 25, y: 40, label: "13. 압력스위치(PS)",
        desc: "[기술기준] 수압개폐장치에 설치하여 압력 감지.",
        examDesc: "1. PS 설정값(Range/Diff) 적정성\n2. 접점 동작 시 수신반 신호 이송",
        defect: "결함 예시: 압력스위치 접점 노후로 인한 신호 누락"
    }
];

export default function VisualLearning({ isExamMode, setIsExamMode, setMode, subject }) {
    const [selectedHotspot, setSelectedHotspot] = useState(null);
    const [isDefectMode, setIsDefectMode] = useState(false);

    // Filter Hotspots based on Subject
    const filteredHotspots = useMemo(() => {
        return HOTSPOTS.filter(spot => spot.subject === subject);
    }, [subject]);

    const themeColors = subject === 'mechanical'
        ? { ring: 'ring-blue-500', text: 'text-blue-400', bg: 'bg-blue-600', border: 'border-blue-500' }
        : { ring: 'ring-orange-500', text: 'text-orange-400', bg: 'bg-orange-600', border: 'border-orange-500' };

    return (
        <div className="flex h-full">
            {/* Diagram Section */}
            <div className="flex-1 bg-slate-950/50 relative flex items-center justify-center p-4 overflow-hidden">

                {/* Top Controls: Mode Toggle & Defect Switch */}
                <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                    {/* Exam Mode Toggle */}
                    <div className="flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl select-none">
                        <span className={`text-xs font-bold uppercase ${!isExamMode ? themeColors.text : 'text-slate-600'}`}>기술기준(NFTC)</span>
                        <button
                            onClick={() => setIsExamMode(!isExamMode)}
                            className={`w-14 h-7 rounded-full p-1 transition-all ${isExamMode ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${isExamMode ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                        <span className={`text-xs font-bold uppercase ${isExamMode ? 'text-emerald-400' : 'text-slate-600'}`}>점검실무(2027)</span>
                    </div>

                    {/* Defect Mode Toggle */}
                    <button
                        onClick={() => setIsDefectMode(!isDefectMode)}
                        className={`flex items-center space-x-2 p-3 rounded-xl border shadow-xl transition-all font-bold text-xs uppercase tracking-wide
                            ${isDefectMode ? 'bg-red-900/80 border-red-500 text-red-200' : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        <AlertTriangle size={16} className={isDefectMode ? 'animate-pulse' : ''} />
                        <span>{isDefectMode ? '결함 찾기 모드 ON' : '결함 모드 OFF'}</span>
                    </button>
                </div>

                {/* SVG Schematic */}
                <div className={`relative w-full max-w-5xl aspect-video rounded-xl border shadow-2xl overflow-hidden transition-all duration-500
                    ${isDefectMode ? 'border-red-500/50 shadow-red-900/20' : 'border-slate-800 bg-slate-900'}`}>

                    {/* Grid & Background */}
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        {/* Dimming Layer for Electrical Mode to focus on electrical components */}
                        {subject === 'electrical' && !isDefectMode && (
                            <rect x="0" y="0" width="100" height="100" fill="black" opacity="0.3" />
                        )}

                        <defs>
                            <filter id="glow-panel"><feGaussianBlur stdDeviation="1.5" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                        </defs>

                        {/* Pipes (Mechanical Context) */}
                        <g fill="none" strokeWidth="2" stroke={subject === 'mechanical' ? "#475569" : "#334155"} opacity={subject === 'electrical' ? 0.4 : 1}>
                            <rect x="5" y="60" width="55" height="35" rx="2" strokeDasharray="2,2" />
                            <path d="M15 90 L45 90" strokeWidth="3" />
                            <path d="M45 85 L45 30 L80 30" strokeWidth="3" />
                            <path d="M45 75 L30 75 L30 85" strokeDasharray="2,2" />
                            <path d="M45 50 L70 50" />
                        </g>

                        {/* Mechanical Components */}
                        <path d="M5 80 L15 80 L15 95 L5 95 Z" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" opacity={subject === 'electrical' ? 0.3 : 1} />
                        <circle cx="45" cy="85" r="7" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" opacity={subject === 'electrical' ? 0.3 : 1} />
                        <circle cx="58" cy="85" r="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" opacity={subject === 'electrical' ? 0.3 : 1} />

                        {/* Electrical Components (Highlighted in Electrical Mode) */}
                        <g filter={subject === 'electrical' ? "url(#glow-panel)" : ""}>
                            {/* MCC */}
                            <rect x="10" y="10" width="12" height="18" fill={subject === 'electrical' ? "#1e40af" : "#334155"} stroke={subject === 'electrical' ? "#60a5fa" : "#94a3b8"} />
                            <text x="16" y="20" fontSize="2.5" fill="white" textAnchor="middle">MCC</text>

                            {/* Control Panel */}
                            <rect x="75" y="10" width="15" height="10" fill={subject === 'electrical' ? "#c2410c" : "#0f172a"} stroke={subject === 'electrical' ? "#fdba74" : "#10b981"} />
                            <text x="82.5" y="16" fontSize="2.5" fill="white" textAnchor="middle">CP</text>

                            {/* Pressure Chamber (Has Switch) */}
                            <rect x="25" y="40" width="8" height="12" fill={subject === 'electrical' ? "#be123c" : "#be123c"} stroke="#f43f5e" rx="2" />
                        </g>

                        {/* Red Flaw Indicators (Only in Defect Mode) */}
                        {isDefectMode && (
                            <g className="animate-pulse">
                                <circle cx="45" cy="85" r="8" fill="none" stroke="red" strokeWidth="1" strokeDasharray="2" />
                                <path d="M43 50 L47 54 M47 50 L43 54" stroke="red" strokeWidth="1" /> {/* X mark on valve */}
                            </g>
                        )}
                    </svg>

                    {/* Hotspots */}
                    {filteredHotspots.map((spot) => (
                        <button
                            key={spot.id}
                            onClick={() => setSelectedHotspot(spot)}
                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                            className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border shadow-lg transform transition-all duration-300 z-20 flex items-center justify-center font-bold text-[9px]
                                ${selectedHotspot?.id === spot.id
                                    ? `bg-white ${themeColors.text} scale-125 ring-4 ${themeColors.ring}`
                                    : isDefectMode
                                        ? 'bg-red-500/80 border-red-300 text-white animate-bounce'
                                        : 'bg-slate-700 border-slate-500 text-slate-300 hover:scale-110 hover:bg-white hover:text-slate-900'}`}
                        >
                            {spot.id}
                        </button>
                    ))}
                </div>
            </div>

            {/* Side Panel */}
            <div className={`w-80 bg-slate-900 border-l border-slate-800 p-6 shadow-2xl z-30 overflow-y-auto transition-colors duration-500`}>
                {selectedHotspot ? (
                    <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                        <div>
                            <div className="mb-4">
                                <div className="flex items-center space-x-2 text-slate-500 text-xs font-mono mb-1">
                                    <span>ID: {String(selectedHotspot.id).padStart(2, '0')}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase">{selectedHotspot.subject}</span>
                                </div>
                                <h2 className="text-xl font-bold text-white leading-tight">{selectedHotspot.label.substring(4)}</h2>
                            </div>

                            {/* Standard Content Node */}
                            {!isDefectMode && (
                                <div className={`p-4 rounded-xl border mb-4 shadow-sm transition-colors duration-500 
                                    ${isExamMode ? 'bg-emerald-900/20 border-emerald-500/30' : `bg-slate-800/50 ${themeColors.border}/30`}`}>
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                        {isExamMode ? <ClipboardCheck className="text-emerald-500" size={20} /> : <BookOpen className={themeColors.text} size={20} />}
                                        <span className={`font-bold text-sm ${isExamMode ? 'text-emerald-400' : themeColors.text}`}>
                                            {isExamMode ? '점검 항목 (Checklist)' : '기술 기준 (Code)'}
                                        </span>
                                    </div>
                                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                        {isExamMode ? selectedHotspot.examDesc : selectedHotspot.desc}
                                    </div>
                                </div>
                            )}

                            {/* Defect Node */}
                            {isDefectMode && (
                                <div className="p-4 rounded-xl border border-red-500/30 bg-red-900/10 mb-4 animate-pulse">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-500/10">
                                        <AlertTriangle className="text-red-500" size={20} />
                                        <span className="font-bold text-sm text-red-400">발견된 결함 (Defect)</span>
                                    </div>
                                    <div className="text-red-200 text-sm leading-relaxed font-bold">
                                        {selectedHotspot.defect}
                                    </div>
                                    <div className="mt-3 text-xs text-red-400/70">
                                        * 터치하여 상세 법적 기준을 확인하세요.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Link to Workbook */}
                        <div className="mt-auto pt-6">
                            <button
                                onClick={() => setMode && setMode('workbook')}
                                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl border transition-all font-bold text-sm group shadow-lg
                                ${themeColors.bg} text-white ${themeColors.border} hover:opacity-90 active:scale-95`}
                            >
                                <span>관련 문제 풀러가기</span>
                                <ExternalLink size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                            <ArrowRight size={24} className="opacity-50" />
                        </div>
                        <p className="text-sm text-center">번호를 클릭하여<br />세부 내용을 확인하세요.</p>
                        {isDefectMode && <p className="text-xs text-red-400 font-bold animate-bounce">⚠️ 결함 모드 활성화됨</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
