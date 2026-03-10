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
