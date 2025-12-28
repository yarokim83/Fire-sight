import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Trash2, FileText, WifiOff, ExternalLink, LogIn } from 'lucide-react';
import { saveFile as savePDF, getAllSavedFiles, deleteFile as deletePDF, getFile as getPDF } from '../utils/db';

const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

function Reference({ subject, isAuthenticated, handleLogin, isOnline, onDataToss }) {
    const [driveFiles, setDriveFiles] = useState([]);
    const [savedFiles, setSavedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const syncFiles = async () => {
            setIsLoading(true);
            const localFiles = await getAllSavedFiles();
            setSavedFiles(localFiles);

            if (isOnline && isAuthenticated) {
                fetchDriveFiles();
            }
            setIsLoading(false);
        };
        syncFiles();
    }, [isOnline, isAuthenticated]);

    const fetchDriveFiles = async () => {
        if (!window.gapi || !window.gapi.client) return;

        try {
            // 복잡한 ID 추출 로직 대신 직접 사용
            const targetFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
            
            const response = await window.gapi.client.drive.files.list({
                'pageSize': 100,
                'fields': "files(id, name, mimeType, webViewLink, iconLink)",
                // 'trashed = false'를 유지하되 폴더 ID 쿼리를 단순화
                'q': `'${targetFolderId}' in parents and trashed = false`,
            });

            const files = response.result.files || [];
            setDriveFiles(files);
            
            // 캐시도 일단 초기화
            localStorage.removeItem('fireSight_driveCache'); 
        } catch (err) {
            console.error("Drive Fetch Error:", err);
        }
    };

    const handleDownload = async (file) => {
        if (!isOnline) return alert("오프라인 상태에서는 다운로드할 수 없습니다.");

        try {
            setIsLoading(true); // 로딩 상태 시작

            // 1. 구글 인증 토큰 가져오기
            const token = window.gapi.client.getToken().access_token;

            // 2. fetch API를 사용하여 파일의 실제 데이터(media)를 직접 호출
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('파일 데이터를 가져오지 못했습니다.');

            // 3. 응답 데이터를 Blob으로 변환
            const blob = await response.blob();

            // 4. IndexedDB 저장 (매개변수 구조를 db.js와 일치시킴)
            await savePDF(file.id, { name: file.name }, blob);

            // 5. 로컬 상태 업데이트 및 알림
            const updatedLocal = await getAllSavedFiles();
            setSavedFiles(updatedLocal);
            alert(`[${file.name}] 오프라인 저장이 완료되었습니다!`);

        } catch (error) {
            console.error("저장 실패 상세:", error);
            alert(`다운로드 실패: ${error.message || "권한 또는 네트워크 오류"}`);
        } finally {
            setIsLoading(false); // 로딩 상태 해제
        }
    };

    const handleViewFile = async (file) => {
        const localData = await getPDF(file.id);

        if (localData) {
            const blob = localData.blob || localData.data;
            const fileURL = URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
        } else if (isOnline) {
            window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
        } else {
            alert("오프라인 상태이며 로컬에 저장되지 않은 파일입니다.");
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <FileText className="text-blue-500" />
                    법령 및 기출 자료실
                </h2>
                {!isOnline && (
                    <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30 animate-pulse">
                        <WifiOff size={12} /> 오프라인 모드
                    </span>
                )}
            </div>

            {/* [구글 연동 복구] 로그인 권장 UI */}
            {isOnline && !isAuthenticated && (
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-8 text-center mb-6">
                    <div className="flex justify-center mb-4 text-blue-400">
                        <LogIn size={48} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Google Drive 연동 필요</h3>
                    <p className="text-slate-400 mb-6 text-sm">구글 드라이브에 저장된 화재안전기준(NFTC)과 기출문제 목록을 가져오려면 로그인이 필요합니다.</p>
                    <button
                        onClick={handleLogin}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        구글 계정으로 연결하기
                    </button>
                </div>
            )}

            {/* 파일 리스트 테이블 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-3">파일명</th>
                            <th className="px-4 py-3">상태</th>
                            <th className="px-4 py-3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {(isOnline && isAuthenticated ? driveFiles : savedFiles).map((file) => {
                            const isSaved = savedFiles.some(f => f.id === file.id);
                            const fileName = file.name || file.meta?.name || 'Untitled';

                            return (
                                <tr key={file.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-4 font-medium flex items-center gap-2">
                                        <span className="truncate max-w-[300px] text-white">{fileName}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                        {isSaved ? (
                                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                                                <CheckCircle size={14} /> Offline Ready
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-xs bg-slate-800 px-2 py-1 rounded-full w-fit border border-slate-700">Cloud Only</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewFile(file)}
                                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                                                title="보기"
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            {isOnline && !isSaved && (
                                                <button
                                                    onClick={() => handleDownload(file)}
                                                    className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors border border-blue-500/30"
                                                    title="오프라인 저장"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            )}
                                            {isSaved && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('정말 삭제하시겠습니까?')) {
                                                            await deletePDF(file.id);
                                                            const updatedLocal = await getAllSavedFiles();
                                                            setSavedFiles(updatedLocal);
                                                        }
                                                    }}
                                                    className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition-colors border border-red-500/30"
                                                    title="삭제"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {/* 데이터가 없을 때의 처리 */}
                {(isOnline && isAuthenticated ? driveFiles : savedFiles).length === 0 && !isLoading && (
                    <div className="p-12 text-center text-slate-500">표시할 자료가 없습니다.</div>
                )}
            </div>
        </div>
    );
}

export default Reference;
