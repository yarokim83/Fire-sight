/**
 * Google Gemini API Service
 * Analyzes images using the 'gemini-1.5-flash' model to extract Fire-Sight exam data.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper: Convert File to Base64 for Gemini API
async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const analyzeImage = async (file) => {
    if (!API_KEY) {
        console.error("Gemini API Key is missing!");
        throw new Error("API Key Missing");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        당신은 소방시설관리사 시험 전문가입니다. 
        입력된 이미지를 분석하여 2027년 개편 출제 기준에 맞춰 다음 JSON 형식으로만 응답하세요. 
        (Markdown 코드 블록 없이 순수 JSON 텍스트만 출력할 것)

        **JSON 스키마:**
        {
          "problemType": "descriptive" | "short", | "calculation",
          "category": "water" | "gas" | "alarm" | "basic",
          "title": "문제의 핵심 주제 (20자 이내 요약)",
          "question": "이미지 내의 문제 지문 전체 (OCR)",
          "modelAnswer": "문제에 대한 상세한 모범 답안 (서술형의 경우 개조식으로 정리, 계산형의 경우 풀이 과정 포함)",
          "keywords": "핵심 키워드 3~5개 (쉼표로 구분)", 
          "answer": "단답형 정답 (해당될 경우)",
          "reference": "관련 NFTC/NFPA 기준 (해당될 경우)",
          "solution": "계산형 풀이 과정 (해당될 경우)",
          "finalAnswer": "계산형 최종 정답 (숫자만)",
          "unit": "단위 (해당될 경우)"
        }

        **분류 기준:**
        - **calculation**: 계산 식, 수치 산출, 펌프 성능 시험 등이 포함된 경우.
        - **short**: 빈칸 채우기, 괄호 넣기, 단순 수치/용어 묻기.
        - **descriptive**: 작동 순서, 설치 기준 서술, 장단점 설명 등 그 외 모든 경우.
        `;

        const imagePart = await fileToGenerativePart(file);

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Parse JSON (Remove Markdown code blocks if present)
        const jsonText = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonText);

        return {
            type: 'workbook', // Always workbook for this flow
            ...data
        };

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw error;
    }
};
