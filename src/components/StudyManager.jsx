import React, { useState } from 'react';
import { 
    Database, Download, FileJson, AlertTriangle, 
    CheckCircle2, Loader2, ShieldCheck 
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // firebase 설정 파일 경로 확인

export default function StudyManager() {
    const [loading, setLoading] = useState(false);
    const [backupStatus, setBackupStatus] = useState(null); // null | 'success' | 'error'

    // 데이터 백업 핸들러
    const handleBackup = async () => {
        if (loading) return;
        setLoading(true);
        setBackupStatus(null);

        try {
            // 1. Firestore에서 'workbook' 컬렉션의 모든 문서 가져오기
            const querySnapshot = await getDocs(collection(db, "workbook"));
            
            if (querySnapshot.empty) {
                alert("저장된 데이터가 없습니다.");
                setLoading(false);
                return;
            }

            // 2. 데이터 가공 (날짜 객체 -> 문자열 변환 등)
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    _id: doc.id, // 나중에 복구(Import)할 때를 대비해 ID 포함
                    ...docData,
                    // Firestore Timestamp를 읽기 좋은 ISO 날짜 문자열로 변환
                    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt,
                    lastStudiedAt: docData.lastStudiedAt?.toDate ? docData.lastStudiedAt.toDate().toISOString() : docData.lastStudiedAt
                };
            });

            // 3. JSON 문자열로 변환 (들여쓰기 2칸)
            const jsonString = JSON.stringify(data, null, 2);

            // 4. 가상 다운로드 링크 생성 및 클릭
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            // 파일명: FireSight_Backup_202X-XX-XX.json
            const dateStr = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `FireSight_Backup_${dateStr}.json`;
            
            document.body.appendChild(link);
            link.click();
            
            // 뒷정리
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setBackupStatus({
                type: 'success',
                count: data.length,
                message: `총 ${data.length}개의 문제 데이터가 성공적으로 백업되었습니다.`
            });

        } catch (error) {
            console.error("Backup Failed:", error);
            setBackupStatus({
                type: 'error',
                message: `백업 중 오류가 발생했습니다: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 h-full bg-slate-950 text-white overflow-y-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
                    <Database className="text-blue-500" size={32} />
                    데이터 관리자
                </h2>
                <p className="text-slate-400">
                    학습 데이터의 백업 및 관리를 수행합니다. 데이터는 주기적으로 백업하는 것이 좋습니다.
                </p>
            </header>

            <div className="max-w-2xl">
                {/* 백업 카드 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
                    <div className="flex items-start gap-5 mb-8">
                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <FileJson size={40} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                전체 데이터 백업 (JSON Export)
                                <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800">RECOMMENDED</span>
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                현재 Firestore 서버에 저장된 <strong>모든 문제와 풀이 기록</strong>을 
                                JSON 파일 형식으로 변환하여 다운로드합니다.
                            </p>
                            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                                <li>이미지 파일은 Base64 또는 URL 형태로 포함됩니다.</li>
                                <li>오프라인 상태에서는 최신 데이터가 아닐 수 있습니다.</li>
                                <li>다운로드한 파일은 <strong>Fire-Sight 백업용</strong>으로 보관하세요.</li>
                            </ul>
                        </div>
                    </div>

                    {/* 백업 버튼 */}
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg
                            ${loading 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" /> 데이터 추출 및 압축 중...
                            </>
                        ) : (
                            <>
                                <Download /> 데이터 내려받기
                            </>
                        )}
                    </button>

                    {/* 상태 메시지 */}
                    {backupStatus && (
                        <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border animate-in slide-in-from-top-2
                            ${backupStatus.type === 'success' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                        >
                            {backupStatus.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertTriangle className="shrink-0" />}
                            <div>
                                <h4 className="font-bold text-sm mb-1">
                                    {backupStatus.type === 'success' ? '백업 완료!' : '백업 실패'}
                                </h4>
                                <p className="text-sm opacity-90">{backupStatus.message}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 보안 안내 */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
                    <ShieldCheck size={14} />
                    <span>데이터는 암호화 통신을 통해 안전하게 전송됩니다.</span>
                </div>
            </div>
        </div>
    );
}