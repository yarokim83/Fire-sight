import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, 
    Pause, 
    ChevronLeft, 
    ChevronRight, 
    RotateCcw, 
    PlayCircle, 
    Clock, 
    Settings,
    Sparkles,
    Trash2,
    RefreshCw,
    CheckCircle,
    X,
    HelpCircle
} from 'lucide-react';
import { saveFile, getFile, deleteFile } from '../../utils/db';

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

// 긴 지문을 문장 단위로 분할하여 iOS WebKit 끊김 문제를 해결하는 함수
const splitIntoSentences = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const sentences = [];
    lines.forEach(line => {
        const parts = line.split(/[.?!]/).map(s => s.trim()).filter(Boolean);
        sentences.push(...parts);
    });
    return sentences.filter(s => s.length > 0);
};

// OpenAI TTS API 호출 함수
const fetchOpenAITTS = async (text, apiKey, voice) => {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: voice || 'alloy',
            response_format: 'mp3'
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API 호출 에러: ${response.statusText}`);
    }

    return await response.blob();
};

// OpenAI TTS API 호출 함수 (4096자 초과 시 문장 단위로 자동 분할 및 병합 지원)
const fetchOpenAITTSWithChunking = async (text, apiKey, voice) => {
    const LIMIT = 4000;
    if (!text) return null;
    if (text.length <= LIMIT) {
        return await fetchOpenAITTS(text, apiKey, voice);
    }

    const sentences = splitIntoSentences(text);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > LIMIT) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            if (sentence.length > LIMIT) {
                let temp = sentence;
                while (temp.length > LIMIT) {
                    chunks.push(temp.substring(0, LIMIT));
                    temp = temp.substring(LIMIT);
                }
                currentChunk = temp;
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    const blobs = [];
    for (const chunk of chunks) {
        const blob = await fetchOpenAITTS(chunk, apiKey, voice);
        blobs.push(blob);
    }

    return new Blob(blobs, { type: 'audio/mp3' });
};

export default function AudioStudyPlayer({ currentProblem, onNext, onPrev, isFirst, isLast }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeStep, setActiveStep] = useState('idle'); // 'idle' | 'title' | 'question' | 'pause' | 'introAnswer' | 'answer' | 'done'
    const [rate, setRate] = useState(1.0); // 1.0, 1.25, 1.5, 2.0
    const [playMode, setPlayMode] = useState('continuous'); // 'repeat' | 'continuous'
    const [selectedVoice, setSelectedVoice] = useState(null);

    // 하이브리드 캐시/API 제어 상태
    const [hasQuestionCache, setHasQuestionCache] = useState(false);
    const [hasAnswerCache, setHasAnswerCache] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('fire_sight_user_openai_key') || '');
    const [premiumVoice, setPremiumVoice] = useState(() => localStorage.getItem('fire_sight_premium_voice') || 'alloy');

    const currentUtteranceRef = useRef(null);
    const currentAudioRef = useRef(null);
    const preloadedQuestionAudioRef = useRef(null);
    const preloadedAnswerAudioRef = useRef(null);
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
            
            // 1순위: Microsoft Online Natural 신경망 음성 (Edge/데스크톱용)
            // 2순위: iOS Siri / Yuna / Premium (애플 모바일 기기용 고품질)
            // 3순위: Google/Apple 기본 음성
            // 4순위: 기본 첫 번째 보이스
            const preferred = 
                koVoices.find(v => v.name.includes('Natural') || v.name.includes('Online')) ||
                koVoices.find(v => v.name.includes('Siri') || v.name.includes('Yuna') || v.name.includes('Premium')) ||
                koVoices.find(v => v.name.includes('Google') || v.name.includes('Apple')) || 
                koVoices[0];
            setSelectedVoice(preferred);
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            cleanupAudio();
        };
    }, []);

    // IndexedDB 캐시 유무 체크
    const checkCacheStatus = async () => {
        if (!currentProblem) return;
        try {
            const qFile = await getFile(`audio_${currentProblem.id}_question`);
            const aFile = await getFile(`audio_${currentProblem.id}_answer`);
            setHasQuestionCache(!!qFile);
            setHasAnswerCache(!!aFile);
        } catch (e) {
            console.error("캐시 검사 에러:", e);
            setHasQuestionCache(false);
            setHasAnswerCache(false);
        }
    };

    // 프리미엄 AI 음성 생성 및 캐싱 실행
    const handleGeneratePremiumAudio = async () => {
        const activeKey = userApiKey.trim() || import.meta.env.VITE_OPENAI_API_KEY || '';
        if (!activeKey) {
            setShowSettings(true);
            alert("프리미엄 AI 음성 생성을 위해 설정 아이콘(⚙️)을 누르고 OpenAI API Key를 등록해 주세요.");
            return;
        }

        setIsGenerating(true);
        try {
            // 1. 지문 오디오 생성
            const cleanQuestion = cleanTextForTTS(currentProblem?.question || currentProblem?.content || '');
            if (cleanQuestion) {
                const questionBlob = await fetchOpenAITTSWithChunking(cleanQuestion, activeKey, premiumVoice);
                if (questionBlob) {
                    await saveFile(`audio_${currentProblem.id}_question`, { type: 'audio/mp3', problemId: currentProblem.id }, questionBlob);
                }
            }

            // 2. 해설 오디오 생성
            const cleanAnswer = cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');
            if (cleanAnswer) {
                const answerBlob = await fetchOpenAITTSWithChunking(cleanAnswer, activeKey, premiumVoice);
                if (answerBlob) {
                    await saveFile(`audio_${currentProblem.id}_answer`, { type: 'audio/mp3', problemId: currentProblem.id }, answerBlob);
                }
            }

            await checkCacheStatus();
            await preloadAudioCache(); // 구워진 캐시 즉시 프리로드 객체에 반영
            alert("프리미엄 AI 음성이 성공적으로 생성되어 기기에 무상 캐싱되었습니다! 즉시 재생 가능합니다.");
        } catch (error) {
            console.error("AI 오디오 생성 실패:", error);
            alert(`오디오 생성에 실패했습니다: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 프리미엄 AI 음성 로컬 캐시 삭제
    const handleDeletePremiumAudio = async () => {
        if (!confirm("이 문제에 구워진 프리미엄 AI 음성 캐시를 삭제하시겠습니까?")) return;
        try {
            await deleteFile(`audio_${currentProblem.id}_question`);
            await deleteFile(`audio_${currentProblem.id}_answer`);
            await checkCacheStatus();
            alert("프리미엄 음성 캐시가 성공적으로 삭제되었습니다.");
        } catch (e) {
            console.error("캐시 삭제 실패:", e);
            alert("캐시 삭제에 실패했습니다.");
        }
    };

    // API 키 및 목소리 설정 저장
    const handleSaveSettings = () => {
        localStorage.setItem('fire_sight_user_openai_key', userApiKey.trim());
        localStorage.setItem('fire_sight_premium_voice', premiumVoice);
        setShowSettings(false);
        alert("설정이 저장되었습니다.");
    };

    // 오디오 캐시 사전 로드 (지연 극복용 Preload)
    const preloadAudioCache = async () => {
        if (!currentProblem) return;
        
        // 이전 프리로드 자원 해제
        if (preloadedQuestionAudioRef.current) {
            URL.revokeObjectURL(preloadedQuestionAudioRef.current.url);
            if (preloadedQuestionAudioRef.current.audio) {
                preloadedQuestionAudioRef.current.audio.src = "";
            }
            preloadedQuestionAudioRef.current = null;
        }
        if (preloadedAnswerAudioRef.current) {
            URL.revokeObjectURL(preloadedAnswerAudioRef.current.url);
            if (preloadedAnswerAudioRef.current.audio) {
                preloadedAnswerAudioRef.current.audio.src = "";
            }
            preloadedAnswerAudioRef.current = null;
        }

        try {
            const qFile = await getFile(`audio_${currentProblem.id}_question`);
            if (qFile && qFile.blob) {
                const url = URL.createObjectURL(qFile.blob);
                const audio = new Audio(url);
                audio.playbackRate = rate;
                audio.load(); // 오디오 리소스 버퍼 로딩 시작
                preloadedQuestionAudioRef.current = { audio, url };
            }

            const aFile = await getFile(`audio_${currentProblem.id}_answer`);
            if (aFile && aFile.blob) {
                const url = URL.createObjectURL(aFile.blob);
                const audio = new Audio(url);
                audio.playbackRate = rate;
                audio.load();
                preloadedAnswerAudioRef.current = { audio, url };
            }
        } catch (e) {
            console.error("오디오 사전 로드 실패:", e);
        }
    };

    // 프리로드 오디오 및 IndexedDB 전면 리셋
    const resetAudioEngine = () => {
        cleanupAudio();
        
        if (preloadedQuestionAudioRef.current) {
            URL.revokeObjectURL(preloadedQuestionAudioRef.current.url);
            if (preloadedQuestionAudioRef.current.audio) {
                preloadedQuestionAudioRef.current.audio.src = "";
            }
            preloadedQuestionAudioRef.current = null;
        }
        if (preloadedAnswerAudioRef.current) {
            URL.revokeObjectURL(preloadedAnswerAudioRef.current.url);
            if (preloadedAnswerAudioRef.current.audio) {
                preloadedAnswerAudioRef.current.audio.src = "";
            }
            preloadedAnswerAudioRef.current = null;
        }
    };

    // 오디오 일시정지 (인스턴스 파괴 없음)
    const cleanupAudio = () => {
        window.speechSynthesis.cancel();
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
        }
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };

    // 프리로드된 오디오 즉각 재생기 (딜레이 0초)
    const playPreloadedAudio = (type, onEnd) => {
        cleanupAudio();

        const preloadObj = type === 'question' ? preloadedQuestionAudioRef.current : preloadedAnswerAudioRef.current;
        
        if (preloadObj && preloadObj.audio) {
            const { audio, url } = preloadObj;
            audio.playbackRate = rate;
            
            audio.onended = () => {
                currentAudioRef.current = null;
                if (isPlayingRef.current) {
                    onEnd();
                }
            };

            audio.onerror = (e) => {
                console.error("프리로드 오디오 재생 에러 (Fallback TTS 구동):", e);
                currentAudioRef.current = null;
                onEnd(); // Fallback 진행
            };

            currentAudioRef.current = audio;
            audio.playbackRate = rate;
            audio.play().then(() => {
                audio.playbackRate = rate;
            }).catch(err => {
                console.error("프리로드 play() 인터랙션 거부 (Fallback TTS 구동):", err);
                currentAudioRef.current = null;
                onEnd();
            });
        } else {
            // 프리로드 데이터가 유효하지 않으면 Fallback 진행
            onEnd();
        }
    };

    // 기본 Web Speech API 음성 낭독 함수
    const speakText = (text, onEndCallback) => {
        window.speechSynthesis.cancel();
        if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);

        if (!text) {
            onEndCallback();
            return;
        }

        const sentences = splitIntoSentences(text);
        if (sentences.length === 0) {
            onEndCallback();
            return;
        }

        speakQueue(sentences, 0, onEndCallback);
    };

    // 문장 큐 순차 낭독 재귀 함수
    const speakQueue = (sentences, index, onEndCallback) => {
        if (!isPlayingRef.current) return;

        if (index >= sentences.length) {
            onEndCallback();
            return;
        }

        const sentenceText = sentences[index];
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.lang = 'ko-KR';
        utterance.rate = rate;
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
            if (isPlayingRef.current) {
                speakQueue(sentences, index + 1, onEndCallback);
            }
        };

        utterance.onerror = (e) => {
            console.error("큐 낭독 에러:", e);
            if (e.error !== 'interrupted' && isPlayingRef.current) {
                speakQueue(sentences, index + 1, onEndCallback);
            }
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // Active Recall 낭독 시퀀스 러너
    const runSequence = async (step) => {
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
                if (preloadedQuestionAudioRef.current) {
                    playPreloadedAudio('question', () => {
                        runSequence('pause');
                    });
                } else {
                    const cleanQuestion = cleanTextForTTS(currentProblem?.question || currentProblem?.content || '');
                    speakText(cleanQuestion, () => {
                        runSequence('pause');
                    });
                }
                break;
            }
            case 'pause': {
                cleanupAudio();
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
                if (preloadedAnswerAudioRef.current) {
                    playPreloadedAudio('answer', () => {
                        runSequence('done');
                    });
                } else {
                    const cleanAnswer = cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');
                    speakText(cleanAnswer, () => {
                        runSequence('done');
                    });
                }
                break;
            }
            case 'done': {
                setIsPlaying(false);
                setActiveStep('idle');
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
            cleanupAudio();
        } else {
            // iOS / Safari의 비동기 Autoplay 차단 정책 우회용 오디오 엔진 언락 (유저 터치 이벤트 스택 내 즉시 기동)
            try {
                if (preloadedQuestionAudioRef.current && preloadedQuestionAudioRef.current.audio) {
                    const qAudio = preloadedQuestionAudioRef.current.audio;
                    qAudio.play().then(() => {
                        qAudio.pause();
                    }).catch(e => console.log("Question Audio Unlock Attempt: ", e));
                }
                if (preloadedAnswerAudioRef.current && preloadedAnswerAudioRef.current.audio) {
                    const aAudio = preloadedAnswerAudioRef.current.audio;
                    aAudio.play().then(() => {
                        aAudio.pause();
                    }).catch(e => console.log("Answer Audio Unlock Attempt: ", e));
                }
            } catch (err) {
                console.warn("Audio Context Autoplay Unlock warning: ", err);
            }

            setIsPlaying(true);
        }
    };

    // 플레이어 제어용 Effect
    useEffect(() => {
        if (isPlaying) {
            if (activeStep === 'question' || activeStep === 'answer') {
                if (currentAudioRef.current && currentAudioRef.current.paused) {
                    // 일시정지되었던 프리미엄 음성이 있으면 즉시 이어서 재생 (딜레이 없음)
                    currentAudioRef.current.play().catch(e => {
                        console.error("오디오 복구 실패, 처음부터 재시작:", e);
                        runSequence(activeStep);
                    });
                } else {
                    runSequence(activeStep);
                }
            } else {
                runSequence(activeStep === 'idle' || activeStep === 'done' ? 'title' : activeStep);
            }
        } else {
            cleanupAudio();
        }
    }, [isPlaying]);

    // 배속이 실시간 변경될 때 오디오 객체에 즉시 반영 (리로드 방지)
    useEffect(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.playbackRate = rate;
        }
        if (preloadedQuestionAudioRef.current && preloadedQuestionAudioRef.current.audio) {
            preloadedQuestionAudioRef.current.audio.playbackRate = rate;
        }
        if (preloadedAnswerAudioRef.current && preloadedAnswerAudioRef.current.audio) {
            preloadedAnswerAudioRef.current.audio.playbackRate = rate;
        }
    }, [rate]);

    // 문제가 전환될 때만 낭독 리로드 및 프리로드 재가동
    useEffect(() => {
        resetAudioEngine();
        checkCacheStatus();
        preloadAudioCache();

        if (isPlaying) {
            runSequence('title');
        } else {
            setActiveStep('idle');
        }
    }, [currentProblem]);

    // 언마운트 시 엔진 전면 리셋
    useEffect(() => {
        return () => {
            resetAudioEngine();
        };
    }, []);

    const hasAnswerText = !!cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');
    const isFullyCached = hasQuestionCache && (!hasAnswerText || hasAnswerCache);

    return (
        <div className="font-sans fixed top-20 right-4 w-72 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 p-3 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-50 transition-all duration-300 animate-in fade-in slide-in-from-top-3">
            <div className="flex flex-col gap-2.5 relative">
                {/* 1. 상단: 진행 상태 & 재생 컨트롤 */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    {/* 왼쪽: 진행 상태 */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ${isPlaying ? 'animate-pulse' : 'opacity-60'}`} />
                        <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">
                            {activeStep === 'title' && "📌 제목 낭독 중"}
                            {activeStep === 'question' && (hasQuestionCache ? "✨ 프리미엄 지문" : "📖 지문 낭독")}
                            {activeStep === 'pause' && "⏳ 묵음 대기 (3초)"}
                            {activeStep === 'introAnswer' && "📢 해설 준비"}
                            {activeStep === 'answer' && (hasAnswerCache ? "✨ 프리미엄 해설" : "💡 해설 낭독")}
                            {activeStep === 'idle' && ""}
                        </span>
                    </div>

                    {/* 오른쪽: 핵심 재생 컨트롤 */}
                    <div className="flex items-center gap-1">
                        {/* 다음 문제 이동 (좌측 버튼) */}
                        <button 
                            onClick={onNext} 
                            disabled={isLast}
                            className={`p-1 rounded transition-all ${isLast ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                            title="다음 문제"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* 재생/일시정지 토글 버튼 */}
                        <button 
                            onClick={handleTogglePlay}
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all shadow-sm shadow-emerald-500/10 active:scale-95 flex items-center justify-center"
                            title={isPlaying ? "일시정지" : "재생"}
                        >
                            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        </button>

                        {/* 이전 문제 이동 (우측 버튼) */}
                        <button 
                            onClick={onPrev} 
                            disabled={isFirst}
                            className={`p-1 rounded transition-all ${isFirst ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                            title="이전 문제"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* 2. 하단: 배속, 캐싱, 세팅 */}
                <div className="flex items-center justify-between gap-2">
                    {/* 배속 조절 */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 px-2 py-0.5 rounded-lg">
                        <Clock size={10} className="text-slate-400" />
                        <select 
                            value={rate} 
                            onChange={(e) => setRate(parseFloat(e.target.value))}
                            className="bg-transparent text-slate-300 text-[9px] font-black outline-none cursor-pointer focus:text-white"
                        >
                            <option value="1.0" className="bg-slate-950 text-white">1.0x</option>
                            <option value="1.25" className="bg-slate-950 text-white">1.25x</option>
                            <option value="1.5" className="bg-slate-950 text-white">1.5x</option>
                            <option value="2.0" className="bg-slate-950 text-white">2.0x</option>
                        </select>
                    </div>

                    {/* 프리미엄 캐싱 및 세팅 */}
                    <div className="flex items-center gap-1.5">
                        {/* 프리미엄 목소리 굽기/제거 */}
                        <div className="flex items-center gap-1">
                            {isGenerating ? (
                                <button className="p-1.5 bg-slate-900 text-emerald-400 rounded-lg animate-spin cursor-not-allowed">
                                    <RefreshCw size={12} />
                                </button>
                            ) : (
                                <button 
                                    onClick={handleGeneratePremiumAudio}
                                    className={`p-1.5 rounded-lg transition-all ${
                                        isFullyCached
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                                        : 'bg-slate-900 text-amber-400 border border-slate-800 hover:bg-slate-800 hover:text-amber-300 active:scale-95'
                                    }`}
                                    title={isFullyCached ? "프리미엄 AI 음성 캐싱됨" : "프리미엄 AI 음성 생성 및 캐싱"}
                                >
                                    <Sparkles size={12} fill={isFullyCached ? "currentColor" : "none"} />
                                </button>
                            )}

                            {(hasQuestionCache || hasAnswerCache) && !isGenerating && (
                                <button 
                                    onClick={handleDeletePremiumAudio}
                                    className="p-1.5 bg-slate-900 text-red-400 border border-slate-800 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all active:scale-95"
                                    title="프리미엄 음성 캐시 삭제"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>

                        <div className="h-4 w-[1px] bg-slate-800" />

                        {/* 세팅 토글 기어 버튼 */}
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-1.5 rounded-lg transition-all ${showSettings ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="OpenAI API 키 설정"
                        >
                            <Settings size={12} />
                        </button>
                    </div>
                </div>

                {/* API Key 입력 팝오버 세팅 패널 */}
                {showSettings && (
                    <div className="absolute top-full mt-2 right-0 w-64 bg-slate-950/98 border border-slate-800 rounded-xl p-3 shadow-2xl z-50 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-white flex items-center gap-1.5"><Settings size={11} /> OpenAI TTS 프리미엄 설정</span>
                            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">개인 OpenAI API Key</label>
                                <input 
                                    type="password"
                                    value={userApiKey}
                                    onChange={(e) => setUserApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder:text-slate-700 focus:border-blue-500 outline-none transition-all"
                                />
                                <p className="text-[7.5px] text-slate-500 mt-1 leading-normal">
                                    ※ 입력된 키는 사용자의 브라우저(`localStorage`)에만 저장되어 API 직접 낭독에만 사용됩니다.
                                </p>
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">AI 목소리 스타일</label>
                                <select
                                    value={premiumVoice}
                                    onChange={(e) => setPremiumVoice(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none cursor-pointer"
                                >
                                    <option value="alloy">Alloy (부드럽고 자연스러움)</option>
                                    <option value="echo">Echo (선명하고 또렷함)</option>
                                    <option value="fable">Fable (설득력 있는 나레이터)</option>
                                    <option value="onyx">Onyx (깊고 신뢰감 있는 저음 남성)</option>
                                    <option value="nova">Nova (매끄러운 중고음 여성)</option>
                                    <option value="shimmer">Shimmer (활기차고 부드러움)</option>
                                </select>
                            </div>
                            <button 
                                onClick={handleSaveSettings}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-blue-600/20"
                            >
                                설정을 기기에 저장
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
