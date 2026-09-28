import ExcelJS from "exceljs";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Excel support for the importer.
 *
 * The sheet is converted to CSV text and handed to the existing parser rather
 * than given its own row pipeline: one normaliser, one set of quirks, and the
 * preview an operator sees is identical whichever format they uploaded.
 */

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function isSpreadsheetUpload(file: { originalname: string; mimetype: string }): boolean {
  return file.mimetype === XLSX_MIME || file.originalname.toLowerCase().endsWith(".xlsx");
}

export function isLegacyExcel(file: { originalname: string; mimetype: string }): boolean {
  return (
    file.mimetype === "application/vnd.ms-excel" ||
    file.originalname.toLowerCase().endsWith(".xls")
  );
}

/** Everything Excel can put in a cell, flattened to the text a human sees. */
export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }

    // A formula cell carries both the formula and its last computed value; the
    // value is what the export actually means.
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);

    // Hyperlink cells keep the label separately from the target. The target is
    // the useful half — these columns hold affiliate links.
    if ("hyperlink" in value) return String(value.hyperlink ?? value.text ?? "");

    if ("text" in value) return String(value.text ?? "");
    if ("error" in value) return "";
  }

  return String(value);
}

const escapeCsv = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * Reads the first worksheet of an `.xlsx` file and returns it as CSV text.
 *
 * Trailing blank columns and rows are dropped — Excel files routinely carry a
 * few hundred empty cells past the real data, and they would otherwise become
 * unnamed columns in the header.
 */
export async function xlsxToCsv(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();

  try {
    // ExcelJS types the argument as its own Buffer alias; the runtime takes a
    // Node Buffer or an ArrayBuffer either way.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw ApiError.badRequest("That file could not be read as an Excel workbook");
  }

  const sheet = workbook.worksheets.find((worksheet) => worksheet.rowCount > 0);
  if (!sheet) throw ApiError.badRequest("The workbook has no rows");

  const rows: string[][] = [];

  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // `row.values` is 1-indexed with a hole at 0, which is why this walks the
    // column count rather than mapping the array.
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      cells.push(cellText(row.getCell(column).value).trim());
    }
    rows.push(cells);
  });

  while (rows.length && rows[rows.length - 1]?.every((cell) => cell === "")) rows.pop();
  if (!rows.length) throw ApiError.badRequest("The workbook has no rows");

  const header = rows[0] ?? [];
  let width = header.length;
  while (width > 0 && (header[width - 1] ?? "") === "") width -= 1;
  if (!width) throw ApiError.badRequest("The first row of the sheet must hold the column names");

  return rows
    .map((row) => row.slice(0, width).map(escapeCsv).join(","))
    .join("\n");
}
