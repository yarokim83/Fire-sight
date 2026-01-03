import { useState, useEffect } from 'react';
import { updateProblemResult, updateProblemInfo, deleteProblem } from '../../utils/db'; // [FIX] deleteProblem 추가

// [FIX] onBack 인자 추가
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

    const analyzeAnswer = () => {
        if (!currentProblem) return null;
        const keywords = currentProblem.keywords || [];
        
        if (inputMode === 'draw' || !userAnswer.trim() || keywords.length === 0) {
            return { score: 0, percentage: 0, matched: [], missing: keywords, manualGradingRequired: true };
        }

        const matched = keywords.filter(keyword =>
            userAnswer.includes(keyword) || userAnswer.includes(keyword.replace(/\s+/g, ''))
        );
        const missing = keywords.filter(keyword => !matched.includes(keyword));
        const percentage = keywords.length > 0 
            ? Math.round((matched.length / keywords.length) * 100) 
            : 0;
        
        return { percentage, matched, missing, manualGradingRequired: false };
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
        setShowResult(true);

        if (inputMode === 'text') {
            const { percentage } = analyzeAnswer();
            try {
                if (currentProblem?.id) {
                    await updateProblemResult(currentProblem.id, percentage);
                }
            } catch (error) {
                console.error("점수 저장 실패:", error);
            }
        }
    };

    const handleManualGrade = async (isCorrect) => {
        const score = isCorrect ? 100 : 0;
        try {
            await updateProblemResult(currentProblem.id, score);
            handleNext();
        } catch (error) {
            console.error("수동 채점 저장 실패:", error);
        }
    };

    const handleSaveMemo = async () => {
        try {
            await updateProblemInfo(currentProblem.id, { memo: memoText });
            problems[currentIndex].memo = memoText;
            alert("메모가 저장되었습니다 📝");
        } catch (e) {
            alert("저장 실패");
        }
    };

    const handleSaveEdit = async () => {
        try {
            const keywordArray = Array.isArray(currentProblem.keywords) 
                ? currentProblem.keywords 
                : String(currentProblem.keywords).split(',').map(k => k.trim());

            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                content: currentProblem.question, 
                answer: currentProblem.modelAnswer,
                keywords: keywordArray,
                imageUrl: currentProblem.imageUrl || null 
            });
            setIsEditMode(false);
            alert("문제가 수정되었습니다 ✅");
        } catch (e) {
            alert("수정 실패");
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("이미지 크기는 1MB 이하여야 합니다.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentProblem({ ...currentProblem, imageUrl: reader.result });
        };
        reader.readAsDataURL(file);
    };

    // [NEW] 문제 삭제 핸들러
    const handleDelete = async () => {
        if (window.confirm("이 문제를 정말 삭제하시겠습니까?")) {
            try {
                await deleteProblem(currentProblem.id);
                alert("삭제되었습니다.");
                if (onBack) onBack(); // 목록으로 돌아가기
            } catch (error) {
                console.error("삭제 실패:", error);
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    return {
        state: {
            problems, currentIndex, currentProblem, userAnswer, showResult,
            inputMode, showMemo, isEditMode, memoText, result
        },
        actions: {
            setUserAnswer, setInputMode, setShowMemo, setIsEditMode, setMemoText, setCurrentProblem,
            handleNext, handleSubmit, handleManualGrade, handleSaveMemo, handleSaveEdit, handleImageUpload, handleDelete
        }
    };
};