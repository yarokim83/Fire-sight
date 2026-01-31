/* src/utils/gemini.js */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * [정밀 분류 지식베이스]
 * AI가 대시보드 카테고리와 100% 일치하도록 유도합니다.
 */
const CLASSIFICATION_SYSTEM = `
1. 수계소화설비: 옥내/외소화전, 스프링클러, 물분무, 미분무, 포소화설비 등.
2. 가스계소화설비: 이산화탄소, 할론, 할로겐화합물 및 불활성기체, 분말소화설비 등.
3. 경보설비: 자동화재탐지설비(감지기, 수신기, 발신기), 비상방송, 누전/가스누설경보기 등.
4. 피난구조설비: 피난기구(완강기, 사다리), 인명구조기구, 유도등, 비상조명등, '피난안전구역', '건축법상 피난시설'.
5. 소화활동설비: 제연설비, 연결송수관, 연결살수, 비상콘센트, 무선통신보조설비 등.
6. 소방시설 공통: 비상전원, 내진설계, 소방기본법, 공통 화재안전성능기준(NFPC).
`;

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
 * Gemini 이미지 분석 함수
 */
export async function analyzeImage(file, type = 'workbook', mode = 'problem') {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");
        const base64Data = await fileToBase64(file);
        
        // 🔴 수정: CLASSIFICATION_SYSTEM을 프롬프트에 직접 포함하여 지침 강화
        const smartInstruction = `
            당신은 소방시설관리사 전문 OCR 스캐너이자 채점 설계자입니다.
            [원문 보존] 이미지의 텍스트를 절대 요약하지 말고 '원본 그대로' 추출하세요.
            [정밀 분류] 아래 기준에 따라 분류하되, '피난', '안전구역', '건축법' 문구 발견 시 무조건 [피난구조설비]로 분류하세요.
            [분류 기준]: ${CLASSIFICATION_SYSTEM}
        `;

        let promptText = "";

        if (mode === 'problem') {
            promptText = `${smartInstruction}
                이미지의 지문을 OCR 하고 검색용 'tags'를 5개 이내로 추출하세요.
                결과 JSON: { 
                    "category": "정식명칭", 
                    "title": "20자 이내 요약", 
                    "content": "원본 지문 전체", 
                    "tags": ["키워드1", "키워드2"] 
                }`;
        } else if (mode === 'answer') {
            promptText = `${smartInstruction}
                이미지의 해설을 OCR 하고, 채점 기준이 될 '필수 요소'를 분리하세요.
                결과 JSON: { 
                    "answer": "해설 원문 전체", 
                    "grading_points": {
                        "mandatory_terms": ["필수용어1"], 
                        "mandatory_numbers": ["수치1"]
                    },
                    "tags": ["해설키워드1"]
                }`;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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
                    response_mime_type: "application/json",
                    temperature: 0,
                    max_output_tokens: 8192 
                }
            })
        });

        // 🔴 추가: 응답 상태 확인 로직
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const textRes = data.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(textRes.replace(/```json|```/g, '').trim());
        
        // 🔴 데이터 보정: UI 상태(keywords)와 DB 저장(tags)을 모두 만족시키도록 수정
        const extractedTags = parsedData.tags || [];
        const keywordsString = extractedTags.join(', '); // 배열을 "태그1, 태그2" 형태의 문자열로 변환

        return { 
            ...parsedData,
            type: type,
            content: parsedData.content || parsedData.question || "", 
            answer: parsedData.answer || parsedData.modelAnswer || "",
            category: parsedData.category || '소방시설 공통',
            tags: extractedTags,             // Firestore 저장용 (배열)
            keywords: keywordsString,       // UI 입력창 표시용 (문자열)
            grading_points: parsedData.grading_points || { mandatory_terms: [], mandatory_numbers: [] }
        };

    } catch (error) {
        console.error("🔥 Gemini 분석 실패:", error);
        throw error;
    }
}