import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const analyzeImage = async (file) => {
    try {
        if (!API_KEY) throw new Error("API Key 미설정");

        const base64Data = await fileToGenerativePart(file);

        // 아까 유일하게 성공했던 2.0 모델을 다시 사용합니다.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
      당신은 소방시설관리사 시험 전문가입니다. 2027년 개편 기준에 맞춰 분석하세요.
      [필수] 'question' 필드에 이미지 내의 문제 텍스트 전체를 OCR하여 포함하세요.
      
      JSON 형식으로만 응답:
      {
        "problemType": "descriptive" | "short-answer" | "practical-calculation",
        "category": "water" | "gas" | "alarm" | "basic",
        "title": "주제 요약",
        "question": "이미지 텍스트 전체", 
        "modelAnswer": "정답 해설",
        "keywords": ["키워드"],
        "answer": "단답형 정답 (해당될 경우)",
        "reference": "관련 NFTC/NFPA 기준 (해당될 경우)",
        "solution": "계산형 풀이 과정 (해당될 경우)",
        "finalAnswer": "계산형 최종 정답 (숫자만)",
        "unit": "단위 (해당될 경우)"
      }
    `;

        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(text);

        // [Compatibility Fix] SmartUpload.jsx expects 'type' and string 'keywords'
        return {
            ...data,
            type: 'workbook',
            keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords,
            // Map problemType aliases for UI compatibility
            problemType: data.problemType === 'short-answer' ? 'short' :
                data.problemType === 'practical-calculation' ? 'calculation' :
                    data.problemType || 'descriptive'
        };

    } catch (error) {
        console.error("🔥 Gemini 에러:", error);

        // 할당량 초과(429) 에러에 대한 상세 안내
        if (error.message.includes("429")) {
            alert("현재 무료 API 할당량이 일시적으로 소진되었습니다.\n약 1~2분 뒤에 다시 시도하시거나, 구글 클라우드에서 결제 계정을 연결하면 제한 없이 사용 가능합니다.");
        } else {
            alert("AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        return null; // 실패 시 null 반환
    }
};

async function fileToGenerativePart(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(",")[1];
            resolve({ inlineData: { data: base64String, mimeType: file.type } });
        };
        reader.readAsDataURL(file);
    });
}
