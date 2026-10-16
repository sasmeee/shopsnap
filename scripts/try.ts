import fs from "fs";
import { transcribeImage, extractOrders } from "../src/lib/ollama";

const b64 = fs.readFileSync("samples/chat01.png").toString("base64");
const text = await transcribeImage(b64);
console.log("--- TRANSCRIPT\n" + text);
console.log(
  "--- ORDERS\n" + JSON.stringify(await extractOrders(text), null, 2),
);
