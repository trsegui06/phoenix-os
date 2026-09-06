import { parse } from "csv-parse/sync";

export const MAX_IMPORT_BYTES = 512 * 1024;
export const MAX_IMPORT_ROWS = 500;

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvImportError";
  }
}

export function parseCsvBytes(bytes: Uint8Array) {
  if (!bytes.length) throw new CsvImportError("The CSV file is empty.");
  if (bytes.length > MAX_IMPORT_BYTES)
    throw new CsvImportError("The CSV file exceeds the 512 KiB limit.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CsvImportError("The CSV file must be valid UTF-8.");
  }
  let matrix: string[][];
  try {
    matrix = parse(text.replace(/^\uFEFF/, ""), {
      bom: true,
      columns: false,
      delimiter: ",",
      relax_column_count: false,
      skip_empty_lines: true,
      trim: false,
    }) as string[][];
  } catch {
    throw new CsvImportError("The CSV file is malformed.");
  }
  if (matrix.length < 2) throw new CsvImportError("The CSV file contains no Trade rows.");
  const headers = matrix[0] ?? [];
  if (new Set(headers).size !== headers.length)
    throw new CsvImportError("The CSV file contains duplicate headers.");
  const data = matrix.slice(1);
  if (data.length > MAX_IMPORT_ROWS)
    throw new CsvImportError(`The CSV file exceeds the ${MAX_IMPORT_ROWS}-row limit.`);
  if (data.some((row) => row.length !== headers.length))
    throw new CsvImportError("Every CSV row must contain the same number of columns.");
  return {
    headers,
    rows: data.map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]!])),
    ),
  };
}
