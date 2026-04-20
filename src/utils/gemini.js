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
 * 🔴 [개선] 인자로 넘어오는 modelName을 우선하되, 기본값을 최신 3.1 Pro Preview로 설정
 */
export async function analyzeImage(file, type = 'workbook', mode = 'problem', modelName = 'gemini-1.5-pro') {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");
        const base64Data = await fileToBase64(file);
        
        // 🔴 [개선] 구조적 줄바꿈 및 문맥 병합 인스트럭션 강화
        const smartInstruction = `
            당신은 소방시설관리사 전문 OCR 스캐너이자 채점 설계자입니다.
            [원문 보존] 이미지의 텍스트를 절대 요약하지 말고 '원본 그대로' 추출하세요.
            [문맥 정렬] 이미지 레이아웃 때문에 중간에 끊긴 문장은 줄바꿈 없이 하나의 완성된 줄로 병합하세요. 단어 결합 시 표준 띄어쓰기를 적용하세요.
            [구조적 분리] (1), (2), (3) 또는 ①, ② 등 '번호로 시작하는 문항'이 발견되면 반드시 해당 번호 바로 앞에서 줄바꿈(Enter)을 실행하세요.
            [정밀 분류] 아래 기준에 따라 분류하되, '피난', '안전구역', '건축법' 문구 발견 시 무조건 [피난구조설비]로 분류하세요.
            [분류 기준]: ${CLASSIFICATION_SYSTEM}
        `;

        let promptText = "";

        // 🔴 [핵심 개선] AI에게 결과물을 줄 때부터 UI 폼 변수명(description, modelAnswer)에 맞춰서 달라고 강제합니다.
        if (mode === 'problem') {
            promptText = `${smartInstruction}
                이미지의 지문을 OCR 하고 검색용 'tags'를 5개 이내로 추출하세요. 
                도입부 문장은 한 줄로 잇고, 각 세부 문항은 번호별로 줄을 바꾸어 가독성을 높이세요.
                결과 JSON: { 
                    "category": "정식명칭", 
                    "title": "20자 이내 요약", 
                    "description": "가독성 있게 줄바꿈이 정제된 원문 전체", 
                    "tags": ["키워드1", "키워드2"] 
                }`;
        } else if (mode === 'answer') {
            promptText = `${smartInstruction}
                이미지의 해설을 OCR 하고, 채점 기준이 될 '필수 요소'를 분리하세요.
                해설 문장이 물리적 폭 때문에 끊기지 않도록 문맥 위주로 통합하되, 단계별 설명은 줄바꿈을 유지하세요.
                결과 JSON: { 
                    "modelAnswer": "가독성 있게 줄바꿈이 정제된 해설 원문 전체", 
                    "gradingPoints": {
                        "mandatory_terms": ["필수용어1"], 
                        "mandatory_numbers": ["수치1"]
                    },
                    "tags": ["해설키워드1"]
                }`;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 오류: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const textRes = data.candidates[0].content.parts[0].text;
        
        let parsedData = {};
        try {
            parsedData = JSON.parse(textRes.replace(/```json|```/g, '').trim());
        } catch (e) {
            console.error("JSON 파싱 오류:", textRes);
            throw new Error("AI 응답을 JSON으로 변환할 수 없습니다.");
        }
        
        const extractedTags = parsedData.tags || [];
        const keywordsString = extractedTags.join(', ');

        // 🔴 [최종 매핑] AI가 과거 프롬프트 습관대로 content나 answer를 뱉어도, 강제로 화면 변수명(description, modelAnswer)으로 연결
        return { 
            ...parsedData,
            type: type,
            category: parsedData.category || '소방시설 공통',
            title: parsedData.title || '',
            description: parsedData.description || parsedData.content || parsedData.question || "", 
            modelAnswer: parsedData.modelAnswer || parsedData.answer || "",
            tags: extractedTags,             
            searchTags: extractedTags,       
            keywords: keywordsString,       
            gradingPoints: parsedData.gradingPoints || parsedData.grading_points || { mandatory_terms: [], mandatory_numbers: [] }
        };

    } catch (error) {
        console.error("🔥 Gemini 분석 실패:", error);
        throw error;
    }
}