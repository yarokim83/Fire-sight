import { useState, useEffect } from 'react';
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db';

export const useProblemSolver = (initialProblems, startIndex, onComplete, onBack) => {
    const problems = initialProblems || [];
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [currentProblem, setCurrentProblem] = useState(null);
    
    // 상태 관리
    const [userAnswer, setUserAnswer] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [inputMode, setInputMode] = useState('text');
    const [showMemo, setShowMemo] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [memoText, setMemoText] = useState('');

    useEffect(() => {
        const p = problems[currentIndex];
        if (p) {
            setCurrentProblem(p);
            setMemoText(p.memo || '');
            setUserAnswer('');
            setShowResult(false);
            setShowMemo(false);
            setIsEditMode(false);
            
            if (p.problemType === 'drawing' || p.problemType === 'calculation') {
                setInputMode('draw');
            } else {
                setInputMode('text');
            }
        }
    }, [currentIndex, problems]);

    // 🔴 [핵심 개선] 정밀 채점 로직 (가중치 방식 도입)
    const analyzeAnswer = () => {
        if (!currentProblem) return null;

        // 1. 채점 포인트 데이터 확보 (이전 SmartUpload에서 저장한 필드)
        const gradingPoints = currentProblem.gradingPoints || { 
            mandatory_terms: currentProblem.keywords || [], // 하위 호환성 유지
            mandatory_numbers: [] 
        };
        
        const terms = gradingPoints.mandatory_terms || [];
        const numbers = gradingPoints.mandatory_numbers || [];

        // 2. 입력값이 없거나 드로잉 모드인 경우 수동 채점 유도
        if (inputMode === 'draw' || !userAnswer.trim()) {
            return { percentage: 0, matchedTerms: [], matchedNumbers: [], missingTerms: terms, missingNumbers: numbers, manualGradingRequired: true };
        }

        // 3. 텍스트 정규화 (공백 제거 및 소문자화로 채점 정확도 향상)
        const normalize = (text) => text.replace(/\s+/g, '').toLowerCase();
        const normalizedUserAnswer = normalize(userAnswer);

        // 4. 필수 용어 및 수치 대조
        const matchedTerms = terms.filter(t => normalizedUserAnswer.includes(normalize(t)));
        const missingTerms = terms.filter(t => !matchedTerms.includes(t));

        const matchedNumbers = numbers.filter(n => normalizedUserAnswer.includes(normalize(n)));
        const missingNumbers = numbers.filter(n => !matchedNumbers.includes(n));

        // 5. 가중치 점수 산출 (수치 60%, 용어 40%)
        let termScore = terms.length > 0 ? (matchedTerms.length / terms.length) * 40 : 40;
        let numberScore = numbers.length > 0 ? (matchedNumbers.length / numbers.length) * 60 : 60;
        
        // 채점 기준이 아예 없는 특수 사례 대응
        if (terms.length === 0 && numbers.length === 0) {
            return { percentage: 0, matchedTerms: [], matchedNumbers: [], missingTerms: [], missingNumbers: [], manualGradingRequired: true };
        }

        const totalPercentage = Math.round(termScore + numberScore);
        
        return { 
            percentage: totalPercentage, 
            matchedTerms, 
            matchedNumbers, 
            missingTerms, 
            missingNumbers, 
            manualGradingRequired: false 
        };
    };

    const result = showResult ? analyzeAnswer() : null;

    const handleNext = () => {
        if (currentIndex < problems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            if (onComplete) onComplete();
            else alert("모든 문제를 완료했습니다! 🎉");
        }
    };

    const handleSubmit = async () => {
        if (inputMode === 'text' && !userAnswer.trim()) {
            alert("답안을 입력해주세요!");
            return;
        }
        
        const currentResult = analyzeAnswer();
        setShowResult(true);

        if (inputMode === 'text' && !currentResult.manualGradingRequired) {
            try {
                if (currentProblem?.id) {
                    await updateProblemResult(currentProblem.id, currentResult.percentage);
                }
            } catch (error) {
                console.error("점수 저장 실패:", error);
            }
        }
    };

    // --- 이하 로직 (메모, 편집, 삭제) 동일 유지 ---
    const handleManualGrade = async (isCorrect) => {
        const score = isCorrect ? 100 : 0;
        try {
            await updateProblemResult(currentProblem.id, score);
            handleNext();
        } catch (error) { console.error("수동 채점 저장 실패:", error); }
    };

    const handleSaveMemo = async () => {
        try {
            await updateProblemInfo(currentProblem.id, { memo: memoText });
            problems[currentIndex].memo = memoText;
            alert("메모가 저장되었습니다 📝");
        } catch (e) { alert("저장 실패"); }
    };

    const handleSaveEdit = async () => {
        try {
            const keywordArray = Array.isArray(currentProblem.keywords) 
                ? currentProblem.keywords 
                : String(currentProblem.keywords).split(',').map(k => k.trim());

            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                question: currentProblem.question, 
                modelAnswer: currentProblem.modelAnswer,
                keywords: keywordArray,
                gradingPoints: currentProblem.gradingPoints || null, // 🔴 필드 추가
                questionImageUrl: currentProblem.questionImageUrl || null, 
                answerImageUrl: currentProblem.answerImageUrl || null
            });
            setIsEditMode(false);
            alert("문제가 수정되었습니다 ✅");
        } catch (e) { alert("수정 실패"); }
    };

    const handleImageUpload = (e, imageType) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { setCurrentProblem({ ...currentProblem, [imageType]: reader.result }); };
        reader.readAsDataURL(file);
    };

    const handleDeleteImage = async (problemId, imageType) => {
        if (!window.confirm("이미지를 삭제하시겠습니까?")) return;
        try {
            await updateProblemInfo(problemId, { [imageType]: null });
            setCurrentProblem({ ...currentProblem, [imageType]: null });
            const problemIndex = problems.findIndex(p => p.id === problemId);
            if (problemIndex > -1) problems[problemIndex][imageType] = null;
        } catch (error) { console.error('이미지 삭제 실패:', error); }
    };

    const handleDelete = async () => {
        if (window.confirm("이 문제를 정말 삭제하시겠습니까?")) {
            try {
                await deleteProblem(currentProblem.id);
                if (onBack) onBack();
            } catch (error) { console.error("삭제 실패:", error); }
        }
    };

    return {
        state: {
            problems, currentIndex, currentProblem, userAnswer, showResult,
            inputMode, showMemo, isEditMode, memoText, result
        },
        actions: {
            setUserAnswer, setInputMode, setShowMemo, setIsEditMode, setMemoText, setCurrentProblem,
            handleNext, handleSubmit, handleManualGrade, handleSaveMemo, handleSaveEdit, 
            handleImageUpload, handleDelete, handleDeleteImage
        }
    };
};