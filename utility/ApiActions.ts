import { APIRequestContext, APIResponse, request, expect } from '@playwright/test';
import { ConfigReader } from './DataHandler';

/**
 * ApiActions
 * ---------------------------------------------------------------------
 * The API counterpart to utility/CommonActions.ts: a single home for every
 * raw HTTP interaction. Where CommonActions wraps Playwright's page/locator
 * API for UI tests, ApiActions wraps Playwright's APIRequestContext for API
 * tests, so step definitions never touch `request.*` directly and every call
 * shares one base URL, one default timeout and consistent JSON handling.
 *
 *   - Base URL is read from config.properties (`api.base.url`) via
 *     ConfigReader, so endpoints passed to the methods below are relative
 *     paths ("/users/1"), never full URLs -- the one place the host lives
 *     is config, exactly like `base.url` for the UI.
 *   - An instance owns one APIRequestContext (cookies/auth headers persist
 *     across calls on it). Create it with `ApiActions.create()` and release
 *     it with `dispose()`; stepDefinitions/hooks.ts does this per scenario
 *     via the CustomWorld (see stepDefinitions/world.ts).
 */
export type QueryParams = Record<string, string | number | boolean>;

export interface ApiRequestOptions {
  /** Extra headers merged on top of the context defaults for this one call. */
  headers?: Record<string, string>;
  /** Query-string parameters, appended to the URL. */
  params?: QueryParams;
  /** Request body. A plain object is serialized to JSON (Content-Type set
   *  automatically); a string/Buffer is sent as-is. */
  data?: unknown;
  /** Per-call timeout override in milliseconds. */
  timeoutMs?: number;
}

export class ApiActions {
  private constructor(private readonly context: APIRequestContext) {}

  /**
   * Builds an ApiActions backed by a fresh APIRequestContext whose baseURL
   * and default timeout come from config.properties. Pass `baseUrlOverride`
   * to target a different host for a specific scenario.
   */
  public static async create(baseUrlOverride?: string): Promise<ApiActions> {
    const config = ConfigReader.getInstance();
    const baseURL = baseUrlOverride ?? config.get('api.base.url');
    const context = await request.newContext({
      baseURL,
      timeout: config.getNumber('api.timeout.millis'),
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    return new ApiActions(context);
  }

  /** Underlying Playwright context, for the rare call these wrappers don't cover. */
  public get requestContext(): APIRequestContext {
    return this.context;
  }

  /** Releases the HTTP context. Always call once the scenario is done. */
  public async dispose(): Promise<void> {
    await this.context.dispose();
  }

  // ------------------------------------------------------------------
  // Common HTTP verbs — all resolve `endpoint` against api.base.url
  // ------------------------------------------------------------------
  public async get(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    return this.context.get(endpoint, this.toFetchOptions(options));
  }

  public async post(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    return this.context.post(endpoint, this.toFetchOptions(options));
  }

  public async put(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    return this.context.put(endpoint, this.toFetchOptions(options));
  }

  public async patch(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    return this.context.patch(endpoint, this.toFetchOptions(options));
  }

  public async delete(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
    return this.context.delete(endpoint, this.toFetchOptions(options));
  }

  // ------------------------------------------------------------------
  // Response helpers
  // ------------------------------------------------------------------
  /** Parses the response body as JSON, typed to `T`. */
  public async json<T = unknown>(response: APIResponse): Promise<T> {
    return (await response.json()) as T;
  }

  /** Returns the response body as plain text. */
  public async text(response: APIResponse): Promise<string> {
    return response.text();
  }

  // ------------------------------------------------------------------
  // Assertions — thin wrappers over `expect`, mirroring CommonActions
  // ------------------------------------------------------------------
  public assertStatus(response: APIResponse, expectedStatus: number, message?: string): void {
    expect(response.status(), message ?? `Expected HTTP ${expectedStatus} for ${response.url()}`).toBe(expectedStatus);
  }

  /** Asserts a 2xx response. */
  public assertOk(response: APIResponse, message?: string): void {
    expect(response.ok(), message ?? `Expected a 2xx response for ${response.url()} but got ${response.status()}`).toBeTruthy();
  }

  private toFetchOptions(options?: ApiRequestOptions) {
    return {
      headers: options?.headers,
      params: options?.params,
      data: options?.data,
      timeout: options?.timeoutMs,
    };
  }
}
