import React, { useState } from 'react';
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react';

const hotspots = [
    {
        id: 1,
        x: 45, y: 65, // 펌프 위치
        label: "주펌프 (Main Pump)",
        desc: "NFTC 102: 체절운전 시 정격토출압력의 140% 이하, 정격운전 시 정격토출압력 이상일 것.",
        highRiseDesc: "★고층 건물 전용 주의사항 (NFTC 강화 기준): 스프링클러 겸용 시 토출측 압력 릴리프 밸브 설치 및 과압 방지 조치 필수."
    },
    {
        id: 2,
        x: 50, y: 40, // 순환배관 위치
        label: "순환배관 & 릴리프밸브",
        desc: "구경 20mm 이상. 체절압력 미만에서 개방되어 수온 상승 방지.",
        highRiseDesc: "★고층 건물 전용: 고압 릴리프 밸브 사용. 개방 시 배관 충격 및 고여있는 물의 배수 처리 확인."
    },
    {
        id: 3,
        x: 65, y: 50, // 성능시험배관 위치
        label: "성능시험배관 & 유량계",
        desc: "정격토출량의 175% 이상 측정 가능할 것. 유량계 전단에 개폐밸브 설치.",
        highRiseDesc: "★고층 건물 전용: 고압 유수 검지 장치 및 유량계 파손 방지를 위한 감압 밸브 설치 여부 점검."
    },
    {
        id: 4,
        x: 30, y: 55, // 기동용수압개폐장치 위치
        label: "기동용 수압개폐장치 (압력챔버)",
        desc: "용적 100L 이상. 기동/정지 압력 세팅값 적정성 확인.",
        highRiseDesc: "★고층 건물 전용: 디지털 압력 스위치 사용 권장. 잦은 기동 방지를 위한 차압 설정 세밀화."
    }
];

export default function VisualLearning({ isHighRise, setIsHighRise }) {
    const [selectedHotspot, setSelectedHotspot] = useState(null);

    return (
        <div className="flex h-full">
            {/* Diagram Section */}
            <div className="flex-1 bg-slate-950 relative flex items-center justify-center p-8 overflow-hidden">

                {/* High-Rise Toggle Switch */}
                <div className="absolute top-6 left-6 z-10 flex items-center space-x-3 bg-slate-900/80 backdrop-blur-sm p-3 rounded-lg border border-slate-700 shadow-xl select-none">
                    <span className={`text-sm font-bold ${!isHighRise ? 'text-white' : 'text-slate-500'}`}>Standard</span>
                    <button
                        onClick={() => setIsHighRise(!isHighRise)}
                        className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 ${isHighRise ? 'bg-orange-600' : 'bg-slate-700'}`}
                    >
                        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isHighRise ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-sm font-bold ${isHighRise ? 'text-orange-500' : 'text-slate-500'}`}>High-Rise</span>
                </div>

                {/* SVG Diagram Container */}
                <div className="relative w-full max-w-4xl aspect-[16/9] bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
                    {/* Grid Pattern Background */}
                    <div className="absolute inset-0 opacity-5"
                        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    </div>

                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <defs>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            {/* Symbol: Valve */}
                            <path id="valve-symbol" d="M0 0 L10 5 L0 10 Z M10 0 L0 5 L10 10 Z" fill="#64748b" stroke="white" strokeWidth="0.5" />
                        </defs>

                        {/* Pipes Group: fill="none" is critical here */}
                        <g fill="none">
                            {/* Suction Pipe */}
                            <path d="M10 80 L45 80" stroke="#475569" strokeWidth="3" />

                            {/* Discharge Pipe */}
                            <path d="M45 70 L45 20 L80 20" stroke="#475569" strokeWidth="3" />

                            {/* Circulation Pipe */}
                            <path d="M45 65 L25 65 L25 85" stroke="#475569" strokeWidth="2" strokeDasharray="2,2" />

                            {/* Flow Meter Pipe */}
                            <path d="M45 40 L80 40" stroke="#475569" strokeWidth="2" />

                            {/* Pressure Chamber Pipe */}
                            <path d="M45 35 L30 35 L30 50" stroke="#475569" strokeWidth="2" />
                        </g>

                        {/* Components */}
                        {/* Main Pump */}
                        <circle cx="45" cy="80" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" filter="url(#glow)" />
                        <text x="45" y="82" textAnchor="middle" fontSize="3" fill="white" fontWeight="bold">PUMP</text>

                        {/* Check Valve */}
                        <path d="M43 55 L47 55" stroke="white" strokeWidth="1" />
                        <circle cx="45" cy="55" r="3" stroke="white" strokeWidth="1" fill="none" />

                        {/* Relief Valve */}
                        <rect x="23" y="68" width="4" height="6" fill="#ef4444" />

                        {/* Flow Meter Component */}
                        <rect x="65" y="38" width="6" height="4" fill="#3b82f6" />

                        {/* Pressure Chamber Component */}
                        <rect x="25" y="50" width="10" height="15" rx="2" fill="#be123c" />

                    </svg>

                    {/* Interactive Hotspots */}
                    {hotspots.map((spot) => (
                        <button
                            key={spot.id}
                            onClick={() => setSelectedHotspot(spot)}
                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                            className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 shadow-[0_0_15px_rgba(239,68,68,0.6)] transform transition-transform duration-200 z-20
                                ${selectedHotspot?.id === spot.id ? 'bg-red-600 border-white scale-125' : 'bg-red-600/60 border-red-300 hover:scale-110 hover:bg-red-600'}`}
                            aria-label={`Select ${spot.label}`}
                        >
                            <span className="absolute inset-0 rounded-full bg-red-500 opacity-75 animate-ping"></span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Info Panel Sidebar */}
            <div className="w-96 bg-slate-900 border-l border-slate-700 p-6 flex flex-col shadow-2xl z-30">
                {selectedHotspot ? (
                    <div className="animate-fade-in-up">
                        <div className="mb-6 pb-4 border-b border-slate-700">
                            <h2 className="text-2xl font-bold text-white mb-2">{selectedHotspot.label}</h2>
                            <span className="text-xs font-mono text-slate-400">ID: {selectedHotspot.id}</span>
                        </div>

                        <div className={`p-5 rounded-xl border mb-4 shadow-inner ${isHighRise ? 'bg-orange-950/30 border-orange-500/50' : 'bg-blue-950/30 border-blue-500/50'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                {isHighRise ? <AlertCircle className="text-orange-500" size={24} /> : <CheckCircle2 className="text-blue-500" size={24} />}
                                <h3 className={`font-bold text-lg ${isHighRise ? 'text-orange-400' : 'text-blue-400'}`}>
                                    {isHighRise ? 'High-Rise Checkpoint' : 'Standard Checkpoint'}
                                </h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed text-sm">
                                {isHighRise ? selectedHotspot.highRiseDesc : selectedHotspot.desc}
                            </p>
                        </div>

                        {isHighRise && (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-red-300 text-xs">
                                ⚠ 고층 건축물은 화재안전기준(NFTC)의 강화된 규정을 반드시 준수해야 합니다.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                        <Info size={64} strokeWidth={1} className="mb-4" />
                        <p className="text-center font-medium">다이어그램의 붉은 점을 클릭하여<br />세부 점검 항목을 확인하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
