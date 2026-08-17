"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TradeEntryValidationError, type TradeEntryInput } from "@/lib/trading-entry";
import { TradingApplicationError } from "@/services/trading/errors";
import { createTradeEntry } from "@/services/trading/trading-entry";

export type TradeEntryState = { message?: string; fieldErrors?: Record<string, string> };
export async function createTradeEntryAction(
  _state: TradeEntryState,
  formData: FormData,
): Promise<TradeEntryState> {
  const client = await getSupabaseServerClient();
  if (!client) redirect("/login");
  let errors: TradeEntryInput["errors"] = [];
  try {
    errors = JSON.parse(String(formData.get("errors") || "[]"));
  } catch {
    return { message: "Review the Trade Error entries." };
  }
  const value = (name: string) => String(formData.get(name) ?? "");
  try {
    await createTradeEntry(client, {
      tradingAccountId: value("tradingAccountId"),
      sessionId: value("sessionId"),
      setupId: value("setupId"),
      tradeDate: value("tradeDate"),
      asset: value("asset"),
      direction: value("direction"),
      entryPrice: value("entryPrice"),
      stopLoss: value("stopLoss"),
      takeProfit: value("takeProfit"),
      exitPrice: value("exitPrice"),
      riskPercent: value("riskPercent"),
      positionSize: value("positionSize"),
      result: value("result"),
      pnl: value("pnl"),
      executionQuality: value("executionQuality"),
      notes: value("notes"),
      errors,
    });
  } catch (error) {
    if (error instanceof TradeEntryValidationError)
      return {
        message: "Check the highlighted fields.",
        fieldErrors: { [error.field]: error.message },
      };
    if (error instanceof TradingApplicationError && error.code === "UNAUTHENTICATED")
      redirect("/login");
    return { message: "The Trade could not be recorded. Check the form and try again." };
  }
  revalidatePath("/trading");
  redirect("/trading?created=trade");
}
