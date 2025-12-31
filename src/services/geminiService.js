/* src/services/geminiService.js */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ API Key Missing: .env 파일을 확인해주세요.");
}

// 파일 Base64 변환 함수
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (!reader.result) {
                reject(new Error("파일 읽기 실패"));
                return;
            }
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

export const analyzeImage = async (file, mode = 'workbook') => {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다. .env 파일을 확인해주세요.");

        const base64Data = await fileToBase64(file);
        
        // 1. 모드에 따른 강력한 프롬프트 설정 (JSON 강제)
        let promptText = "";
        
        if (mode === 'workbook') {
            promptText = `
            당신은 소방시설관리사 시험 전문가입니다. 
            이미지의 텍스트를 완벽하게 OCR하여 분석하세요.
            반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
            {
                "title": "문제의 핵심 주제",
                "problemType": "descriptive",
                "content": "문제 지문 전체 내용 (OCR 결과)",
                "answer": "정답 및 상세 해설 (법령, 수치 포함)",
                "keywords": ["키워드1", "키워드2"]
            }`;
        } else {
            promptText = `
            당신은 소방 설비 구조 전문가입니다.
            도면이나 설비 사진을 분석하여 구조와 작동 원리를 설명하세요.
            반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
            {
                "title": "설비/도면 이름",
                "problemType": "visual",
                "content": "구조적 특징 및 작동 순서 설명",
                "answer": "핵심 암기 포인트 요약",
                "keywords": ["설비명", "유형"]
            }`;
        }

        // ---------------------------------------------------------
        // [핵심 기술] 개발 환경 vs 배포 환경 자동 전환
        // ---------------------------------------------------------
        // import.meta.env.DEV는 'npm run dev' 실행 중일 때만 true입니다.
        const isDevelopment = import.meta.env.DEV; 

        // 개발 중이면 프록시(/api/gemini) 사용, 배포 후면 구글 주소 직접 사용
        const baseUrl = isDevelopment 
            ? '/api/gemini' 
            : 'https://generativelanguage.googleapis.com';

        // URL 조합 (API Key 필수 포함)
        const url = `${baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        console.log(`🚀 AI 분석 요청 중... (환경: ${isDevelopment ? '개발(Proxy)' : '배포(Direct)'})`);
        console.log("🔗 접속 URL:", url);

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
                    responseMimeType: "application/json" // JSON 응답 강제
                }
            })
        });

        // 에러 처리
        if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = `HTTP Error ${response.status}`;
            
            // 404 에러 상세 진단
            if (response.status === 404 && isDevelopment) {
                errorMsg = "🚧 [설정 오류] vite.config.js가 적용되지 않았습니다. 서버를 재시작해주세요.";
            } else {
                try {
                    const errJson = JSON.parse(errorText);
                    errorMsg += `: ${errJson.error?.message}`;
                } catch {
                    errorMsg += `: ${errorText.slice(0, 100)}`;
                }
            }
            throw new Error(errorMsg);
        }

        // 응답 파싱
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("AI가 응답을 생성하지 못했습니다.");
        }

        const textResponse = data.candidates[0].content.parts[0].text;
        
        // 마크다운 제거 및 JSON 파싱
        const cleanJson = textResponse.replace(/```json|```/g, '').trim();
        const parsedData = JSON.parse(cleanJson);

        console.log("✅ 분석 성공!");

        // SmartUpload 호환성 유지
        return {
            ...parsedData,
            type: mode,
            // UI에서 사용하는 키값으로 매핑
            content: parsedData.question || parsedData.content, 
            answer: parsedData.modelAnswer || parsedData.answer
        };

    } catch (error) {
        console.error("🔥 Gemini Service Error:", error);
        alert(`🚨 분석 실패:\n${error.message}`);
        return null;
    }
};