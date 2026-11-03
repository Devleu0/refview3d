# RefView3D

그림 레퍼런스용 경량 3D 뷰어 (Windows 데스크톱).
블렌더보다 가볍게, 포즈·구도·명암을 잡아 2D 작업 툴(클립스튜디오, 포토샵)로 넘기는 것이 목표입니다.

## 기술 스택

| 영역 | 선택 |
|---|---|
| 데스크톱 셸 | Tauri 2 (Rust, WebView2) |
| UI | React + TypeScript + Zustand |
| 3D | Three.js (WebGL2) |
| 디렉토리 인덱스 | Rust `notify` + SQLite (예정) |
| 내보내기 | 투명 PNG, `ag-psd` 레이어 PSD (예정) |

## 폴더 구조

```
src/
  app/       앱 셸, 레이아웃
  viewer/    Three.js 씬·카메라·렌더 루프
  loaders/   포맷별 모델 로더
  store/     Zustand 상태, 히스토리(Undo/Redo)
  ui/        패널, 툴바 컴포넌트
src-tauri/   Rust 백엔드 (파일 시스템, 폴더 감시)
```

## 개발

사전 준비 (Windows): Node.js 20+, Rust stable, WebView2 런타임(Windows 10/11 기본 포함),
Visual Studio Build Tools의 "C++를 사용한 데스크톱 개발" 워크로드.

```bash
npm install
npm run tauri dev     # 데스크톱 앱 실행
npm run dev           # 브라우저에서 UI만 확인
npm run tauri build   # 설치 파일 빌드
```

## 지원 포맷

OBJ, STL, FBX, GLTF, GLB.
SKP는 SketchUp에서 glTF 또는 OBJ로 내보낸 뒤 불러옵니다.

## 조작

| 동작 | 입력 |
|---|---|
| 회전 / 이동 / 줌 | 왼쪽 드래그 / 오른쪽 드래그 / 휠 |
| 모델 열기 | Ctrl+O, 또는 창에 파일 끌어다 놓기 |
| 화면에 맞추기 | F |
| 실행 취소 / 다시 실행 | Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) |

히스토리에는 시점 이동, 화각, 시점 프리셋이 기록됩니다. 모델을 바꾸면 초기화됩니다.

## 로드맵

1. [x] 모델 불러오기, 카메라(FOV) 제어
2. [ ] 디렉토리 연결, 썸네일 인덱스
3. [ ] 주광원·보조광, 툰 셰이딩
4. [ ] 선화(외곽선·은선), PNG/PSD 내보내기
5. [ ] 히스토리 패널(목록), 색상·명도·채도 보정 — Undo/Redo 기반은 완료
6. [ ] IK 포징, 데포르메
7. [ ] 1·2·3점 투시 가이드
