import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { transcribeImage, extractOrders, OllamaError } from "@/lib/ollama";
import { parseHeader, validateOrder, toItems } from "@/lib/chat";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const date = form.get("date");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Pick a valid date" }, { status: 400 });
  }

  const original = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(original).digest("hex");

  let resized: Buffer;
  try {
    resized = await sharp(original)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "That file is not a readable image" },
      { status: 400 },
    );
  }

  try {
    const transcript = await transcribeImage(resized.toString("base64"));
    const header = parseHeader(transcript);
    const extracted = await extractOrders(transcript);

    const hasHeader = header.phone !== null || header.chatName !== null;

    const orders = extracted.map((o, idx) => {
      const phone = hasHeader ? header.phone : normalizePhone(o.phone);
      const chat_name = phone
        ? null
        : hasHeader
          ? header.chatName
          : o.chat_name;
      const order = {
        ...o,
        items: toItems(o.items),
        phone,
        chat_name,
        order_idx: idx,
        source_hash: hash,
        order_date: date,
      };
      return { ...order, errors: validateOrder(order) };
    });

    return NextResponse.json({ hash, transcript, orders });
  } catch (e) {
    if (e instanceof OllamaError && e.code === "OLLAMA_DOWN") {
      return NextResponse.json(
        { error: "AI engine is not running. Start Ollama and try again." },
        { status: 503 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Couldn't read this screenshot. Try again." },
      { status: 502 },
    );
  }
}
