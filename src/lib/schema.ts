import { z } from "zod";

export const ItemSchema = z.object({
  name: z.string().describe("Item name as written in the chat"),
  qty: z.number().describe("Quantity, 1 if not stated. 'x2' means 2"),
  line_total: z
    .number()
    .describe(
      "Amount for this whole line, copied from the shop's message after '=', in rupees. 0 if no amount shown",
    ),
});

export const OrderSchema = z.object({
  chat_name: z
    .string()
    .nullable()
    .describe("Contact name shown at top of the chat, null if not visible"),
  phone: z
    .string()
    .nullable()
    .describe(
      "Phone number exactly as written, null if not visible. Never invent one",
    ),
  items: z.array(ItemSchema),
  total: z.number().describe("Order total in rupees"),
  pay_status: z
    .enum(["paid", "unpaid", "partial", "unknown"])
    .describe("unknown if the chat does not say"),
});

export const ExtractionSchema = z.object({
  orders: z.array(OrderSchema),
});

export type RawItem = z.infer<typeof ItemSchema>;
export type Item = { name: string; qty: number; price: number };
export type ExtractedOrder = z.infer<typeof OrderSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;

const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(ExtractionSchema);
export const extractionJsonSchema = jsonSchema;
