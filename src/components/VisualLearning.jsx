import React, { useState } from 'react';
import { Info, BookOpen, ClipboardCheck, ArrowRight, ExternalLink } from 'lucide-react';

const HOTSPOTS = [
    // --- 가압송수장치 파트 ---
    {
        id: 1, x: 50, y: 80, label: "01. 주펌프 (Main PV)",
        desc: "[기술기준] 정격토출량 150% 운전 시 정격압력 65% 이상.",
        examDesc: "1. 펌프 기동/정지 압력 셋팅\n2. 커플링/베어링 상태 및 회전방향\n3. 누수 및 이음 발생 여부"
    },
    {
        id: 2, x: 58, y: 80, label: "02. 충압펌프 (Jockey PV)",
        desc: "[기술기준] 정격토출압력은 주펌프와 동등 이상일 것.",
        examDesc: "1. 잦은 기동 여부 확인 (누수 의심)\n2. 정지 압력 설정 상태 확인"
    },
    {
        id: 3, x: 65, y: 38, label: "03. 성능시험배관",
        desc: "[기술기준] 정격토출량 175% 측정 가능 유량계.",
        examDesc: "1. 유량조절밸브 조작 용이성\n2. 유량계 지시치 흔들림 및 파손 여부"
    },
    {
        id: 4, x: 28, y: 70, label: "04. 릴리프 밸브 (순환배관)",
        desc: "[기술기준] 체절압력 미만에서 개방 (수온상승방지).",
        examDesc: "1. 릴리프 밸브 개방 압력 확인\n2. 배수 처리 및 배관 고정 상태"
    },
    {
        id: 5, x: 45, y: 65, label: "05. 물올림장치",
        desc: "[기술기준] 유효수량 100L 이상, 급수배관 15mm.",
        examDesc: "1. 감수 경보 장치(저수위) 작동\n2. 볼탭에 의한 자동 급수 여부"
    },
    {
        id: 6, x: 25, y: 45, label: "06. 기동용수압개폐장치",
        desc: "[기술기준] 용적 100L 이상, 릴리프밸브 설치.",
        examDesc: "1. 공기 교체 및 수위 확인\n2. 압력스위치 Range/Diff 설정 확인"
    },
    // --- 배관/수원 파트 ---
    {
        id: 7, x: 10, y: 85, label: "07. 수원 (수조)",
        desc: "[기술기준] N × 2.6㎥ (30층↑: N×5.2㎥).\n옥상수조 1/3 이상 확보.",
        examDesc: "1. 수위계 작동 상태\n2. 수조 청소 상태 및 사다리 고정\n3. 후트밸브 및 연성계 작동 확인"
    },
    {
        id: 8, x: 90, y: 85, label: "08. 송수구",
        desc: "[기술기준] 0.5~1m 높이, 쌍구형, 마개 씌울 것.",
        examDesc: "1. 이물질 막힘 여부\n2. 자동배수밸브 잔류수 배출 확인"
    },
    {
        id: 9, x: 45, y: 56, label: "09. 배관 (체크/개폐밸브)",
        desc: "[기술기준] 펌프 토출측 체크밸브 및 개폐표시형 밸브.",
        examDesc: "1. 체크밸브 누수 및 스윙 작동\n2. 탬퍼스위치 작동 여부 확인"
    },
    // --- 제어반/방수구 파트 ---
    {
        id: 10, x: 80, y: 15, label: "10. 감시제어반 (수신반)",
        desc: "[기술기준] 상시 사람이 근무하는 장소, 전용회로.",
        examDesc: "1. 펌프 기동/정지 수동 조작\n2. 도통시험 및 각종 표시등 점등 확인"
    },
    {
        id: 11, x: 15, y: 20, label: "11. 동력제어반 (MCC)",
        desc: "[기술기준] 펌프실 인근 설치, 전용실 구획 권장.",
        examDesc: "1. 펌프 기동 표시등(적색) 점등\n2. 비상전원 절환 및 차단기 용량"
    },
    {
        id: 12, x: 90, y: 40, label: "12. 옥내소화전함/방수구",
        desc: "[기술기준] 문짝 0.5㎡↑, 방수구 높이 1.5m↓.",
        examDesc: "1. 방수압력(0.17MPa↑) 측정\n2. 호스 적재 및 노즐 결합 상태"
    }
];

export default function VisualLearning({ isExamMode, setIsExamMode, setMode }) {
    const [selectedHotspot, setSelectedHotspot] = useState(null);

    return (
        <div className="flex h-full">
            {/* Diagram Section */}
            <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-4 overflow-hidden">

                {/* Mode Toggle */}
                <div className="absolute top-6 left-6 z-10 flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl select-none">
                    <span className={`text-xs font-bold uppercase ${!isExamMode ? 'text-blue-400' : 'text-slate-600'}`}>기술기준(NFTC)</span>
                    <button
                        onClick={() => setIsExamMode(!isExamMode)}
                        className={`w-14 h-7 rounded-full p-1 transition-all ${isExamMode ? 'bg-emerald-600' : 'bg-blue-600'}`}
                    >
                        <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${isExamMode ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-xs font-bold uppercase ${isExamMode ? 'text-emerald-400' : 'text-slate-600'}`}>점검실무(2027)</span>
                </div>

                {/* SVG Schematic */}
                <div className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="glow-panel"><feGaussianBlur stdDeviation="1.5" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                        </defs>

                        {/* Pipes & Structure Guidelines */}
                        <g fill="none" strokeWidth="2" stroke="#334155">
                            {/* Pump Room Base */}
                            <rect x="5" y="60" width="55" height="35" rx="2" strokeDasharray="2,2" />

                            {/* Pipes */}
                            <path d="M15 90 L45 90" stroke="#475569" strokeWidth="3" /> {/* Suction */}
                            <path d="M45 85 L45 30 L80 30" stroke="#475569" strokeWidth="3" /> {/* Discharge Main */}
                            <path d="M45 75 L30 75 L30 85" strokeDasharray="2,2" /> {/* Circulation */}
                            <path d="M45 50 L70 50" /> {/* Test Pipe */}
                        </g>

                        {/* Components */}
                        {/* Tank */}
                        <path d="M5 80 L15 80 L15 95 L5 95 Z" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1" />
                        <text x="10" y="88" fontSize="2" fill="white" textAnchor="middle">TANK</text>

                        {/* Main Pump */}
                        <circle cx="45" cy="85" r="7" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />

                        {/* Jockey Pump (Small) */}
                        <circle cx="58" cy="85" r="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="58" y="86" fontSize="1.5" fill="white" textAnchor="middle">JP</text>

                        {/* MCC (Left Top) */}
                        <rect x="10" y="10" width="12" height="18" fill="#334155" stroke="#94a3b8" />
                        <text x="16" y="20" fontSize="2.5" fill="white" textAnchor="middle">MCC</text>

                        {/* Control Panel (Right Top) */}
                        <rect x="75" y="10" width="15" height="10" fill="#0f172a" stroke="#10b981" />
                        <text x="82.5" y="16" fontSize="2.5" fill="white" textAnchor="middle">수신반</text>

                        {/* Hydrant Box (Right) */}
                        <rect x="85" y="40" width="10" height="20" fill="#b91c1c" stroke="#f87171" />
                        <text x="90" y="52" fontSize="2.5" fill="white" textAnchor="middle">함</text>

                        {/* Priming Tank */}
                        <rect x="42" y="62" width="6" height="6" fill="#1e3a8a" stroke="#60a5fa" />

                        {/* Pressure Chamber */}
                        <rect x="25" y="40" width="8" height="12" fill="#be123c" stroke="#f43f5e" rx="2" />

                    </svg>

                    {/* Hotspots */}
                    {HOTSPOTS.map((spot) => (
                        <button
                            key={spot.id}
                            onClick={() => setSelectedHotspot(spot)}
                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                            className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border shadow-lg transform transition-all duration-300 z-20 flex items-center justify-center font-bold text-[9px]
                                ${selectedHotspot?.id === spot.id
                                    ? 'bg-emerald-500 border-white text-white scale-125 ring-4 ring-emerald-500/30'
                                    : 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-emerald-600 hover:text-white hover:scale-110'}`}
                        >
                            {spot.id}
                        </button>
                    ))}
                </div>
            </div>

            {/* Side Panel */}
            <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 shadow-2xl z-30 overflow-y-auto">
                {selectedHotspot ? (
                    <div className="animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                        <div>
                            <div className="mb-4">
                                <div className="flex items-center space-x-2 text-slate-500 text-xs font-mono mb-1">
                                    <span>ID: {String(selectedHotspot.id).padStart(2, '0')}</span>
                                </div>
                                <h2 className="text-xl font-bold text-white leading-tight">{selectedHotspot.label.substring(4)}</h2>
                            </div>

                            <div className={`p-4 rounded-xl border mb-4 shadow-sm transition-colors duration-500 
                                ${isExamMode ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                    {isExamMode ? <ClipboardCheck className="text-emerald-500" size={20} /> : <BookOpen className="text-blue-500" size={20} />}
                                    <span className={`font-bold text-sm ${isExamMode ? 'text-emerald-400' : 'text-blue-400'}`}>
                                        {isExamMode ? '점검 항목 (Checklist)' : '기술 기준 (Code)'}
                                    </span>
                                </div>
                                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                    {isExamMode ? selectedHotspot.examDesc : selectedHotspot.desc}
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-3 rounded-lg text-xs text-slate-500 mb-6">
                                <strong>Note:</strong> {isExamMode ? '2027 점검실무 대비 핵심 사항입니다.' : 'NFTC 화재안전기술기준 원문입니다.'}
                            </div>
                        </div>

                        {/* Link to Workbook Button */}
                        <div className="mt-auto">
                            <button
                                onClick={() => setMode && setMode('workbook')}
                                className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-3 rounded-xl border border-slate-700 transition-all font-medium text-sm group"
                            >
                                <span>관련 문제 풀기</span>
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
                    </div>
                )}
            </div>
        </div>
    );
}
