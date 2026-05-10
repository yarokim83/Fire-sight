import React, { useState, useRef } from 'react';
import { 
    Database, Download, Upload, FileArchive, AlertTriangle, 
    CheckCircle2, Loader2, ShieldCheck, RefreshCw, CloudUpload
} from 'lucide-react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase'; 
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function StudyManager({ accessToken, tokenClient, isAuthenticated }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); 
    const [progress, setProgress] = useState(''); // 진행 상태 텍스트
    
    const fileInputRef = useRef(null);

    // 이미지 Fetch 헬퍼 (CORS 우회 및 Blob 변환)
    const fetchImageToBlob = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.blob();
        } catch (e) {
            console.warn('Image fetch failed:', url, e);
            return null;
        }
    };

    // 1. [통합 백업] ZIP 아카이브 생성
    const createZipArchive = async () => {
        setStatus(null);
        setProgress('데이터베이스에서 문서를 읽어오는 중...');
        
        const querySnapshot = await getDocs(collection(db, "workbook"));
        if (querySnapshot.empty) {
            throw new Error("저장된 데이터가 없습니다.");
        }

        const data = [];
        let imageUrls = new Set();

        querySnapshot.forEach(doc => {
            const docData = doc.data();
            const item = {
                _id: doc.id,
                ...docData,
                createdAt: docData.createdAt?.toDate ? docData.createdAt.toDate().toISOString() : docData.createdAt,
                lastStudiedAt: docData.lastStudiedAt?.toDate ? docData.lastStudiedAt.toDate().toISOString() : docData.lastStudiedAt
            };
            data.push(item);
            if (item.images) item.images.forEach(url => imageUrls.add(url));
            if (item.answerImages) item.answerImages.forEach(url => imageUrls.add(url));
        });

        const zip = new JSZip();
        zip.file("data.json", JSON.stringify(data, null, 2));

        const imageFolder = zip.folder("images");
        const urlsArray = Array.from(imageUrls);
        
        for (let i = 0; i < urlsArray.length; i++) {
            setProgress(`원본 이미지 다운로드 및 압축 중... (${i + 1}/${urlsArray.length})`);
            const url = urlsArray[i];
            const blob = await fetchImageToBlob(url);
            if (blob) {
                // Firebase URL에서 고유 파일명 추출 (대략적인 추측)
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/');
                const filename = decodeURIComponent(pathParts[pathParts.length - 1]).replace(/[^a-zA-Z0-9.-]/g, '_') || `image_${i}.jpg`;
                imageFolder.file(filename, blob);
            }
        }

        setProgress('ZIP 파일 패키징 중... (기기 성능에 따라 다소 시간이 소요될 수 있습니다)');
        const zipBlob = await zip.generateAsync({ type: "blob" });
        return { zipBlob, dataLength: data.length };
    };

    // 1-1. 로컬(아이패드) ZIP 저장
    const handleLocalBackup = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const { zipBlob, dataLength } = await createZipArchive();
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(zipBlob, `FireSight_Integrated_Backup_${dateStr}.zip`);
            
            setStatus({ type: 'success', message: `✅ 총 ${dataLength}개의 문서 및 이미지가 통합 압축되었습니다.` });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: `❌ 백업 실패: ${error.message}` });
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    // 1-2. 구글 드라이브 동기화 업로드
    const handleDriveUpload = async () => {
        if (loading) return;

        // 인증 체크
        if (!isAuthenticated || !accessToken) {
            if (tokenClient) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                alert("구글 연동이 준비되지 않았습니다. 앱을 껐다가 다시 켜주세요.");
            }
            return;
        }

        const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
        if (!FOLDER_ID) {
            alert(".env에 VITE_GOOGLE_DRIVE_FOLDER_ID가 없습니다.");
            return;
        }

        setLoading(true);
        try {
            const { zipBlob, dataLength } = await createZipArchive();
            setProgress('구글 드라이브로 업로드 전송 중...');

            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `FireSight_CloudSync_${dateStr}.zip`;

            // Google Drive Multipart Upload
            const metadata = {
                name: fileName,
                parents: [FOLDER_ID]
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

            if (!res.ok) {
                throw new Error(`Drive Upload Failed: ${res.statusText}`);
            }

            setStatus({ type: 'success', message: `☁️ 구글 드라이브 동기화 완료! (${dataLength}건)` });
        } catch (error) {
            console.error(error);
            setStatus({ type: 'error', message: `❌ 드라이브 업로드 실패: ${error.message}` });
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    // 2. [복구] 파일 선택 핸들러
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // ZIP 파일을 올렸을지 JSON을 올렸을지에 대한 분기 처리 필요
        if (file.name.endsWith('.zip')) {
            alert("통합 복원(ZIP 해제 및 DB 인서트)은 현재 준비 중입니다. 압축 해제 후 data.json 파일만 선택해 주세요.");
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

    // 3. [복구] 실제 복원 로직
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
                    데이터 관리 및 통합 백업
                </h2>
                <p className="text-slate-400">
                    클라우드에 분산된 텍스트와 모든 실물 이미지를 하나로 묶어 독립적으로 저장하거나 구글 드라이브와 동기화할 수 있습니다.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                
                {/* 1. 백업 카드 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <FileArchive size={32} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">독립형 통합 백업 (.zip)</h3>
                                <p className="text-slate-400 text-sm">
                                    서버의 모든 텍스트와 실물 이미지를 하나로 묶어냅니다.
                                </p>
                            </div>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <li>문제, 정답 텍스트 및 메타데이터 (data.json)</li>
                            <li>실물 이미지 원본 파일 포함 (images/ 폴더)</li>
                            <li>서버 종료 시에도 100% 안전한 영구 보존 방식</li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* 로컬 아이패드 다운로드 */}
                        <button
                            onClick={handleLocalBackup}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg
                                ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white shadow-black/20 active:scale-95'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Download size={18} />}
                            기기(iPad/PC)에 압축 파일 다운로드
                        </button>

                        {/* 구글 드라이브 동기화 */}
                        <button
                            onClick={handleDriveUpload}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg
                                ${loading ? 'bg-blue-900/20 text-blue-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-95'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <CloudUpload size={18} />}
                            개인 구글 드라이브에 안전하게 동기화
                        </button>
                    </div>

                    {progress && (
                        <p className="text-center text-xs text-blue-400 mt-4 font-bold animate-pulse">
                            {progress}
                        </p>
                    )}
                </div>

                {/* 2. 복구 카드 */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Upload size={32} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">데이터 복구 (Import)</h3>
                                <p className="text-slate-400 text-sm">
                                    추출된 데이터 파일을 업로드하여 되살립니다.
                                </p>
                            </div>
                        </div>
                        <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6">
                            <li>압축 해제 후 <strong>data.json</strong> 파일만 선택하세요</li>
                            <li>기존 ID가 같으면 내용을 덮어씁니다 (업데이트)</li>
                            <li>없는 ID는 새로 추가됩니다</li>
                        </ul>
                    </div>

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
                        className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg mt-auto
                            ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 active:scale-95'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                        JSON 파일 선택 및 복구
                    </button>
                </div>

            </div>

            {status && (
                <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border animate-in slide-in-from-bottom-2 max-w-5xl
                    ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
                >
                    {status.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertTriangle className="shrink-0" />}
                    <div>
                        <h4 className="font-bold text-sm mb-1">{status.type === 'success' ? '작업 완료' : '오류 발생'}</h4>
                        <p className="text-sm opacity-90">{status.message}</p>
                    </div>
                </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
                <ShieldCheck size={14} />
                <span>파이어베이스가 종료되어도 기기와 구글 드라이브의 백업 파일은 영구적으로 보존됩니다.</span>
            </div>
        </div>
    );
}