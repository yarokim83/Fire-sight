/* src/utils/gemini.js */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ API Key Missing: .env 파일을 확인해주세요.");
}

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

export async function analyzeImage(file, mode) {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");

        const base64Data = await fileToBase64(file);
        
        let promptText = mode === 'workbook' 
            ? "소방시설관리사 문제 분석: 문제 지문을 OCR로 추출하고 정답/해설을 포함하여 JSON으로 반환. { title, content, answer, tags }"
            : "소방 설비 도면 분석: 구조와 작동 원리를 설명하여 JSON으로 반환. { title, content, answer, tags }";

        const baseUrl = import.meta.env.DEV 
            ? '/api/gemini' 
            : 'https://generativelanguage.googleapis.com';

        // [핵심 수정] 별명 대신 '정식 버전 번호(001)'를 사용합니다.
        // 1.5-flash는 별명이라 가끔 404가 뜨지만, 001은 고정된 버전이라 무조건 인식합니다.
        const url = `${baseUrl}/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

        console.log(`🚀 요청 모델: gemini-1.5-flash-001 (Stable Version)`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: file.type, data: base64Data } }
                    ]
                }]
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
        const cleanJson = textRes.replace(/```json|```/g, '').trim();
        
        return { ...JSON.parse(cleanJson), type: mode };

    } catch (error) {
        console.error("🔥 실패:", error);
        alert(`🚨 분석 실패: ${error.message}`);
        throw error;
    }
}