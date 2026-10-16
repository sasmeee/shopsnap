import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw.trim(), "LK");
  return parsed && parsed.isValid() ? parsed.number : null;
}
