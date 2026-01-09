/* src/utils/gemini.js */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ API Key Missing: .env 파일을 확인해주세요.");
}

// [분류 기준] AI 프롬프트에 주입할 데이터
const CLASSIFICATION_SYSTEM = `
1. 수계소화설비 (Water-based Systems):
   - 소화기구 및 자동소화장치, 옥내소화전설비, 옥외소화전설비, 스프링클러설비, 간이스프링클러설비, 화재조기진압용 스프링클러설비, 물분무소화설비, 미분무소화설비, 포소화설비
2. 가스계소화설비 (Gas-based):
   - 이산화탄소소화설비, 할론소화설비, 할로겐화합물 및 불활성기체소화설비, 분말소화설비, 고체에어로졸소화설비
3. 경보설비 (Alarm Systems):
   - 비상경보설비 및 단독경보형감지기, 비상방송설비, 자동화재탐지설비 및 시각경보장치, 자동화재속보설비, 누전경보기, 가스누설경보기
4. 피난구조설비:
   - 피난기구, 인명구조기구, 유도등 및 유도표지, 비상조명등
5. 소화활동설비 (Fire-fighting Support):
   - 제연설비, 특별피난계단 계단실 및 부속실 제연설비, 연결송수관설비, 연결살수설비, 비상콘센트설비, 무선통신보조설비
6. 소방시설 공통 (Common):
   - 수원 및 가압송수장치, 배관 및 밸브류, 비상전원 및 배선, 내진설계 기준, 도로터널/고층건축물 기준
`;

// 파일 Base64 변환 유틸리티
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (!reader.result) reject(new Error("파일 읽기 실패"));
            else resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Gemini 이미지 분석 함수 (통합 버전)
 */
export async function analyzeImage(file, type = 'workbook', mode = 'problem') {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");

        const base64Data = await fileToBase64(file);
        
        let promptText = "";

        // 1. 시각 자료(도면/사진) 모드
        if (type === 'visual') {
            promptText = `
                당신은 소방 설비 구조 전문가입니다.
                이 이미지는 소방 설비 도면이나 시각 자료입니다.
                다음 [분류 기준]을 참고하여 분류하고, 구조와 작동 원리를 상세히 설명해주세요.

                [분류 기준]
                ${CLASSIFICATION_SYSTEM}

                결과는 반드시 다음 JSON 형식으로만 반환하세요 (마크다운 없이):
                { 
                    "category": "위 분류 기준 중 하나 선택",
                    "title": "도면의 제목 또는 핵심 주제", 
                    "content": "도면에 대한 상세한 설명 및 해석", 
                    "answer": "관련된 핵심 이론이나 암기 포인트", 
                    "keywords": ["설비명", "핵심부품"] 
                }
            `;
        } 
        // 2. 문제(지문) 분석 모드
        else if (mode === 'problem') {
            promptText = `
                당신은 소방시설관리사 시험 전문가입니다.
                이미지의 텍스트를 OCR하여 지문을 추출하고 카테고리를 판단하세요.
                
                [분류 기준]
                ${CLASSIFICATION_SYSTEM}

                [규칙]
                1. 'category': 위 분류 기준 중 하나를 정확히 선택 (예: 수계소화설비).
                2. 'title': 문제의 핵심 주제나 제목을 20자 이내로 요약.
                3. 'content': 문제의 지문, 보기, 조건 등을 모두 포함한 전체 텍스트.
                4. 'keywords': 문제의 핵심 키워드 3~5개 추출.
                5. 정답이나 해설이 이미지에 포함되어 있어도 절대 포함하지 마세요. (무시할 것)
                
                결과는 반드시 다음 JSON 형식으로만 반환하세요 (마크다운 없이):
                { 
                    "category": "...", 
                    "title": "...", 
                    "content": "...",
                    "keywords": ["...", "..."]
                }
            `;
        } 
        // 3. 답안(해설) 분석 모드
        else if (mode === 'answer') {
            promptText = `
                이 이미지는 시험 문제의 '정답 및 해설' 부분입니다.
                이미지에서 정답과 해설 내용만 추출하세요.

                [규칙]
                1. 'answer': 정답, 풀이 과정, 상세 해설을 텍스트로 정리.
                2. 'keywords': 문제와 관련된 핵심 키워드를 배열로 추출.
                
                결과는 반드시 다음 JSON 형식으로만 반환하세요 (마크다운 없이):
                { "answer": "...", "keywords": ["...", "..."] }
            `;
        } 
        // 4. 기본 모드
        else {
            promptText = `
                이 이미지는 소방시설관리사 문제입니다. 
                문제, 정답, 해설을 분석하여 다음 JSON으로 반환하세요.
                { "title": "...", "content": "...", "answer": "...", "keywords": [...] }
            `;
        }

        const baseUrl = import.meta.env.DEV 
            ? '/api/gemini' 
            : 'https://generativelanguage.googleapis.com';

        // 🔴 [최종 모델 설정] 사용자님 요청 버전
        const apiVersion = 'v1beta';
        const modelVersion = 'gemini-2.0-flash-exp'; // 2.5가 안 될 경우 대비해 현존 최신으로 설정 (원하시면 2.5로 변경 가능)
        
        const url = `${baseUrl}/${apiVersion}/models/${modelVersion}:generateContent?key=${API_KEY}`;

        console.log(`🚀 Gemini 요청: ${mode} 모드 (${modelVersion})`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: file.type, data: base64Data } }
                    ]
                }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API 오류 (${response.status}): ${errText.slice(0, 100)}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
             throw new Error("AI 응답이 비어있습니다.");
        }

        const textRes = data.candidates[0].content.parts[0].text;
        
        // JSON 파싱 (마크다운 코드블록 제거)
        const cleanJson = textRes.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);
        
        // 데이터 보정
        const rawKeywords = parsedData.keywords || parsedData.tags || [];
        const keywordsString = Array.isArray(rawKeywords) ? rawKeywords.join(', ') : rawKeywords;

        return { 
            ...parsedData,
            type: type,
            content: parsedData.question || parsedData.content, 
            answer: parsedData.modelAnswer || parsedData.answer,
            category: parsedData.category || '소방시설 공통',
            keywords: keywordsString 
        };

    } catch (error) {
        console.error("🔥 Gemini 분석 실패:", error);
        throw error;
    }
}