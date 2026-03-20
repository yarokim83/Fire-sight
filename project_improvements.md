# Fire-Sight Pro 프로젝트 개선 및 보완 제안서

코드와 구조 검토 결과 파악된 애플리케이션의 앱 완성도와 안정성 향상을 위한 주요 보완점 4가지입니다.

## 1. 🔒 보안 및 환경 변수 처리 (Security)
* **Firebase 키 노출:** 현재 `src/firebase.js` 파일에 `apiKey`, `projectId` 등 민감한 인증 정보가 그대로 하드코딩되어 소스 코드에 드러납니다.
  * **개선 방향:** 프로젝트 루트에 `.env` 파일을 구성하고 `import.meta.env.VITE_FIREBASE_API_KEY` 형태로 코드를 분리하여 보호해야 합니다.
* **접속 암호 검증 방식:** `src/App.jsx`에서 `pinInput === '2027'`과 같이 클라이언트 측 코드에 접속 암호가 직접 명시되어 있어 보안에 취약합니다.
  * **개선 방향:** 암호를 최소한 해싱(Hashing)해서 비교하거나 환경 변수로 분리해야 합니다.
* **세션 불안정성:** 한 번 올바른 PIN을 입력해 접속(Unlock)하더라도 브라우저 새로고침 시 초기화되어 암호를 매번 다시 입력해야 합니다.
  * **개선 방향:** 로그인 성공 시 `sessionStorage`에 임시 인증 상태를 기록하여 새로고침 시 유지되도록 개선이 필요합니다.

## 2. 🧠 주관식 자동 채점 엔진의 한계 (Grading Logic)
* **단순 문자열 매칭의 취약점:** `ProblemSolver/index.jsx`의 `analyzeAnswer` 로직은 수험생이 작성한 답안과 필수 키워드(`mandatory_terms`)가 일치하는지 단순 문자열 매칭(`.includes()`)만으로 검사합니다.
* **문제점:** 수험생이 의미는 똑같게 적었으나 조사/어미를 다르게 쓰거나 약간의 오타, 띄어쓰기 차이가 있을 경우 시스템은 오답으로 처리하게 될 위험이 큽니다.
* **개선 방향:** 
  1. 문자열 사이에 공백이 섞여 있어도 매칭 가능하도록 **정규표현식(Regex) 검사 로직 고도화**.
  2. 기구축된 Gemini API를 채점 과정에도 연결하여, 수험생 답안이 정답 뼈대와 의미론적(Semantic)으로 일치하는지 유연하게 채점하는 **'스마트 채점 모드'** 도입.

## 3. 🧩 코드 모듈화 및 유지보수성 (Code Refactoring)
* **비대해진 하나의 컴포넌트:** 핵심 컴포넌트인 `src/components/ProblemSolver/index.jsx`가 약 800줄에 달합니다. 
* **문제점:** 파일 내부에 메인 컴포넌트 외에도 `DrawingToolbar`, `ImageCarousel` 등 복잡한 하위 컴포넌트가 함께 구현되어 있어 가독성과 향후 유지보수성이 떨어집니다.
* **개선 방향:** 이들을 `src/components/ProblemSolver/DrawingToolbar.jsx`, `ImageCarousel.jsx` 등 별도 모듈 파일로 깔끔하게 분리하여 관리해야 합니다.

## 4. ⚠️ 에러 핸들링 및 예외 처리 (Error Handling)
* **이미지 삭제 로직의 취약함:** `handleDeleteImage` 함수에서 Firebase Storage 파일을 삭제할 때 모종의 이유(이미 삭제됨 등)로 에러가 발생하면 무조건 `alert('삭제 실패')` 팝업만 띄우고 상태 동기화를 중단합니다.
* **개선 방향:** Storage 객체가 없더라도 Firestore DB의 문서 배열 항목(`images`, `answerImages`)은 확실하게 동기화 정리(`arrayRemove`)되도록 로직을 보강해야 합니다.
* **인증 갱신:** 구글 Oauth 사이드 초기화 시 엑세스 토큰이 만료되었을 때 조용히 갱신 처리하는 로직을 보완하면 사용자 경험이 끊김없이 유지됩니다.
