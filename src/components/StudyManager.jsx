import React, { useState, useRef } from 'react';
import { 
    Database, Download, Upload, FileJson, AlertTriangle, 
    CheckCircle2, Loader2, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore'; // writeBatch, doc 추가
import { db } from '../firebase'; 

export default function StudyManager() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }
    
    // 파일 선택을 위한 hidden input 참조
    const fileInputRef = useRef(null);

    // 1. [백업] 데이터 내보내기
    const handleBackup = async () => {
        if (loading) return;
        setLoading(true);
        setStatus(null);

        try {
            // Firestore에서 'workbook' 컬렉션 데이터 가져오기
            const querySnapshot = await getDocs(collection(db, "workbook"));
            
            if (querySnapshot.empty) {
                alert("저장된 데이터가 없습니다.");
                setLoading(false);
                return;
            }

            // 데이터 가공
            const data = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    _id: doc.id, // 복구 시 ID 매칭을 위해 저장
                    ...docData,
                    // 날짜 변환 (Firestore Timestamp -> ISO String)
                    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt,
                    lastStudiedAt: docData.lastStudiedAt?.toDate ? docData.lastStudiedAt.toDate().toISOString() : docData.lastStudiedAt
                };
            });

            // JSON 다운로드 트리거
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const dateStr = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `FireSight_Backup_${dateStr}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatus({
                type: 'success',
                message: `✅ 총 ${data.length}개의 데이터 백업이 완료되었습니다.`
            });

        } catch (error) {
            console.error("Backup Failed:", error);
            setStatus({
                type: 'error',
                message: `❌ 백업 실패: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    // 2. [복구] 파일 선택 핸들러
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 파일 읽기
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            processRestore(content);
        };
        reader.readAsText(file);
        
        // 같은 파일 재선택 가능하게 초기화
        e.target.value = ''; 
    };

    // 3. [복구] 실제 복원 로직
    const processRestore = async (jsonContent) => {
        if (!window.confirm("⚠️ 주의: 데이터를 복구하면 기존 데이터와 합쳐지거나 덮어쓰여집니다.\n진행하시겠습니까?")) return;

        setLoading(true);
        setStatus(null);

        try {
            const data = JSON.parse(jsonContent);
            if (!Array.isArray(data)) throw new Error("잘못된 파일 형식입니다. (데이터 배열이 아님)");

            // Firestore Batch는 한 번에 500개 제한 -> 450개씩 끊어서 처리
            const BATCH_SIZE = 450;
            let successCount = 0;

            for (let i = 0; i < data.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = data.slice(i, i + BATCH_SIZE);

                chunk.forEach((item) => {
                    // ID가 있으면 해당 ID로 덮어쓰기(수정), 없으면 새 문서 생성
                    const docRef = item._id ? doc(db, "workbook", item._id) : doc(collection(db, "workbook"));
                    
                    // _id 필드는 DB에 저장하지 않음
                    const { _id, ...rest } = item;

                    // 날짜 문자열 -> Date 객체로 복원
                    const restoreData = {
                        ...rest,
                        createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
                        lastStudiedAt: rest.lastStudiedAt ? new Date(rest.lastStudiedAt) : null
                    };

                    batch.set(docRef, restoreData, { merge: true }); // merge: true로 기존 필드 보존
                });

                await batch.commit();
                successCount += chunk.length;
            }

            setStatus({
                type: 'success',
                message: `🎉 성공! 총 ${successCount}개의 데이터를 복구했습니다.`
            });

        } catch (error) {
            console.error("Restore Failed:", error);
            setStatus({
                type: 'error',
                message: `❌ 복구 실패: ${error.message}`
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
                    학습 데이터의 백업 및 복구를 수행합니다. 데이터 유실 방지를 위해 주기적으로 백업하세요.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                
                {/* 1. 백업 카드 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <Download size={32} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">데이터 백업 (Export)</h3>
                                <p className="text-slate-400 text-sm">
                                    서버의 모든 데이터를 JSON 파일로 내려받습니다.
                                </p>
                            </div>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <li>문제, 정답, 이미지(URL), 학습 기록 포함</li>
                            <li><strong>FireSight_Backup.json</strong> 형식으로 저장</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg
                            ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <FileJson />}
                        백업 파일 다운로드
                    </button>
                </div>

                {/* 2. 복구 카드 (NEW) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Upload size={32} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">데이터 복구 (Import)</h3>
                                <p className="text-slate-400 text-sm">
                                    백업 파일을 업로드하여 데이터를 되살립니다.
                                </p>
                            </div>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <li>기존 ID가 같으면 내용을 덮어씁니다 (업데이트)</li>
                            <li>없는 ID는 새로 추가됩니다</li>
                            <li>실수로 삭제한 데이터도 복구됩니다</li>
                        </ul>
                    </div>

                    {/* Hidden Input */}
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                    />
                    
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg
                            ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 active:scale-95'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        데이터 파일 선택 및 복구
                    </button>
                </div>

            </div>

            {/* 상태 메시지 알림 */}
            {status && (
                <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border animate-in slide-in-from-bottom-2 max-w-5xl
                    ${status.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}
                >
                    {status.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertTriangle className="shrink-0" />}
                    <div>
                        <h4 className="font-bold text-sm mb-1">
                            {status.type === 'success' ? '작업 완료' : '오류 발생'}
                        </h4>
                        <p className="text-sm opacity-90">{status.message}</p>
                    </div>
                </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
                <ShieldCheck size={14} />
                <span>데이터는 암호화 통신을 통해 안전하게 처리됩니다.</span>
            </div>
        </div>
    );
}