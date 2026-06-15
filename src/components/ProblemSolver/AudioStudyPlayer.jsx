import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, 
    Pause, 
    ChevronLeft, 
    ChevronRight, 
    RotateCcw, 
    PlayCircle, 
    Clock, 
    Volume2 
} from 'lucide-react';

// TTS 낭독 텍스트 청취 가독성 극대화를 위한 한국어 정제 함수
const cleanTextForTTS = (text) => {
    if (!text) return '';
    let clean = text;
    // HTML 태그 제거
    clean = clean.replace(/<[^>]*>/g, '');
    // 유니코드 원기호 ①~⑳ 한글 정제
    const circleNumbers = {
        '①':'1번', '②':'2번', '③':'3번', '④':'4번', '⑤':'5번', 
        '⑥':'6번', '⑦':'7번', '⑧':'8번', '⑨':'9번', '⑩':'10번', 
        '⑪':'11번', '⑫':'12번', '⑬':'13번', '⑭':'14번', '⑮':'15번', 
        '⑯':'16번', '⑰':'17번', '⑱':'18번', '⑲':'19번', '⑳':'20번'
    };
    clean = clean.replace(/[①-⑳]/g, (m) => circleNumbers[m] ? ' ' + circleNumbers[m] + ' ' : m);
    // 괄호 숫자 및 기호 변환
    clean = clean.replace(/\((\d+)\)/g, ' $1번 ');
    clean = clean.replace(/\[(\d+)\]/g, ' $1번 ');
    // 특수 문자 및 마크다운 표시 제거
    clean = clean.replace(/[\*\_]/g, '');
    return clean.trim();
};

export default function AudioStudyPlayer({ currentProblem, onNext, onPrev, isFirst, isLast }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeStep, setActiveStep] = useState('idle'); // 'idle' | 'title' | 'question' | 'pause' | 'introAnswer' | 'answer' | 'done'
    const [rate, setRate] = useState(1.0); // 1.0, 1.25, 1.5, 2.0
    const [playMode, setPlayMode] = useState('continuous'); // 'repeat' | 'continuous'
    const [selectedVoice, setSelectedVoice] = useState(null);

    const currentUtteranceRef = useRef(null);
    const pauseTimeoutRef = useRef(null);
    const isPlayingRef = useRef(isPlaying);

    // ref와 state 동기화 (이벤트 핸들러 내 최신값 참조용)
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // TTS 목소리 로드 및 한국어 설정
    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            const koVoices = allVoices.filter(v => v.lang.startsWith('ko'));
            // 구글/애플 고품질 한국어 보이스 우선 탑재, 없으면 기본 한국어 보이스 매핑
            const preferred = koVoices.find(v => v.name.includes('Google') || v.name.includes('Apple')) || koVoices[0];
            setSelectedVoice(preferred);
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            window.speechSynthesis.cancel();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        };
    }, []);

    // 음성 낭독 처리 함수
    const speakText = (text, onEndCallback) => {
        window.speechSynthesis.cancel();
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);

        if (!text) {
            onEndCallback();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = rate;
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
            // 재생 중에만 다음 시퀀스로 이어지도록 가드 처리
            if (isPlayingRef.current) {
                onEndCallback();
            }
        };

        utterance.onerror = (e) => {
            console.error("TTS 낭독 중 에러 발생:", e);
            if (e.error !== 'interrupted' && isPlayingRef.current) {
                onEndCallback();
            }
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // Active Recall 낭독 시퀀스 러너
    const runSequence = (step) => {
        if (!isPlayingRef.current) return;

        setActiveStep(step);

        switch (step) {
            case 'title': {
                const cleanTitle = cleanTextForTTS(currentProblem?.title || '');
                speakText(`문제, ${cleanTitle} 질문입니다.`, () => {
                    runSequence('question');
                });
                break;
            }
            case 'question': {
                const cleanQuestion = cleanTextForTTS(currentProblem?.question || currentProblem?.content || '');
                speakText(cleanQuestion, () => {
                    runSequence('pause');
                });
                break;
            }
            case 'pause': {
                // 지문 완독 후 정답 리콜을 위한 3초 정적 유지
                window.speechSynthesis.cancel();
                pauseTimeoutRef.current = setTimeout(() => {
                    runSequence('introAnswer');
                }, 3000);
                break;
            }
            case 'introAnswer': {
                speakText("정답 해설입니다.", () => {
                    runSequence('answer');
                });
                break;
            }
            case 'answer': {
                const cleanAnswer = cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');
                speakText(cleanAnswer, () => {
                    runSequence('done');
                });
                break;
            }
            case 'done': {
                if (playMode === 'repeat') {
                    runSequence('title');
                } else {
                    if (!isLast) {
                        onNext(); // 다음 문제로 인덱스 전이
                    } else {
                        setIsPlaying(false);
                        setActiveStep('idle');
                    }
                }
                break;
            }
            default:
                break;
        }
    };

    // 재생/일시정지 토글
    const handleTogglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            window.speechSynthesis.cancel();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        } else {
            setIsPlaying(true);
        }
    };

    // 플레이어 제어용 Effect
    useEffect(() => {
        if (isPlaying) {
            runSequence(activeStep === 'idle' || activeStep === 'done' ? 'title' : activeStep);
        } else {
            window.speechSynthesis.cancel();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        }
    }, [isPlaying]);

    // 배속 또는 문제가 전환될 때의 낭독 리로드 제어
    useEffect(() => {
        if (isPlaying) {
            runSequence('title');
        } else {
            setActiveStep('idle');
        }
    }, [currentProblem, rate]);

    // 언마운트 시 클린업
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
        };
    }, []);

    return (
        <div className="font-sans fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-full sm:max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 p-4 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex flex-col w-full gap-3">
                {/* 상단 진행 정보 표시 바 */}
                <div className="flex items-center justify-between text-xs font-semibold border-b border-slate-800/80 pb-2">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className={`w-2.5 h-2.5 rounded-full bg-emerald-500 ${isPlaying ? 'animate-pulse' : 'opacity-60'}`} />
                        오디오북 학습 {playMode === 'repeat' ? '• 1문제 반복' : '• 연속 재생'}
                    </span>
                    <span className="text-slate-400 font-mono tracking-tight leading-[1.75]">
                        {activeStep === 'title' && "📌 제목 낭독 중..."}
                        {activeStep === 'question' && "📖 지문 낭독 중..."}
                        {activeStep === 'pause' && "⏳ 3초간 정적 대기 (생각해보기)"}
                        {activeStep === 'introAnswer' && "📢 정답 해설 준비..."}
                        {activeStep === 'answer' && "💡 정답 및 해설 낭독 중..."}
                        {activeStep === 'idle' && "💤 대기 중"}
                    </span>
                </div>

                {/* 하단 메인 컨트롤 바 */}
                <div className="flex items-center justify-between gap-4">
                    {/* 이전 문제 이동 */}
                    <button 
                        onClick={onPrev} 
                        disabled={isFirst}
                        className={`p-2.5 rounded-xl transition-all ${isFirst ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90'}`}
                        title="이전 문제"
                    >
                        <ChevronLeft size={22} />
                    </button>

                    {/* 재생/일시정지 토글 버튼 */}
                    <button 
                        onClick={handleTogglePlay}
                        className="p-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center font-black"
                        title={isPlaying ? "일시정지" : "재생"}
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>

                    {/* 다음 문제 이동 */}
                    <button 
                        onClick={onNext} 
                        disabled={isLast}
                        className={`p-2.5 rounded-xl transition-all ${isLast ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90'}`}
                        title="다음 문제"
                    >
                        <ChevronRight size={22} />
                    </button>

                    <div className="h-6 w-[1px] bg-slate-800" />

                    {/* 배속 조절 드롭다운 */}
                    <div className="flex items-center gap-1 bg-slate-950/50 border border-slate-800/80 px-3 py-1.5 rounded-xl">
                        <Clock size={14} className="text-slate-400" />
                        <select 
                            value={rate} 
                            onChange={(e) => setRate(parseFloat(e.target.value))}
                            className="bg-transparent text-slate-300 text-xs font-extrabold outline-none cursor-pointer focus:text-white"
                        >
                            <option value="1.0" className="bg-slate-900 text-white">1.0x</option>
                            <option value="1.25" className="bg-slate-900 text-white">1.25x</option>
                            <option value="1.5" className="bg-slate-900 text-white">1.5x</option>
                            <option value="2.0" className="bg-slate-900 text-white">2.0x</option>
                        </select>
                    </div>

                    {/* 재생 모드 토글 */}
                    <button 
                        onClick={() => setPlayMode(playMode === 'continuous' ? 'repeat' : 'continuous')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-black active:scale-95 ${
                            playMode === 'repeat' 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/5' 
                            : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                        title={playMode === 'repeat' ? "1문제 반복 중" : "전체 연속 재생 중"}
                    >
                        {playMode === 'repeat' ? <RotateCcw size={14} /> : <PlayCircle size={14} />}
                        <span className="hidden xs:inline">{playMode === 'repeat' ? '1문제 반복' : '연속 재생'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
