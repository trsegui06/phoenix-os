export type CreateTraderInput = { name: string; timezone: string };

export class TraderValidationError extends Error {
  constructor(
    public readonly field: "name" | "timezone",
    message: string,
  ) {
    super(message);
    this.name = "TraderValidationError";
  }
}

export function validateCreateTrader(input: CreateTraderInput): CreateTraderInput {
  const name = input.name.trim();
  if (!name) throw new TraderValidationError("name", "Enter a name for your trading workspace.");
  const timezone = input.timezone.trim();
  try {
    if (!timezone) throw new RangeError();
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new TraderValidationError(
      "timezone",
      "Enter a valid IANA timezone such as Europe/Paris.",
    );
  }
  return { name, timezone };
}
