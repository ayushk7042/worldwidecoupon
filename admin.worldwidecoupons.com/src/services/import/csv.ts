/**
 * A small RFC 4180 parser.
 *
 * Written rather than pulled in because the WordPress export puts multi-line
 * Gutenberg HTML inside quoted fields, which trips the naive `split(",")`
 * approach, while a full CSV library would be the only reason this service
 * needs a dependency at all.
 */
export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];

  const header = (rows[0] ?? []).map((column) => column.trim());

  return rows
    .slice(1)
    // A trailing newline produces one empty row; a genuinely empty line in the
    // middle of an export is also noise.
    .filter((row) => row.length > 1 || (row[0] ?? "").trim() !== "")
    .map((row) => {
      const record: CsvRow = {};
      header.forEach((column, index) => {
        record[column] = row[index] ?? "";
      });
      return record;
    });
}

export function parseCsvRows(text: string): string[][] {
  // A BOM at the start would become part of the first column name.
  const input = text.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // Swallow; the \n that follows ends the row.
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
