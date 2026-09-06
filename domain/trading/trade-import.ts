import { validateCreateTrade, type CreateTradeInput } from "./trade";

export type ImportProvenance = {
  source: string;
  externalAccountId: string;
  externalTradeId: string;
  batchId: string;
  metadata: Record<string, string>;
};

export type ImportedTradeInput = Omit<CreateTradeInput, "riskBasisPoints"> & {
  riskBasisPoints: null;
  provenance: ImportProvenance;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateImportedTrade(input: ImportedTradeInput): ImportedTradeInput {
  const validated = validateCreateTrade({ ...input, riskBasisPoints: 0 });
  for (const [field, value] of Object.entries({
    source: input.provenance.source,
    externalAccountId: input.provenance.externalAccountId,
    externalTradeId: input.provenance.externalTradeId,
    batchId: input.provenance.batchId,
  })) {
    if (!value.trim()) throw new Error(`${field} is required for an imported Trade.`);
  }
  if (!uuid.test(input.provenance.batchId))
    throw new Error("batchId must be a valid UUID for an imported Trade.");
  return { ...validated, riskBasisPoints: null, provenance: input.provenance };
}
