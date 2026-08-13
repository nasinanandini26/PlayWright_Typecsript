import { Page } from '@playwright/test';

/**
 * MODULE 1 — PLAYWRIGHT BASICS
 * Read notes/01-playwright-basics.md first if any of this feels unfamiliar.
 *
 * QUESTIONS (think through these before/while you code — no need to write answers down):
 *   1. What is a Locator, and why is `page.locator(selector)` "lazy" (it doesn't
 *      search the DOM the moment you call it)?
 *   2. Why does `.fill()` not need an explicit wait before it, unlike raw
 *      DOM-manipulation code that might run before the element exists?
 *   3. What's the difference between reading `.innerText()` and checking
 *      `.isVisible()` — why might you want a function that never throws even if
 *      the element isn't on the page at all?
 *
 * YOUR TASK
 * Implement the four TODO functions below using the Playwright Page/Locator API.
 * Do not change any function signature — PlaywrightBasicsExercise.test.ts calls
 * these exactly as declared below.
 *
 * SPACE TO WRITE CODE is marked with TODO comments and a placeholder
 * `throw new Error(...)` — replace each throw with your real implementation.
 *
 * HOW TO RUN (validates your code — see PlaywrightBasicsExercise.test.ts)
 *   ./exercises/run.sh 1
 * Runs headless by default — set HEADLESS=false to watch it in a real window:
 *   HEADLESS=false ./exercises/run.sh 1
 */

/**
 * TODO 1: Fill the SauceDemo login form's username and password fields.
 * Locators to use: "#user-name" and "#password".
 * Do NOT click login here — that's a separate function, see clickLoginButton below.
 */
export async function fillLoginForm(page: Page, username: string, password: string): Promise<void> {
  throw new Error('TODO: implement fillLoginForm');
}

/**
 * TODO 2: Click the login button. Locator: "#login-button".
 */
export async function clickLoginButton(page: Page): Promise<void> {
  throw new Error('TODO: implement clickLoginButton');
}

/**
 * TODO 3: Read and return the TRIMMED text of the error banner.
 * Locator: "[data-test='error']"
 */
export async function readErrorMessage(page: Page): Promise<string> {
  throw new Error('TODO: implement readErrorMessage');
}

/**
 * TODO 4: Return whether an element matching the given CSS selector is
 * currently visible. Must not throw if the element doesn't exist on the page at
 * all — Locator#isVisible() already behaves that way, so lean on it rather than
 * checking existence yourself.
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  throw new Error('TODO: implement isElementVisible');
}
