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
    HelpCircle,
    ArrowRight,
    Repeat,
    Repeat1
} from 'lucide-react';
import { saveFile, getFile, deleteFile } from '../../utils/db';
import { ref as storageRef, uploadBytes, getBlob, deleteObject, getDownloadURL } from 'firebase/storage';

import { storage, db } from '../../firebase';
import { doc, updateDoc, terminate, clearIndexedDbPersistence } from 'firebase/firestore';


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

// Firebase Storage getBlob 무한 펜딩 우회용 표준 Fetch 다운로드 헬퍼
const downloadBlobFromStorage = async (sRef) => {
    const url = await getDownloadURL(sRef);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`다운로드 실패 (HTTP ${response.status})`);
    }
    return await response.blob();
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
    const [playMode, setPlayMode] = useState(() => localStorage.getItem('fire_sight_play_mode') || 'continuous');
    const [selectedVoice, setSelectedVoice] = useState(null);

    useEffect(() => {
        localStorage.setItem('fire_sight_play_mode', playMode);
    }, [playMode]);

    const handleTogglePlayMode = () => {
        setPlayMode(prev => {
            if (prev === 'single') return 'continuous';
            if (prev === 'continuous') return 'repeat';
            return 'single';
        });
    };

    const getPlayModeDetails = () => {
        switch (playMode) {
            case 'single':
                return {
                    icon: <ArrowRight size={12} className="text-slate-300 animate-pulse" />,
                    label: "단일 재생",
                    title: "한문제만 출력 (현재 문제 완료 후 정지)"
                };
            case 'continuous':
                return {
                    icon: <Repeat size={12} className="text-emerald-400" />,
                    label: "연속 재생",
                    title: "다음문제 출력 (완료 시 다음 문제 자동 연속 재생)"
                };
            case 'repeat':
                return {
                    icon: <Repeat1 size={12} className="text-amber-400" />,
                    label: "한문제 반복",
                    title: "한문제 반복 (현재 문제 무한 반복)"
                };
            default:
                return {
                    icon: <Repeat size={12} className="text-emerald-400" />,
                    label: "연속 재생",
                    title: "다음문제 출력"
                };
        }
    };

    // 하이브리드 캐시/API 제어 상태
    const [hasQuestionCache, setHasQuestionCache] = useState(false);
    const [hasAnswerCache, setHasAnswerCache] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('fire_sight_user_openai_key') || '');
    const [premiumVoice, setPremiumVoice] = useState(() => localStorage.getItem('fire_sight_premium_voice') || 'alloy');
    const [localHasPremiumAudio, setLocalHasPremiumAudio] = useState(false);

    useEffect(() => {
        setLocalHasPremiumAudio(!!currentProblem?.hasPremiumAudio);
    }, [currentProblem?.id]);

    const currentUtteranceRef = useRef(null);
    const currentAudioRef = useRef(null);
    const preloadedQuestionAudioRef = useRef(null);
    const preloadedAnswerAudioRef = useRef(null);
    const pauseTimeoutRef = useRef(null);
    const isPlayingRef = useRef(isPlaying);
    const activeStepRef = useRef(activeStep);

    // ref와 state 동기화 (이벤트 핸들러 내 최신값 참조용)
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        activeStepRef.current = activeStep;
    }, [activeStep]);

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
            alert("프리미엄 AI 음성을 생성을 위해 설정 아이콘(⚙️)을 누르고 OpenAI API Key를 등록해 주세요.");
            return;
        }

        setIsGenerating(true);
        try {
            // 1. 지문 오디오 생성 및 업로드
            const cleanQuestion = cleanTextForTTS(currentProblem?.question || currentProblem?.content || '');
            if (cleanQuestion) {
                const questionBlob = await fetchOpenAITTSWithChunking(cleanQuestion, activeKey, premiumVoice);
                if (questionBlob) {
                    await saveFile(`audio_${currentProblem.id}_question`, { type: 'audio/mp3', problemId: currentProblem.id }, questionBlob);
                    
                    // Firebase Storage 업로드 (단일 depth 경로 answers/audio_tts_...)
                    const qStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_question.mp3`);
                    await uploadBytes(qStorageRef, questionBlob);
                }
            }

            // 2. 해설 오디오 생성 및 업로드
            const cleanAnswer = cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');
            if (cleanAnswer) {
                const answerBlob = await fetchOpenAITTSWithChunking(cleanAnswer, activeKey, premiumVoice);
                if (answerBlob) {
                    await saveFile(`audio_${currentProblem.id}_answer`, { type: 'audio/mp3', problemId: currentProblem.id }, answerBlob);
                    
                    // Firebase Storage 업로드 (단일 depth 경로 answers/audio_tts_...)
                    const aStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_answer.mp3`);
                    await uploadBytes(aStorageRef, answerBlob);
                }
            }

            // 3. Firestore 플래그 갱신 및 로컬 상태 즉각 반영 (Storage 업로드 완료 시에만 실행)
            const docRef = doc(db, "workbook", currentProblem.id);
            await updateDoc(docRef, { hasPremiumAudio: true });
            setLocalHasPremiumAudio(true);

            await checkCacheStatus();
            await preloadAudioCache(); // 구워진 캐시 즉시 프리로드 객체에 반영
            alert("프리미엄 AI 음성이 성공적으로 생성되어 기기에 저장 및 서버 동기화되었습니다! 🎉");
        } catch (error) {
            console.error("AI 오디오 생성 및 서버 업로드 실패:", error);
            alert(`오디오 생성 및 서버 업로드에 실패했습니다.\n에러 내용: ${error.message}\n(API 키 설정 및 인터넷 연결을 확인하세요)`);
        } finally {
            setIsGenerating(false);
        }
    };

    // 프리미엄 AI 음성 로컬 캐시 및 서버 리소스 삭제
    const handleDeletePremiumAudio = async () => {
        if (!confirm("이 문제에 구워진 프리미엄 AI 음성 캐시 및 서버 저장본을 모두 삭제하시겠습니까?")) return;
        setIsGenerating(true);
        try {
            await deleteFile(`audio_${currentProblem.id}_question`);
            await deleteFile(`audio_${currentProblem.id}_answer`);

            // Firebase Storage 파일 삭제
            try {
                const qStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_question.mp3`);
                await deleteObject(qStorageRef);
            } catch (err) {
                console.warn("Storage 지문 오디오 삭제 실패:", err);
            }
            try {
                const aStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_answer.mp3`);
                await deleteObject(aStorageRef);
            } catch (err) {
                console.warn("Storage 해설 오디오 삭제 실패:", err);
            }

            // Firestore 플래그 삭제
            try {
                const docRef = doc(db, "workbook", currentProblem.id);
                await updateDoc(docRef, { hasPremiumAudio: false });
                setLocalHasPremiumAudio(false);
            } catch (e) {
                console.error("Firestore 플래그 해제 실패:", e);
            }

            await checkCacheStatus();
            alert("프리미엄 음성 캐시 및 서버 데이터가 성공적으로 삭제되었습니다.");
        } catch (e) {
            console.error("캐시 삭제 실패:", e);
            alert("캐시 삭제에 실패했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    // 백그라운드 서버 오디오 자동 동기화 기능
    const syncPremiumAudioFromServer = async () => {
        if (!currentProblem || !currentProblem.hasPremiumAudio) return;

        try {
            const cacheKeyQ = `audio_${currentProblem.id}_question`;
            const cacheKeyA = `audio_${currentProblem.id}_answer`;

            const hasQText = !!cleanTextForTTS(currentProblem?.question || currentProblem?.content || '');
            const hasAText = !!cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');

            const qFile = await getFile(cacheKeyQ);
            const aFile = await getFile(cacheKeyA);

            let changed = false;

            // 1. 지문 오디오 동기화 필요 여부 확인
            if (hasQText && !qFile) {
                try {
                    const qStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_question.mp3`);
                    const blob = await downloadBlobFromStorage(qStorageRef);
                    if (blob) {
                        await saveFile(cacheKeyQ, { type: 'audio/mp3', problemId: currentProblem.id }, blob);
                        changed = true;
                    }
                } catch (err) {
                    console.warn("Storage 지문 오디오 다운로드 실패:", err);
                }
            }

            // 2. 해설 오디오 동기화 필요 여부 확인
            if (hasAText && !aFile) {
                try {
                    const aStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_answer.mp3`);
                    const blob = await downloadBlobFromStorage(aStorageRef);
                    if (blob) {
                        await saveFile(cacheKeyA, { type: 'audio/mp3', problemId: currentProblem.id }, blob);
                        changed = true;
                    }
                } catch (err) {
                    console.warn("Storage 해설 오디오 다운로드 실패:", err);
                }
            }

            if (changed) {
                await checkCacheStatus();
                await preloadAudioCache();
            }
        } catch (e) {
            console.error("자동 서버 오디오 동기화 에러:", e);
        }
    };

    // 서버 오디오 수동 강제 동기화 실행 및 진단 기능
    const handleForceSyncAudio = async () => {
        if (!currentProblem) return;
        setIsGenerating(true);
        try {
            const cacheKeyQ = `audio_${currentProblem.id}_question`;
            const cacheKeyA = `audio_${currentProblem.id}_answer`;

            const hasQText = !!cleanTextForTTS(currentProblem?.question || currentProblem?.content || '');
            const hasAText = !!cleanTextForTTS(currentProblem?.modelAnswer || currentProblem?.answer || '');

            let qDownloaded = false;
            let aDownloaded = false;

            // 1. 지문 오디오 동기화
            if (hasQText) {
                try {
                    const qStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_question.mp3`);
                    const blob = await downloadBlobFromStorage(qStorageRef);
                    if (blob) {
                        await saveFile(cacheKeyQ, { type: 'audio/mp3', problemId: currentProblem.id }, blob);
                        qDownloaded = true;
                    }
                } catch (err) {
                    console.error("수동 지문 동기화 실패:", err);
                    alert(`지문 오디오 다운로드 실패: ${err.message}\n(CORS 차단 또는 서버 파일 부재)`);
                }
            }

            // 2. 해설 오디오 동기화
            if (hasAText) {
                try {
                    const aStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_answer.mp3`);
                    const blob = await downloadBlobFromStorage(aStorageRef);
                    if (blob) {
                        await saveFile(cacheKeyA, { type: 'audio/mp3', problemId: currentProblem.id }, blob);
                        aDownloaded = true;
                    }
                } catch (err) {
                    console.error("수동 해설 동기화 실패:", err);
                    alert(`해설 오디오 다운로드 실패: ${err.message}\n(CORS 차단 또는 서버 파일 부재)`);
                }
            }

            await checkCacheStatus();
            await preloadAudioCache();

            if (qDownloaded || aDownloaded) {
                try {
                    const docRef = doc(db, "workbook", currentProblem.id);
                    await updateDoc(docRef, { hasPremiumAudio: true });
                } catch (dbErr) {
                    console.warn("Firestore 플래그 강제 보장 실패:", dbErr);
                }
                setLocalHasPremiumAudio(true);
                alert("서버 프리미엄 음성 동기화 및 로컬 캐싱 완료! 🎉");
            } else {
                if (currentProblem.hasPremiumAudio) {
                    setLocalHasPremiumAudio(true);
                }
                alert("동기화할 새 파일이 없거나 이미 최신 상태입니다.");
            }
        } catch (e) {
            console.error("수동 동기화 에러:", e);
            alert(`동기화 중 오류: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // API 키 및 목소리 설정 저장
    const handleSaveSettings = () => {
        localStorage.setItem('fire_sight_user_openai_key', userApiKey.trim());
        localStorage.setItem('fire_sight_premium_voice', premiumVoice);
        setShowSettings(false);
        alert("설정이 저장되었습니다.");
    };

    // 앱 전체 캐시 초기화 및 새로고침
    const handleClearAppCache = async () => {
        if (!confirm("앱의 모든 캐시(서비스워커, 캐시 스토리지, Firestore 오프라인 데이터)를 초기화하고 새로고침하시겠습니까?\n이 작업은 최신 버전(v3.3.26)을 강제로 받아옵니다.")) return;
        setIsGenerating(true);
        try {
            // 1. Firestore 오프라인 캐시 강제 소거 및 소켓 해제
            try {
                await terminate(db);
                await clearIndexedDbPersistence(db);
            } catch (firestoreErr) {
                console.warn("Firestore 캐시 정리 실패:", firestoreErr);
            }

            // 2. 서비스워커 등록 해제
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 3. Cache Storage 삭제
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    await caches.delete(name);
                }
            }

            alert("앱 캐시 및 오프라인 데이터가 성공적으로 제거되었습니다. 앱을 재부팅합니다.");
            window.location.reload();
        } catch (e) {
            console.error("캐시 제거 실패:", e);
            alert("캐시 제거에 실패했습니다: " + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // 오디오 캐시 사전 로드 (지연 극복용 Preload)
    const preloadAudioCache = async () => {
        if (!currentProblem) return;
        
        // 이전 프리로드 자원 해제
        if (preloadedQuestionAudioRef.current) {
            if (!preloadedQuestionAudioRef.current.isServerUrl && preloadedQuestionAudioRef.current.url) {
                URL.revokeObjectURL(preloadedQuestionAudioRef.current.url);
            }
            if (preloadedQuestionAudioRef.current.audio) {
                preloadedQuestionAudioRef.current.audio.src = "";
            }
            preloadedQuestionAudioRef.current = null;
        }
        if (preloadedAnswerAudioRef.current) {
            if (!preloadedAnswerAudioRef.current.isServerUrl && preloadedAnswerAudioRef.current.url) {
                URL.revokeObjectURL(preloadedAnswerAudioRef.current.url);
            }
            if (preloadedAnswerAudioRef.current.audio) {
                preloadedAnswerAudioRef.current.audio.src = "";
            }
            preloadedAnswerAudioRef.current = null;
        }

        try {
            let qUrl = null;
            const qFile = await getFile(`audio_${currentProblem.id}_question`);
            if (qFile && qFile.blob) {
                qUrl = URL.createObjectURL(qFile.blob);
            } else if (currentProblem.hasPremiumAudio) {
                try {
                    const qStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_question.mp3`);
                    qUrl = await getDownloadURL(qStorageRef);
                } catch (err) {
                    console.warn("지문 다운로드 URL 획득 실패:", err);
                }
            }

            if (qUrl) {
                const audio = new Audio(qUrl);
                audio.playbackRate = rate;
                audio.load(); // 오디오 리소스 버퍼 로딩 시작
                preloadedQuestionAudioRef.current = { audio, url: qUrl, isServerUrl: !qFile };
            }

            let aUrl = null;
            const aFile = await getFile(`audio_${currentProblem.id}_answer`);
            if (aFile && aFile.blob) {
                aUrl = URL.createObjectURL(aFile.blob);
            } else if (currentProblem.hasPremiumAudio) {
                try {
                    const aStorageRef = storageRef(storage, `answers/audio_tts_${currentProblem.id}_answer.mp3`);
                    aUrl = await getDownloadURL(aStorageRef);
                } catch (err) {
                    console.warn("해설 다운로드 URL 획득 실패:", err);
                }
            }

            if (aUrl) {
                const audio = new Audio(aUrl);
                audio.playbackRate = rate;
                audio.load();
                preloadedAnswerAudioRef.current = { audio, url: aUrl, isServerUrl: !aFile };
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
                if (playMode === 'repeat') {
                    runSequence('title');
                } else if (playMode === 'continuous') {
                    if (!isLast) {
                        onNext(true);
                    } else {
                        setIsPlaying(false);
                        setActiveStep('idle');
                    }
                } else {
                    setIsPlaying(false);
                    setActiveStep('idle');
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
            cleanupAudio();
        } else {
            // iOS / Safari의 비동기 Autoplay 차단 정책 우회용 오디오 엔진 언락 및 즉시 재생 재개
            try {
                if (currentAudioRef.current && currentAudioRef.current.paused) {
                    currentAudioRef.current.playbackRate = rate;
                    currentAudioRef.current.play().catch(e => console.log("Current Audio Resume failed: ", e));
                } else {
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
                    // 혹시라도 handleTogglePlay에서 재생 시작이 안 되었을 경우 대비용 예비 재생
                    currentAudioRef.current.playbackRate = rate;
                    currentAudioRef.current.play().catch(e => {
                        console.error("오디오 복구 실패, 처음부터 재시작:", e);
                        runSequence(activeStep);
                    });
                } else if (!currentAudioRef.current) {
                    // Web Speech API용 재생 시작
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
        const applyPlaybackRate = (audioObj) => {
            if (!audioObj) return;
            audioObj.defaultPlaybackRate = rate;
            audioObj.playbackRate = rate;
            
            // Safari/iOS 대응: 재생 중인 경우 일시정지 후 즉시 재개하여 배속 적용 강제화
            if (!audioObj.paused) {
                audioObj.pause();
                audioObj.play().then(() => {
                    audioObj.playbackRate = rate;
                }).catch(e => console.log("Safari speed rate change bypass:", e));
            }
        };

        if (currentAudioRef.current) {
            applyPlaybackRate(currentAudioRef.current);
        }
        if (preloadedQuestionAudioRef.current && preloadedQuestionAudioRef.current.audio) {
            applyPlaybackRate(preloadedQuestionAudioRef.current.audio);
        }
        if (preloadedAnswerAudioRef.current && preloadedAnswerAudioRef.current.audio) {
            applyPlaybackRate(preloadedAnswerAudioRef.current.audio);
        }

        // Web Speech API의 경우 현재 말하고 있다면 즉시 끊고 현 단계 재시작하여 배속 적용
        if (!currentAudioRef.current && isPlayingRef.current && 
            activeStepRef.current !== 'idle' && activeStepRef.current !== 'done' && activeStepRef.current !== 'pause') {
            window.speechSynthesis.cancel();
            runSequence(activeStepRef.current);
        }
    }, [rate]);

    // 문제가 전환될 때만 낭독 리로드 및 프리로드 재가동
    useEffect(() => {
        const loadAndSync = async () => {
            resetAudioEngine();
            await checkCacheStatus();
            await preloadAudioCache();
            
            // 백그라운드 서버 오디오 자동 동기화
            await syncPremiumAudioFromServer();
        };

        loadAndSync();

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
    const isFullyCached = (hasQuestionCache && (!hasAnswerText || hasAnswerCache)) || localHasPremiumAudio;

    return (
        <div className="font-sans fixed bottom-6 left-4 right-4 md:bottom-6 md:left-auto md:top-auto md:right-6 md:w-72 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 p-3 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3">
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
                        {/* 이전 문제 이동 (좌측 버튼) */}
                        <button 
                            onClick={() => onPrev && onPrev(true)} 
                            disabled={isFirst}
                            className={`p-1 rounded transition-all ${isFirst ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                            title="이전 문제"
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

                        {/* 다음 문제 이동 (우측 버튼) */}
                        <button 
                            onClick={() => onNext && onNext(true)} 
                            disabled={isLast}
                            className={`p-1 rounded transition-all ${isLast ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                            title="다음 문제"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* 2. 하단: 배속, 재생모드, 캐싱, 세팅 */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        {/* 배속 조절 */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 px-2 py-0.5 rounded-lg">
                            <Clock size={10} className="text-slate-400" />
                            <select 
                                value={rate} 
                                onChange={(e) => setRate(parseFloat(e.target.value))}
                                className="bg-transparent text-slate-300 text-[9px] font-black outline-none cursor-pointer focus:text-white"
                            >
                                <option value="1" className="bg-slate-950 text-white">1.0x</option>
                                <option value="1.25" className="bg-slate-950 text-white">1.25x</option>
                                <option value="1.5" className="bg-slate-950 text-white">1.5x</option>
                                <option value="2" className="bg-slate-950 text-white">2.0x</option>
                            </select>
                        </div>

                        {/* 재생 모드 순환 버튼 */}
                        <button
                            onClick={handleTogglePlayMode}
                            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 px-1.5 py-0.5 rounded-lg text-slate-300 hover:text-white transition-all active:scale-95"
                            title={getPlayModeDetails().title}
                        >
                            {getPlayModeDetails().icon}
                            <span className="text-[9px] font-black">{getPlayModeDetails().label}</span>
                        </button>
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
                    <div className="absolute bottom-full mb-2 left-0 right-0 md:top-full md:bottom-auto md:mt-2 md:mb-0 md:left-auto md:right-0 md:w-64 bg-slate-950/98 border border-slate-800 rounded-xl p-3 shadow-2xl z-50 animate-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-300">
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

                            {/* 서버 음성 동기화 */}
                            <div className="border-t border-slate-800/80 pt-2.5 mt-2.5 space-y-2">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">서버 음성 동기화</span>
                                <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/40">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-slate-300">서버 저장 상태</span>
                                        <span className="text-[7.5px] text-slate-500">
                                            {localHasPremiumAudio ? "🟢 음성 감지됨" : "⚪ 음성 없음"}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={handleForceSyncAudio}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-[8px] font-black rounded border border-slate-700 transition-all"
                                    >
                                        동기화 호출
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-800/80 pt-2.5 mt-2.5">
                                <button
                                    onClick={handleClearAppCache}
                                    className="w-full py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 text-[9px] font-black rounded-lg border border-red-900/30 transition-all flex items-center justify-center gap-1 active:scale-98"
                                    title="앱 캐시 강제 청소 및 강제 새로고침"
                                >
                                    <RefreshCw size={10} className="animate-spin-slow" />
                                    앱 캐시 초기화 및 새로고침
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
