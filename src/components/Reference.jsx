import React, { useState, useEffect, useRef } from 'react';
import { FileText, WifiOff, ExternalLink, LogIn, Upload, RefreshCw, Trash2, BrainCircuit, Image as ImageIcon, CheckCircle, Search, X } from 'lucide-react';
import { saveFile as savePDF, getAllSavedFiles, deleteFile as deletePDF, getFile as getPDF } from '../utils/db';

function Reference({ isAuthenticated, handleLogin, isOnline, onDataToss }) {
    const [driveFiles, setDriveFiles] = useState([]);
    const [savedFiles, setSavedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    
    // [추가] 디바운싱 타이머 (사용자가 타자를 칠 때마다 API 요청하지 않도록)
    const searchTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        syncFiles();
    }, [isOnline, isAuthenticated]);

    // [변경] 검색어가 바뀌면 API를 다시 호출하여 '본문 검색' 수행
    useEffect(() => {
        if (!isOnline || !isAuthenticated) return;

        // 타자 칠 때마다 요청 보내면 비효율적이므로 0.5초 딜레이
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(() => {
            fetchDriveFiles(searchTerm);
        }, 500);

    }, [searchTerm]);

    const syncFiles = async () => {
        setIsLoading(true);
        const localFiles = await getAllSavedFiles();
        setSavedFiles(localFiles);

        if (isOnline && isAuthenticated) {
            await fetchDriveFiles(); // 초기엔 전체 목록
        }
        setIsLoading(false);
    };

    // [핵심 기능] 본문 검색(fullText)이 적용된 구글 드라이브 요청 함수
    const fetchDriveFiles = async (queryText = '') => {
        if (!window.gapi || !window.gapi.client) return;
        
        try {
            setIsLoading(true);
            const targetFolderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
            
            // 1. 기본 쿼리: 해당 폴더 안에 있고 + 삭제되지 않은 파일
            let query = `'${targetFolderId}' in parents and trashed = false`;

            // 2. [검색 기능] 검색어가 있으면 'fullText' 조건 추가
            // fullText contains '단어': 파일 이름, 설명, 그리고 **파일 내용**까지 검색함
            if (queryText.trim()) {
                // 구글 쿼리 문법에 맞춰서 특수문자 이스케이프 처리
                const safeQuery = queryText.replace(/'/g, "\\'");
                query += ` and fullText contains '${safeQuery}'`;
            }

            const response = await window.gapi.client.drive.files.list({
                'pageSize': 100,
                'fields': "files(id, name, mimeType, webViewLink, iconLink)",
                'q': query,
            });
            
            setDriveFiles(response.result.files || []);
        } catch (err) {
            console.error("본문 검색 실패:", err);
            // 에러 시 기존 목록 유지하거나 빈 배열 처리
        } finally {
            setIsLoading(false);
        }
    };

    // ... (handleFileUpload, handleViewFile 등 나머지 함수는 기존과 동일) ...
    // ... (handleCreateQuiz, handleCreateVisual, handleDeleteFile 등 기존과 동일) ...

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const fileId = `local_${Date.now()}`;
            await savePDF(fileId, { id: fileId, name: file.name }, file);
            
            // 저장 후 목록 갱신 (로컬 파일 다시 불러오기)
            const localFiles = await getAllSavedFiles();
            setSavedFiles(localFiles);
            
            alert(`[${file.name}] 저장 완료!`);
        } catch (error) {
            console.error("File upload failed:", error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleViewFile = async (file) => {
        const isSaved = savedFiles.some(f => f.id === file.id);

        if (isSaved) {
            try {
                const localData = await getPDF(file.id);
                if (localData) {
                    const blob = localData.blob || localData.data;
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                } else {
                    alert("파일 데이터를 찾을 수 없습니다.");
                }
            } catch (e) {
                console.error("Error opening local file:", e);
                alert("파일 열기 실패");
            }
        } else {
            if (file.webViewLink) {
                window.open(file.webViewLink, '_blank');
            } else {
                alert("구글 드라이브 링크가 없습니다.");
            }
        }
    };

    const handleCreateQuiz = (file) => {
        if (onDataToss) {
            onDataToss({
                type: 'quiz_generation',
                source: 'reference',
                title: file.name,
                fileId: file.id
            });
            alert(`[${file.name}] 문제 생성을 시작합니다.`);
        }
    };

    const handleCreateVisual = (file) => {
        if (onDataToss) {
            onDataToss({
                type: 'visual_generation',
                source: 'reference',
                title: file.name,
                fileId: file.id
            });
            alert(`[${file.name}] Visual 생성을 시작합니다.`);
        }
    };
    
    const handleDeleteFile = async (fileId) => {
        if (window.confirm('기기에서 삭제하시겠습니까?')) {
            await deletePDF(fileId);
            // 삭제 후 목록 갱신
            const localFiles = await getAllSavedFiles();
            setSavedFiles(localFiles);
        }
    };

    // [렌더링 로직 수정] 
    // 로컬 파일은 '제목'으로만 필터링 (IndexedDB는 본문 검색 불가)
    // 드라이브 파일은 API가 이미 필터링해서 줌
    const filteredLocalFiles = savedFiles.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 최종 표시 목록: (검색된 로컬 파일) + (본문 검색된 드라이브 파일) - (중복 제거)
    const displayFiles = [
        ...filteredLocalFiles, 
        ...driveFiles.filter(d => !filteredLocalFiles.some(s => s.id === d.id))
    ];

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto animate-in fade-in duration-300">
            {/* 헤더 영역 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <FileText className="text-blue-500" />
                    Reference & Past Papers
                </h2>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    {/* 검색창 */}
                    <div className="relative group w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="내용/제목 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 transition-all outline-none"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
                        <button onClick={() => fileInputRef.current.click()} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg whitespace-nowrap">
                            <Upload size={16} />
                            <span>PDF 등록</span>
                        </button>
                    </div>
                </div>
            </div>

            {!isOnline && (
                 <div className="flex items-center justify-end mb-4">
                    <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30 animate-pulse">
                        <WifiOff size={12} /> Offline Mode
                    </span>
                </div>
            )}

            {isOnline && !isAuthenticated && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center mb-6">
                    <LogIn size={32} className="text-slate-500 mb-3" />
                    <p className="text-slate-400 text-sm mb-4">구글 드라이브 파일을 보려면 연결하세요.</p>
                    <button onClick={handleLogin} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors">
                        계정 연결
                    </button>
                </div>
            )}

            {/* 파일 목록 테이블 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl min-h-[300px] max-h-[calc(100vh-220px)] overflow-y-auto relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-20">
                        <RefreshCw className="animate-spin text-blue-500" />
                    </div>
                )}
                
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm text-slate-400 border-b border-slate-800 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 w-1/2">자료명</th>
                            <th className="px-4 py-3 text-center">상태</th>
                            <th className="px-4 py-3 text-right">기능</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {displayFiles.map((file) => {
                            // Saved 여부 확인 (id 기준)
                            const isSaved = savedFiles.some(f => f.id === file.id);
                            
                            return (
                                <tr key={file.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-4 py-4 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isSaved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                <FileText size={18} />
                                            </div>
                                            <span className="text-slate-200 group-hover:text-white transition-colors cursor-pointer" onClick={() => handleViewFile(file)}>
                                                {file.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                         {isSaved ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                                <CheckCircle size={10} /> Saved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                                                Cloud
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button 
                                                onClick={() => handleViewFile(file)} 
                                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700" 
                                                title={isSaved ? "열기" : "구글 드라이브 열기"}
                                            >
                                                <ExternalLink size={16} />
                                            </button>
                                            
                                            {(isSaved || isOnline) && (
                                                <>
                                                    <button 
                                                        onClick={() => handleCreateQuiz(file)} 
                                                        className="p-2 bg-purple-900/20 hover:bg-purple-900/50 text-purple-400 rounded-lg transition-colors border border-purple-500/20" 
                                                        title="문제 생성"
                                                    >
                                                        <BrainCircuit size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCreateVisual(file)} 
                                                        className="p-2 bg-sky-900/20 hover:bg-sky-900/50 text-sky-400 rounded-lg transition-colors border border-sky-500/20" 
                                                        title="Visual 생성"
                                                    >
                                                        <ImageIcon size={16} />
                                                    </button>
                                                </>
                                            )}

                                            {isSaved && (
                                                <button 
                                                    onClick={() => handleDeleteFile(file.id)} 
                                                    className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors border border-red-500/20" 
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

                {!isLoading && displayFiles.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                        {searchTerm ? (
                            <>
                                <p className="text-lg">"{searchTerm}" 관련 자료를 찾지 못했습니다.</p>
                                <p className="text-sm mt-2">구글 드라이브 파일의 내용은 검색될 수 있지만, 로컬 파일은 제목만 검색됩니다.</p>
                            </>
                        ) : (
                            <>
                                <p>표시할 파일이 없습니다.</p>
                                <p className="text-sm mt-2">PDF를 직접 등록하거나 계정을 연결해 주세요.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Reference;