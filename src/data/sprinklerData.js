// 1. Visual Learning 데이터 (도면 학습)
export const sprinklerVisualData = [
    {
        id: 'wet-valve',
        category: 'water', // 수계
        title: '습식 유수검지장치 (Wet Alarm Valve)',
        imageUrl: '/images/wet-valve-diagram.png', // 나중에 실제 이미지 넣을 것
        description: '1, 2차측이 모두 가압수로 채워진 방식으로 동결 우려가 없는 곳에 설치',
        importance: 5,
        tag: 'neighboring', // 옆집조문 (예상)
        hotspots: [
            { id: 1, x: 45, y: 50, label: '클래퍼 (Clapper)', desc: '평상시 닫혀 있다가 헤드 개방 시 수압차에 의해 열림' },
            { id: 2, x: 70, y: 30, label: '리타딩 챔버', desc: '오동작 방지 기능 (일시적 수압 변동 흡수)' },
            { id: 3, x: 70, y: 15, label: '압력 스위치', desc: '유수 검지 신호를 수신반으로 발신' }
        ]
    },
    {
        id: 'preaction-valve',
        category: 'water',
        title: '준비작동식 밸브 (Pre-action Valve)',
        imageUrl: '/images/preaction-valve.png',
        description: '동결 우려 장소에 설치하며, 감지기 교차회로 방식을 사용',
        importance: 2,
        tag: 'completed', // 기출완료
        hotspots: [
            { id: 1, x: 30, y: 40, label: '솔레노이드 밸브', desc: '화재 신호 수신 시 개방되어 중간 챔버 물을 배수' },
            { id: 2, x: 50, y: 80, label: '슈퍼비조리 판넬(SVP)', desc: '수동 조작 및 밸브 개방 상태 확인' }
        ]
    }
];

// 2. Workbook 데이터 (문제 풀이)
export const sprinklerProblems = [
    {
        id: 'spr-001',
        category: 'water',
        type: 'descriptive', // 서술형
        question: "준비작동식 스프링클러 설비의 작동 순서를 '감지기 작동'부터 '방수'까지 서술하시오.",
        importance: 3,
        tag: 'completed',
        modelAnswer: "감지기(A,B) 작동 -> 수신반 신호 -> 솔레노이드 밸브 개방 -> 중간 챔버 감압 -> 클래퍼 개방 -> 2차측 용수 공급 -> 헤드 개방 -> 방수",
        keywords: ["솔레노이드", "중간 챔버", "감압", "클래퍼", "2차측"] // 채점 기준 키워드
    },
    {
        id: 'spr-002',
        category: 'water',
        type: 'multiple-choice', // 객관식/단답형
        question: "스프링클러 헤드의 설치 기준 중, 무대부나 특수가연물을 저장하는 장소의 헤드 간 수평거리는 몇 m 이하인가?",
        importance: 4,
        tag: 'neighboring',
        options: ["1.7m", "2.1m", "2.3m", "3.2m"],
        answer: "1.7m",
        explanation: "무대부 및 특수가연물 저장소는 화재 확산 속도가 빠르므로 1.7m 이하로 촘촘하게 배치해야 함."
    }
];
