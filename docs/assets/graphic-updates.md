# Graphic 업데이트 로그

## 1. 파일 명세
- `index.html` : HUD/컨트롤 구조 재배치, 캔버스 시점 전체 개편, ghost/packman/maze 그래픽 전면 리뉴얼과 새로운 조명/그리드 그리기 흐름 포함.
- `docs/assets/pacman-theme.css` : 배경 그라디언트, HUD 글로우, 컨트롤 pill, 캔버스 프레임 등 전체 UI 스타일 정의.
- `docs/assets/pacman-palette.json` : 이번 그래픽 테마에 적용된 컬러 팔레트 목록.
- `docs/screenshots/` : before/after/Playwright 스크린샷 및 추적 기록용 이미지 저장.

## 2. 팔레트 리스트
1. Radiant Midnight (#020512) – 핵심 배경과 캔버스 여백.
2. Nebula Barrier (#041639) – HUD/보드 내부 판넬 베이스.
3. Aurora Hue (#9e5ef3) – HUD 테두리 아웃라인과 글로우 강조.
4. Prismatic Glow (#3cc8ff) – 글로우 스포트 및 배경 포인트.
5. Pacfire Burst (#ffe747) – 팩맨 밝은 셰이딩과 펠릿.
6. Pulse Ember (#ff7f8d) – ghost 본체와 발광 디테일.

## 3. 적용 요약
- Canvas 드로잉을 재정비해 wall/maze에 그라디언트 셰이딩, 전체 배경의 레이저 그리드, glow 레이어를 추가.
- ghost는 눈/속도감/웨이브 하단 fringe를 포함한 풀바디 스프라이트로 렌더링하며, 페이스/눈동자 방향을 Pacman 위치에 맞춰 추적.
- HUD는 gradient/outline + 고광택 chip 스타일로 게임 지역과 일치하는 톤 유지.
- 텍스처/텍스트 요소는 docs/assets의 스타일 정의를 참고하도록 구조화.
