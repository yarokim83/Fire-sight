import React, { useState, useRef } from 'react';
import { 
    Database, Download, Upload, FileJson, AlertTriangle, 
    CheckCircle2, Loader2, ShieldCheck, RefreshCw, Cloud, Save,
    Sparkles, FileText
} from 'lucide-react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { ref, getBlob } from 'firebase/storage';
import { db, storage } from '../firebase'; 
import JSZip from 'jszip';

export default function StudyManager({ isAuthenticated, accessToken, handleLogin }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); 
    const fileInputRef = useRef(null);

    // 내부 공통 백업 생성 함수 (JSON 데이터 추출 및 이미지 ZIP 패키징)
    const generateBackupZip = async () => {
        const querySnapshot = await getDocs(collection(db, "workbook"));
        if (querySnapshot.empty) {
            throw new Error("저장된 데이터가 없습니다.");
        }

        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            return {
                _id: doc.id,
                ...docData,
                createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt,
                lastStudiedAt: docData.lastStudiedAt?.toDate ? docData.lastStudiedAt.toDate().toISOString() : docData.lastStudiedAt
            };
        });

        const zip = new JSZip();
        zip.file("FireSight_Backup.json", JSON.stringify(data, null, 2));

        const imgFolder = zip.folder("images");
        
        let urls = new Set();
        data.forEach(item => {
            if(item.images) item.images.forEach(u => urls.add(u));
            if(item.answerImages) item.answerImages.forEach(u => urls.add(u));
        });
        
        const urlArray = Array.from(urls);
        let downloadedCount = 0;

        // Blob 파일 다운로드
        for (const url of urlArray) {
            try {
                // Firebase Storage URL 인 경우에만
                if (url.includes('firebasestorage')) {
                    const imageRef = ref(storage, url);
                    const blob = await getBlob(imageRef);
                    
                    const urlObj = new URL(url);
                    const pathParts = urlObj.pathname.split('/');
                    const fileName = decodeURIComponent(pathParts[pathParts.length - 1]).replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    
                    imgFolder.file(fileName, blob);
                }
            } catch (e) {
                console.warn("Failed to download image:", url, e);
            }
            downloadedCount++;
            setStatus({ type: 'info', message: `이미지 원본 추출 중... (${downloadedCount}/${urlArray.length})` });
        }

        setStatus({ type: 'info', message: 'ZIP 압축 파일을 생성하고 있습니다...' });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        return { zipBlob, dataLength: data.length };
    };

    // 1. [백업] 로컬 다운로드 (ZIP)
    const handleLocalBackup = async () => {
        if (loading) return;
        setLoading(true);
        setStatus(null);

        try {
            const { zipBlob, dataLength } = await generateBackupZip();
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            
            const dateStr = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `FireSight_Backup_${dateStr}.zip`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatus({
                type: 'success',
                message: `✅ 총 ${dataLength}개의 데이터와 이미지가 압축 저장되었습니다.`
            });
        } catch (error) {
            console.error("Backup Failed:", error);
            setStatus({ type: 'error', message: `❌ 로컬 백업 실패: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    // 2. [백업] 구글 드라이브 업로드
    const handleDriveBackup = async () => {
        if (!isAuthenticated || !accessToken) {
            alert("구글 드라이브 연결을 위해 구글 계정 인증이 필요합니다.");
            if (handleLogin) handleLogin();
            return;
        }

        if (loading) return;
        setLoading(true);
        setStatus(null);

        try {
            const { zipBlob, dataLength } = await generateBackupZip();
            setStatus({ type: 'info', message: '☁️ 구글 드라이브에 업로드하고 있습니다...' });

            const dateStr = new Date().toISOString().slice(0, 10);
            const folderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

            const metadata = {
                name: `FireSight_Backup_${dateStr}.zip`,
                mimeType: 'application/zip',
                ...(folderId ? { parents: [folderId] } : {})
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', zipBlob);

            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                body: form
            });

            if (res.ok) {
                setStatus({ type: 'success', message: `🎉 드라이브 업로드 완료! (${dataLength}개 문제 보존됨)` });
            } else {
                const err = await res.json();
                throw new Error(err.error?.message || '구글 API 오류');
            }
        } catch (error) {
            console.error("Drive upload error", error);
            setStatus({ type: 'error', message: `❌ 구글 드라이브 업로드 실패: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    // 2.5 [AI 연동] 구글 Gemini 및 NotebookLM 전용 Markdown 전체 문제 내보내기
    const handleGeminiExport = async () => {
        if (loading) return;
        setLoading(true);
        setStatus(null);

        try {
            setStatus({ type: 'info', message: '🤖 구글 Gemini 연동용 데이터를 준비하고 있습니다...' });
            const querySnapshot = await getDocs(collection(db, "workbook"));
            if (querySnapshot.empty) {
                throw new Error("저장된 데이터가 없습니다.");
            }

            // 생성일 순 정렬
            const docs = querySnapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate() : new Date(docData.createdAt || 0)
                };
            });
            docs.sort((a, b) => a.createdAt - b.createdAt);

            let mdContent = `# Firesight 단권화 문제집 백업 및 AI 학습용 데이터\n`;
            mdContent += `- **추출일시**: ${new Date().toLocaleString()}\n`;
            mdContent += `- **총 문항 수**: ${docs.length}개\n`;
            mdContent += `- **주의사항**: 구글 Gemini NotebookLM에 새 파일을 올릴 때는, 기존에 올렸던 이전 백업 파일 소스를 삭제하고 **방금 다운로드한 최신 단일 파일 하나만 소스로 남겨두어야** 정확한 분석 및 중복 방지가 가능합니다.\n\n`;

            docs.forEach((p, idx) => {
                mdContent += `---\n\n`;
                mdContent += `## [${p.category || p.subject || '기타'}] [${idx + 1}] ${p.title || '제목 없음'}\n`;
                mdContent += `- **유형**: ${p.problemType || 'descriptive'}\n`;
                
                const cleanQuestion = (p.content || p.question || '내용 없음').replace(/\n/g, ' ').trim();
                mdContent += `- **지문**: ${cleanQuestion}\n`;
                
                const cleanAnswer = (p.answer || p.modelAnswer || '해설 없음').replace(/\n/g, ' ').trim();
                mdContent += `- **모범 답안**: ${cleanAnswer}\n`;
                
                let keywords = [];
                if (Array.isArray(p.keywords)) keywords = p.keywords;
                else if (typeof p.keywords === 'string' && p.keywords.trim()) keywords = p.keywords.split(',').map(k => k.trim());
                else if (Array.isArray(p.tags)) keywords = p.tags;
                mdContent += `- **채점 키워드**: ${keywords.join(', ') || '없음'}\n`;

                const numbers = Array.isArray(p.numbers) ? p.numbers : (p.gradingPoints?.mandatory_numbers || []);
                if (numbers.length > 0) {
                    mdContent += `- **포함 수치**: ${numbers.join(', ')}\n`;
                }
                if (p.memo) {
                    mdContent += `- **학습 메모**: ${p.memo.replace(/\n/g, ' ').trim()}\n`;
                }
                mdContent += `\n`;
            });

            const blob = new Blob([mdContent], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `firesight_all_problems.md`; // 파일명 고정하여 중복 교체 용이화
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setStatus({
                type: 'success',
                message: `🎉 구글 Gemini 연동용 Markdown 파일(firesight_all_problems.md) 다운로드 완료!`
            });
        } catch (error) {
            console.error("Gemini Export Failed:", error);
            setStatus({ type: 'error', message: `❌ Markdown 내보내기 실패: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    // 3. [복구] 파일 선택 핸들러
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // 만약 ZIP 파일인 경우와 JSON 파일인 경우를 분기 (향후 ZIP 복구 지원 가능)
        if (file.name.endsWith('.zip')) {
            alert("현재 ZIP 파일 복구는 준비 중입니다. JSON 파일로 선택해 주세요.");
            e.target.value = ''; 
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            processRestore(content);
        };
        reader.readAsText(file);
        
        e.target.value = ''; 
    };

    // 4. [복구] 실제 복원 로직 (기존 유지)
    const processRestore = async (jsonContent) => {
        if (!window.confirm("⚠️ 주의: 데이터를 복구하면 기존 데이터와 합쳐지거나 덮어쓰여집니다.\n진행하시겠습니까?")) return;

        setLoading(true);
        setStatus(null);

        try {
            const data = JSON.parse(jsonContent);
            if (!Array.isArray(data)) throw new Error("잘못된 파일 형식입니다. (데이터 배열이 아님)");

            const BATCH_SIZE = 450;
            let successCount = 0;

            for (let i = 0; i < data.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = data.slice(i, i + BATCH_SIZE);

                chunk.forEach((item) => {
                    const docRef = item._id ? doc(db, "workbook", item._id) : doc(collection(db, "workbook"));
                    const { _id, ...rest } = item;
                    const restoreData = {
                        ...rest,
                        createdAt: rest.createdAt ? new Date(rest.createdAt) : new Date(),
                        lastStudiedAt: rest.lastStudiedAt ? new Date(rest.lastStudiedAt) : null
                    };

                    batch.set(docRef, restoreData, { merge: true });
                });

                await batch.commit();
                successCount += chunk.length;
            }

            setStatus({ type: 'success', message: `🎉 성공! 총 ${successCount}개의 데이터를 복구했습니다.` });
        } catch (error) {
            console.error("Restore Failed:", error);
            setStatus({ type: 'error', message: `❌ 복구 실패: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 h-full bg-slate-950 text-white overflow-y-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
                    <Database className="text-blue-500" size={32} />
                    서버 독립 백업 센터
                </h2>
                <p className="text-slate-400">
                    파이어베이스 서버 없이도 모든 데이터를 보존할 수 있도록 실물 이미지가 포함된 통합 ZIP 백업을 제공합니다.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                
                {/* 1. 백업 카드 (구글 드라이브 + 로컬 ZIP) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <Download size={32} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">통합 데이터 백업 (ZIP)</h3>
                                <p className="text-slate-400 text-sm">
                                    이미지 파일 원본과 JSON 데이터를 하나로 압축합니다.
                                </p>
                            </div>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <li>텍스트 및 파이어베이스 저장소의 <strong className="text-rose-400">모든 실물 이미지 다운로드</strong></li>
                            <li><strong>FireSight_Backup.zip</strong> 형식으로 생성 (인터넷 영구 독립)</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleLocalBackup}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            내 기기(아이패드)에 압축파일 저장
                        </button>
                        
                        <button
                            onClick={handleDriveBackup}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Cloud size={18} />}
                            Google 드라이브로 직접 보내기
                        </button>
                    </div>
                </div>

                {/* 2. 복구 카드 (동일) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Upload size={32} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">데이터 복구 (Import)</h3>
                                <p className="text-slate-400 text-sm">
                                    백업 파일(JSON)을 업로드하여 데이터를 되살립니다.
                                </p>
                            </div>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <li>현재는 압축을 푼 <strong className="text-emerald-400">JSON 파일</strong> 복구만 지원합니다</li>
                            <li>기존 ID가 같으면 업데이트, 없으면 새 문서를 생성합니다</li>
                        </ul>
                    </div>

                    <input 
                        type="file" 
                        accept=".json,.zip" 
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
                        복구 파일(JSON) 선택
                    </button>
                </div>

                {/* 3. 구글 Gemini Notebook 연동 카드 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between lg:col-span-2 max-w-none">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <Sparkles size={32} className="text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Google Gemini NotebookLM 연동</h3>
                                <p className="text-slate-400 text-sm">
                                    모든 문제를 구조화된 Markdown(.md) 파일로 변환하여 구글 AI의 자료실(Notebook)에 업로드할 수 있도록 내보냅니다.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6 text-xs leading-relaxed">
                            <div>
                                <h4 className="font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <FileText size={12} className="text-indigo-400" />
                                    AI 맞춤 연동 학습 기능
                                </h4>
                                <ul className="text-slate-500 space-y-1 list-disc list-inside">
                                    <li><strong>맞춤 모의고사</strong>: <em>"수계 과목 113번과 유사한 오답 방지용 5문항 출제해줘"</em></li>
                                    <li><strong>핵심 요약</strong>: <em>"이 문제집의 설치 기준과 수치 조건들을 표로 만들어줘"</em></li>
                                    <li><strong>Audio Overview</strong>: NotebookLM에서 오디오 쇼로 음성 요약본 청취</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle size={12} className="text-amber-400" />
                                    ⚠️ AI 중복 학습 오작동 방지 팁
                                </h4>
                                <p className="text-slate-500">
                                    Gemini나 NotebookLM에 새 백업 파일을 업로드할 때는, <strong>기존에 등록했던 예전 백업 파일 소스를 먼저 삭제</strong>해 주세요. 
                                    방금 다운로드한 <strong>최신 단일 파일(<code className="text-indigo-300 font-bold">firesight_all_problems.md</code>) 하나만 소스 목록에 남겨두어야</strong> 데이터 중복으로 인한 AI 대화의 혼선을 막을 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleGeminiExport}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/5
                            ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                        Gemini Notebook용 내보내기 (Markdown)
                    </button>
                </div>

            </div>

            {status && (
                <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border animate-in slide-in-from-bottom-2 max-w-5xl
                    ${status.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : ''}
                    ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
                    ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : ''}
                `}>
                    {status.type === 'success' && <CheckCircle2 className="shrink-0" />}
                    {status.type === 'error' && <AlertTriangle className="shrink-0" />}
                    {status.type === 'info' && <Loader2 className="shrink-0 animate-spin" />}
                    <div>
                        <h4 className="font-bold text-sm mb-0.5">
                            {status.type === 'success' ? '작업 완료' : status.type === 'error' ? '오류 발생' : '처리 중...'}
                        </h4>
                        <p className="text-sm opacity-90">{status.message}</p>
                    </div>
                </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
                <ShieldCheck size={14} />
                <span>백업 시 구글 드라이브 연동은 Firebase 서버를 완전히 우회하는 로컬 직접 통신입니다.</span>
            </div>
        </div>
    );
}