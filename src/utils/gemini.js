/* src/utils/gemini.js */
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

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

async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (!reader.result) reject(new Error("파일 읽기 실패"));
            else {
                resolve({
                    inlineData: {
                        data: reader.result.split(',')[1],
                        mimeType: file.type
                    }
                });
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Gemini 이미지 분석 함수 (SDK 공식 라이브러리 사용)
 * 🔴 [개선] 직접 fetch 대신 SDK를 사용하여 v1/v1beta 버전 및 모델 가용성 이슈 해결
 */
export async function analyzeImage(file, type = 'workbook', mode = 'problem', modelName = 'gemini-3.1-pro-preview') {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");

        // SDK 모델 인스턴스 생성
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0,
                maxOutputTokens: 8192 
            }
        });

        const imagePart = await fileToGenerativePart(file);
        
        const smartInstruction = `
            당신은 소방시설관리사 전문 OCR 스캐너이자 채점 설계자입니다.
            [원문 보존] 이미지의 텍스트를 절대 요약하지 말고 '원본 그대로' 추출하세요.
            [문맥 정렬] 이미지 레이아웃 때문에 중간에 끊긴 문장은 줄바꿈 없이 하나의 완성된 줄로 병합하세요. 단어 결합 시 표준 띄어쓰기를 적용하세요.
            [구조적 분리] (1), (2), (3) 또는 ①, ② 등 '번호로 시작하는 문항'이 발견되면 반드시 해당 번호 바로 앞에서 줄바꿈(Enter)을 실행하세요.
            [정밀 분류] 아래 기준에 따라 분류하되, '피난', '안전구역', '건축법' 문구 발견 시 무조건 [피난구조설비]로 분류하세요.
            [분류 기준]: ${CLASSIFICATION_SYSTEM}
        `;

        let promptText = "";

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

        const result = await model.generateContent([promptText, imagePart]);
        const response = await result.response;
        const textRes = response.text();
        
        let parsedData = {};
        try {
            // JSON 마크다운 태그가 포함되어 있을 수 있으므로 정제 후 파싱
            parsedData = JSON.parse(textRes.replace(/```json|```/g, '').trim());
        } catch (e) {
            console.error("JSON 파싱 오류:", textRes);
            throw new Error("AI 응답을 JSON으로 변환할 수 없습니다.");
        }
        
        const extractedTags = parsedData.tags || [];
        const keywordsString = extractedTags.join(', ');

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
        console.error("🔥 Gemini SDK 분석 실패:", error);
        // 에러 메시지가 'Not found'인 경우 사용자가 알기 쉽게 가공
        if (error.message.includes('not found')) {
            throw new Error(`선택하신 모델(${modelName})을 현재 API 버전에서 사용할 수 없습니다. 다른 모델로 변경해 보세요.`);
        }
        throw error;
    }
}