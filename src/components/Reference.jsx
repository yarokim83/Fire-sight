import React, { useState, useEffect, useRef } from 'react';
import {
    Scale, BookOpen, Building2, Calculator,
    FileText, ExternalLink, Search, Clock,
    X, AlertTriangle, FileCheck, Map, ArrowRightCircle, BookOpenCheck,
    LogIn, Loader2, HardDrive, User, Info, Tag, Trash2, FolderInput, PenTool
} from 'lucide-react';
import { getAllFileIds, saveFile, deleteFile, getFile } from '../utils/db';

// Google Drive Folder ID
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

// summaryDatabase: 키워드 기반 메타데이터 매핑
const summaryDatabase = {
    '소방시설법': {
        title: "소방시설 설치 및 관리에 관한 법률",
        desc: "특정소방대상물에 설치하는 소화·경보·피난구조설비 등의 설치·관리 기준과 소방용품 성능관리를 목적으로 하는 핵심 법령입니다.",
        penalty: "시설 미관리 시 300만원 이하 과태료 부과 (중대 위반 시 형사처벌 가능)",
        tags: ["#행정", "#필수암기", "#설치기준"],
        keywords: ['소방시설법', '설치 및 관리', '소방시설공사업법'],
        quickLinks: [
            { label: "별표 4 (설치대상)", page: 45 },
            { label: "제22조 (자체점검)", page: 12 },
            { label: "별표 2 (수용인원)", page: 38 }
        ]
    },
    '화재예방법': {
        title: "화재의 예방 및 안전관리에 관한 법률",
        desc: "화재 예방 및 안전관리 활동을 규정하며, 소방안전관리자 선임, 권한 및 예방안전진단 제도를 포함합니다.",
        penalty: "소방안전관리자 업무 태만 시 300만원 이하 과태료 부과",
        tags: ["#예방", "#안전관리자", "#특별관리"],
        keywords: ['화재예방법', '화재의 예방', '안전관리'],
        quickLinks: [
            { label: "제24조 (소방안전관리자)", page: 15 },
            { label: "제29조 (건설현장)", page: 22 }
        ]
    },
    '다중이용업소법': {
        title: "다중이용업소의 안전관리에 관한 특별법",
        desc: "불특정 다수가 이용하는 영업장의 안전시설 설치·유지 및 화재배상책임보험 가입 의무 등을 엄격히 규정합니다.",
        penalty: "안전시설 미설치 시 300만원 이하 과태료 및 시정명령",
        tags: ["#다중이용", "#영업장", "#필수설비"],
        keywords: ['다중이용업소', '특별법', '노래반주기'],
        quickLinks: [
            { label: "별표 1 (영업범위)", page: 5 },
            { label: "안전시설등의 기준", page: 18 }
        ]
    },
    '건축법': {
        title: "건축법 및 건축물의 피난·방화구조 규칙",
        desc: "건축물의 대지, 구조, 설비 기준 및 용도를 정하여 화재 시 피난 및 방화 성능을 확보하는 것이 목적입니다.",
        penalty: "위법 건축물에 대해 이행강제금 부과",
        tags: ["#건축", "#방화구획", "#피난계단"],
        keywords: ['건축법', '피난', '방화구조', '방화문'],
        quickLinks: [
            { label: "제46조 (방화구획)", page: 55 },
            { label: "제49조 (피난시설)", page: 62 },
            { label: "갑종/을종 방화문", page: 88 }
        ]
    },
    'NFTC': {
        title: "국가화재안전기술기준 (NFTC)",
        desc: "소방시설의 구체적인 설치 방법과 기술적 기준을 상세히 다루는 실무 및 시험 핵심 기준서입니다.",
        penalty: "기술기준 위반 시 시정명령 및 과태료",
        tags: ["#기술기준", "#설계", "#시공"],
        keywords: ['NFTC', 'NFPC', '화재안전기술기준', '성능기준'],
        quickLinks: [
            { label: "수원 산정 기준", page: 10 },
            { label: "배관 설치 기준", page: 15 },
            { label: "헤드 설치 기준", page: 25 }
        ]
    },
    'NFTC 해설서': {
        title: "NFTC 상세 해설서",
        desc: "NFTC 기준의 배경, 공학적 근거, 세부 적용 예시를 포함하여 심도 있는 이해를 돕는 기술 자료입니다.",
        penalty: "참고 자료 (법적 효력 없음)",
        tags: ["#심화", "#해설", "#공학계산"],
        keywords: ['해설서', '해설', '부록', '심화'],
        quickLinks: []
    }
};

const Reference = ({ subject, isAuthenticated, handleLogin, handleLogout, gapiInited, onDataToss }) => {
    const [activeTab, setActiveTab] = useState('L1');
    const [selectedSummary, setSelectedSummary] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewPage, setPreviewPage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [driveFiles, setDriveFiles] = useState([]);
    const [deletedFileIds, setDeletedFileIds] = useState([]);
    const [categorized, setCategorized] = useState({ L1: [], L2: [], L3: [], L4: [] });
    const [searchTerm, setSearchTerm] = useState('');
    // [NEW] Manual Categorization State
    const [manualCategories, setManualCategories] = useState(() => JSON.parse(localStorage.getItem('fireSight_manualCategories') || '{}'));
    const [activeMenuFileId, setActiveMenuFileId] = useState(null); // For dropdown

    // [NEW] Offline Support State
    const [offlineFiles, setOfflineFiles] = useState([]); // IDs of files saved locally
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        const savedDeleted = JSON.parse(localStorage.getItem('fireSight_deletedRefs') || '[]');
        setDeletedFileIds(savedDeleted);

        // Init Offline List
        getAllFileIds().then(ids => setOfflineFiles(ids));

        // Network Listeners
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Re-run categorization when manualCategories changes
    useEffect(() => {
        if (driveFiles.length > 0) {
            categorizeFiles(driveFiles);
        }
    }, [manualCategories]);

    const handleDeleteFile = (e, fileId) => {
        e.stopPropagation();
        if (window.confirm("선택한 자료를 삭제하시겠습니까? (목록에서 숨김 처리됩니다)")) {
            const updated = [...deletedFileIds, fileId];
            setDeletedFileIds(updated);
            localStorage.setItem('fireSight_deletedRefs', JSON.stringify(updated));
        }
    };

    const handleMoveFile = (fileId, newCategoryId) => {
        const updatedManual = { ...manualCategories, [fileId]: newCategoryId };
        setManualCategories(updatedManual);
        localStorage.setItem('fireSight_manualCategories', JSON.stringify(updatedManual));
        setActiveMenuFileId(null); // Close menu
    };

    // Global click handler to close menu
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuFileId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Categories Definition
    const categories = [
        { id: 'L1', label: '행정법규', icon: <Scale size={18} />, description: '설치 대상물, 자체점검 주기 및 소방 행정 근거' },
        { id: 'L2', label: '기술기준', icon: <BookOpen size={18} />, description: '2024년 개정 화재안전기술기준(NFTC) 통합 해설' },
        { id: 'L3', label: '건축/방화', icon: <Building2 size={18} />, description: '건축물 구조에 따른 피난 및 방화 성능 기준' },
        { id: 'L4', label: '심화/부록', icon: <Calculator size={18} />, description: '고난도 수리계산 및 국외 기준 비교 데이터' }
    ];

    const [isLoaded, setIsLoaded] = useState(false); // [NEW] Prevent multiple calls

    useEffect(() => {
        // [Optimized] Only fetch if not loaded and authenticated
        if (isLoaded || !isAuthenticated || !gapiInited) return;

        fetchDriveFiles().then(() => {
            setIsLoaded(true);
        }).catch(err => {
            console.error("Quota error or network issue:", err);
        });
    }, [isAuthenticated, gapiInited, isLoaded]);

    const fetchDriveFiles = async () => {
        setLoading(true);

        // 1. Check Local Cache
        const cached = localStorage.getItem('fireSight_driveCache');
        if (cached) {
            const parsed = JSON.parse(cached);
            const now = new Date().getTime();
            // 1 hour cache validity
            if (now - parsed.timestamp < 3600 * 1000) {
                console.log("Using cached drive list");
                setDriveFiles(parsed.files);
                categorizeFiles(parsed.files);
                setLoading(false);
                setIsLoaded(true);
                return;
            }
        }

        try {
            let targetFolderId = FOLDER_ID;
            if (FOLDER_ID && FOLDER_ID.includes('drive.google.com')) {
                const match = FOLDER_ID.match(/folders\/([-a-zA-Z0-9_]+)/);
                if (match && match[1]) targetFolderId = match[1];
            }

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

            // [NEW] Cache the result
            localStorage.setItem('fireSight_driveCache', JSON.stringify({
                timestamp: new Date().getTime(),
                files: files
            }));

            setDriveFiles(files);
            categorizeFiles(files);
        } catch (err) {
            console.error("Drive Fetch Error:", err);
            // On error, try to use stale cache if available
            if (cached) {
                const parsed = JSON.parse(cached);
                setDriveFiles(parsed.files);
                categorizeFiles(parsed.files);
                alert("최신 자료를 불러오지 못해 저장된 목록을 표시합니다.");
            } else {
                alert(`자료를 불러오는데 실패했습니다.`);
            }
        } finally {
            setLoading(false);
        }
    };

    // [UPDATED] Advanced Categorization Logic with Manual Override
    const categorizeFiles = (files) => {
        const cats = { L1: [], L2: [], L3: [], L4: [] };

        files.forEach(file => {
            const fileName = file.name || '';
            const fileObj = { ...file };

            // 0. Manual Override (Priority)
            if (manualCategories[file.id]) {
                const manualCat = manualCategories[file.id];
                if (cats[manualCat]) {
                    // Try to attach meta even if manually moved
                    let matchedKey = null;
                    for (const key in summaryDatabase) {
                        const entry = summaryDatabase[key];
                        if (entry.keywords && entry.keywords.some(k => fileName.includes(k))) {
                            matchedKey = key; break;
                        } else if (fileName.includes(key)) {
                            matchedKey = key; break;
                        }
                    }
                    if (matchedKey) fileObj.meta = summaryDatabase[matchedKey];
                    cats[manualCat].push(fileObj);
                    return;
                }
            }

            // 1. Find matching metadata 
            let matchedKey = null;
            for (const key in summaryDatabase) {
                const entry = summaryDatabase[key];
                if (entry.keywords && entry.keywords.some(k => fileName.includes(k))) {
                    matchedKey = key;
                    break;
                } else if (fileName.includes(key)) {
                    matchedKey = key;
                    break;
                }
            }

            const meta = matchedKey ? summaryDatabase[matchedKey] : null;
            fileObj.meta = meta; // Attach meta

            // 2. Priority-based Classification
            // [UPDATED] Strict Classification for user request
            if (/(해설서|해설|수리계산|부록|심화)/.test(fileName)) { cats.L4.push(fileObj); return; }
            if (/(건축|방화|피난|셔터|계단)/.test(fileName)) { cats.L3.push(fileObj); return; }
            // Specific keywords for L2 (Technical Standards)
            if (/(NFTC|NFPC|기술기준|성능기준|설치기준)/.test(fileName)) { cats.L2.push(fileObj); return; }
            // Specific keywords for L1 (Laws)
            if (/(법|령|규칙|행정|예방|다중이용)/.test(fileName)) { cats.L1.push(fileObj); return; }

            // 3. Smart Fallback
            if (meta && meta.tags) {
                if (meta.tags.includes('#심화')) { cats.L4.push(fileObj); return; }
                if (meta.tags.includes('#건축')) { cats.L3.push(fileObj); return; }
                if (meta.tags.includes('#기술기준')) { cats.L2.push(fileObj); return; }
                if (meta.tags.includes('#행정')) { cats.L1.push(fileObj); return; }
            }

            if (fileName.includes('기준')) { cats.L2.push(fileObj); }
            else if (fileName.includes('법')) { cats.L1.push(fileObj); }
            else { cats.L4.push(fileObj); }
        });

        setCategorized(cats);
    };

    const searchResults = driveFiles.filter(file => {
        if (!searchTerm) return false;
        const term = searchTerm.toLowerCase();

        let foundMeta = null;
        for (const key in summaryDatabase) {
            const entry = summaryDatabase[key];
            if (entry.keywords && entry.keywords.some(k => file.name.includes(k))) { foundMeta = entry; break; }
            else if (file.name.includes(key)) { foundMeta = entry; break; }
        }
        const m = foundMeta || {};

        return (
            file.name.toLowerCase().includes(term) ||
            (m.title && m.title.toLowerCase().includes(term)) ||
            (m.desc && m.desc.toLowerCase().includes(term)) ||
            (m.tags && m.tags.some(tag => tag.toLowerCase().includes(term)))
        );
    });

    const isSearching = searchTerm.length > 0;
    const currentCategory = categories.find(c => c.id === activeTab);

    const displaySearchResults = searchResults.map(f => {
        let foundMeta = null;
        for (const key in summaryDatabase) {
            const entry = summaryDatabase[key];
            if (entry.keywords && entry.keywords.some(k => f.name.includes(k))) { foundMeta = entry; break; }
            else if (f.name.includes(key)) { foundMeta = entry; break; }
        }
        return { ...f, meta: foundMeta };
    });

    const displayFiles = isSearching
        ? displaySearchResults.filter(f => !deletedFileIds.includes(f.id))
        : (categorized[activeTab] || []).filter(f => !deletedFileIds.includes(f.id));

    const handleDownload = async (e, file) => {
        e.stopPropagation();
        if (offlineFiles.includes(file.id)) {
            if (window.confirm("기기에 저장된 파일을 삭제하시겠습니까?")) {
                await deleteFile(file.id);
                const ids = await getAllFileIds();
                setOfflineFiles(ids);
            }
            return;
        }

        if (!isOnline) {
            alert("오프라인 상태에서는 다운로드할 수 없습니다.");
            return;
        }

        setDownloadingId(file.id);
        try {
            const token = window.gapi.client.getToken()?.access_token;
            if (!token) throw new Error("No access token");

            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            await saveFile(file.id, file.meta || { name: file.name }, blob);

            const ids = await getAllFileIds();
            setOfflineFiles(ids);
            alert("오프라인 저장이 완료되었습니다.");
        } catch (err) {
            console.error(err);
            alert("다운로드 중 오류가 발생했습니다.");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleCardClick = async (file) => {
        // If it's a summary card, open modal (metadata is local)
        if (file.meta) {
            setSelectedSummary({ ...file.meta, webViewLink: file.webViewLink, fileName: file.name, id: file.id }); // Add ID
            setPreviewPage(null);
            setIsModalOpen(true);
            return;
        }

        // Direct file opening
        openPdf(file.webViewLink, null, file.id);
    };

    const handleCreateProblem = () => {
        if (!selectedSummary) return;

        const problemData = {
            type: 'workbook',
            title: `[문제] ${selectedSummary.title}`,
            description: selectedSummary.desc || '',
            source: selectedSummary.fileName, // Reference Source
            content: selectedSummary.desc || '', // Pre-fill content
            keywords: selectedSummary.tags || []
        };

        if (onDataToss) {
            onDataToss(problemData);
        } else {
            console.error("onDataToss prop is missing");
        }
    };

    const openPdf = async (link, page, fileId) => {
        // 1. Try Local
        const targetId = fileId || selectedSummary?.id;
        if (targetId && offlineFiles.includes(targetId)) {
            try {
                const localFile = await getFile(targetId);
                if (localFile) {
                    const url = URL.createObjectURL(localFile.blob);
                    // Append page hash if needed (PDF.js supports #page=)
                    // Blob URLs might not support #page same way as web viewers, but standard usually works
                    const finalUrl = page ? `${url}#page=${page}` : url;
                    window.open(finalUrl, '_blank');
                    return;
                }
            } catch (e) { console.error(e); }
        }

        // 2. Fallback to Network
        if (!isOnline) {
            alert("오프라인 상태입니다. 다운로드된 파일만 열 수 있습니다.");
            return;
        }

        const url = page ? `${link}#page=${page}` : link;
        window.open(url, '_blank');
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-500 text-slate-100 relative">

            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-500" />
                        자료실 <span className="text-sm font-normal text-slate-500 ml-2">Reference Library</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {isSearching ? `검색 결과: "${searchTerm}" (${displayFiles.length}건)` : currentCategory?.description}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold shadow-lg">U</div>
                            <span className="text-xs text-slate-300">Connected</span>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 active:scale-95 duration-200">
                            <LogIn size={16} /> 구글 드라이브 연결
                        </button>
                    )}
                </div>
            </div>

            {isAuthenticated ? (
                <>
                    {/* Search Field */}
                    <div className="relative w-full">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-blue-500' : 'text-slate-500'}`} size={16} />
                        <input
                            type="text"
                            placeholder="자료 검색 (파일명, 내용, 태그...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full bg-slate-900 border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${isSearching ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-slate-800'}`}
                        />
                        {isSearching && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    {!isSearching && (
                        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300
                                                ${activeTab === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                                >
                                    {cat.icon}
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content Grid */}
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                            <p>Google Drive에서 자료를 불러오는 중입니다...</p>
                        </div>
                    ) : displayFiles.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-4 content-start pb-10">
                            {displayFiles.map((file) => {
                                const isSaved = offlineFiles.includes(file.id);
                                const isUnavailable = !isOnline && !isSaved;

                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => !isUnavailable && handleCardClick(file)}
                                        className={`group bg-slate-900/40 border p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between relative
                                        ${isUnavailable ? 'opacity-40 grayscale cursor-not-allowed border-slate-800' : 'border-slate-800/60 hover:border-blue-500/30 hover:bg-slate-900/60 cursor-pointer'} 
                                        ${isSaved ? 'ring-1 ring-emerald-500/30 bg-emerald-900/10' : ''}`}
                                    >
                                        {/* Action Buttons: Move & Delete */}
                                        <div className="absolute top-3 right-3 flex gap-1 z-20">
                                            {/* Download Button */}
                                            <button
                                                onClick={(e) => handleDownload(e, file)}
                                                className={`p-1.5 rounded-lg transition-all 
                                                ${isSaved ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-blue-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100'}
                                                ${isUnavailable ? 'hidden' : ''}
                                            `}
                                                title={isSaved ? "오프라인 저장됨 (클릭 시 삭제)" : "다운로드"}
                                            >
                                                {downloadingId === file.id ? <Loader2 size={16} className="animate-spin" /> :
                                                    isSaved ? <Check size={16} /> : <Download size={16} />}
                                            </button>

                                            {/* Move Button with Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id); }}
                                                    className={`p-1.5 rounded-lg transition-colors ${activeMenuFileId === file.id ? 'bg-slate-700 text-blue-400 opacity-100' : 'text-slate-600 hover:text-blue-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100'}`}
                                                    title="폴더 이동"
                                                >
                                                    <FolderInput size={16} />
                                                </button>

                                                {/* Move Dropdown Menu */}
                                                {activeMenuFileId === file.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-30">
                                                        <div className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-900/50 border-b border-slate-700">이동할 카테고리 선택</div>
                                                        {categories.filter(c => c.id !== activeTab).map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={(e) => { e.stopPropagation(); handleMoveFile(file.id, cat.id); }}
                                                                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                                                            >
                                                                {cat.icon}
                                                                {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <button onClick={(e) => handleDeleteFile(e, file.id)} className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="목록에서 제거">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <span className="px-2 py-0.5 bg-slate-800 text-blue-400 rounded text-[10px] font-mono border border-slate-700 uppercase">PDF</span>
                                                {/* Show manual tag if exists */}
                                                {manualCategories[file.id] && (
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] border border-purple-500/30 flex items-center gap-1">
                                                        <FolderInput size={8} /> 수동이동
                                                    </span>
                                                )}
                                                {file.meta?.tags?.map((tag, i) => (
                                                    <span key={i} className={`px-2 py-0.5 rounded text-[10px] ${searchTerm && tag.toLowerCase().includes(searchTerm.toLowerCase()) ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/10 text-blue-300'}`}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <h3 className="font-bold text-slate-200 group-hover:text-white mb-2 leading-tight flex items-start justify-between pr-12">
                                                <span>{file.name}</span>
                                            </h3>
                                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                                {file.meta ? file.meta.desc : '요약 정보가 없습니다. 클릭하여 원문을 확인하세요.'}
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                                            <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                                <HardDrive size={10} /> {isSearching ? (file.meta?.tags && file.meta.tags[0] ? file.meta.tags[0] : 'Drive') : 'Drive'}
                                            </div>
                                            <span className="text-xs font-bold text-blue-500 group-hover:underline flex items-center gap-1">
                                                {file.meta ? 'Smart Summary' : 'Open PDF'} <ExternalLink size={10} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                            {isSearching ? <Search size={48} className="mb-4 text-slate-600" /> : <FileText size={48} className="mb-4 text-slate-600" />}
                            <p>{isSearching ? `'${searchTerm}'에 대한 검색 결과가 없습니다.` : '해당 카테고리에 파일이 없습니다.'}</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-700">
                    <div className="p-6 bg-slate-800/50 rounded-full border border-slate-700 shadow-xl">
                        <HardDrive size={48} className="text-slate-400" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Google Drive 연결 필요</h3>
                        <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
                            최신 법령 및 기술기준 PDF 자료 열람을 위해<br />구글 계정으로 로그인해 주세요.
                        </p>
                        <button onClick={handleLogin} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2 mx-auto">
                            <LogIn size={18} />
                            Google 계정으로 로그인
                        </button>
                    </div>
                </div>
            )}

            {/* Smart Summary Modal */}
            {isModalOpen && selectedSummary && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
                    <div className="bg-slate-800 border-2 border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl relative z-60 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex justify-between items-start shrink-0">
                            <div className="min-w-0 pr-4">
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    {selectedSummary.tags?.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold border border-blue-500/30">{tag}</span>
                                    ))}
                                </div>
                                <h3 className="text-2xl font-bold text-white relative leading-tight">{selectedSummary.title}</h3>
                                <p className="text-xs text-slate-400 mt-1 font-mono">{selectedSummary.fileName}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><Info size={16} className="text-blue-500" />핵심 요약</div>
                                <p className="text-base text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">{selectedSummary.desc}</p>
                            </div>
                            {selectedSummary.penalty && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><AlertTriangle size={16} className="text-amber-500" />주요 체크포인트 / 벌칙</div>
                                    <p className="text-sm text-amber-200/90 leading-relaxed bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">{selectedSummary.penalty}</p>
                                </div>
                            )}
                            {selectedSummary.quickLinks && selectedSummary.quickLinks.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><Map size={16} className="text-emerald-500" />빠른 이동 (Deep Links)</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedSummary.quickLinks.map((link, idx) => (
                                            <button key={idx} onClick={() => openPdf(selectedSummary.webViewLink, link.page)} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-700 hover:bg-slate-700 hover:border-blue-500/50 hover:text-blue-300 transition-all group text-left">
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-blue-300 flex items-center gap-2"><BookOpenCheck size={14} className="opacity-50" />{link.label}</span>
                                                <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-500 group-hover:text-blue-400">p.{link.page}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-5 bg-slate-900/50 border-t border-slate-700 flex gap-3 shrink-0">
                            {/* [NEW] Data Toss Button */}
                            <button
                                onClick={handleCreateProblem}
                                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <PenTool size={18} /> 문제로 만들기
                            </button>
                            <button onClick={() => openPdf(selectedSummary.webViewLink)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-2"><ExternalLink size={18} />PDF 원문 열기</button>
                            {/* <button onClick={() => setIsModalOpen(false)} className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors active:scale-95">닫기</button> */}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reference;
