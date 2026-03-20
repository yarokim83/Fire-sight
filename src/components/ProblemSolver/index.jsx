import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp } from 'firebase/firestore'; 
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import { updateProblemResult, updateProblemMemo, updateProblemInfo, deleteProblem } from '../../utils/db';
import { 
    ChevronLeft, ChevronRight, CheckCircle2, XCircle, 
    BookOpen, Maximize2, Trash2, X, ArrowLeft,
    Type, PenTool, Eraser, RotateCcw, StickyNote, Edit3, Save, ImageIcon,
    Check, Trophy, RefreshCcw, AlertTriangle, Pen, CheckCircle2 as OIcon,
    RefreshCw, Plus, Link, Target, Calculator, Highlighter, Sparkles, EyeOff
} from 'lucide-react';

import { SUBJECT_LIST, PROBLEM_TYPES } from '/src/utils/constants';
import SharedCanvas from '../SharedCanvas';
import DrawingToolbar from './DrawingToolbar';
import ImageCarousel from './ImageCarousel';

export default function ProblemSolver({ problems, startIndex = 0, onBack, onComplete, onEditProblem }) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [inputMode, setInputMode] = useState('text'); 
    const [userAnswer, setUserAnswer] = useState('');
    const [gradingResult, setGradingResult] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);
    const [editedQuestion, setEditedQuestion] = useState('');
    const [editedAnswer, setEditedAnswer] = useState('');
    const [editedTerms, setEditedTerms] = useState([]);
    const [editedNumbers, setEditedNumbers] = useState([]);
    const [newTerm, setNewTerm] = useState('');
    const [newNumber, setNewNumber] = useState('');

    const [showMemo, setShowMemo] = useState(false);
    const [memoText, setMemoText] = useState('');
    const [zoomImage, setZoomImage] = useState(null);
    const [isOverlayMode, setIsOverlayMode] = useState(false);
    const [localProblemImages, setLocalProblemImages] = useState([]);
    const [localAnswerImages, setLocalAnswerImages] = useState([]);
     // 🔴 [신규 추가] 해설 이미지 업로드 상태 및 함수
    const [isUploading, setIsUploading] = useState(false);
    const canvasRef = useRef(null);        
    const overlayCanvasRef = useRef(null); 
    
    const [penColor, setPenColor] = useState('#facc15'); 
    const [lineWidth, setLineWidth] = useState(4);
    const [isEraserMode, setIsEraserMode] = useState(false);

    const textareaRef = useRef(null);

    useEffect(() => {
        const p = problems && problems[currentIndex];
        if (p) {
            const rootNumbers = Array.isArray(p.numbers) ? p.numbers : [];
            const dbNumbers = p.gradingPoints?.mandatory_numbers || [];
            const mergedNumbers = Array.from(new Set([...rootNumbers, ...dbNumbers]))
                .map(n => String(n).trim())
                .filter(n => n !== '' && n !== 'null' && n !== 'undefined');

            const rootKeywords = Array.isArray(p.keywords) ? p.keywords : [];
            const dbTerms = p.gradingPoints?.mandatory_terms || [];
            const mergedTerms = Array.from(new Set([...rootKeywords, ...dbTerms]))
                .map(t => String(t).trim())
                .filter(t => t !== '');

            const formattedQuestion = p.content || p.question || '';
            const formattedAnswer = p.answer || p.modelAnswer || '';

            setCurrentProblem({
                ...p,
                gradingPoints: {
                    mandatory_terms: mergedTerms,
                    mandatory_numbers: mergedNumbers
                },
                question: formattedQuestion,
                modelAnswer: formattedAnswer
            });

            setEditedQuestion(formattedQuestion);
            setEditedAnswer(formattedAnswer);
            setEditedTerms(mergedTerms);
            setEditedNumbers(mergedNumbers);

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

    const addTerm = () => {
        if (newTerm.trim() && !editedTerms.includes(newTerm.trim())) {
            setEditedTerms([...editedTerms, newTerm.trim()]);
            setNewTerm('');
        }
    };

    const addNumber = () => {
        if (newNumber.trim() && !editedNumbers.includes(newNumber.trim())) {
            setEditedNumbers([...editedNumbers, newNumber.trim()]);
            setNewNumber('');
        }
    };

    const clearCurrentCanvas = () => {
        if (isOverlayMode && overlayCanvasRef.current) overlayCanvasRef.current.clear();
        else if (!isOverlayMode && canvasRef.current) canvasRef.current.clear();
    };

    const analyzeAnswer = (answerText = userAnswer) => { 
        if (!currentProblem) return null;
        const terms = currentProblem.gradingPoints?.mandatory_terms || [];
        const numbers = currentProblem.gradingPoints?.mandatory_numbers || [];
        if (inputMode === 'draw' || !answerText.trim()) {
            return { percentage: 0, matchedTerms: [], matchedNumbers: [], missingTerms: terms, missingNumbers: numbers, manualGradingRequired: true };
        }
        
        // 1. 공백 및 개행을 단일 공백으로 단순화
        const normalizedInput = answerText.replace(/\s+/g, ' ');

        // [고도화된 Regex 검사기] 키워드의 각 글자 사이에 최대 3자의 임의 문자(조사, 오타 제한적 허용) 허용
        const buildRegex = (term) => {
            const chars = Array.from(String(term).replace(/\s+/g, ''));
            const escapedChars = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            return new RegExp(escapedChars.join('.{0,3}?'), 'i');
        };

        const matchedTerms = terms.filter(t => buildRegex(t).test(normalizedInput));
        
        // 숫자는 단위 혼동 방지를 위해 오직 공백만 무시하고 스캔
        const normalizedInputForNumbers = answerText.replace(/\s+/g, '').toLowerCase();
        const matchedNumbers = numbers.filter(n => normalizedInputForNumbers.includes(String(n).replace(/\s+/g, '').toLowerCase()));
        
        let finalScore = 0;
        if (terms.length > 0 && numbers.length > 0) finalScore = (matchedTerms.length/terms.length * 40) + (matchedNumbers.length/numbers.length * 60);
        else if (terms.length > 0) finalScore = (matchedTerms.length/terms.length * 100);
        else if (numbers.length > 0) finalScore = (matchedNumbers.length/numbers.length * 100);
        
        return { 
            percentage: Math.round(finalScore), 
            matchedTerms, 
            matchedNumbers, 
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
        let currentAnswer = userAnswer;
        // 도화지에 그림을 그렸다면, 새 도화지에서 이미지를 뽑아옵니다!
        if (inputMode === 'draw' && canvasRef.current) {
            currentAnswer = canvasRef.current.getImageData('white');
            setUserAnswer(currentAnswer);
        }

        const res = analyzeAnswer(currentAnswer);
        setGradingResult(res); 
        setShowAnswer(true);

        if (inputMode === 'text' && currentAnswer.trim() && !res.manualGradingRequired) {
            await updateProblemResult(currentProblem.id, res.percentage);
        }
    };

    const handleRetrySubmit = async () => {
        const res = analyzeAnswer();
        setGradingResult(res); setIsRetrying(false);  
        if (!res.manualGradingRequired) await updateProblemResult(currentProblem.id, res.percentage);
    };

    const handleSaveMemo = async () => {
        try {
            await updateProblemMemo(currentProblem.id, memoText);
            setCurrentProblem(prev => ({ ...prev, memo: memoText }));
            alert('메모 저장 완료! 📝');
        } catch (e) { alert('메모 저장 실패'); }
    };

    const handleQuickUpdate = async () => {
        try {
            const finalTerms = editedTerms.map(t => String(t).trim()).filter(t => t !== '');
            const finalNumbers = editedNumbers.map(n => String(n).trim()).filter(n => n !== '');

            await updateProblemInfo(currentProblem.id, {
                content: editedQuestion,
                answer: editedAnswer,
                keywords: finalTerms,
                numbers: finalNumbers,
                gradingPoints: {
                    mandatory_terms: finalTerms,
                    mandatory_numbers: finalNumbers
                }
            });

            setCurrentProblem(prev => ({
                ...prev,
                question: editedQuestion,
                modelAnswer: editedAnswer,
                keywords: finalTerms,
                numbers: finalNumbers,
                gradingPoints: {
                    mandatory_terms: finalTerms,
                    mandatory_numbers: finalNumbers
                }
            }));
            
            setIsEditMode(false);
            setGradingResult(null);
            setShowAnswer(false);
            setUserAnswer('');

            alert('지문, 해설 및 채점 기준이 성공적으로 수정되었습니다! ✅\n변경된 기준으로 다시 풀어보세요.');
        } catch (e) {
            console.error(e);
            alert('수정 저장 중 오류가 발생했습니다.');
        }
    };
    


    const handleDeleteImage = async (type, imageUrl) => {
        if (!window.confirm('삭제하시겠습니까?')) return;
        try {
            // [에러 핸들링] Storage 삭제 시도 (실패해도 DB 정리는 강제 진행)
            try {
                const fileRef = ref(storage, imageUrl);
                await deleteObject(fileRef);
            } catch (storageError) {
                console.warn('스토리지에서 이미지를 찾을 수 없거나 이미 삭제되었습니다. DB 정리를 계속 진행합니다.', storageError);
            }

            // DB 레코드 삭제 (좀비 이미지 링크 제거)
            const docRef = doc(db, 'workbook', currentProblem.id);
            if (type === 'problem') {
                await updateDoc(docRef, { images: arrayRemove(imageUrl) });
                setLocalProblemImages(prev => prev.filter(url => url !== imageUrl));
            } else {
                await updateDoc(docRef, { answerImages: arrayRemove(imageUrl) });
                setLocalAnswerImages(prev => prev.filter(url => url !== imageUrl));
            }
        } catch (e) { 
            alert('삭제 처리에 실패했습니다. 다시 시도해주세요.'); 
            console.error(e); 
        }
    };

   

    const handleAddAnswerImages = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newUrls = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileRef = ref(storage, `answers/${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                newUrls.push(url);
            }

            const docRef = doc(db, 'workbook', currentProblem.id);
            await updateDoc(docRef, { answerImages: arrayUnion(...newUrls) });

            setLocalAnswerImages(prev => [...prev, ...newUrls]);
            alert('이미지가 성공적으로 추가되었습니다! ✅');
        } catch (error) {
            console.error('Upload error:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
            e.target.value = null; 
        }
    };

    const HighlightedUserAnswer = () => {
        if (!gradingResult) return <p className="text-slate-700 whitespace-pre-wrap">{userAnswer}</p>;
        
        const allTerms = gradingResult.matchedTerms || [];
        const allNums = gradingResult.matchedNumbers || [];
        
        if (allTerms.length === 0 && allNums.length === 0) {
            return <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg">{userAnswer}</p>;
        }
        
        // 태그 파괴 방지를 위해 HTML 이스케이프
        const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let safeHtml = escapeHtml(userAnswer);
        
        // 긴 단어부터 매칭하여 태그 꼬임 방지
        const sortedTerms = [...allTerms].sort((a,b) => b.length - a.length);
        const sortedNums = [...allNums].sort((a,b) => String(b).length - String(a).length);

        sortedTerms.forEach(t => {
            const chars = Array.from(String(t).replace(/\s+/g, ''));
            const escapedChars = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            // 태그 내부 속성값 매칭 방지: (?![^<]*>)
            const pattern = new RegExp(`(${escapedChars.join('.{0,3}?')})(?![^<]*>)`, 'gi');
            safeHtml = safeHtml.replace(pattern, '<span class="font-black px-1.5 rounded mx-0.5 border text-emerald-700 bg-emerald-100 border-emerald-200">$&</span>');
        });

        sortedNums.forEach(n => {
            const pattern = new RegExp(`(${String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi');
            safeHtml = safeHtml.replace(pattern, '<span class="font-black px-1.5 rounded mx-0.5 border text-blue-700 bg-blue-100 border-blue-200">$&</span>');
        });

        return (
            <p 
                className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg font-medium"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
        );
    };

    if (!currentProblem) return <div className="p-10 text-center text-white font-black animate-pulse">FireSight Data Hydrating...</div>;

    return (
        <div className="relative flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur border-b border-slate-800 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"><ArrowLeft size={18} /> 목록</button>
                    <button onClick={() => setIsOverlayMode(!isOverlayMode)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${isOverlayMode ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Pen size={14} /> {isOverlayMode ? '연습장 끄기' : '연습장 모드'}
                    </button>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setShowMemo(!showMemo)} className={`p-2.5 rounded-xl transition-all ${showMemo ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><StickyNote size={20} /></button>
                    
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)} 
                        className={`p-2.5 rounded-xl transition-all ${isEditMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-blue-400'}`}
                        title="제자리 수정 모드"
                    >
                        <Edit3 size={20} />
                    </button>
                    
                    <button onClick={() => {if(window.confirm('삭제하시겠습니까?')) { deleteProblem(currentProblem.id); onBack(); }}} className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/20"><Trash2 size={20} /></button>
                </div>
            </div>

            {showMemo && (
                <div className="max-w-4xl mx-auto w-full px-4 md:px-8 mt-4 animate-in slide-in-from-top-4 duration-500 z-20">
                    <div className="bg-amber-500/10 backdrop-blur-2xl border border-amber-500/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl rounded-full" />
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-xl shadow-amber-500/20">
                                    <StickyNote size={22} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white tracking-tight">Study Memo</h4>
                                    <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">Personal Revision Note</p>
                                </div>
                            </div>
                            <button onClick={handleSaveMemo} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black rounded-full transition-all active:scale-95 shadow-lg shadow-amber-500/20">
                                <Save size={16} /> SAVE CHANGES
                            </button>
                        </div>
                        <textarea 
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="이 문제의 핵심 암기법이나 주의사항을 정밀하게 기록하세요..."
                            className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 text-slate-100 text-base leading-relaxed outline-none focus:border-amber-500/50 transition-all resize-none placeholder:text-white/5 shadow-inner relative z-10"
                        />
                    </div>
                </div>
            )}

            <div className="problem-container flex-1 overflow-y-auto p-4 md:p-8 pb-40 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-8">
                    
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-8">
                            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight break-keep">{currentProblem.title}</h1>
                            {isEditMode && (
                                <button onClick={handleQuickUpdate} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                                    <Save size={16} /> 전체 저장
                                </button>
                            )}
                        </div>
                        
                        {localProblemImages.length > 0 && (
                            <ImageCarousel images={localProblemImages} onZoom={setZoomImage} onDelete={(url) => handleDeleteImage('problem', url)} isEditMode={isEditMode} />
                        )}

                        <div className="mt-6">
                            {isEditMode ? (
                                <textarea 
                                    value={editedQuestion}
                                    onChange={(e) => setEditedQuestion(e.target.value)}
                                    className="w-full min-h-[150px] bg-black/40 border-2 border-blue-500/50 rounded-2xl p-4 text-slate-200 text-lg font-medium outline-none focus:border-blue-400 transition-all resize-y"
                                    placeholder="지문 내용을 수정하세요..."
                                />
                            ) : (
                                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-line leading-relaxed text-lg font-medium">{currentProblem.question}</div>
                            )}
                        </div>
                    </div>

                    {isEditMode && (
                        <div className="bg-slate-900/80 rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-black text-emerald-400 flex items-center gap-2 border-b border-slate-700 pb-4">
                                <BookOpen size={24} /> 해설 및 채점 기준 수정
                            </h3>
                            
                            {/* 🔴 [업그레이드된 UI] 해설 이미지 추가 버튼과 이미지 목록 통합 */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-bold text-slate-400">Answer Images (해설 이미지)</label>
                                    <div>
                                        <input 
                                            type="file" 
                                            id="add-answer-image" 
                                            multiple 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleAddAnswerImages} 
                                            disabled={isUploading}
                                        />
                                        <label 
                                            htmlFor="add-answer-image" 
                                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-lg ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                                            {isUploading ? '업로드 중...' : '이미지 추가'}
                                        </label>
                                    </div>
                                </div>
                                
                                {localAnswerImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {localAnswerImages.map((url, idx) => (
                                            <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40 group/img">
                                                <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in hover:scale-105 transition-all duration-300" onClick={() => setZoomImage(url)} />
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteImage('answer', url); }}
                                                    className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-500 text-white p-2.5 rounded-xl shadow-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-black/20 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-sm font-bold">
                                        등록된 해설 이미지가 없습니다. 우측 상단의 버튼을 눌러 추가하세요.
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-400 mb-2 block">Model Answer (정답 해설)</label>
                                <textarea 
                                    value={editedAnswer}
                                    onChange={(e) => setEditedAnswer(e.target.value)}
                                    className="w-full min-h-[200px] bg-black/40 border-2 border-emerald-500/50 rounded-2xl p-4 text-emerald-50/90 text-lg font-black tracking-tight outline-none focus:border-emerald-400 transition-all resize-y shadow-inner"
                                    placeholder="해설 내용을 수정하세요..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-black/20 p-6 rounded-2xl border border-slate-800">
                                    <label className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Target size={14} /> Mandatory Terms
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {editedTerms.map((t, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg">
                                                {t} 
                                                <button onClick={() => setEditedTerms(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-200 bg-black/20 rounded-full p-0.5"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newTerm}
                                            onChange={(e) => setNewTerm(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') addTerm(); }}
                                            placeholder="새 키워드 입력 후 Enter" 
                                            className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                        />
                                        <button onClick={addTerm} className="px-4 py-2 bg-slate-800 hover:bg-emerald-600 text-white rounded-xl font-black transition-all">추가</button>
                                    </div>
                                </div>

                                <div className="bg-black/20 p-6 rounded-2xl border border-slate-800">
                                    <label className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Calculator size={14} /> Mandatory Numbers
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {editedNumbers.map((n, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg">
                                                {n} 
                                                <button onClick={() => setEditedNumbers(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-200 bg-black/20 rounded-full p-0.5"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newNumber}
                                            onChange={(e) => setNewNumber(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') addNumber(); }}
                                            placeholder="새 수치 입력 후 Enter" 
                                            className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
                                        />
                                        <button onClick={addNumber} className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white rounded-xl font-black transition-all">추가</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditMode && !showAnswer && !isOverlayMode && (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-800 focus-within:border-blue-500 transition-all relative group animate-in fade-in">
                            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex gap-3">
                                    <button onClick={() => { setInputMode('text'); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><Type size={14} /> TEXT</button>
                                    {/* 🔴 DRAW 버튼 클릭 시 기본 펜 색상을 검은색으로 설정 */}
                                    <button onClick={() => { setInputMode('draw'); setPenColor('#000000'); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${inputMode === 'draw' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}><PenTool size={14} /> DRAW</button>
                                </div>
                            </div>
                            
                            <div className="relative w-full h-[500px] bg-slate-50 overflow-hidden"> 
                                {inputMode === 'text' ? (
                                    <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="답안을 서술하세요..." className="w-full h-full p-8 text-slate-900 text-xl font-bold leading-relaxed outline-none resize-none border-none placeholder:text-slate-300 shadow-inner bg-transparent relative z-10" spellCheck="false" />
                                ) : (
                                    <>
                                        {/* 🔴 정답 입력창 캔버스 */}
                                        <div className="absolute inset-0 z-10">
                                            <SharedCanvas ref={canvasRef} penColor={penColor} lineWidth={lineWidth} isEraserMode={isEraserMode} />
                                        </div>
                                        
                                        {/* 🔴 아까 만든 예쁜 캡슐 툴바를 여기에 쏙! 집어넣습니다! */}
                                        <DrawingToolbar 
                                            penColor={penColor} 
                                            setPenColor={setPenColor} 
                                            lineWidth={lineWidth} 
                                            setLineWidth={setLineWidth} 
                                            isEraserMode={isEraserMode} 
                                            setIsEraserMode={setIsEraserMode} 
                                            clearCurrentCanvas={clearCurrentCanvas} 
                                        />
                                    </>
                                )}
                                
                                <div className="absolute bottom-8 right-8 z-[300]">
                                    <button onClick={handleSubmit} className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.5rem] font-black shadow-2xl transition-all transform active:scale-95 pointer-events-auto"><Check size={24} /> {inputMode === 'draw' ? '정답 확인' : '제출하기'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditMode && showAnswer && gradingResult && (
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
                                        </p>
                                    </div>
                                </div>
                                <button onClick={handleNext} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-10 py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all border border-slate-700 shadow-xl active:scale-95">다음 학습 <ChevronRight size={24} /></button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-2xl h-full flex flex-col min-h-[500px]">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-slate-900 font-black flex items-center gap-3 text-xl"><CheckCircle2 size={28} className="text-blue-600" /> 나의 답안 분석</h3>
                                        {!isRetrying && inputMode === 'text' && (
                                            <button 
                                                onClick={() => setIsRetrying(true)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-blue-50 text-blue-600 text-xs font-black rounded-xl transition-all"
                                            >
                                                <Edit3 size={14} /> 수정하기
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner relative">
                                        {isRetrying ? (
                                            <div className="flex flex-col h-full gap-5">
                                                <textarea 
                                                    ref={textareaRef} 
                                                    value={userAnswer} 
                                                    onChange={(e) => setUserAnswer(e.target.value)} 
                                                    className="w-full flex-1 bg-white p-6 rounded-2xl border-2 border-blue-500/30 outline-none resize-none text-slate-900 text-lg font-bold shadow-xl" 
                                                    autoFocus 
                                                />
                                                <div className="flex gap-3">
                                                    <button onClick={() => setIsRetrying(false)} className="flex-1 py-4 bg-slate-200 text-slate-600 font-black rounded-2xl transition-all active:scale-95">취소</button>
                                                    <button onClick={handleRetrySubmit} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2">
                                                        <RefreshCw size={18} /> 재채점 실시
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 🔴 추가된 부분: 데이터가 이미지면 <img>태그로, 텍스트면 기존 방식으로 렌더링! */
                                            userAnswer?.startsWith('data:image') ? (
                                                <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-sm">
                                                    <img src={userAnswer} alt="나의 답안 이미지" className="max-w-full max-h-[400px] object-contain rounded-xl" />
                                                </div>
                                            ) : (
                                                <HighlightedUserAnswer />
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-emerald-950/20 rounded-[2.5rem] p-10 border border-emerald-900/50 shadow-2xl relative group/answer overflow-hidden transition-all duration-500">
                                        
                                        {/* 블라인드 모드 가림막 (isRetrying일 때만 활성화) */}
                                        {isRetrying && (
                                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl opacity-100 group-hover/answer:opacity-0 pointer-events-none transition-all duration-500">
                                                <EyeOff size={48} className="text-emerald-500/40 mb-4 animate-pulse" />
                                                <p className="text-emerald-400 font-black text-xl tracking-tight">Blind Typing Mode</p>
                                                <p className="text-emerald-500/70 text-sm font-bold mt-3 bg-emerald-950/50 px-4 py-2 rounded-full shadow-lg">마우스를 올리면 잠깐 정답이 보입니다 💡</p>
                                            </div>
                                        )}

                                        <div className={`relative z-10 transition-all duration-500 ${isRetrying ? 'blur-md opacity-20 group-hover/answer:blur-none group-hover/answer:opacity-100 select-none' : ''}`}>
                                            <h3 className="text-emerald-400 font-black text-xl mb-8 flex items-center gap-3"><BookOpen size={30} /> Model Answer</h3>
                                            {localAnswerImages.length > 0 && (
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    {localAnswerImages.map((url, idx) => (
                                                        <div key={idx} className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-black/40 group/img">
                                                            <img src={url} alt="Answer" className="w-full h-full object-contain cursor-zoom-in group-hover:scale-105 transition-all duration-500" onClick={() => setZoomImage(url)} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="prose prose-invert max-w-none text-slate-100 whitespace-pre-line leading-[1.8] text-[17px] font-medium tracking-wide select-text mt-4">
                                                {currentProblem.modelAnswer || '해설이 등록되지 않았습니다.'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {!gradingResult.manualGradingRequired && (
                                        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-right-4 duration-700">
                                            <div className="p-6 bg-emerald-950/10 rounded-3xl border border-emerald-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} /> Mandatory Terms (40%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedTerms.map(t => <span key={t} className={`px-3.5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/30`}>{t}</span>)}
                                                    {gradingResult.missingTerms.map(t => <span key={t} className={`px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50`}>{t}</span>)}
                                                </div>
                                            </div>
                                            <div className="p-6 bg-blue-950/10 rounded-3xl border border-blue-500/20 space-y-4 shadow-xl">
                                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14} /> Mandatory Numbers (60%)</h4>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {gradingResult.matchedNumbers.map(n => <span key={n} className={`px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-950/30`}>{n}</span>)}
                                                    {gradingResult.missingNumbers.map(n => <span key={n} className={`px-3.5 py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-bold border border-slate-800 line-through opacity-50`}>{n}</span>)}
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

            {isOverlayMode && (
                <div className="fixed inset-0 z-[100] pointer-events-auto bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="absolute inset-0">
                        <SharedCanvas 
                            ref={overlayCanvasRef} 
                            penColor={penColor}
                            lineWidth={lineWidth}
                            isEraserMode={isEraserMode}
                            className="bg-transparent"
                        />
                    </div>
                    <DrawingToolbar 
                        penColor={penColor} 
                        setPenColor={setPenColor} 
                        lineWidth={lineWidth} 
                        setLineWidth={setLineWidth} 
                        isEraserMode={isEraserMode} 
                        setIsEraserMode={setIsEraserMode} 
                        clearCurrentCanvas={clearCurrentCanvas} 
                        onClose={() => setIsOverlayMode(false)} 
                    />
                </div>
            )}

            {zoomImage && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-zoom-out" 
                    onClick={() => setZoomImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 md:top-10 md:right-10 text-white/60 hover:text-white bg-black/50 hover:bg-red-500/80 p-3 rounded-full transition-all z-50 shadow-2xl"
                        onClick={() => setZoomImage(null)}
                    >
                        <X size={28} />
                    </button>
                    
                    <img 
                        src={zoomImage} 
                        alt="Zoomed" 
                        className="max-w-full max-h-[95vh] object-contain shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300" 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            setZoomImage(null); 
                        }} 
                    />
                </div>
            )}
        </div>
    );
}


