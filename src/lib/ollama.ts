import {
  ExtractionSchema,
  extractionJsonSchema,
  type ExtractedOrder,
} from "@/lib/schema";
import { OLLAMA_URL, VISION_MODEL, TEXT_MODEL } from "@/lib/models";

export class OllamaError extends Error {
  code: "OLLAMA_DOWN" | "BAD_RESPONSE";
  constructor(code: "OLLAMA_DOWN" | "BAD_RESPONSE", message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function generate(body: Record<string, unknown>, timeoutMs: number) {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream: false, ...body }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new OllamaError("OLLAMA_DOWN");
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OllamaError("BAD_RESPONSE", `HTTP ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { response?: string };
  return data.response ?? "";
}

const TRANSCRIBE_PROMPT = `You are reading a screenshot of a WhatsApp chat.
Write the text exactly as shown. Do not summarize, judge, or fix anything.
Line 1 must be: HEADER: <the name or phone number shown at the top of the chat, or NONE>
Then one line per message, in order. Keep numbers, prices and item names exactly.`;

export async function transcribeImage(base64: string): Promise<string> {
  return generate(
    {
      model: VISION_MODEL,
      prompt: TRANSCRIBE_PROMPT,
      images: [base64],
      options: { temperature: 0 },
    },
    180_000,
  );
}

const EXTRACT_PROMPT = `Extract customer orders from this WhatsApp chat text.
Rules:
- The HEADER line is the chat title. If it is a phone number, put it in "phone". If it is a name, put it in "chat_name". Never invent a phone or name.
- One order per purchase. A chat can contain several orders.
- Use the shop's confirmed lines (the ones with "=" and a number) for items. Example: "Rice 5kg x2 = 3600" means name "Rice 5kg", qty 2, line_total 3600.
- line_total is the number after "=", copied as is. Do not divide anything.
- In the customer's lines, "2k" or "3 k" after an item means a count of 2 or 3. It never means thousand.
- "total" is the "Total" amount the shop states, in rupees.
- pay_status: "paid" if the chat says paid, "partial" if only part is paid, "unpaid" if it says not paid or owes, "unknown" if the chat does not say.
- qty is 1 if not stated.
- If there is no order, return an empty orders list.

Chat:
`;

export async function extractOrders(
  chatText: string,
): Promise<ExtractedOrder[]> {
  const raw = await generate(
    {
      model: TEXT_MODEL,
      prompt: EXTRACT_PROMPT + chatText,
      format: extractionJsonSchema,
      options: { temperature: 0 },
    },
    120_000,
  );

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new OllamaError("BAD_RESPONSE", "Model returned invalid JSON");
  }
  const parsed = ExtractionSchema.safeParse(json);
  if (!parsed.success) {
    throw new OllamaError("BAD_RESPONSE", "Model JSON did not match schema");
  }
  return parsed.data.orders;
}
