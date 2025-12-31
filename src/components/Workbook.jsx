/* src/components/Workbook.jsx */
import { useEffect, useState } from 'react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot } from 'firebase/firestore'; 
import { PenTool, ArrowRight } from 'lucide-react';
import ProblemSolver from './ProblemSolver';

const Workbook = ({ isExamMode, subject }) => {
  // 1. 상태 관리
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProblem, setSelectedProblem] = useState(null);

  // 2. 데이터 로드
  useEffect(() => {
    const q = query(collection(db, "workbook"));
    console.log("📡 Workbook 구독 시작...");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const problemList = snapshot.docs.map(doc => {
        const data = doc.data();
        // 데이터 필드 안전하게 가져오기 (문자열 강제 변환)
        return {
          id: doc.id,
          ...data,
          title: String(data.title || "제목 없음"),
          content: String(data.content || data.description || "내용 없음"),
          answer: String(data.answer || data.modelAnswer || "해설 없음"),
          tags: Array.isArray(data.tags) ? data.tags : [] 
        };
      });

      console.log(`📦 데이터 ${problemList.length}개 로드 완료`);
      setProblems(problemList);
      setLoading(false);
    }, (err) => {
      console.error("🔥 데이터 로드 실패:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. 문제 선택 핸들러 (안전장치 강화됨)
  const handleSelectProblem = (item) => {
    console.log("👆 '문제 풀기' 버튼 클릭됨:", item.title); // 클릭 확인용 로그

    try {
        // [채점 키워드 생성 로직]
        let gradingKeywords = [];
        const answerText = String(item.answer || ""); // 에러 방지용 문자열 변환

        if (item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0) {
            // 1순위: DB에 저장된 키워드
            gradingKeywords = item.keywords;
        } else if (answerText.length > 0 && answerText !== "해설 없음") {
            // 2순위: 정답 텍스트에서 2글자 이상 단어 추출
            gradingKeywords = answerText
                .split(/[\s,().]+/) // 공백, 특수문자로 분리
                .filter(word => word && word.length >= 2) // 빈 문자열 제거 및 2글자 이상
                .slice(0, 15); // 최대 15개
        } else {
            // 3순위: 태그 활용
            gradingKeywords = item.tags && item.tags.length > 0 ? item.tags : ["핵심"];
        }

        const problemData = {
          id: item.id,
          question: item.content, 
          modelAnswer: item.answer,
          keywords: gradingKeywords,
          title: item.title
        };

        console.log("✅ 문제 데이터 준비 완료:", problemData);
        setSelectedProblem(problemData); // 화면 전환 트리거

    } catch (error) {
        console.error("❌ 문제 선택 중 에러 발생:", error);
        alert("문제를 불러오는 도중 오류가 발생했습니다.\n" + error.message);
    }
  };

  // 4. 로딩 중 화면
  if (loading) return <div className="p-10 text-center text-slate-400">데이터를 불러오는 중...</div>;

  // 5. 문제 풀기 화면 (ProblemSolver)
  if (selectedProblem) {
    return (
      <ProblemSolver 
        problems={[selectedProblem]} 
        topicId={selectedProblem.id}
        onBack={() => setSelectedProblem(null)} // 뒤로가기
        onComplete={() => alert("학습이 완료되었습니다.")}
      />
    );
  }

  // 6. 문제 목록 화면
  return (
    <div className="p-4 h-full overflow-y-auto pb-20">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        📚 문제 보관함 <span className="text-sm font-normal text-slate-500">({problems.length})</span>
      </h2>

      {problems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 border border-dashed border-slate-700 rounded-xl bg-slate-800/50 text-slate-400">
          <p>저장된 문제가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problems.map(item => (
            <div 
              key={item.id} 
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col gap-3 group relative hover:border-blue-500/50 transition-all"
            >
              
              {/* 태그 영역 */}
              <div className="flex flex-wrap gap-2">
                {item.tags.length > 0 ? item.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                )) : <span className="text-[10px] text-slate-600">태그 없음</span>}
              </div>

              {/* 제목 */}
              <h3 className="font-bold text-lg text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                {item.title}
              </h3>

              {/* 내용 미리보기 */}
              <div className="text-slate-400 text-sm bg-slate-900/50 p-3 rounded-lg min-h-[60px] line-clamp-3 whitespace-pre-wrap">
                {item.content}
              </div>

              {/* 하단 버튼 영역 */}
              <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-700/50">
                <details className="group/details">
                  <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors list-none flex items-center gap-1 select-none">
                    <span>👁️ 정답 확인</span>
                  </summary>
                  <div className="absolute left-0 bottom-full mb-2 w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 z-20 hidden group-open/details:block shadow-xl">
                    <p className="font-bold text-blue-400 mb-1">정답:</p>
                    {item.answer}
                  </div>
                </details>

                {/* 문제 풀기 버튼 */}
                <button 
                  onClick={() => handleSelectProblem(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95"
                >
                  <PenTool size={12} /> 문제 풀기
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workbook;