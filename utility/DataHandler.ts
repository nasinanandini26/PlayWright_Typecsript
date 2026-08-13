import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * ConfigReader
 * ---------------------------------------------------------------------
 * Reads config/config.properties (a Java-style .properties file) once
 * and exposes typed getters. Implemented as a Singleton so every page,
 * step definition and hook shares a single in-memory copy instead of
 * re-parsing the file on every call.
 */
export class ConfigReader {
  private static instance: ConfigReader;
  private readonly properties: Map<string, string> = new Map();

  private constructor(filePath: string) {
    this.load(filePath);
  }

  /** Returns the single shared instance, creating it from the default
   *  config/config.properties path the first time it is called. */
  public static getInstance(
    filePath: string = path.resolve(__dirname, '..', 'config', 'config.properties')
  ): ConfigReader {
    if (!ConfigReader.instance) {
      ConfigReader.instance = new ConfigReader(filePath);
    }
    return ConfigReader.instance;
  }

  /** Test-only escape hatch to force a reload from a different file. */
  public static resetForTesting(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ConfigReader as any).instance = undefined;
  }

  private load(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Config properties file not found at: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split(/\r?\n/).forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('!')) {
        return; // blank line or comment
      }
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
      this.properties.set(key, value);
    });
  }

  public get(key: string): string {
    const value = this.properties.get(key);
    if (value === undefined) {
      throw new Error(`Property "${key}" was not found in config.properties`);
    }
    return value;
  }

  public getOrDefault(key: string, defaultValue: string): string {
    return this.properties.get(key) ?? defaultValue;
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  public getBoolean(key: string): boolean {
    return this.get(key).toLowerCase() === 'true';
  }
}

/**
 * CsvDataReader
 * ---------------------------------------------------------------------
 * Reads test data CSV files from /testdata into typed row objects.
 * Results are cached per absolute file path so a data file backing
 * many scenarios is parsed from disk only once per run.
 */
export class CsvDataReader {
  private static readonly cache: Map<string, Record<string, string>[]> = new Map();

  /** Reads and parses a CSV file (header row -> object keys) relative to the project root. */
  public static readCsv<T = Record<string, string>>(relativeOrAbsolutePath: string): T[] {
    const resolvedPath = path.isAbsolute(relativeOrAbsolutePath)
      ? relativeOrAbsolutePath
      : path.resolve(process.cwd(), relativeOrAbsolutePath);

    const cached = CsvDataReader.cache.get(resolvedPath);
    if (cached) {
      return cached as unknown as T[];
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Test data CSV not found at: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    CsvDataReader.cache.set(resolvedPath, records);
    return records as unknown as T[];
  }

  /** Convenience lookup for the common "one row per test case" CSV shape. */
  public static getRowByTestCaseId<T extends { testCaseId: string }>(
    relativeOrAbsolutePath: string,
    testCaseId: string
  ): T {
    const rows = CsvDataReader.readCsv<T>(relativeOrAbsolutePath);
    const row = rows.find((r) => r.testCaseId === testCaseId);
    if (!row) {
      throw new Error(`No row with testCaseId "${testCaseId}" found in ${relativeOrAbsolutePath}`);
    }
    return row;
  }

  /** Returns every row whose testCaseId matches, useful for Scenario Outline Examples fed from CSV. */
  public static getRowsByTestCaseIds<T extends { testCaseId: string }>(
    relativeOrAbsolutePath: string,
    testCaseIds: string[]
  ): T[] {
    return testCaseIds.map((id) => CsvDataReader.getRowByTestCaseId<T>(relativeOrAbsolutePath, id));
  }
}
