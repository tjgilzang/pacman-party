# Playwright 배포/검증 베스트 프랙티스

사주/팩맨처럼 Playwright가 로컬 정적 서버와 함께 돌아가야 하는 경우 다음 순서를 지켜야 안정적인 검증이 가능했습니다.

1. **서버 띄우기 (`http-server` 등)**
   - `npm run start`가 4173 포트로 서버를 여는데 sandbox에서 `listen EPERM` 오류가 발생할 수 있으므로, `http-server -a 0.0.0.0 -p 4173 -c-1`로 명시적인 서버를 먼저 띄우고 백그라운드로 둡니다.
2. **Playwright 의존성 확보**
   - `npm install playwright` → `npx playwright install chromium` 명령으로 필요한 모듈과 브라우저를 사전에 설치해서 `Cannot find module 'playwright'` 오류를 방지합니다.
3. **Playwright 테스트 실행**
   - `npx playwright test --config=playwright.config.js`를 실행합니다. 모바일/데스크톱 컨텍스트를 모두 필요로 할 경우 각 컨텍스트에서 버튼 클릭을 통한 입력을 테스트해 두었습니다.
4. **우회/헤드리스 설정**
   - sandbox 환경에서 `1373` 포트를 열 수 없는 경우 `browserType.launch({ args: ['--no-sandbox'] })` 설정으로 권한 문제를 우회합니다.
5. **배포 → validator**
   - Playwright가 정상 종료되면 gh-pages 브랜치를 새로 만들고 `git push origin gh-pages --force`를 수행하고, `curl -I https://tjgilzang.github.io/<project>/`로 HTTP 200을 확인합니다.

이 문서를 기억/검색 가능한 지식 저장소(`memory/2026-03-10.md`에도 요약)와 연동하여, 다음 번 Playwright 배포 시 같은 절차를 자동 참조할 수 있도록 합니다.