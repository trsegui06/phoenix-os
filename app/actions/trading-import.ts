"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CsvImportError } from "@/lib/trading-import/csv-parser";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  analyzeTradeImport,
  executeTradeImport,
  previewTradeImport,
  type TradeImportMapping,
} from "@/services/trading/trade-import";

async function input(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new CsvImportError("Select a CSV file.");
  return new Uint8Array(await file.arrayBuffer());
}

function mapping(formData: FormData): TradeImportMapping {
  try {
    return {
      tradingAccountId: String(formData.get("tradingAccountId") ?? ""),
      setupId: String(formData.get("setupId") ?? ""),
      asset: String(formData.get("asset") ?? "") as "XAUUSD",
      sessionIdsByDate: JSON.parse(String(formData.get("sessionIdsByDate") ?? "{}")),
    };
  } catch {
    throw new CsvImportError("The import mappings are malformed.");
  }
}

async function client() {
  const value = await getSupabaseServerClient();
  if (!value) redirect("/login");
  const {
    data: { user },
  } = await value.auth.getUser();
  if (!user) redirect("/login");
  return value;
}

const message = (error: unknown) =>
  error instanceof CsvImportError
    ? error.message
    : "The historical Trade import could not be processed.";

export async function analyzeTradeImportAction(formData: FormData) {
  try {
    await client();
    return { ok: true as const, analysis: analyzeTradeImport(await input(formData)) };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}

export async function previewTradeImportAction(formData: FormData) {
  try {
    const rows = await previewTradeImport(
      await client(),
      await input(formData),
      String(formData.get("fileHash") ?? ""),
      mapping(formData),
    );
    return { ok: true as const, rows };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}

export async function executeTradeImportAction(formData: FormData) {
  try {
    const summary = await executeTradeImport(
      await client(),
      await input(formData),
      String(formData.get("fileHash") ?? ""),
      mapping(formData),
    );
    revalidatePath("/trading");
    return { ok: true as const, summary };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}
