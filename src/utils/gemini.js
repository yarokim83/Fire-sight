/* src/utils/gemini.js */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ API Key Missing: .env 파일을 확인해주세요.");
}

/**
 * [정밀 분류 지식베이스] 
 * 피난안전구역 및 건축법 피난 관련 키워드를 피난구조설비에 명시적으로 추가했습니다.
 */
const CLASSIFICATION_SYSTEM = `
1. 수계소화설비: 옥내/외소화전, 스프링클러, 물분무, 미분무, 포소화설비, 펌프, 배관 등.
2. 가스계소화설비: CO2, 할론, 할로겐화합물 및 불활성기체, 분말소화설비 등.
3. 경보설비: 자동화재탐지설비(감지기, 수신기), 비상경보, 비상방송, 누전/가스누설경보기.
4. 피난구조설비: 피난기구(완강기, 사다리), 인명구조기구, 유도등, 비상조명등, '피난안전구역', '건축법상 피난시설', '방화구조' 관련 문항.
5. 소화활동설비: 제연설비(댐퍼, 팬), 연결송수관, 연결살수, 비상콘센트, 무선통신보조설비.
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

export async function analyzeImage(file, type = 'workbook', mode = 'problem') {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");
        const base64Data = await fileToBase64(file);
        
        // 🔴 개선: '피난' 키워드 우선 순위 및 원문 복사 지침 강화
        const smartInstruction = `
            당신은 소방시설관리사 전문 OCR 스캐너입니다.
            [규칙 1: 절대 요약 금지] 이미지의 텍스트를 글자 하나, 기호 하나 빼놓지 말고 원문 그대로 추출하세요. 특히 (1), (2) 번호와 「 」 기호를 그대로 살리세요.
            [규칙 2: 카테고리 매핑 순위]
              1순위: '피난', '안전구역', '피난계단', '완강기' 단어가 보이면 무조건 [피난구조설비]로 분류하세요.
              2순위: '건축법', '방화구조' 관련 기준 문항도 [피난구조설비]로 분류하세요.
            
            [분류 기준]
            ${CLASSIFICATION_SYSTEM}
        `;

        let promptText = "";
        if (mode === 'problem') {
            promptText = `${smartInstruction}
                이미지의 지문을 요약 없이 원문 그대로 OCR 하고 카테고리를 결정하세요.
                결과 JSON: { 
                    "category": "수계소화설비/가스계소화설비/경보설비/피난구조설비/소화활동설비/소방시설 공통 중 택1", 
                    "title": "20자 이내 제목", 
                    "content": "원본 텍스트 전체", 
                    "keywords": ["핵심단어"] 
                }`;
        } else if (mode === 'answer') {
            promptText = `${smartInstruction}
                해설을 요약 없이 원본 그대로 추출하세요.
                결과 JSON: { "answer": "해설 원문 전체", "keywords": [] }`;
        }

        const baseUrl = import.meta.env.DEV ? '/api/gemini' : 'https://generativelanguage.googleapis.com';
        
        // 속도와 정확도의 균형을 맞춘 2.5 Flash 사용
        const url = `${baseUrl}/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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
                    temperature: 0, // 정확도 극대화
                    max_output_tokens: 8192 
                }
            })
        });

        const data = await response.json();
        const textRes = data.candidates[0].content.parts[0].text;
        const parsedData = JSON.parse(textRes.replace(/```json|```/g, '').trim());
        
        return { 
            ...parsedData,
            type: type,
            content: parsedData.content || parsedData.question || "", 
            answer: parsedData.answer || parsedData.modelAnswer || "",
            category: parsedData.category || '소방시설 공통',
            keywords: Array.isArray(parsedData.keywords) ? parsedData.keywords.join(', ') : parsedData.keywords 
        };

    } catch (error) {
        console.error("🔥 Gemini 분석 실패:", error);
        throw error;
    }
}