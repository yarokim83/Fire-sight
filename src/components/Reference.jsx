import React, { useState, useEffect } from 'react';
import {
    Search, FolderOpen, FileText, Download, ExternalLink,
    ChevronRight, Loader2, Clock, HardDrive, CheckCircle2, Lock, AlertCircle
} from 'lucide-react';

/* 
  [SECURITY NOTE] 
  실제 배포 시에는 .env 파일 등을 사용하여 환경변수로 관리하세요.
  For Development: Paste your keys here temporarily.
*/
const API_KEY = ""; // TODO: Insert Google Drive API Key
const CLIENT_ID = ""; // TODO: Insert OAuth 2.0 Client ID

// Google Drive Folder IDs for each subject (Replace with real Folder IDs)
const FOLDER_IDS = {
    mechanical: "YOUR_MECHANICAL_FOLDER_ID",
    electrical: "YOUR_ELECTRICAL_FOLDER_ID"
};

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

export default function Reference({ subject }) {
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [files, setFiles] = useState([]);

    // Auth & Init States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [tokenClient, setTokenClient] = useState(null);
    const [gapiInited, setGapiInited] = useState(false);
    const [gisInited, setGisInited] = useState(false);

    // Theme Configuration
    const theme = subject === 'mechanical'
        ? {
            accent: 'text-blue-400',
            bg: 'bg-blue-600',
            border: 'border-blue-500/30',
            hover: 'hover:bg-blue-500/10',
            ring: 'focus:ring-blue-500',
            btn: 'bg-blue-600 hover:bg-blue-500'
        }
        : {
            accent: 'text-orange-400',
            bg: 'bg-orange-600',
            border: 'border-orange-500/30',
            hover: 'hover:bg-orange-500/10',
            ring: 'focus:ring-orange-500',
            btn: 'bg-orange-600 hover:bg-orange-500'
        };

    // 1. Initial Load: Load Google Scripts (gapi & gis)
    useEffect(() => {
        const loadGapi = () => {
            // Check if already loaded or loading
            if (window.gapi || document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
                if (window.gapi) initGapi();
                return;
            }
            console.log("[Reference] Loading gapi script...");
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.onload = () => {
                console.log("[Reference] gapi script loaded.");
                initGapi();
            };
            document.body.appendChild(gapiScript);
        };

        const initGapi = () => {
            // Guard: Check API Key
            if (!API_KEY) {
                console.warn("[Reference] API_KEY is missing. Skipping gapi init.");
                return;
            }

            window.gapi.load('client', async () => {
                try {
                    console.log("[Reference] Initializing gapi client...");
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                    setGapiInited(true);
                    console.log("[Reference] gapi client initialized!");
                } catch (err) {
                    console.error("[Reference] Error initializing gapi client:", err);
                }
            });
        };

        const loadGis = () => {
            // Check if already loaded or loading
            if (window.google?.accounts?.oauth2 || document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
                if (window.google?.accounts?.oauth2) initGis();
                return;
            }

            console.log("[Reference] Loading gis script...");
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.onload = () => {
                console.log("[Reference] gis script loaded.");
                initGis();
            };
            document.body.appendChild(gisScript);
        };

        const initGis = () => {
            // Guard: Check Client ID
            if (!CLIENT_ID) {
                console.warn("[Reference] CLIENT_ID is missing. Skipping gis init.");
                return;
            }

            console.log("[Reference] Initializing gis token client...");
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (resp) => {
                        console.log("[Reference] Token callback received:", resp);
                        if (resp.error) {
                            console.error("[Reference] Auth Error:", resp);
                            throw (resp);
                        }
                        setIsAuthenticated(true);
                        console.log("[Reference] Authenticated successfully.");
                    },
                });
                setTokenClient(client);
                setGisInited(true);
                console.log("[Reference] gis token client initialized!");
            } catch (err) {
                console.error("[Reference] Error initializing gis:", err);
            }
        };

        loadGapi();
        loadGis();
    }, []);

    // 2. Auth Handlers
    const handleAuthClick = () => {
        if (!API_KEY || !CLIENT_ID) {
            alert("API 설정 오류: 소스 코드의 API_KEY와 CLIENT_ID를 먼저 설정해주세요.");
            console.warn("[Reference] Missing API configuration.");
            return;
        }

        if (tokenClient) {
            console.log("[Reference] Requesting access token...");
            // Skip prompt if we just want to restore session, prompt if explicit login needed
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            console.error("[Reference] Token client not initialized yet.");
            alert("구글 서비스 초기화 중입니다. 잠시 후 다시 시도해주세요.");
        }
    };

    // 3. Fetch Files when Authenticated
    useEffect(() => {
        if (!isAuthenticated || !gapiInited) return;

        const fetchFiles = async () => {
            console.log(`[Reference] Fetching files for subject: ${subject}`);
            setIsLoading(true);
            setFiles([]);
            const folderId = FOLDER_IDS[subject];

            if (!folderId || folderId.startsWith("YOUR_")) {
                console.warn("[Reference] Invalid Folder ID configured.");
                setIsLoading(false);
                return;
            }

            try {
                // Query: Inside specific folder, Not Trashed
                const query = `'${folderId}' in parents and trashed = false`;
                const response = await window.gapi.client.drive.files.list({
                    'pageSize': 20,
                    'fields': "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)",
                    'q': query,
                    'orderBy': 'folder, name'
                });

                console.log("[Reference] Files response:", response);

                const driveFiles = response.result.files || [];
                const mappedFiles = driveFiles.map(f => ({
                    id: f.id,
                    name: f.name,
                    size: f.size ? (parseInt(f.size) / 1024 / 1024).toFixed(1) + ' MB' : '-',
                    date: new Date(f.modifiedTime).toLocaleDateString(),
                    status: 'Cloud',
                    link: f.webViewLink
                }));

                setFiles(mappedFiles);
            } catch (err) {
                console.error("[Reference] Error fetching files:", err);
                if (err.status === 401 || err.status === 403) {
                    setIsAuthenticated(false); // Force re-auth on token expiry
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchFiles();
    }, [isAuthenticated, subject, gapiInited]);


    // Filter Logic
    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileClick = (url) => {
        window.open(url, '_blank');
    };

    // Initialization Status Helper
    const isReady = gapiInited && gisInited;

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-300 font-sans">

            {/* Header Area */}
            <div className={`px-8 py-6 border-b ${theme.border} bg-slate-900/50 backdrop-blur-md sticky top-0 z-20`}>
                <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4 font-mono">
                    <HardDrive size={14} />
                    <span>Google Drive</span>
                    <ChevronRight size={12} />
                    <span>소방시설 점검실무</span>
                    <ChevronRight size={12} />
                    <span className={`font-bold uppercase ${theme.accent}`}>
                        {subject === 'mechanical' ? 'Mechanical (기계)' : 'Electrical (전기)'}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <FolderOpen className={theme.accent} size={28} />
                            참고 자료실
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Google Cloud 기반 실시간 데이터베이스
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="파일명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={!isAuthenticated}
                            className={`w-full bg-slate-800 text-sm text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 border border-slate-700 
                                focus:outline-none focus:ring-2 ${theme.ring} transition-all shadow-sm disabled:opacity-50`}
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative">

                {!isAuthenticated ? (
                    /* Not Authenticated State */
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                        <div className={`p-6 rounded-full bg-slate-800/50 border-2 ${theme.border} mb-2`}>
                            <Lock size={48} className={theme.accent} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Google Drive 접근 권한이 필요합니다</h3>

                        {!isReady ? (
                            <div className="flex flex-col items-center space-y-2 text-slate-500">
                                <Loader2 size={24} className="animate-spin text-slate-400" />
                                <span className="text-sm">구글 서비스 연결 중...</span>
                            </div>
                        ) : (
                            <>
                                <p className="text-slate-400 text-sm max-w-md text-center">
                                    보안을 위해 학습 자료는 인증된 사용자에게만 제공됩니다.<br />
                                    아래 버튼을 눌러 본인의 계정으로 로그인해 주세요.
                                </p>
                                <button
                                    onClick={handleAuthClick}
                                    className={`flex items-center space-x-3 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${theme.btn}`}
                                >
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="G" />
                                    <span>Google 계정으로 계속하기</span>
                                </button>

                                {(!API_KEY || !CLIENT_ID) && (
                                    <div className="flex items-center gap-2 text-amber-500 text-xs mt-4 bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-500/20">
                                        <AlertCircle size={14} />
                                        <span>API Key 및 Client ID 설정이 필요합니다.</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : isLoading ? (
                    /* Loading State */
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                        <Loader2 size={40} className={`animate-spin ${theme.accent}`} />
                        <span className="text-sm text-slate-500 animate-pulse">Drive API 통신 중...</span>
                    </div>
                ) : (
                    /* File List State */
                    <div className="w-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                        <div className="flex items-center px-6 py-3 bg-slate-800/80 text-xs font-bold text-slate-400 border-b border-slate-700 uppercase tracking-wider">
                            <div className="flex-1">File Name</div>
                            <div className="w-32 text-center">Cloud Status</div>
                            <div className="w-24 text-right">Size</div>
                            <div className="w-32 text-right">Modified</div>
                            <div className="w-16"></div>
                        </div>

                        {filteredFiles.length > 0 ? (
                            <div className="divide-y divide-slate-800">
                                {filteredFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        onClick={() => handleFileClick(file.link)}
                                        className={`group flex items-center px-6 py-4 cursor-pointer transition-colors duration-200 ${theme.hover} hover:bg-slate-800`}
                                    >
                                        <div className="flex-1 flex items-center space-x-3 min-w-0">
                                            <div className={`p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors`}>
                                                <FileText size={20} className={theme.accent} />
                                            </div>
                                            <div className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                                                {file.name}
                                            </div>
                                        </div>

                                        <div className="w-32 flex justify-center">
                                            <span className="px-2 py-1 rounded text-[10px] font-bold border bg-sky-500/10 text-sky-400 border-sky-500/20">
                                                Synced
                                            </span>
                                        </div>

                                        <div className="w-24 text-right text-sm text-slate-500 font-mono">
                                            {file.size}
                                        </div>

                                        <div className="w-32 text-right text-xs text-slate-500 flex items-center justify-end gap-1">
                                            <Clock size={12} />
                                            {file.date}
                                        </div>

                                        <div className="w-16 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white">
                                                <ExternalLink size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-slate-500">
                                <FolderOpen size={48} className="mx-auto mb-4 opacity-20" />
                                <p>폴더가 비어있거나 검색 결과가 없습니다.</p>
                                {(FOLDER_IDS[subject] || "").startsWith("YOUR_") && (
                                    <p className="text-xs text-amber-500 mt-2">
                                        * FOLDER_ID가 설정되지 않았습니다.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-3 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span>Ref Status:</span>
                    <span className={isReady ? 'text-blue-500' : 'text-slate-600'}>
                        {isReady ? 'Systems Ready' : 'Initializing...'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span>{isAuthenticated ? 'Authenticated' : 'Offline'}</span>
                </div>
            </div>
        </div>
    );
}
