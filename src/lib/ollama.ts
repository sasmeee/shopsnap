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
Write the text exactly as shown. Do not summarize, judge, fix or skip anything.
Line 1 must be: HEADER: <the name or phone number shown at the top of the chat, or NONE>
Then one line per message line, from top to bottom, in the same order as on screen. Include messages on both the left and the right side.
Keep numbers, prices, item names and "=" signs exactly. Do not write message times.`;

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
- Items come ONLY from confirmed lines that look like: <item> x<qty> = <amount>. name is the item, qty is the number after x, line_total is the <amount>, copied as is. Do not divide anything.
- A request line without "=" and an amount is never an item. Greetings and sentences are never items.
- In request lines, "2k" or "3 k" after an item means a count of 2 or 3. It never means thousand.
- Never invent an amount. Only use numbers that appear in the chat text.
- A "Total" line ends one order. Make one order per Total line. A chat can contain several orders. "total" is the amount on that Total line.
- If there is no line with "=" and an amount, return an empty orders list.
- pay_status: "paid" only if a line clearly says it was paid (paid, damma, bank transfer done). "partial" if only part is paid. "unpaid" if it says not paid, owes, or will pay later. "unknown" if the chat does not say.
- qty is 1 if not stated.

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
