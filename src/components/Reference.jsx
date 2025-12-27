import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Trash2, FileText, WifiOff, ExternalLink } from 'lucide-react';
import { saveFile as savePDF, getAllSavedFiles, deleteFile as deletePDF, getFile as getPDF } from '../utils/db'; // Aliased for compatibility with request

// Google Drive Folder ID
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

function Reference({ subject, isAuthenticated, handleLogin, isOnline, onDataToss }) {
    const [driveFiles, setDriveFiles] = useState([]); // 구글 드라이브 목록
    const [savedFiles, setSavedFiles] = useState([]); // 로컬 저장 목록
    const [isLoading, setIsLoading] = useState(false);

    // 1. 초기 로드: 온라인이면 드라이브 목록을, 오프라인이면 로컬 목록을 로드
    useEffect(() => {
        const syncFiles = async () => {
            setIsLoading(true);
            const localFiles = await getAllSavedFiles();
            setSavedFiles(localFiles);

            if (isOnline && isAuthenticated) {
                // 구글 드라이브 파일 목록 가져오는 기존 로직 호출
                fetchDriveFiles();
            }
            setIsLoading(false);
        };
        syncFiles();
    }, [isOnline, isAuthenticated]);

    const fetchDriveFiles = async () => {
        if (!window.gapi || !window.gapi.client) return;

        // 1. Check Local Cache
        const cached = localStorage.getItem('fireSight_driveCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            const now = new Date().getTime();
            if (now - parsed.timestamp < 3600 * 1000) {
                console.log("Using cached drive list");
                setDriveFiles(parsed.files);
                return;
            }
        }

        try {
            let targetFolderId = FOLDER_ID;
            // Handle Folder ID extraction if it's a URL
            if (FOLDER_ID && FOLDER_ID.includes('drive.google.com')) {
                const match = FOLDER_ID.match(/folders\/([-a-zA-Z0-9_]+)/);
                if (match && match[1]) targetFolderId = match[1];
            }

            // Try to find folder by name if ID looks like a name
            if (targetFolderId && targetFolderId.length < 25) {
                try {
                    const folderResponse = await window.gapi.client.drive.files.list({
                        q: `mimeType = 'application/vnd.google-apps.folder' and name = '${targetFolderId}' and trashed = false`,
                        fields: 'files(id, name)',
                        pageSize: 1
                    });
                    if (folderResponse.result.files && folderResponse.result.files.length > 0) {
                        targetFolderId = folderResponse.result.files[0].id;
                    }
                } catch (e) { }
            }

            const query = (targetFolderId && targetFolderId.length > 20)
                ? `'${targetFolderId}' in parents and trashed = false`
                : "trashed = false";

            const response = await window.gapi.client.drive.files.list({
                'pageSize': 100,
                'fields': "files(id, name, mimeType, webViewLink, iconLink)",
                'q': query,
            });

            const files = response.result.files || [];
            console.log("Fetched Files:", files.length);

            // Cache the result
            localStorage.setItem('fireSight_driveCache', JSON.stringify({
                timestamp: new Date().getTime(),
                files: files
            }));

            setDriveFiles(files);
        } catch (err) {
            console.error("Drive Fetch Error:", err);
            // On error, use cache if available
            if (cached) {
                setDriveFiles(JSON.parse(cached).files);
            }
        }
    };

    // 2. 오프라인 저장 실행 (구글 드라이브 -> IndexedDB)
    const handleDownload = async (file) => {
        if (!isOnline) return alert("오프라인 상태에서는 다운로드할 수 없습니다.");

        try {
            // 구글 드라이브에서 파일 Blob 데이터 가져오기
            const response = await window.gapi.client.drive.files.get({
                fileId: file.id,
                alt: 'media',
            });

            const blob = new Blob([response.body], { type: 'application/pdf' });
            // Call with meta object { name: file.name } to match DB schema expected by saveFile
            await savePDF(file.id, { name: file.name }, blob);

            // 로컬 상태 업데이트
            const updatedLocal = await getAllSavedFiles();
            setSavedFiles(updatedLocal);
            alert(`${file.name} 저장 완료!`);
        } catch (error) {
            console.error("저장 실패:", error);
            alert("다운로드 중 오류가 발생했습니다.");
        }
    };

    // 3. 스마트 파일 열기 (로컬 우선)
    const handleViewFile = async (file) => {
        const localData = await getPDF(file.id);

        if (localData) {
            // 로컬에 있으면 즉시 실행
            // localData might have structure { blob: ... } based on db.js saveFile implementation
            // db.js saveFile: { id, meta, blob, savedAt }
            // So localData.blob is the blob
            const blob = localData.blob || localData.data; // Handle both structures just in case
            const fileURL = URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
        } else if (isOnline) {
            // 로컬에 없고 온라인이면 드라이브에서 열기
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
                        {(isOnline ? driveFiles : savedFiles).map((file) => {
                            // Ensure we check savedFiles correctly. savedFiles stores full objects.
                            const isSaved = savedFiles.some(f => f.id === file.id);
                            // If offline, we are iterating savedFiles, so they are all saved.
                            // If online, we iterate driveFiles.

                            // Normalize Name: Saved files might store it in meta
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
                        {(isOnline ? driveFiles : savedFiles).length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent"></div>
                                            Loading...
                                        </div>
                                    ) : (
                                        "표시할 자료가 없습니다."
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Reference;
