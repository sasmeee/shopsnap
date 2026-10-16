import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { transcribeImage, extractOrders, OllamaError } from "@/lib/ollama";
import { parseHeader, validateOrder, checkGrounded, toItems } from "@/lib/chat";
import { normalizePhone } from "@/lib/phone";
import { findAlias } from "@/lib/db";

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
      .resize({
        width: 1024,
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({
        quality: 80,
      })
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

    const orders = extracted.map((order, index) => {
      let phone = hasHeader ? header.phone : normalizePhone(order.phone);

      const chatName = phone
        ? null
        : hasHeader
          ? header.chatName
          : order.chat_name;

      const aliasWarnings: string[] = [];

      if (!phone && chatName) {
        const aliasedPhone = findAlias(chatName);

        if (aliasedPhone) {
          phone = aliasedPhone;
          aliasWarnings.push(
            `phone ${aliasedPhone} was filled from saved chat name "${chatName}". Make sure it is the right customer`,
          );
        }
      }

      const normalizedOrder = {
        ...order,
        items: toItems(order.items),
        phone,
        chat_name: chatName,
        order_idx: index,
        source_hash: hash,
        order_date: date,
      };

      return {
        ...normalizedOrder,
        errors: validateOrder(normalizedOrder),
        warnings: [...aliasWarnings, ...checkGrounded(transcript, order)],
      };
    });

    return NextResponse.json({
      hash,
      transcript,
      orders,
    });
  } catch (error) {
    if (error instanceof OllamaError && error.code === "OLLAMA_DOWN") {
      return NextResponse.json(
        { error: "AI engine is not running. Start Ollama and try again." },
        { status: 503 },
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Couldn't read this screenshot. Try again." },
      { status: 502 },
    );
  }
}
