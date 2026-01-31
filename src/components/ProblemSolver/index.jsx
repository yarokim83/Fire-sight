import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp } from 'firebase/firestore'; 
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen, CheckCircle2 as OIcon,
    RefreshCw, Plus, Link, Target, Calculator, Highlighter
} from 'lucide-react';

// 절대 경로 사용으로 빌드 에러 방지
import { SUBJECT_LIST, PROBLEM_TYPES } from '/src/utils/constants';

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete }) {
    // --- [1. 상태 관리: 학습 및 시스템] ---
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); 
    const [userAnswer, setUserAnswer] = useState('');
    const [gradingResult, setGradingResult] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);

    // --- [2. 상태 관리: 편집 및 부가기능] ---
    const [isEditMode, setIsEditMode] = useState(false);
    const [showMemo, setShowMemo] = useState(false);
    const [memoText, setMemoText] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);

    // --- [3. 상태 관리: 드로잉 및 캔버스 엔진] ---
    const canvasRef = useRef(null);        
    const overlayCanvasRef = useRef(null); 
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(2);
    const activePointerId = useRef(null);
    const textareaRef = useRef(null);

    // --- [4. 🔴 근본 해결: 로드 시 모든 가능성 있는 Numbers 통합 수화] ---
    useEffect(() => {
        const p = problems && problems[currentIndex];
        if (p) {
            // 🔴 root level 'numbers'와 'gradingPoints' 내부 데이터를 강제 병합하여 유실 방지
            const rootNumbers = Array.isArray(p.numbers) ? p.numbers : [];
            const dbNumbers = p.gradingPoints?.mandatory_numbers || [];
            const mergedNumbers = Array.from(new Set([...rootNumbers, ...dbNumbers]))
                .map(n => String(n).trim())
                .filter(n => n !== "" && n !== "null");

            const rootKeywords = Array.isArray(p.keywords) ? p.keywords : [];
            const dbTerms = p.gradingPoints?.mandatory_terms || [];
            const mergedTerms = Array.from(new Set([...rootKeywords, ...dbTerms]))
                .map(t => String(t).trim())
                .filter(t => t !== "");

            setCurrentProblem({
                ...p,
                gradingPoints: {
                    mandatory_terms: mergedTerms,
                    mandatory_numbers: mergedNumbers
                },
                // 필드명 불일치 해소 (content/answer 통합)
                question: p.content || p.question || '',
                modelAnswer: p.answer || p.modelAnswer || ''
            });

            setLocalProblemImages(p.images || []);
            setLocalAnswerImages(p.answerImages || []);
            setMemoText(p.memo || '');
            setUserAnswer('');
            setShowAnswer(false);
            setShowMemo(false);
            setIsEditMode(false);
            setIsOverlayMode(false);
            setGradingResult(null);
            setIsRetrying(false); 
            
            setInputMode(p.problemType === 'drawing' || p.problemType === 'calculation' ? 'draw' : 'text');
            document.querySelector('.problem-container')?.scrollTo(0, 0);
        }
    }, [currentIndex, problems]);

    useEffect(() => {
        if (isRetrying && textareaRef.current) {
            textareaRef.current.style.height = 'auto'; 
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; 
        }
    }, [userAnswer, isRetrying]);

    // --- [5. iOS 터치 방지 및 포인터 이벤트 엔진 (유지)] ---
    useEffect(() => {
        if (isOverlayMode) {
            const style = document.createElement('style');
            style.id = 'drawing-mode-lock';
            style.innerHTML = `*{-webkit-touch-callout:none!important;-webkit-user-select:none!important;user-select:none!important;touch-action:none!important;}`;
            document.head.appendChild(style);
        } else {
            const style = document.getElementById('drawing-mode-lock');
            if (style) style.remove();
        }
    }, [isOverlayMode]);

    useEffect(() => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : (inputMode === 'draw' ? canvasRef.current : null);
        if (!activeCanvas) return;
        const preventAll = (e) => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); };
        const options = { passive: false };
        const events = ['touchstart','touchmove','touchend','touchcancel','click','dblclick','selectstart','contextmenu'];
        events.forEach(evt => activeCanvas.addEventListener(evt, preventAll, options));
        return () => { events.forEach(evt => activeCanvas.removeEventListener(evt, preventAll, options)); };
    }, [isOverlayMode, inputMode]);

    // --- [6. 캔버스 엔진: 🔴 색상 변경 시 드로잉 유실 방지 로직] ---
    useEffect(() => {
        const updateCanvasSize = () => {
            const activeCanvas = isOverlayMode ? overlayCanvasRef.current : (inputMode === 'draw' ? canvasRef.current : null);
            if (activeCanvas) {
                const parent = activeCanvas.parentElement;
                // 크기 지정 시 기존 내용이 초기화되므로 크기 변경 시에만 작동
                if (activeCanvas.width !== parent.clientWidth || activeCanvas.height !== parent.clientHeight) {
                    activeCanvas.width = isOverlayMode ? window.innerWidth : parent.clientWidth;
                    activeCanvas.height = isOverlayMode ? window.innerHeight : parent.clientHeight;
                    const ctx = activeCanvas.getContext('2d');
                    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                }
            }
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [inputMode, isOverlayMode]); 

    // 🔴 펜 스타일 및 보정된 색상 업데이트
    useEffect(() => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) {
            const ctx = activeCanvas.getContext('2d');
            ctx.strokeStyle = penColor;
            
            // 🔴 형광펜 색상 보정: 탁한 녹색 제거 -> 선명한 네온 옐로우
        if (penColor === '#bef26480' || penColor === '#fdfd96aa') { 
            ctx.strokeStyle = '#fdfd96aa'; // 맑은 노란색으로 교체
            ctx.globalCompositeOperation = 'multiply'; // 글자가 비치도록 설정
            ctx.lineWidth = 25; 
            }
            else if (penColor === '#ffffff') { // 지우개
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = 60; // 3배 확대
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.lineWidth = lineWidth;
            }
        }
    }, [penColor, lineWidth, isOverlayMode, inputMode]);

    // 드로잉 핸들러 (유지)
    const startDrawing = (e) => {
        e.preventDefault(); if (e.nativeEvent.pointerType !== 'pen' && e.nativeEvent.pointerType !== 'mouse') return;
        activePointerId.current = e.pointerId;
        if (e.target.setPointerCapture) try { e.target.setPointerCapture(e.pointerId); } catch(err) {}
        const ctx = e.target.getContext('2d');
        const rect = e.target.getBoundingClientRect();
        ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        setIsDrawing(true);
    };
    const draw = (e) => {
        e.preventDefault(); if (!isDrawing || e.pointerId !== activePointerId.current) return;
        const ctx = e.target.getContext('2d');
        const rect = e.target.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
    };
    const stopDrawing = (e) => { if (e.pointerId === activePointerId.current) { setIsDrawing(false); activePointerId.current = null; } };
    const clearCurrentCanvas = () => {
        const activeCanvas = isOverlayMode ? overlayCanvasRef.current : canvasRef.current;
        if (activeCanvas) activeCanvas.getContext('2d').clearRect(0, 0, activeCanvas.width, activeCanvas.height);
    };

    // --- [🔴 8. 정밀 채점 로직: 수치 데이터 바인딩 및 handleNext 복구] ---
    const analyzeAnswer = () => {
        if (!currentProblem) return null;
        const terms = currentProblem.gradingPoints?.mandatory_terms || [];
        const numbers = currentProblem.gradingPoints?.mandatory_numbers || [];

        if (inputMode === 'draw' || !userAnswer.trim()) {
            return { percentage: 0, matchedTerms: [], matchedNumbers: [], missingTerms: terms, missingNumbers: numbers, manualGradingRequired: true };
        }

        const normalize = (text) => String(text).replace(/\s+/g, '').toLowerCase();
        const normalizedInput = normalize(userAnswer);

        const matchedTerms = terms.filter(t => normalizedInput.includes(normalize(t)));
        const matchedNumbers = numbers.filter(n => normalizedInput.includes(normalize(n)));

        let finalScore = 0;
        if (terms.length > 0 && numbers.length > 0) finalScore = (matchedTerms.length/terms.length * 40) + (matchedNumbers.length/numbers.length * 60);
        else if (terms.length > 0) finalScore = (matchedTerms.length/terms.length * 100);
        else if (numbers.length > 0) finalScore = (matchedNumbers.length/numbers.length * 100);

        return { 
            percentage: Math.round(finalScore), 
            matchedTerms, matchedNumbers, // 🔴 UI 리포트 출력용
            missingTerms: terms.filter(t => !matchedTerms.includes(t)),
            missingNumbers: numbers.filter(n => !matchedNumbers.includes(n)),
            manualGradingRequired: (terms.length === 0 && numbers.length === 0) 
        };
    };

    const handleNext = () => {
        if (currentIndex < problems.length - 1) setCurrentIndex(prev => prev + 1);
        else onComplete();
    };

    const handleSubmit = async () => {
        const res = analyzeAnswer();
        setGradingResult(res); setShowAnswer(true);
        if (inputMode === 'text' && userAnswer.trim() && !res.manualGradingRequired) {
            await updateProblemResult(currentProblem.id, res.percentage);
        }
    };

    const handleRetrySubmit = async () => {
        const res = analyzeAnswer();
        setGradingResult(res); setIsRetrying(false);  
        if (!res.manualGradingRequired) await updateProblemResult(currentProblem.id, res.percentage);
    };

    // --- [🔴 9. 저장 로직 강화: 모든 필드 동시 업데이트로 유실 차단] ---
    const handleSaveEdit = async () => {
        try {
            const cleanTerms = currentProblem.gradingPoints.mandatory_terms.map(t => String(t).trim()).filter(t => t !== "");
            const cleanNumbers = currentProblem.gradingPoints.mandatory_numbers.map(n => String(n).trim()).filter(n => n !== "");

            const updateData = {
                title: currentProblem.title,
                content: currentProblem.question,
                answer: currentProblem.modelAnswer,
                gradingPoints: {
                    mandatory_terms: cleanTerms,
                    mandatory_numbers: cleanNumbers
                },
                keywords: cleanTerms, // 백업 필드
                numbers: cleanNumbers, // 백업 필드
                subject: currentProblem.subject || currentProblem.category, 
                problemType: currentProblem.problemType,
                source: currentProblem.source || ""
            };

            await updateProblemInfo(currentProblem.id, updateData);
            setIsEditMode(false);
            alert("데이터가 안전하게 동기화되어 저장되었습니다! ✅");
        } catch (e) { alert("저장 에러"); }
    };

    const handleManualGrade = async (isCorrect) => {
        const score = isCorrect ? 100 : 0;
        await updateProblemResult(currentProblem.id, score);
        handleNext();
    };

    const handleSaveMemo = async () => {
        await updateProblemInfo(currentProblem.id, { memo: memoText });
        setCurrentProblem(prev => ({ ...prev, memo: memoText }));
        alert("메모 저장 완료! 📝");
    };

    const handleDeleteImage = async (type, imageUrl) => {
        if (!window.confirm("삭제?")) return;
        try {
            const fileRef = ref(storage, imageUrl);
            await deleteObject(fileRef).catch(e => console.warn(e));
            const docRef = doc(db, "workbook", currentProblem.id);
            if (type === 'problem') {
                await updateDoc(docRef, { images: arrayRemove(imageUrl) });
                setLocalProblemImages(prev => prev.filter(url => url !== imageUrl));
            } else {
                await updateDoc(docRef, { answerImages: arrayRemove(imageUrl) });
                setLocalAnswerImages(prev => prev.filter(url => url !== imageUrl));
            }
        } catch (e) { alert("삭제 실패"); }
    };

    const handleAnswerImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentProblem) return;
        try {
            const storagePath = `workbook_images/${currentProblem.id}/answer_${Date.now()}_${file.name}`;
            const fileRef = ref(storage, storagePath);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            const docRef = doc(db, "workbook", currentProblem.id);
            await updateDoc(docRef, { answerImages: arrayUnion(downloadUrl) });
            setLocalAnswerImages(prev => [...prev, downloadUrl]);
            alert("이미지가 추가되었습니다. ✅");
        } catch (error) { alert("업로드 실패"); }
    };

    // --- [10. UI 렌더링 서브 컴포넌트: 하이라이트] ---
    const HighlightedUserAnswer = () => {
        if (!gradingResult) return <p className="text-slate-700 whitespace-pre-wrap">{userAnswer}</p>;
        const allMatched = [...gradingResult.matchedTerms, ...gradingResult.matchedNumbers];
        if (allMatched.length === 0) return <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg">{userAnswer}</p>;
        const pattern = new RegExp(`(${allMatched.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
        const parts = userAnswer.split(pattern);
        return (
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg font-medium">
                {parts.map((part, i) => {
                    const isTerm = gradingResult.matchedTerms.includes(part);
                    const isNum = gradingResult.matchedNumbers.includes(part);
                    if (isTerm || isNum) return <span key={i} className={`font-black px-1.5 rounded mx-0.5 border ${isTerm ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : 'text-blue-700 bg-blue-100 border-blue-200'}`}>{part}</span>;
                    return part;
                })}
            </p>
        );
    };

    if (!currentProblem) return <div className="p-10 text-center text-white font-black">FireSight Data Hydrating...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            {/* Header 섹션: Edit3 및 메뉴 완벽 유지 */}
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"><ArrowLeft size={18} /> 목록</button>
                    <button onClick={() => setIsOverlayMode(!isOverlayMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${isOverlayMode ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Pen size={14} /> {isOverlayMode ? "연습장 끄기" : "연습장 모드"}
                    </button>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setShowMemo(!showMemo)} className={`p-2.5 rounded-xl transition-all ${showMemo ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><StickyNote size={20} /></button>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2.5 rounded-xl transition-all ${isEditMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><Edit3 size={20} /></button>
                    <button onClick={() => {if(window.confirm("삭제?")) { deleteProblem(currentProblem.id); onBack(); }}} className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/20"><Trash2 size={20} /></button>
                </div>
            </div>

            <div className="problem-container flex-1 overflow-y-auto p-4 md:p-8 pb-40 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* [섹션 1] 문제 카드: 수정 모드 데이터 수화 연동 */}
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                        {isEditMode ? (
                            <div className="space-y-5 animate-in zoom-in-95">
                                <div className="flex gap-3">
                                    <select value={currentProblem.subject} onChange={(e) => setCurrentProblem({...currentProblem, subject: e.target.value})} className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-xl px-4 py-2 outline-none">{SUBJECT_LIST.map(subj => <option key={subj} value={subj}>{subj}</option>)}</select>
                                    <select value={currentProblem.problemType} onChange={(e) => setCurrentProblem({...currentProblem, problemType: e.target.value})} className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-xl px-4 py-2 outline-none">{PROBLEM_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
                                </div>
                                <input value={currentProblem.title} onChange={(e) => setCurrentProblem({...currentProblem, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black text-lg focus:border-blue-500 outline-none" />
                                <textarea value={currentProblem.question} onChange={(e) => setCurrentProblem({...currentProblem, question: e.target.value})} className="w-full h-40 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 leading-relaxed outline-none" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Terms (용어)</label>
                                        <input 
                                            value={currentProblem.gradingPoints?.mandatory_terms?.join(', ') || ''} 
                                            onChange={(e) => setCurrentProblem({
                                                ...currentProblem, 
                                                gradingPoints: { ...currentProblem.gradingPoints, mandatory_terms: e.target.value.split(',').map(v=>v.trim()) }
                                            })} 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Numbers (수치)</label>
                                        <input 
                                            value={currentProblem.gradingPoints?.mandatory_numbers?.join(', ') || ''} 
                                            onChange={(e) => setCurrentProblem({
                                                ...currentProblem, 
                                                gradingPoints: { ...currentProblem.gradingPoints, mandatory_numbers: e.target.value.split(',').map(v=>v.trim()) }
                                            })} 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white font-bold text-blue-400" 
                                        />
                                    </div>
                                </div>
                                <button onClick={handleSaveEdit} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl transform active:scale-95 transition-all">수정 사항 통합 저장</button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl md:text-3xl font-black text-white mb-8 leading-tight tracking-tight break-keep">{currentProblem.title}</h1>
                                {localProblemImages.length > 0 && <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={()=>{}} />}
                                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-relaxed text-lg font-medium mt-6">{currentProblem.question}</div>
                            </>
                        )}
                    </div>

                    {/* [섹션 2] 정답 입력창: 드로잉 및 형광펜 툴바 완벽 복구 */}
                    {!showAnswer && !isOverlayMode && (
                        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden border-2 border-slate-800 focus-within:border-blue-500 transition-all relative group">
                            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex gap-3">
                                    <button onClick={() => setInputMode('text')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><Type size={14} /> TEXT</button>
                                    <button onClick={() => setInputMode('draw')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><PenTool size={14} /> DRAW</button>
                                </div>
                                {inputMode === 'draw' && (
                                    <div className="flex items-center gap-3 animate-in slide-in-from-right-2">
                                        {['#000000', '#ef4444', '#3b82f6'].map(color => (
                                            <button key={color} onClick={() => {setPenColor(color); setLineWidth(2)}} className={`w-7 h-7 rounded-full border-2 transition-transform ${penColor === color && lineWidth === 2 ? 'border-blue-500 scale-125 shadow-lg' : 'border-white'}`} style={{ backgroundColor: color }} />
                                        ))}
                                        <button onClick={() => {setPenColor('#fdfd96aa'); setLineWidth(25)}} className={`w-7 h-7 rounded-full border-2 transition-transform ${penColor === '#fdfd96aa' ? 'border-blue-500 scale-125' : 'border-white'}`} style={{ backgroundColor: '#fdfd96' }} title="형광펜" />
                                        <button onClick={() => {setPenColor('#ffffff'); setLineWidth(60)}} className={`p-1.5 rounded-lg ${penColor === '#ffffff' ? 'bg-blue-100 text-blue-600 shadow-inner' : 'text-slate-500'}`}><Eraser size={18} /></button>
                                        <button onClick={clearCurrentCanvas} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"><RotateCcw size={18} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="relative w-full h-[450px] bg-white"> 
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 서술하세요..." className="w-full h-full p-8 text-slate-900 text-xl font-bold leading-relaxed outline-none resize-none border-none placeholder:text-slate-300 shadow-inner" spellCheck="false" />
                                ) : (
                                    <canvas ref={canvasRef} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full bg-slate-50 touch-none" />
                                )}
                            </div>
                            <div className="absolute bottom-8 right-8 z-50">
                                <button onClick={handleSubmit} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.5rem] font-black shadow-2xl transition-all transform active:scale-95 group-hover:scale-105"><Check size={24} /> 제출하기</button>
                            </div>
                        </div>
                    )}

                    {/* [섹션 3] 채점 결과 및 모범 답안: 🔴 정답 이미지 및 수치(Numbers) 표시 완벽 복구 */}
                    {showAnswer && gradingResult && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700 pb-32">
                            <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl gap-8">
                                <div className="flex items-center gap-6">
                                    <div className={`p-5 rounded-3xl ${gradingResult.percentage >= 70 ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-amber-500/20 text-amber-500'}`}>
                                        {gradingResult.percentage >= 70 ? <Trophy size={48} /> : <RefreshCcw size={48} />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Learning Accuracy</p>
                                        <p className={`text-5xl font-black ${gradingResult.percentage >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {gradingResult.percentage}%
                                            <span className="text-sm text-slate-500 font-bold ml-4">({gradingResult.matchedTerms.length + gradingResult.matchedNumbers.length} matched)</span>
                                        </p>
                                    </div>
                                </div>
                                <button onClick={handleNext} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-slate-700 shadow-xl active:scale-95">다음 학습 <ChevronRight size={24} /></button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-2xl h-full flex flex-col">
                                    <h3 className="text-slate-900 font-black flex items-center gap-3 text-xl mb-8"><CheckCircle2 size={28} className="text-blue-600" /> 나의 답안 분석</h3>
                                    <div className={`flex-1 p-8 bg-slate-50 rounded-3xl border border-slate-100 min-h-[350px] shadow-inner`}>
                                        {isRetrying ? (
                                            <div className="flex flex-col h-full gap-5">
                                                <textarea ref={textareaRef} value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} className="w-full flex-1 bg-white p-6 rounded-2xl border-2 border-slate-200 outline-none resize-none text-slate-900 text-lg font-bold" autoFocus />
                                                <button onClick={handleRetrySubmit} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95">재채점 실시</button>
                                            </div>
                                        ) : <HighlightedUserAnswer />}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-emerald-950/20 rounded-[2.5rem] p-10 border border-emerald-900/50 shadow-2xl relative group/answer">
                                        <h3 className="text-emerald-400 font-black text-xl mb-8 flex items-center justify-between">
                                            <div className="flex items-center gap-3"><BookOpen size={30} /> Model Answer</div>
                                            {isEditMode && <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-xl cursor-pointer shadow-lg"><Plus size={16} /> ADD IMAGE<input type="file" accept="image/*" className="hidden" onChange={handleAnswerImageUpload} /></label>}
                                        </h3>
                                        
                                        {localAnswerImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                {localAnswerImages.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40 group/img">
                                                        <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-all duration-500" onClick={() => setZoomImage(url)} />
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteImage('answer', url); }} className="absolute top-2 right-2 bg-red-600 p-2.5 rounded-xl opacity-0 group-hover/img:opacity-100 transition-all transform hover:scale-110 shadow-2xl"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="prose prose-invert max-w-none text-emerald-50/90 whitespace-pre-line leading-relaxed text-lg font-black tracking-tight select-text shadow-sm">
                                            {currentProblem.modelAnswer || "해설이 등록되지 않았습니다."}
                                        </div>
                                    </div>
                                    
                                    {/* 🔴 [복구 및 수정] 정밀 매칭 피드백 리포트 (Numbers 섹션 완벽 복구) */}
                                    {!gradingResult.manualGradingRequired && (
                                        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-right-4 duration-700">
                                            <div className="p-6 bg-emerald-950/10 rounded-3xl border border-emerald-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={14} /> Mandatory Terms (40%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedTerms.map(t => <span key={t} className="px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/30">{t}</span>)}
                                                    {gradingResult.missingTerms.map(t => <span key={t} className="px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50">{t}</span>)}
                                                </div>
                                            </div>
                                            {/* 🔴 Numbers 섹션 완벽 복구 */}
                                            <div className="p-6 bg-blue-950/10 rounded-3xl border border-blue-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2"><Calculator size={14} /> Mandatory Numbers (60%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedNumbers.map(n => <span key={n} className={`px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-950/30`}>{n}</span>)}
                                                    {gradingResult.missingNumbers.map(n => <span key={n} className="px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50">{n}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals: Zoom 유지 */}
            {zoomImage && (
                <div className="fixed inset-0 z-[200] bg-black/98 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setZoomImage(null)}>
                    <img src={zoomImage} alt="Zoomed" className="max-w-full max-h-[95vh] object-contain shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

// 보조 컴포넌트: ImageCarousel (유지)
function ImageCarousel({ images, onZoom, onDelete }) {
    const [index, setIndex] = useState(0);
    const next = () => setIndex((i) => (i + 1) % images.length);
    const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
    if (!images || images.length === 0) return null;
    return (
        <div className="relative w-full max-w-2xl mx-auto aspect-video bg-black/80 rounded-[2rem] overflow-hidden border-2 border-slate-800 group/carousel shadow-2xl select-none">
            <img src={images[index]} alt="Problem" className="w-full h-full object-contain cursor-zoom-in" onClick={() => onZoom(images[index])} />
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur px-4 py-2 rounded-xl text-white text-[10px] font-black tracking-widest flex items-center gap-2 pointer-events-none border border-white/10 shadow-xl opacity-0 group-carousel:opacity-100 transition-opacity"><Maximize2 size={14} /> TAP TO ENLARGE</div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(images[index]); }} className="absolute top-6 right-6 bg-red-600/90 hover:bg-red-500 text-white p-3 rounded-2xl shadow-2xl opacity-0 group-carousel:opacity-100 transition-all transform hover:scale-110 active:scale-90 z-20 border border-red-400/50"><Trash2 size={22} /></button>
            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-emerald-500 text-white p-4 rounded-full transition-all opacity-0 group-carousel:opacity-100 border border-white/5"><ChevronLeft size={32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-emerald-500 text-white p-4 rounded-full transition-all opacity-0 group-carousel:opacity-100 border border-white/5"><ChevronRight size={32} /></button>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl px-6 py-2 rounded-full text-emerald-400 text-xs font-black border border-emerald-500/20 shadow-2xl tracking-widest">{index + 1} / {images.length}</div>
                </>
            )}
        </div>
    );
}