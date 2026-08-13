import { Page } from '@playwright/test';
import { BasePage } from '../../../pages/BasePage';
import { LoginPage } from '../../../pages/LoginPage';

/**
 * MODULE 3 — PAGE OBJECT MODEL
 * Read notes/03-page-object-model.md first.
 *
 * SauceDemo's hamburger menu (top-left "☰" on any logged-in page) isn't wrapped by
 * any Page Object in the main framework yet — per the notes' "rule of thumb", it's
 * a component with several interactive elements reused across scenarios, so it
 * earns its own class. You're building that class.
 *
 * Real elements on saucedemo.com (inspect them yourself at
 * https://www.saucedemo.com/inventory.html after logging in):
 *   - Open button:      #react-burger-menu-btn
 *   - Logout link:       #logout_sidebar_link
 *   - Reset App State:   #reset_sidebar_link
 *   - Menu panel:        .bm-menu-wrap
 *
 * Careful: the menu panel is a slide-out drawer (built with react-burger-menu)
 * that stays in the DOM and CSS-`transform`-slides off-screen when "closed" — it
 * is NOT `display:none`, so `logoutLink.isVisible()` is `true` even while the
 * menu looks closed on screen (Playwright's visibility check only cares about
 * `display`/`visibility` and a non-empty bounding box, not whether an element is
 * scrolled/transformed out of the viewport). Check openness via `.bm-menu-wrap`'s
 * `aria-hidden` attribute instead: `"true"` when closed, `"false"` when open.
 *
 * QUESTIONS (think through these before/while you code):
 *   1. Why does the notes file call locators-must-be-private "rule 1" of POM?
 *      What concretely could a step definition do wrong if a locator field were
 *      public?
 *   2. Why should logout() return a LoginPage instead of void?
 *   3. Why doesn't this hamburger menu deserve a Page Object for, say, a single
 *      "About" link most tests never touch, per the notes' rule of thumb?
 *
 * YOUR TASK — follow the three POM rules from notes/03-page-object-model.md:
 *   1. Locators are `private readonly`. (The validation test scans this file's
 *      source text and fails if any `Locator`-typed field isn't `private`.)
 *   2. Methods describe user intent (openMenu(), logout(), resetAppState()), not
 *      raw clicks.
 *   3. A method that navigates returns the next Page Object — logout() returns a LoginPage.
 *
 * Note: the method that opens the *menu* is named `openMenu()`, not `open()` —
 * this class extends BasePage, which already defines a concrete `open()` that
 * navigates to `pageUrl`. Reusing the name `open()` for a different action
 * (clicking the hamburger button, which returns `Promise<BurgerMenuPage>`) would
 * override that inherited method with an incompatible return type — TypeScript's
 * compiler rejects that as a type error.
 *
 * HOW TO RUN (validates your code)
 *   ./exercises/run.sh 3
 */
export class BurgerMenuPage extends BasePage {
  // TODO 1: declare four `private readonly` Locator fields here — name them
  // openMenuButton, logoutLink, resetAppStateLink, menuWrap (mirror
  // pages/LoginPage.ts). Do NOT make them public/protected — the validation
  // checks this by reading this file's own source text.

  constructor(page: Page) {
    super(page);
    // TODO 2: initialize the four locators declared above, using the selectors
    // listed in the comment at the top of this file.
  }

  protected get pageUrl(): string {
    return `${this.config.get('base.url')}/inventory.html`;
  }

  public async isLoaded(): Promise<boolean> {
    return this.actions.isVisible(this.page.locator('.title'));
  }

  /**
   * TODO 3: click the hamburger/open button, then WAIT for the menu to actually
   * finish opening before returning — use `this.actions.assertAttribute(this.menuWrap,
   * 'aria-hidden', 'false')`. Clicking only waits for the click event to
   * register, not for the resulting 0.5s slide-out animation/React state update
   * to land in the DOM, so a caller checking `isMenuOpen()` immediately after
   * `openMenu()` resolves could otherwise see a stale "still closed" state.
   * Return `this` so calls can chain.
   */
  public async openMenu(): Promise<BurgerMenuPage> {
    throw new Error('TODO: implement openMenu');
  }

  /**
   * TODO 4: click "Logout" and return a new LoginPage — logging out navigates
   * back to the login screen, so per POM rule 3 this method must return the next
   * page, not void.
   */
  public async logout(): Promise<LoginPage> {
    throw new Error('TODO: implement logout');
  }

  /** TODO 5: click "Reset App State" (clears the cart). Return `this` so calls can chain. */
  public async resetAppState(): Promise<BurgerMenuPage> {
    throw new Error('TODO: implement resetAppState');
  }

  /**
   * TODO 6: return whether the menu is currently open. Read `menuWrap`'s
   * `aria-hidden` attribute (see `this.actions.getAttribute`) and return `true`
   * when it equals `"false"` — do NOT use the logout link's visibility, see the
   * note at the top of this file for why that doesn't work here.
   */
  public async isMenuOpen(): Promise<boolean> {
    throw new Error('TODO: implement isMenuOpen');
  }
}
