import React, { useState, useEffect } from 'react';
import {
    Scale, BookOpen, Building2, Calculator,
    FileText, ExternalLink, Search, Clock,
    X, AlertTriangle, FileCheck, Map, ArrowRightCircle, BookOpenCheck,
    LogIn, Loader2, HardDrive, User, Info, Tag
} from 'lucide-react';

// Google Drive Folder ID
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

// [1. 데이터 매핑 시스템 구축]
// summaryDatabase: 키워드 기반 메타데이터 매핑
const summaryDatabase = {
    '소방시설법': {
        title: "소방시설 설치 및 관리에 관한 법률",
        desc: "특정소방대상물에 설치하는 소화·경보·피난구조설비 등의 설치·관리 기준과 소방용품 성능관리를 목적으로 하는 핵심 법령입니다.",
        penalty: "시설 미관리 시 300만원 이하 과태료 부과 (중대 위반 시 형사처벌 가능)",
        tags: ["#행정", "#필수암기", "#설치기준"],
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
        quickLinks: []
    }
};

const Reference = ({ subject, isAuthenticated, handleLogin, handleLogout, gapiInited }) => {
    const [activeTab, setActiveTab] = useState('L1');
    const [selectedSummary, setSelectedSummary] = useState(null); // Changed from selectedDoc
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [previewPage, setPreviewPage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [driveFiles, setDriveFiles] = useState([]);
    const [categorized, setCategorized] = useState({ L1: [], L2: [], L3: [], L4: [] });

    const categories = [
        { id: 'L1', label: '행정법규', icon: <Scale size={18} />, description: '설치 대상물, 자체점검 주기 및 소방 행정 근거' },
        { id: 'L2', label: '기술기준', icon: <BookOpen size={18} />, description: '2024년 개정 화재안전기술기준(NFTC) 통합 해설' },
        { id: 'L3', label: '건축/방화', icon: <Building2 size={18} />, description: '건축물 구조에 따른 피난 및 방화 성능 기준' },
        { id: 'L4', label: '심화/부록', icon: <Calculator size={18} />, description: '고난도 수리계산 및 국외 기준 비교 데이터' }
    ];

    useEffect(() => {
        if (isAuthenticated && gapiInited) {
            fetchDriveFiles();
        }
    }, [isAuthenticated, gapiInited]);

    const fetchDriveFiles = async () => {
        setLoading(true);
        console.log("Raw Folder ID from Env:", FOLDER_ID);

        try {
            // Helper to clean Folder ID (handles full URL or raw ID)
            let targetFolderId = FOLDER_ID;
            if (FOLDER_ID && FOLDER_ID.includes('drive.google.com')) {
                const match = FOLDER_ID.match(/folders\/([-a-zA-Z0-9_]+)/);
                if (match && match[1]) {
                    targetFolderId = match[1];
                    console.log("Extracted Folder Name/ID from URL:", targetFolderId);
                }
            }

            // Resolve Folder ID if it seems to be a Name
            if (targetFolderId && targetFolderId !== '공부_자료가_담긴_구글드라이브_폴더ID') {
                try {
                    // Start with assuming it is an ID, check validation later if query fails? 
                    // No, safe approach: If it looks like a Name (not standard ID length/format), try name search.
                    // Google Drive IDs are usually long (33 chars). Simple names are short.
                    // But here we rely on the previous logic: try name search first if we suspect.
                    // Actually, let's keep the user's working logic: Try to find folder by name first.

                    const folderResponse = await window.gapi.client.drive.files.list({
                        q: `mimeType = 'application/vnd.google-apps.folder' and name = '${targetFolderId}' and trashed = false`,
                        fields: 'files(id, name)',
                        pageSize: 1
                    });

                    if (folderResponse.result.files && folderResponse.result.files.length > 0) {
                        const foundId = folderResponse.result.files[0].id;
                        console.log(`Resolved Folder Name '${targetFolderId}' to ID: ${foundId}`);
                        targetFolderId = foundId;
                    }
                } catch (e) {
                    console.warn("Folder name resolution skipped/failed.", e);
                }
            }

            // Check validity
            const isValidFolderId = targetFolderId && targetFolderId !== '공부_자료가_담긴_구글드라이브_폴더ID';

            const query = isValidFolderId
                ? `'${targetFolderId}' in parents and trashed = false`
                : "trashed = false";

            console.log("Final Drive API Query:", query);

            const response = await window.gapi.client.drive.files.list({
                'pageSize': 100,
                'fields': "files(id, name, mimeType, webViewLink, iconLink)",
                'q': query,
            });

            const files = response.result.files || [];
            console.log("Fetched Files:", files.length, files);

            setDriveFiles(files);
            categorizeFiles(files);
        } catch (err) {
            console.error("Drive Fetch Error Details:", err);
            alert(`자료를 불러오는데 실패했습니다. (Error: ${err.status || 'Unknown'})`);
        } finally {
            setLoading(false);
        }
    };

    const categorizeFiles = (files) => {
        const cats = { L1: [], L2: [], L3: [], L4: [] };

        files.forEach(file => {
            // Find matching metadata
            let matchedKey = Object.keys(summaryDatabase).find(k => file.name.includes(k));
            // Fallback for NFTC specific logic if needed, but summaryDatabase covers general matching

            const meta = matchedKey ? summaryDatabase[matchedKey] : null;

            const fileObj = { ...file, meta }; // Attach meta if exists

            // Tab Assignment Logic
            if (file.name.includes('법') || file.name.includes('령') || file.name.includes('규칙')) cats.L1.push(fileObj);
            else if (file.name.includes('NFTC') || file.name.includes('기준') || file.name.includes('해설')) {
                if (file.name.includes('부록')) cats.L4.push(fileObj);
                else cats.L2.push(fileObj);
            }
            else if (file.name.includes('건축') || file.name.includes('방화')) cats.L3.push(fileObj);
            else cats.L4.push(fileObj);
        });

        setCategorized(cats);
    };

    const currentCategory = categories.find(c => c.id === activeTab);
    const displayFiles = categorized[activeTab] || [];

    // [2. 인터랙션 로직 구현]
    const handleCardClick = (file) => {
        if (file.meta) {
            // 1. 매칭된 데이터가 있으면 모달 오픈
            setSelectedSummary({ ...file.meta, webViewLink: file.webViewLink, fileName: file.name });
            setPreviewPage(null);
            setIsModalOpen(true);
        } else {
            // 4. 예외 처리: 데이터가 없으면 바로 구글 드라이브 뷰어 오픈
            window.open(file.webViewLink, '_blank');
        }
    };

    const openPdf = (link, page) => {
        // 3. 딥링크 로직
        const url = page ? `${link}#page=${page}` : link;
        window.open(url, '_blank');
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-in fade-in duration-500 text-slate-100 relative">

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="text-blue-500" />
                        자료실 <span className="text-sm font-normal text-slate-500 ml-2">Reference Library</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">{currentCategory?.description}</p>
                </div>

                {/* Auth Button */}
                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold shadow-lg">U</div>
                            <span className="text-xs text-slate-300">Connected</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleLogin}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 active:scale-95 duration-200"
                        >
                            <LogIn size={16} /> 구글 드라이브 연결
                        </button>
                    )}
                </div>
            </div>

            {isAuthenticated ? (
                <>
                    {/* Search Placeholder */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="파일명 검색..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300
                    ${activeTab === cat.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                            >
                                {cat.icon}
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Files Grid */}
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                            <p>Google Drive에서 자료를 불러오는 중입니다...</p>
                        </div>
                    ) : displayFiles.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-4 content-start">
                            {displayFiles.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => handleCardClick(file)}
                                    className="group bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl hover:border-blue-500/30 hover:bg-slate-900/60 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Tags if meta exists */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className="px-2 py-0.5 bg-slate-800 text-blue-400 rounded text-[10px] font-mono border border-slate-700 uppercase">
                                                PDF
                                            </span>
                                            {file.meta?.tags?.map((tag, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded text-[10px]">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        <h3 className="font-bold text-slate-200 group-hover:text-white mb-2 leading-tight flex items-start justify-between">
                                            <span>{file.name}</span>
                                            <ExternalLink size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0 ml-2" />
                                        </h3>

                                        {/* Description Preview */}
                                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                            {file.meta ? file.meta.desc : '요약 정보가 없습니다. 클릭하여 원문을 확인하세요.'}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
                                        <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                            <HardDrive size={10} /> Drive
                                        </div>
                                        <span className="text-xs font-bold text-blue-500 group-hover:underline">
                                            {file.meta ? 'Smart Summary' : 'Open PDF'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <FileText size={48} className="mb-4" />
                            <p>해당 카테고리에 파일이 없습니다.</p>
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
                        <button
                            onClick={handleLogin}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                        >
                            <LogIn size={18} />
                            Google 계정으로 로그인
                        </button>
                    </div>
                </div>
            )}

            {/* [3. 모달 UI 디자인] - Smart Summary Modal */}
            {isModalOpen && selectedSummary && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>

                    <div className="bg-slate-800 border-2 border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl relative z-60 animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh]">

                        {/* Modal Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex justify-between items-start shrink-0">
                            <div className="min-w-0 pr-4">
                                <div className="flex gap-2 mb-2 flex-wrap">
                                    {selectedSummary.tags?.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-bold border border-blue-500/30">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="text-2xl font-bold text-white relative leading-tight">
                                    {selectedSummary.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 font-mono">{selectedSummary.fileName}</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* 1. 핵심 요약 */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                                    <Info size={16} className="text-blue-500" />
                                    핵심 요약
                                </div>
                                <p className="text-base text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                    {selectedSummary.desc}
                                </p>
                            </div>

                            {/* 2. 벌칙/체크포인트 */}
                            {selectedSummary.penalty && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                                        <AlertTriangle size={16} className="text-amber-500" />
                                        주요 체크포인트 / 벌칙
                                    </div>
                                    <p className="text-sm text-amber-200/90 leading-relaxed bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                        {selectedSummary.penalty}
                                    </p>
                                </div>
                            )}

                            {/* 3. Quick Links (Deep Links) */}
                            {selectedSummary.quickLinks && selectedSummary.quickLinks.length > 0 && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                                        <Map size={16} className="text-emerald-500" />
                                        빠른 이동 (Deep Links)
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedSummary.quickLinks.map((link, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => openPdf(selectedSummary.webViewLink, link.page)}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-700 hover:bg-slate-700 hover:border-blue-500/50 hover:text-blue-300 transition-all group text-left"
                                            >
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-blue-300 flex items-center gap-2">
                                                    <BookOpenCheck size={14} className="opacity-50" />
                                                    {link.label}
                                                </span>
                                                <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-500 group-hover:text-blue-400">
                                                    p.{link.page}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-5 bg-slate-900/50 border-t border-slate-700 flex gap-3 shrink-0">
                            <button
                                onClick={() => openPdf(selectedSummary.webViewLink)}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={18} />
                                PDF 원문 전체 열기
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-colors active:scale-95"
                            >
                                닫기
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default Reference;
