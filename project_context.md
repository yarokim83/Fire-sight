# 🔥 Fire-Sight Pro 프로젝트 명세서 (Project Context)

## 1. 프로젝트 개요 (Overview)
- **프로젝트명:** Fire-Sight Pro
- **목적:** 소방시설관리사 자격증 취득을 위한 고도화된 주관식/서술형 암기 학습 및 자동 채점 웹 애플리케이션.
- **주요 타겟:** 방대한 법령과 기술 기준을 암기해야 하는 수험생 (아이패드 + 애플 펜슬 활용자 우대)

## 2. 기술 스택 (Tech Stack)
- **프론트엔드:** React.js, Vite, Tailwind CSS
- **백엔드/데이터베이스:** Firebase (Firestore, Cloud Storage)
- **AI 연동:** Gemini API (gemini-3.1-pro-preview 모델 사용)
- **아이콘 라이브러리:** Lucide-React

## 3. 핵심 컴포넌트 및 로직 (Core Components)

### 🧠 1) SmartUpload (`src/components/SmartUpload`)
- **역할:** 사용자가 문제집/해설 이미지를 업로드하면 Gemini AI가 이미지를 분석하여 텍스트로 추출.
- **특징:**
  - 지문(Problem)과 해설(Answer)을 구분하여 추출 및 병합.
  - 해설에서 채점의 기준이 되는 **필수 키워드(mandatory_terms)**와 **필수 숫자(mandatory_numbers)**를 AI가 스스로 발췌.
  - 브라우저 이미지 압축(`browser-image-compression`) 및 크롭 기능 지원.
  - 추출된 데이터를 Firestore의 `workbook` 컬렉션에 저장 (이미지는 Storage `problems/`, `answers/` 경로에 저장).

### ✍️ 2) ProblemSolver (`src/components/ProblemSolver/index.jsx`)
- **역할:** 사용자가 실제 문제를 풀고 자동 채점을 받는 메인 학습 인터페이스.
- **특징:**
  - **입력 모드:** TEXT(키보드 타이핑)와 DRAW(캔버스에 직접 필기) 모드 지원.
  - **Active Recall (블라인드 모드):** 학습 효율을 위해 우측의 해설(Model Answer)을 눈동자 아이콘으로 가리거나 켤 수 있음 (재채점 시 자동 블라인드).
  - **채점 엔진:** 사용자가 제출한 답안(텍스트 또는 드로잉 이미지 Base64)을 분석하여, 필수 키워드(40%)와 필수 숫자(60%) 매칭률을 기반으로 자동 점수 계산.
  - **Edit Mode (제자리 수정):** 문제 풀이 중 지문, 해설 텍스트 및 해설 이미지(Answer Images)를 실시간으로 추가/삭제/수정 가능.

### 🎨 3) SharedCanvas (`src/components/SharedCanvas.jsx`)
- **역할:** 아이패드와 애플 펜슬에 최적화된 네이티브 드로잉 캔버스.
- **특징:** 선 긋기, 굵기 조절, 색상 변경, 부분 지우개, 전체 지우기 등 완벽한 필기 기능 제공.

## 4. 데이터베이스 구조 (Firestore Schema)
- **Collection Name:** `workbook`
- **주요 필드 (Document Structure):**
  - `title` (String): 문제 제목
  - `category` (String): 과목 카테고리 (예: 수계소화설비)
  - `question` / `content` (String): 문제 지문 텍스트
  - `modelAnswer` / `answer` (String): 정답 해설 텍스트
  - `images` (Array): 지문 이미지 URL 목록 (이전 명칭 problemImages)
  - `answerImages` (Array): 해설 이미지 URL 목록
  - `gradingPoints` (Object): 
    - `mandatory_terms` (Array): 채점 필수 키워드 목록
    - `mandatory_numbers` (Array): 채점 필수 숫자/수치 목록
  - `tags` / `keywords` (Array/String): 검색용 태그

## 5. 개발 및 배포 환경 (Dev & Deploy)
- **로컬 개발 서버 구동:** `npm run dev` (주소: http://localhost:5173)
- **프로덕션 빌드:** `npm run build`
- **Firebase 배포:** `npx firebase-tools deploy` (배포 주소: https://fire-sight-dc376.web.app)
- **작업 환경 주의사항:** 터치 및 필기(Drawing) 기능의 완벽한 테스트를 위해 코딩은 PC/Mac IDE에서 진행하고, 구동 확인은 아이패드 사파리 브라우저(로컬 IP 접속)에서 진행하는 하이브리드 방식을 권장함.
