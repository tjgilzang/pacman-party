const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const reportsDir = path.join('reports', 'playwright');
const screenshotPath = path.join(reportsDir, 'pacman-qa-fix-success.png');
const tracePath = path.join(reportsDir, 'pacman-qa-fix-trace.zip');
const stageLogPath = path.join(reportsDir, 'pacman-qa-fix-stage.log');

test('정돈스돈스 팩맨 HUD/오버레이/fate transition 검증', async ({ page }) => {
  fs.mkdirSync(reportsDir, { recursive: true });
  const tracingContext = page.context();
  await tracingContext.tracing.start({ screenshots: true, snapshots: true });
  try {
    await page.goto('/');
    await page.waitForTimeout(1200);

    await page.evaluate(() => window.pacmanParty.forceStageWin());
    await page.waitForSelector('#successOverlay.is-visible', { timeout: 6000 });
    await expect(page.locator('#state')).toHaveText('PERFECT!');

    await expect(page.locator('#ghostCount')).toHaveText(/\d{2}/);
    await expect(page.locator('#ghostState')).toHaveText(/ACTIVE|SCARED/);

    const ghostSummary = await page.evaluate(() => window.pacmanParty.getGhostStateSummary());
    expect(ghostSummary.count).toBeGreaterThanOrEqual(4);
    expect(ghostSummary.positions).toHaveLength(ghostSummary.count);
    expect(Array.isArray(ghostSummary.states)).toBe(true);

    await page.evaluate(() => window.pacmanParty.triggerGhostScare());
    await expect(page.locator('#ghostState')).toHaveText('SCARED', { timeout: 4000 });

    await page.screenshot({ path: screenshotPath, fullPage: true });

    await page.waitForFunction(
      () => window.pacmanParty.getState() === 'running' && window.pacmanParty.getStage() > 1,
      { timeout: 8000 }
    );

    const stageLog = await page.evaluate(() => window.pacmanParty.stageLog || []);
    const logLines = stageLog
      .map((entry) => `[${entry.timestamp}] [스테이지 ${entry.stage}] ${entry.reason} (${entry.state})`)
      .join('\n');
    fs.writeFileSync(stageLogPath, `${logLines}\n`, 'utf8');
  } finally {
    await tracingContext.tracing.stop({ path: tracePath });
  }
});


test('모바일 터치 드래그로 팩맨 조작 검증', async ({ browser }) => {
  const reportsDir = path.join('reports', 'playwright');
  const logPath = path.join(reportsDir, 'pacman_mobile.log');
  const screenshotPath = path.join(reportsDir, 'pacman_mobile.png');
  const tracePath = path.join(reportsDir, 'pacman_mobile.trace.zip');
  fs.mkdirSync(reportsDir, { recursive: true });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const tracingContext = mobileContext;
  await tracingContext.tracing.start({ screenshots: true, snapshots: true });
  const page = await mobileContext.newPage();
  try {
    await page.goto('/');
    await page.waitForTimeout(1200);

    await page.click('[data-dir="ArrowRight"]');
    await page.waitForTimeout(300);
    await page.click('[data-dir="ArrowUp"]');
    await page.waitForTimeout(300);

    await expect(page.locator('#state')).toHaveText('RUNNING', { timeout: 4000 });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const logEntries = [
      `[${new Date().toISOString()}] 모바일 뷰포트 로드`,
      '[ACTION] 오른쪽 버튼 입력',
      '[ACTION] 위쪽 버튼 입력',
      `[ASSERT] 상태 RUNNING 확인`,
    ];
    fs.writeFileSync(logPath, `${logEntries.join('\n')}\n`, 'utf8');
  } finally {
    await tracingContext.tracing.stop({ path: tracePath });
    await mobileContext.close();
  }
});
