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

/**
 * Gemini 이미지 분석 함수
 * @param {File} file - 업로드된 이미지 파일
 * @param {string} type - 문제 유형 ('workbook' | 'visual')
 * @param {string} mode - 분석 모드 ('problem': 문제지문 | 'answer': 해설 | 'full': 전체)
 */
export async function analyzeImage(file, type = 'workbook', mode = 'problem') {
    try {
        if (!API_KEY) throw new Error("API Key가 없습니다.");

        const base64Data = await fileToBase64(file);
        
        // [핵심 변경] 모드(mode)에 따른 프롬프트 분기 처리
        let promptText = "";

        if (type === 'visual') {
            // 도면/자료 모드
            promptText = `
                이 이미지는 소방 설비 도면이나 시각 자료입니다.
                이미지의 구조와 작동 원리를 상세히 설명해주세요.
                결과는 반드시 다음 JSON 형식으로만 반환하세요:
                { 
                    "title": "도면의 제목 또는 핵심 주제", 
                    "content": "도면에 대한 상세한 설명 및 해석", 
                    "answer": "관련된 핵심 이론이나 암기 포인트", 
                    "tags": ["태그1", "태그2"] 
                }
            `;
        } else if (mode === 'problem') {
            // [모드 1] 문제 지문만 추출
            promptText = `
                이 이미지는 소방시설관리사 시험 문제입니다.
                이미지에서 오직 '문제 내용(지문)'만 추출하세요.
                
                [규칙]
                1. 'title': 문제의 핵심 주제나 제목을 짧게 요약.
                2. 'content': 문제의 지문, 보기, 조건 등을 모두 포함한 전체 텍스트.
                3. 정답이나 해설이 이미지에 포함되어 있어도 절대 포함하지 마세요. (무시할 것)
                4. 결과는 반드시 다음 JSON 형식으로만 반환하세요:
                { "title": "...", "content": "..." }
            `;
        } else if (mode === 'answer') {
            // [모드 2] 정답 및 해설만 추출
            promptText = `
                이 이미지는 시험 문제의 '정답 및 해설' 부분입니다.
                이미지에서 정답과 해설 내용만 추출하세요.

                [규칙]
                1. 'answer': 정답, 풀이 과정, 상세 해설을 텍스트로 정리.
                2. 'tags': 문제와 관련된 핵심 키워드를 배열로 추출.
                3. 문제 지문은 제외하고 해설에만 집중하세요.
                4. 결과는 반드시 다음 JSON 형식으로만 반환하세요:
                { "answer": "...", "tags": ["태그1", "태그2"] }
            `;
        } else {
            // (기본) 전체 분석 (혹시 모를 하위 호환성)
            promptText = `
                이 이미지는 소방시설관리사 문제입니다. 
                문제, 정답, 해설을 분석하여 다음 JSON으로 반환하세요.
                { "title": "...", "content": "...", "answer": "...", "tags": [...] }
            `;
        }

        // 개발 환경 프록시 설정 (필요시)
        const baseUrl = import.meta.env.DEV 
            ? '/api/gemini' 
            : 'https://generativelanguage.googleapis.com';

        // [모델 설정] 안정적인 1.5 Flash 모델 사용 (속도/정확도 균형)
        // 만약 최신 2.0 모델을 쓰시려면 'gemini-2.0-flash-exp' 로 변경 가능
        const modelVersion = 'gemini-2.5-flash'; 
        const url = `${baseUrl}/v1beta/models/${modelVersion}:generateContent?key=${API_KEY}`;

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
                // JSON 강제 모드 설정 (모델이 지원하는 경우 정확도 상승)
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
        
        return { ...JSON.parse(cleanJson) };

    } catch (error) {
        console.error("🔥 Gemini 분석 실패:", error);
        // 에러를 상위 컴포넌트로 전파하여 alert 표시
        throw error;
    }
}