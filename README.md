# GOROCKET Servo Angle Test GUI

고로켓 팀의 7개 서보 밸브 각도를 시험하기 위한 **Electron + Next.js** 기반 데스크톱 앱입니다. PC와 Arduino 기반 서보 컨트롤러를 시리얼 포트로 연결해 각 밸브의 구동 범위를 확인할 수 있습니다.

## 주요 기능

- **모터 각도 제어**: 각 서보의 0–180°를 슬라이더와 숫자 입력으로 조정해 원하는 각도로 이동시킵니다.
- **실시간 센서 표시**: 압력 트랜스듀서, 유량 센서, 열전대 값을 받아 대시보드에 표시합니다.
- **시퀀스 실행**: 점화, 퍼지, 비상 정지 등 미리 정의된 자동 시퀀스를 버튼 한 번으로 실행합니다.
- **CSV 로깅**: 수집된 센서 데이터를 `Documents/rocket-log-날짜.csv` 형식으로 저장합니다.
- **줌 및 로그 패널**: 화면 확대/축소와 시리얼 통신 로그 확인 기능을 제공합니다.

## 실행 방법

```bash
npm install          # 의존성 설치
npm run dev          # Electron + Next.js 개발 서버 실행
npm run build        # 프로덕션 빌드
```

### 품질 검사

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript 타입 검사
```

## 시리얼 통신 프로토콜

GUI는 다음 형식의 명령을 Arduino로 전송합니다.

```
M,<servoIndex>,<angle>   # 예) M,0,90 -> 0번 서보를 90도로 이동
```

Arduino 스케치는 [`mortor_control_test.ino`](./mortor_control_test.ino)에 포함되어 있으며, 최대 7개의 서보를 500–2500µs 펄스로 구동합니다.

## 설정 파일 (`config.json`)

```json
{
  "serial": { "baudRate": 115200 },
  "motorMappings": {
    "Servo 0 (Ethanol Main)": { "servoIndex": 0 }
  }
}
```

`motorMappings`에 표시 이름과 서보 인덱스를 정의하면 GUI가 자동으로 각 모터를 생성합니다.

## 디렉터리 구조

```
.
├── main.js                # Electron 메인 프로세스
├── preload.js             # IPC 브리지
├── mortor_control_test.ino# Arduino 스케치
├── src/
│   ├── app/page.tsx       # Next.js 엔트리
│   └── components/...     # 대시보드 패널들
└── config.json            # 시리얼 및 모터 매핑 설정
```

## 라이선스

[MIT License](./LICENSE)
