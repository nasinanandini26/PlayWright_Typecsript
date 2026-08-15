import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ReportCollector
 * ---------------------------------------------------------------------
 * Builds the self-contained per-run test report:
 *
 *   testreports/<feature>_<DDMMYYYYHHmm>/
 *     <feature>_<DDMMYYYYHHmm>.html   <- one report, all scenarios
 *     <feature>_<DDMMYYYYHHmm>.json   <- same data as plain JSON
 *     screenshots/*.png               <- every screenshot referenced by the HTML
 *
 * It's a module-level singleton rather than something threaded through
 * every call site: cucumber.js runs scenarios sequentially (no --parallel),
 * so there is only ever one "current scenario" / "current step" at a time,
 * and CommonActions (which has no reference to the Cucumber World) can
 * still record a screenshot against whichever step is currently running
 * just by calling ReportCollector.getInstance().attachScreenshot(...).
 *
 * stepDefinitions/hooks.ts drives the scenario/step lifecycle
 * (startScenario/startStep/endStep/endScenario); AfterAll calls
 * writeReports() once the whole feature file has finished running.
 */

export interface StepScreenshot {
  fileName: string;
  label: string;
}

export interface StepRecord {
  keyword: string;
  text: string;
  status: string;
  durationMs: number;
  errorMessage?: string;
  screenshots: StepScreenshot[];
}

export interface ScenarioRecord {
  name: string;
  tags: string[];
  status: string;
  durationMs: number;
  screenshots: StepScreenshot[];
  steps: StepRecord[];
}

export class ReportCollector {
  private static instance: ReportCollector;

  private runDir = '';
  private screenshotsDir = '';
  private reportBaseName = '';
  private shotCounter = 0;

  private readonly scenarios: ScenarioRecord[] = [];
  private currentScenario: ScenarioRecord | null = null;
  private currentStep: StepRecord | null = null;

  private constructor() {}

  public static getInstance(): ReportCollector {
    if (!ReportCollector.instance) {
      ReportCollector.instance = new ReportCollector();
    }
    return ReportCollector.instance;
  }

  /** Called once per process (BeforeAll) — sets up this run's output folder. */
  public configure(runDir: string): void {
    this.runDir = runDir;
    this.screenshotsDir = path.join(runDir, 'screenshots');
    this.reportBaseName = path.basename(runDir);
    fs.mkdirSync(this.screenshotsDir, { recursive: true });
  }

  public startScenario(name: string, tags: string[]): void {
    this.currentScenario = { name, tags, status: 'UNKNOWN', durationMs: 0, screenshots: [], steps: [] };
    this.scenarios.push(this.currentScenario);
  }

  public endScenario(status: string, durationMs: number): void {
    if (!this.currentScenario) return;
    this.currentScenario.status = status;
    this.currentScenario.durationMs = durationMs;
    this.currentScenario = null;
  }

  public startStep(keyword: string, text: string): void {
    if (!this.currentScenario) return;
    this.currentStep = { keyword, text, status: 'UNKNOWN', durationMs: 0, screenshots: [] };
    this.currentScenario.steps.push(this.currentStep);
  }

  public endStep(status: string, durationMs: number, errorMessage?: string): void {
    if (!this.currentStep) return;
    this.currentStep.status = status;
    this.currentStep.durationMs = durationMs;
    this.currentStep.errorMessage = errorMessage;
    this.currentStep = null;
  }

  /**
   * Captures a screenshot and files it under whichever step is currently
   * running; falls back to the current scenario (e.g. "Browser launched"
   * before the first step, "Final state" after the last one) when no step
   * is active, and is a silent no-op if the run was never configured or
   * no scenario is active — safest default for a shared singleton.
   */
  public async attachScreenshot(page: Page, label: string): Promise<void> {
    if (!this.runDir || !this.currentScenario) return;
    try {
      this.shotCounter += 1;
      const fileName = `${String(this.shotCounter).padStart(3, '0')}_${slugify(label)}.png`;
      await page.screenshot({ path: path.join(this.screenshotsDir, fileName), fullPage: true });
      const entry: StepScreenshot = { fileName, label };
      (this.currentStep ?? this.currentScenario).screenshots.push(entry);
    } catch {
      // Reporting must never fail the actual test action.
    }
  }

  /** Writes the JSON + HTML report for this run. Call once, from AfterAll. */
  public writeReports(): void {
    if (!this.runDir) return;
    const jsonPath = path.join(this.runDir, `${this.reportBaseName}.json`);
    const htmlPath = path.join(this.runDir, `${this.reportBaseName}.html`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.scenarios, null, 2));
    fs.writeFileSync(htmlPath, renderHtml(this.reportBaseName, this.scenarios));
  }
}

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'screenshot'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'PASSED':
      return 'badge-passed';
    case 'FAILED':
      return 'badge-failed';
    case 'SKIPPED':
      return 'badge-skipped';
    default:
      return 'badge-other';
  }
}

function renderScreenshots(shots: StepScreenshot[]): string {
  if (shots.length === 0) return '';
  return `<div class="shots">${shots
    .map(
      (s) => `
      <figure class="shot">
        <img class="shot-thumb" src="screenshots/${encodeURIComponent(s.fileName)}" alt="${escapeHtml(s.label)}" loading="lazy" />
        <figcaption>${escapeHtml(s.label)}</figcaption>
      </figure>`
    )
    .join('')}</div>`;
}

function renderStep(step: StepRecord): string {
  return `
    <li class="step step-${step.status.toLowerCase()}">
      <div class="step-head">
        <span class="badge ${statusBadgeClass(step.status)}">${escapeHtml(step.status)}</span>
        <span class="step-text"><strong>${escapeHtml(step.keyword)}</strong> ${escapeHtml(step.text)}</span>
        <span class="step-duration">${step.durationMs} ms</span>
      </div>
      ${step.errorMessage ? `<pre class="error">${escapeHtml(step.errorMessage)}</pre>` : ''}
      ${renderScreenshots(step.screenshots)}
    </li>`;
}

function renderScenario(scenario: ScenarioRecord, index: number): string {
  return `
  <details class="scenario scenario-${scenario.status.toLowerCase()}" ${scenario.status !== 'PASSED' ? 'open' : ''}>
    <summary>
      <span class="badge ${statusBadgeClass(scenario.status)}">${escapeHtml(scenario.status)}</span>
      <span class="scenario-name">${index + 1}. ${escapeHtml(scenario.name)}</span>
      <span class="scenario-duration">${scenario.durationMs} ms</span>
      ${scenario.tags.length ? `<span class="tags">${scenario.tags.map((t) => `<code>${escapeHtml(t)}</code>`).join(' ')}</span>` : ''}
    </summary>
    ${renderScreenshots(scenario.screenshots)}
    <ol class="steps">
      ${scenario.steps.map(renderStep).join('')}
    </ol>
  </details>`;
}

function renderHtml(title: string, scenarios: ScenarioRecord[]): string {
  const passed = scenarios.filter((s) => s.status === 'PASSED').length;
  const failed = scenarios.filter((s) => s.status === 'FAILED').length;
  const other = scenarios.length - passed - failed;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 2rem; background: #f4f5f7; color: #1a1a1a; }
  @media (prefers-color-scheme: dark) { body { background: #14161a; color: #e8e8e8; } }
  h1 { margin-top: 0; }
  .summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .summary .pill { padding: .4rem .9rem; border-radius: 999px; font-weight: 600; font-size: .9rem; }
  .pill-total { background: #e2e5ea; }
  .pill-passed { background: #d5f5e3; color: #1e7e34; }
  .pill-failed { background: #fbdcdc; color: #a02020; }
  @media (prefers-color-scheme: dark) {
    .pill-total { background: #2a2d33; }
    .pill-passed { background: #123a24; color: #6fe0a0; }
    .pill-failed { background: #3a1616; color: #ff9090; }
  }
  details.scenario { background: white; border-radius: 10px; margin-bottom: 1rem; padding: .75rem 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  @media (prefers-color-scheme: dark) { details.scenario { background: #1e2126; } }
  details.scenario summary { cursor: pointer; display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; list-style: none; }
  details.scenario summary::-webkit-details-marker { display: none; }
  .scenario-name { font-weight: 600; flex: 1; }
  .scenario-duration, .step-duration { color: #888; font-size: .85rem; }
  .tags code { background: #eee; border-radius: 4px; padding: .1rem .4rem; font-size: .75rem; margin-right: .2rem; }
  @media (prefers-color-scheme: dark) { .tags code { background: #2a2d33; } }
  .badge { display: inline-block; padding: .15rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 700; text-transform: uppercase; }
  .badge-passed { background: #d5f5e3; color: #1e7e34; }
  .badge-failed { background: #fbdcdc; color: #a02020; }
  .badge-skipped { background: #fdf3d2; color: #8a6d00; }
  .badge-other { background: #e2e5ea; color: #555; }
  @media (prefers-color-scheme: dark) {
    .badge-passed { background: #123a24; color: #6fe0a0; }
    .badge-failed { background: #3a1616; color: #ff9090; }
    .badge-skipped { background: #3a3316; color: #f0d060; }
    .badge-other { background: #2a2d33; color: #ccc; }
  }
  ol.steps { list-style: none; margin: .75rem 0 0; padding: 0; border-top: 1px solid #eee; }
  @media (prefers-color-scheme: dark) { ol.steps { border-top-color: #333; } }
  li.step { padding: .6rem 0; border-bottom: 1px solid #f0f0f0; }
  @media (prefers-color-scheme: dark) { li.step { border-bottom-color: #2a2a2a; } }
  .step-head { display: flex; align-items: center; gap: .6rem; }
  .step-text { flex: 1; }
  .error { background: #fbdcdc; color: #a02020; padding: .6rem .8rem; border-radius: 6px; overflow-x: auto; font-size: .8rem; margin: .5rem 0 0; }
  @media (prefers-color-scheme: dark) { .error { background: #3a1616; color: #ff9090; } }
  .shots { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: .6rem; }
  figure.shot { margin: 0; text-align: center; }
  figure.shot figcaption { font-size: .75rem; color: #888; margin-top: .25rem; max-width: 180px; }
  .shot-thumb { width: 180px; max-width: 100%; border-radius: 6px; border: 1px solid #ddd; cursor: zoom-in; transition: width .15s ease; display: block; }
  @media (prefers-color-scheme: dark) { .shot-thumb { border-color: #333; } }
  .shot-thumb.expanded { width: min(900px, 100%); cursor: zoom-out; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="summary">
    <span class="pill pill-total">${scenarios.length} scenario(s)</span>
    <span class="pill pill-passed">${passed} passed</span>
    <span class="pill pill-failed">${failed} failed</span>
    ${other > 0 ? `<span class="pill pill-total">${other} other</span>` : ''}
  </div>
  ${scenarios.map((s, i) => renderScenario(s, i)).join('')}
  <script>
    // Screenshots expand in place (no download, no new tab/page) — a click
    // just toggles the thumbnail's own size within the current page.
    document.querySelectorAll('.shot-thumb').forEach(function (img) {
      img.addEventListener('click', function () {
        img.classList.toggle('expanded');
      });
    });
  </script>
</body>
</html>`;
}
