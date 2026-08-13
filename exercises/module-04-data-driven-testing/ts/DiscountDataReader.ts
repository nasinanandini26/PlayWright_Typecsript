import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * MODULE 4 — DATA-DRIVEN TESTING (external-file style — "Style B" in
 * notes/04-data-driven-testing.md). Compare with the real
 * utility/DataHandler.ts's CsvDataReader. Read notes/04-data-driven-testing.md
 * first.
 *
 * Data file: exercises/module-04-data-driven-testing/testdata/discounts.csv
 *   code,description,percentOff
 *   SAVE10,10% off,10
 *   ...
 *
 * QUESTIONS (think through these before/while you code):
 *   1. When would you reach for an external data file (like this one) instead of
 *      a Cucumber Scenario Outline's inline Examples table?
 *   2. Why does CsvDataReader.getRowByTestCaseId throw an Error for an unknown
 *      key instead of just returning undefined?
 *
 * YOUR TASK
 * Implement readDiscount(code), following the exact pattern
 * CsvDataReader.readCsv/getRowByTestCaseId use: parse the CSV into rows, find the
 * one whose `code` column matches, and:
 *   - return it as a Discount (with percentOff converted from the CSV's string to
 *     a number) if found
 *   - throw an Error whose message contains `code`, if not found
 *
 * HOW TO RUN (validates your code, along with PriceCalculator.ts in this same folder)
 *   ./exercises/run.sh 4
 */

export interface Discount {
  code: string;
  description: string;
  percentOff: number;
}

const DATA_FILE = path.resolve(__dirname, '..', 'testdata', 'discounts.csv');

/**
 * TODO: read DATA_FILE, find the row whose `code` column equals `code`, and
 * return it as a Discount — or throw an Error containing `code` if no row matches.
 */
export function readDiscount(code: string): Discount {
  throw new Error('TODO: implement readDiscount');
}
