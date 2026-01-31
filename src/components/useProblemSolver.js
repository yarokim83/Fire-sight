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
            
            // 문제 유형에 따른 입력 모드 자동 설정
            if (p.problemType === 'drawing' || p.problemType === 'calculation') {
                setInputMode('draw');
            } else {
                setInputMode('text');
            }
        }
    }, [currentIndex, problems]);

    /** ---------------------------------------------------------
     * 🔴 [핵심 개선] 정밀 채점 로직 (가중치 및 누락 키워드 추적)
     * - 수치(Mandatory Numbers): 60% 가중치
     * - 용어(Mandatory Terms): 40% 가중치
     --------------------------------------------------------- */
    const analyzeAnswer = () => {
        if (!currentProblem) return null;

        // 1. 채점 데이터 확보 (gradingPoints 우선, 없으면 keywords 하위 호환)
        const pts = currentProblem.gradingPoints || { 
            mandatory_terms: Array.isArray(currentProblem.keywords) ? currentProblem.keywords : [], 
            mandatory_numbers: [] 
        };
        
        const terms = pts.mandatory_terms || [];
        const numbers = pts.mandatory_numbers || [];

        // 2. 입력값이 없거나 드로잉 모드인 경우 (수동 채점 대상)
        if (inputMode === 'draw' || !userAnswer.trim()) {
            return { 
                percentage: 0, 
                matchedTerms: [], 
                matchedNumbers: [], 
                missingTerms: terms, 
                missingNumbers: numbers, 
                manualGradingRequired: true 
            };
        }

        // 3. 텍스트 정규화 (공백 제거 및 소문자화로 채점 정확도 향상)
        const normalize = (text) => String(text).replace(/\s+/g, '').toLowerCase();
        const normalizedInput = normalize(userAnswer);

        // 4. 필수 용어 및 수치 대조 (정확한 매칭 여부 판별)
        const matchedTerms = terms.filter(t => normalizedInput.includes(normalize(t)));
        const missingTerms = terms.filter(t => !matchedTerms.includes(t));

        const matchedNumbers = numbers.filter(n => normalizedInput.includes(normalize(n)));
        const missingNumbers = numbers.filter(n => !matchedNumbers.includes(n));

        // 5. 가중치 점수 산출
        // - 소방시설법규 및 화재안전기준 특성상 '수치' 오류 방지를 위해 60% 부여
        let termScore = terms.length > 0 ? (matchedTerms.length / terms.length) * 40 : 40;
        let numberScore = numbers.length > 0 ? (matchedNumbers.length / numbers.length) * 60 : 60;
        
        // 채점 기준이 아예 없는 경우 방지
        const isCriteriaEmpty = terms.length === 0 && numbers.length === 0;
        const totalPercentage = isCriteriaEmpty ? 0 : Math.round(termScore + numberScore);
        
        return { 
            percentage: totalPercentage, 
            matchedTerms, 
            matchedNumbers, 
            missingTerms, 
            missingNumbers, 
            manualGradingRequired: isCriteriaEmpty 
        };
    };

    // 현재 채점 결과 계산
    const result = showResult ? analyzeAnswer() : null;

    /** ---------------------------------------------------------
     * 액션 핸들러
     --------------------------------------------------------- */
    const handleNext = () => {
        if (currentIndex < problems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            if (onComplete) onComplete();
            else alert("🎉 모든 학습을 완료했습니다!");
        }
    };

    const handleSubmit = async () => {
        if (inputMode === 'text' && !userAnswer.trim()) {
            alert("답안을 입력해주세요!");
            return;
        }
        
        const currentResult = analyzeAnswer();
        setShowResult(true);

        // 자동 채점 결과가 존재하는 경우에만 DB 업데이트
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
            alert("메모 저장 실패");
        }
    };

    // 🔴 수정 모드: gradingPoints 필드 보존 및 검색용 태그 연동 강화
    const handleSaveEdit = async () => {
        try {
            // keywords는 이제 '검색용 tags' 배열로 변환하여 관리하는 것이 이상적입니다.
            const tagArray = Array.isArray(currentProblem.keywords) 
                ? currentProblem.keywords 
                : String(currentProblem.keywords || '').split(',').map(k => k.trim()).filter(k => k);

            await updateProblemInfo(currentProblem.id, {
                title: currentProblem.title,
                content: currentProblem.content || currentProblem.question, 
                modelAnswer: currentProblem.modelAnswer,
                tags: tagArray, // 검색 및 필터링용
                gradingPoints: currentProblem.gradingPoints || { mandatory_terms: [], mandatory_numbers: [] }, // 채점용
                questionImageUrl: currentProblem.questionImageUrl || null, 
                answerImageUrl: currentProblem.answerImageUrl || null
            });
            setIsEditMode(false);
            alert("학습 데이터가 성공적으로 수정되었습니다 ✅");
        } catch (e) {
            alert("수정 저장 실패");
        }
    };

    const handleImageUpload = (e, imageType) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { 
            setCurrentProblem({ ...currentProblem, [imageType]: reader.result }); 
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteImage = async (problemId, imageType) => {
        if (!window.confirm("이미지를 삭제하시겠습니까?")) return;
        try {
            await updateProblemInfo(problemId, { [imageType]: null });
            setCurrentProblem({ ...currentProblem, [imageType]: null });
            const problemIndex = problems.findIndex(p => p.id === problemId);
            if (problemIndex > -1) problems[problemIndex][imageType] = null;
        } catch (error) {
            console.error('이미지 삭제 실패:', error);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("이 문제를 삭제하면 복구할 수 없습니다. 삭제하시겠습니까?")) {
            try {
                await deleteProblem(currentProblem.id);
                if (onBack) onBack();
            } catch (error) {
                console.error("문제 삭제 실패:", error);
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
            handleNext, handleSubmit, handleManualGrade, handleSaveMemo, handleSaveEdit, 
            handleImageUpload, handleDelete, handleDeleteImage
        }
    };
};