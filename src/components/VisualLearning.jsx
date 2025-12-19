import React, { useState } from 'react';
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react';

const hotspots = [
    {
        id: 1,
        x: 45, y: 65, // 펌프 위치
        label: "주펌프 (Main Pump)",
        desc: "NFTC 102: 체절운전 시 정격토출압력의 140% 이하, 정격운전 시 정격토출압력 이상일 것.",
        highRiseDesc: "★고층 건축물: 스프링클러와 겸용 시, 펌프 토출측에 압력 릴리프 밸브 추가 확인 필요 (과압 방지)."
    },
    {
        id: 2,
        x: 50, y: 40, // 순환배관 위치
        label: "순환배관 & 릴리프밸브",
        desc: "구경 20mm 이상. 체절압력 미만에서 개방되어 수온 상승 방지.",
        highRiseDesc: "★고층 건축물: 릴리프 밸브의 개방 압력이 고압에 견디는지 확인 (배관 스케줄 40 이상 권장)."
    },
    {
        id: 3,
        x: 65, y: 50, // 성능시험배관 위치
        label: "성능시험배관 & 유량계",
        desc: "유량계는 정격토출량의 175% 이상 측정 가능한지 확인. (개폐밸브는 전단 직관부에 설치)",
        highRiseDesc: "★고층 건축물: 고압으로 인한 유량계 파손 주의. 전단 밸브 서서히 개방하여 수격현상 방지."
    },
    {
        id: 4,
        x: 30, y: 55, // 기동용수압개폐장치 위치
        label: "기동용 수압개폐장치 (압력챔버)",
        desc: "용적 100L 이상. 펌프의 기동/정지 압력 세팅값 확인.",
        highRiseDesc: "★고층 건축물: 전자식 기동용 압력스위치(Digital Pressure Switch) 사용 권장 (반응속도 및 내구성)."
    }
];

export default function VisualLearning() {
    const [selectedHotspot, setSelectedHotspot] = useState(null);
    const [isHighRise, setIsHighRise] = useState(false);

    return (
        <div className="flex h-full">
            {/* Diagram Area */}
            <div className="flex-1 bg-slate-900 relative flex items-center justify-center p-8 overflow-hidden">

                {/* Toggle Switch */}
                <div className="absolute top-6 left-6 z-10 flex items-center space-x-3 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-lg">
                    <span className={`text-sm font-medium ${!isHighRise ? 'text-white' : 'text-slate-500'}`}>Standard</span>

                    <button
                        onClick={() => setIsHighRise(!isHighRise)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isHighRise ? 'bg-orange-500' : 'bg-slate-600'}`}
                    >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isHighRise ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>

                    <span className={`text-sm font-medium ${isHighRise ? 'text-orange-400' : 'text-slate-500'}`}>High-Rise (&gt;30F)</span>
                </div>

                {/* Diagram Placeholder / Container */}
                <div className="relative w-full max-w-3xl aspect-[4/3] bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                    {/* Decorative Grid */}
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    {/* SVG Schematic */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <defs>
                            {/* Valve Symbol Definition */}
                            <symbol id="valve" viewBox="0 0 10 10">
                                <path d="M0 0 L10 10 L10 0 L0 10 Z" fill="#475569" stroke="white" strokeWidth="0.5" />
                            </symbol>
                            {/* Check Valve Symbol */}
                            <symbol id="check-valve" viewBox="0 0 10 10">
                                <path d="M1 5 L9 5 M7 2 L9 5 L7 8" stroke="white" strokeWidth="1" />
                                <circle cx="5" cy="5" r="4.5" stroke="white" strokeWidth="0.5" fill="#475569" />
                            </symbol>
                        </defs>

                        {/* 1. Main Suction Pipe (Left to Pump) */}
                        <path d="M0 80 L40 80" stroke="#64748b" strokeWidth="4" />
                        <use href="#valve" x="15" y="75" width="10" height="10" />

                        {/* 2. Main Pump (Center Bottom) */}
                        <g transform="translate(50, 80)">
                            <circle r="8" fill="#1e293b" stroke="#f97316" strokeWidth="2" /> {/* Pump Body */}
                            <rect x="-10" y="-12" width="20" height="12" fill="#334155" strokeWidth="0" /> {/* Motor connect */}
                            <rect x="-12" y="-4" width="24" height="8" rx="2" fill="#cbd5e1" /> {/* Base */}
                        </g>

                        {/* 3. Main Discharge Pipe (Pump to Top) */}
                        <path d="M50 72 L50 20 L50 0" stroke="#64748b" strokeWidth="4" />

                        {/* 4. Check Valve on Discharge */}
                        <circle cx="50" cy="60" r="4" fill="#1e293b" stroke="white" strokeWidth="1" />
                        <path d="M48 62 L52 58 M48 58 L52 62" stroke="white" strokeWidth="1" /> {/* Simple Check symbol */}

                        {/* 5. Circulation Piping (Branch Left) */}
                        <path d="M50 70 L28 70 L28 90" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
                        <rect x="23" y="72" width="10" height="6" fill="#fca5a5" stroke="none" /> {/* Relief Valve Box */}
                        <text x="35" y="88" fontSize="3" fill="#94a3b8">Drain</text>

                        {/* 6. Performance Test Piping (Branch Right) */}
                        <path d="M50 45 L90 45" stroke="#64748b" strokeWidth="3" />
                        <use href="#valve" x="60" y="40" width="10" height="10" /> {/* Test Valve */}
                        <circle cx="80" cy="45" r="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" /> {/* Flow Meter */}
                        <path d="M80 45 L80 42" stroke="white" strokeWidth="1" /> {/* Meter indicator */}

                        {/* 7. Pressure Chamber (Branch Top Left) */}
                        <path d="M50 30 L25 30 L25 20" stroke="#64748b" strokeWidth="2" />
                        <rect x="20" y="10" width="10" height="15" rx="1" fill="#be123c" stroke="white" strokeWidth="1" />
                        <line x1="25" y1="10" x2="25" y2="6" stroke="#94a3b8" strokeWidth="1" /> {/* Gauge stem */}
                        <circle cx="25" cy="4" r="2" fill="white" />
                    </svg>

                    {/* Hotspots */}
                    {hotspots.map((spot) => (
                        <button
                            key={spot.id}
                            onClick={() => setSelectedHotspot(spot)}
                            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                            className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300 z-20 hover:scale-125
                ${selectedHotspot?.id === spot.id
                                    ? 'bg-red-500 border-white scale-125 animate-pulse'
                                    : 'bg-red-500/80 border-red-300 hover:bg-red-500'
                                }`}
                        >
                            <span className="sr-only">{spot.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Info Panel */}
            <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col p-6 shadow-xl z-20 transition-all duration-300">
                {selectedHotspot ? (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-1">{selectedHotspot.label}</h3>
                        </div>

                        <div className={`p-4 rounded-lg border ${isHighRise ? 'bg-orange-500/10 border-orange-500/50' : 'bg-blue-500/10 border-blue-500/50'}`}>
                            <div className="flex items-start space-x-3 mb-2">
                                {isHighRise ? <AlertCircle className="text-orange-500 shrink-0" size={20} /> : <CheckCircle2 className="text-blue-500 shrink-0" size={20} />}
                                <h4 className={`font-semibold ${isHighRise ? 'text-orange-400' : 'text-blue-400'}`}>
                                    {isHighRise ? 'High-Rise Checkpoint' : 'Standard Checkpoint'}
                                </h4>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {isHighRise ? selectedHotspot.highRiseDesc : selectedHotspot.desc}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center">
                        <Info size={48} className="mb-4 opacity-50" />
                        <p>Click a red hotspot on the diagram to view inspection details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
