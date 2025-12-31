/* src/components/Workbook.jsx */
import { useEffect, useState } from 'react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'; 

const Workbook = ({ isExamMode, subject }) => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 쿼리 (정렬 없이 안전하게 호출)
    const q = query(collection(db, "workbook"));
    console.log("📡 Workbook 구독 시작...");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const problemList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // [핵심 수정 1] 데이터 필드명 안전장치 (옛날 데이터 호환)
          // content가 없으면 description을 보여주고, 그것도 없으면 빈칸
          title: data.title || "제목 없음",
          content: data.content || data.description || "내용 없음",
          answer: data.answer || data.modelAnswer || "해설 없음",
          // [핵심 수정 2] 태그가 배열이 아니면 빈 배열로 강제 변환 (에러 방지!)
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

  if (loading) return <div className="p-10 text-center text-slate-400">데이터를 불러오는 중...</div>;

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
            <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col gap-3">
              
              {/* 태그 영역 (이제 절대 에러 안 남) */}
              <div className="flex flex-wrap gap-2">
                {item.tags.length > 0 ? item.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                )) : <span className="text-[10px] text-slate-600">태그 없음</span>}
              </div>

              {/* 제목 */}
              <h3 className="font-bold text-lg text-white line-clamp-1">{item.title}</h3>

              {/* 내용 */}
              <div className="text-slate-400 text-sm bg-slate-900/50 p-3 rounded-lg min-h-[60px] line-clamp-3 whitespace-pre-wrap">
                {item.content}
              </div>

              {/* 정답 (클릭 시 펼치기) */}
              <details className="group mt-auto">
                <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors list-none flex items-center gap-1 select-none">
                  <span>▶ 정답 및 해설 보기</span>
                </summary>
                <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-sm text-blue-200 animate-in slide-in-from-top-1 whitespace-pre-wrap">
                  {item.answer}
                </div>
              </details>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workbook;