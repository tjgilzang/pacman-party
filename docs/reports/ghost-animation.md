# Ghost Asset & Animation 리포트

## Ghost 팔레트와 스피드
- **Nova** (핑크): body=#ff7f8d / trim=#fb1b3a / aura=rgba(255,159,173,0.25) / speed profile stages 1~6 → [14, 12, 11, 10, 9, 8]
- **Circuit** (블루): body=#64c8ff / trim=#1d9eff / aura=rgba(100,200,255,0.25) / speed profile → [15, 13, 12, 10, 9, 8]
- **Glow** (노랑): body=#f6ff72 / trim=#fddf38 / aura=rgba(246,255,114,0.28) / speed profile → [16, 14, 11, 10, 9, 7]
- **Bloom** (퍼플): body=#a27bff / trim=#d7b7ff / aura=rgba(162,123,255,0.28) / speed profile → [15, 13, 12, 10, 9, 8]

각 Ghost는 `ghost.speedProfile[stageIndex]` 값을 가져 stage 숫자에 따라 이동 주기를 조정하고, spawn 위치를 아래쪽 중앙으로 나누어 배치해 다수 존재함을 직관적으로 보여줍니다.

## Sprite & 애니메이션
- Canvas path로 몸체와 물결 발을 그려 bobbing, jump, glow 효과를 전달. `frame` 기반 sine 곡선을 조합해 고스트마다 bobPhase/jitterPhase 값을 섞어서 서로 다른 타이밍의 흔들림을 표현합니다.
- 눈동자는 `scared` 상태일 때 색을 바꾸고 자리 이동을 줄여 패닉감 표현. 눈 깜박임은 `pupilShift`로 좌우 미세 움직임을 넣어 애니메이션 강도를 높였습니다.
- `ghost-status-ring` 오버레이와 HUD 패널에서 `data-state`를 활용하여 현재 상태(`ACTIVE`/`SCARED`)에 따라 board 주변 색과 투명도를 바꿔 시각화했습니다.

## HUD/시각 피드백
- HUD에 `ghostCount`(고스트 수)와 `ghostState`(상태 라벨)를 추가하고 ghost 상태 변화마다 `ghostStatusRing` 데이터 속성으로 배경을 투명하게 변경합니다.
- power pellet을 `isPower` 플래그로 구분, 캔버스에서 크기와 glow를 확대하여 강조하고, 먹을 때 `setGhostsScared()`를 통해 ghost 상태를 `SCARED`로 전환, HUD도 즉시 갱신합니다.

## 테스트 & 증거
- Playwright 스크린샷: `reports/playwright/pacman-qa-fix-success.png`
- Playwright trace: `reports/playwright/pacman-qa-fix-trace.zip`
- Stage 로그: `reports/playwright/pacman-qa-fix-stage.log` (HUD 이벤트/승리 트리거 타임스탬프)

## 인사이트 & 다음 과제
- Ghost 상태를 트리거할 수 있는 메서드(`triggerGhostScare`)를 `window.pacmanParty`에 노출해 검증 가능하게 했습니다.
- 다음 단계로는 고스트와 팩맨 충돌 시 `eyes/body` 애니메이션 전환이나 좀 더 복잡한 ai(코너 우선순위 등)를 추가 검토할 수 있습니다.
