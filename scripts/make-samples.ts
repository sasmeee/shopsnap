import fs from "fs";
import path from "path";
import sharp from "sharp";

type Msg = { from: "them" | "me"; time: string; lines: string[] };
type Item = { name: string; qty: number; price: number };
type Order = {
  chat_name: string | null;
  phone: string | null;
  total: number;
  pay_status: "paid" | "unpaid" | "partial" | "unknown";
  items: Item[];
};
type Sample = {
  file: string;
  header: string;
  msgs: Msg[];
  orders: Order[];
};

const samples: Sample[] = [
  {
    file: "chat01.png",
    header: "+94 77 234 5678",
    msgs: [
      {
        from: "them",
        time: "10:12",
        lines: [
          "Hi, I need two 5kg bags of rice.",
          "I also need 1kg of sugar.",
        ],
      },
      {
        from: "me",
        time: "10:15",
        lines: ["Rice 5kg x2 = 3600", "Sugar 1kg x1 = 350", "Total Rs 3950"],
      },
      {
        from: "them",
        time: "10:20",
        lines: [
          "Okay, I have transferred the money.",
          "The payment is complete.",
        ],
      },
    ],
    orders: [
      {
        chat_name: null,
        phone: "+94772345678",
        total: 3950,
        pay_status: "paid",
        items: [
          { name: "Rice 5kg", qty: 2, price: 1800 },
          { name: "Sugar 1kg", qty: 1, price: 350 },
        ],
      },
    ],
  },
  {
    file: "chat02.png",
    header: "+94 71 345 6789",
    msgs: [
      {
        from: "them",
        time: "09:02",
        lines: [
          "Hi, I need two 1kg packs of dhal.",
          "I also need a bottle of coconut oil.",
        ],
      },
      {
        from: "me",
        time: "09:05",
        lines: ["Dhal 1kg x2 = 640", "Coconut oil x1 = 780", "Total Rs 1420"],
      },
      {
        from: "them",
        time: "09:06",
        lines: [
          "I'll pay you later.",
          "I don't have enough cash at my shop today.",
        ],
      },
    ],
    orders: [
      {
        chat_name: null,
        phone: "+94713456789",
        total: 1420,
        pay_status: "unpaid",
        items: [
          { name: "Dhal 1kg", qty: 2, price: 320 },
          { name: "Coconut oil", qty: 1, price: 780 },
        ],
      },
    ],
  },
  {
    file: "chat03.png",
    header: "Nimal Stores",
    msgs: [
      {
        from: "them",
        time: "11:30",
        lines: [
          "I need three 400g packs of milk powder.",
          "I also need two 200g packs of tea.",
        ],
      },
      {
        from: "me",
        time: "11:33",
        lines: [
          "Milk powder 400g x3 = 1740",
          "Tea 200g x2 = 760",
          "Total Rs 2500",
        ],
      },
      {
        from: "them",
        time: "11:40",
        lines: ["I've paid the full amount.", "Thanks for your help!"],
      },
    ],
    orders: [
      {
        chat_name: "Nimal Stores",
        phone: null,
        total: 2500,
        pay_status: "paid",
        items: [
          { name: "Milk powder 400g", qty: 3, price: 580 },
          { name: "Tea 200g", qty: 2, price: 380 },
        ],
      },
    ],
  },
  {
    file: "chat04.png",
    header: "Kamal Aiya",
    msgs: [
      {
        from: "them",
        time: "14:10",
        lines: [
          "I need four bars of soap.",
          "I also need two tubes of toothpaste.",
        ],
      },
      {
        from: "me",
        time: "14:14",
        lines: ["Soap x4 = 480", "Toothpaste x2 = 560", "Total Rs 1040"],
      },
      {
        from: "them",
        time: "14:15",
        lines: ["I'll pay you later.", "I haven't made the payment yet."],
      },
    ],
    orders: [
      {
        chat_name: "Kamal Aiya",
        phone: null,
        total: 1040,
        pay_status: "unpaid",
        items: [
          { name: "Soap", qty: 4, price: 120 },
          { name: "Toothpaste", qty: 2, price: 280 },
        ],
      },
    ],
  },
  {
    file: "chat05.png",
    header: "+94 76 456 7890",
    msgs: [
      {
        from: "them",
        time: "16:01",
        lines: [
          "I need one 10kg bag of rice.",
          "I also need three 1kg packs of flour.",
        ],
      },
      {
        from: "me",
        time: "16:04",
        lines: ["Rice 10kg x1 = 3400", "Flour 1kg x3 = 960", "Total Rs 4360"],
      },
      {
        from: "them",
        time: "16:10",
        lines: [
          "I'll pay Rs 2,000 today.",
          "I'll pay the remaining amount later.",
          "I've made a partial payment.",
        ],
      },
    ],
    orders: [
      {
        chat_name: null,
        phone: "+94764567890",
        total: 4360,
        pay_status: "partial",
        items: [
          { name: "Rice 10kg", qty: 1, price: 3400 },
          { name: "Flour 1kg", qty: 3, price: 320 },
        ],
      },
    ],
  },
  {
    file: "chat06.png",
    header: "+94 70 567 8901",
    msgs: [
      {
        from: "them",
        time: "08:40",
        lines: ["I need two loaves of bread.", "I also need ten eggs."],
      },
      {
        from: "me",
        time: "08:42",
        lines: ["Bread x2 = 300", "Eggs x10 = 450", "Total Rs 750 - Paid"],
      },
      {
        from: "them",
        time: "17:55",
        lines: [
          "Hi, I'd like to order a few more items.",
          "Please add 2kg of sugar.",
          "I also need three packets of biscuits.",
        ],
      },
      {
        from: "me",
        time: "17:58",
        lines: [
          "Sugar 2kg x1 = 700",
          "Biscuits x3 = 540",
          "Total Rs 1240 - Unpaid",
        ],
      },
    ],
    orders: [
      {
        chat_name: null,
        phone: "+94705678901",
        total: 750,
        pay_status: "paid",
        items: [
          { name: "Bread", qty: 2, price: 150 },
          { name: "Eggs", qty: 10, price: 45 },
        ],
      },
      {
        chat_name: null,
        phone: "+94705678901",
        total: 1240,
        pay_status: "unpaid",
        items: [
          { name: "Sugar 2kg", qty: 1, price: 700 },
          { name: "Biscuits", qty: 3, price: 180 },
        ],
      },
    ],
  },
  {
    file: "chat07.png",
    header: "Sunil Aiya",
    msgs: [
      {
        from: "them",
        time: "12:00",
        lines: [
          "I need five packets of noodles.",
          "I also need a bottle of soy sauce.",
        ],
      },
      {
        from: "me",
        time: "12:03",
        lines: [
          "Noodles x5 = 1000",
          "Soy sauce x1 = 260",
          "Total Rs 1260 - Paid",
        ],
      },
      {
        from: "them",
        time: "18:20",
        lines: ["I'd like to order again.", "I need two packets of noodles."],
      },
      {
        from: "me",
        time: "18:22",
        lines: ["Noodles x2 = 400", "Total Rs 400 - Unpaid"],
      },
    ],
    orders: [
      {
        chat_name: "Sunil Aiya",
        phone: null,
        total: 1260,
        pay_status: "paid",
        items: [
          { name: "Noodles", qty: 5, price: 200 },
          { name: "Soy sauce", qty: 1, price: 260 },
        ],
      },
      {
        chat_name: "Sunil Aiya",
        phone: null,
        total: 400,
        pay_status: "unpaid",
        items: [{ name: "Noodles", qty: 2, price: 200 }],
      },
    ],
  },
  {
    file: "chat08.png",
    header: "+94 75 678 9012",
    msgs: [
      {
        from: "them",
        time: "13:15",
        lines: [
          "Hi, I need one 500g pack of chilli powder.",
          "That's all I need.",
          "Please add three fish buns as well.",
        ],
      },
      {
        from: "me",
        time: "13:18",
        lines: [
          "Chilli powder 500g x1 = 650",
          "Fish buns x3 = 210",
          "Total Rs 860",
        ],
      },
      {
        from: "them",
        time: "13:19",
        lines: ["Okay, I'll bring the money and pay you."],
      },
    ],
    orders: [
      {
        chat_name: null,
        phone: "+94756789012",
        total: 860,
        pay_status: "unknown",
        items: [
          { name: "Chilli powder 500g", qty: 1, price: 650 },
          { name: "Fish buns", qty: 3, price: 70 },
        ],
      },
    ],
  },
  {
    file: "chat09.png",
    header: "Pubudu Mudalali",
    msgs: [
      {
        from: "them",
        time: "15:45",
        lines: [
          "I need one gas cylinder.",
          "I also need five packets of matches.",
        ],
      },
      {
        from: "me",
        time: "15:50",
        lines: ["Gas cylinder x1 = 4200", "Matches x5 = 250", "Total Rs 4450"],
      },
      {
        from: "them",
        time: "15:51",
        lines: ["Okay, I'll send you the money later."],
      },
    ],
    orders: [
      {
        chat_name: "Pubudu Mudalali",
        phone: null,
        total: 4450,
        pay_status: "unknown",
        items: [
          { name: "Gas cylinder", qty: 1, price: 4200 },
          { name: "Matches", qty: 5, price: 50 },
        ],
      },
    ],
  },
  {
    file: "chat10.png",
    header: "+94 72 789 0123",
    msgs: [
      {
        from: "them",
        time: "19:00",
        lines: ["Hi, how are you?", "Is your shop open today?"],
      },
      {
        from: "me",
        time: "19:02",
        lines: ["Yes, we're open until 9 PM."],
      },
      {
        from: "them",
        time: "19:03",
        lines: ["Okay, I'll come by soon."],
      },
    ],
    orders: [],
  },
];

const W = 900;
const PAD = 24;
const LH = 30;
const FONT = "Segoe UI, Arial, 'Noto Sans Sinhala', sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function render(s: Sample): string {
  let y = 120;
  let body = "";

  body += `<rect x="${W / 2 - 60}" y="${y - 24}" width="120" height="32" rx="8" fill="#1f2c34"/>`;
  body += `<text x="${W / 2}" y="${y - 2}" fill="#8696a0" font-size="16" font-family="${FONT}" text-anchor="middle">Yesterday</text>`;

  y += 40;

  for (const m of s.msgs) {
    const widest = Math.max(...m.lines.map((l) => l.length));
    const bw = Math.min(widest * 12 + 90, 640);
    const bh = m.lines.length * LH + 16;
    const x = m.from === "me" ? W - PAD - bw : PAD;
    const fill = m.from === "me" ? "#005c4b" : "#202c33";

    body += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="10" fill="${fill}"/>`;

    m.lines.forEach((l, i) => {
      body += `<text x="${x + 14}" y="${y + 28 + i * LH}" fill="#e9edef" font-size="21" font-family="${FONT}">${esc(l)}</text>`;
    });

    body += `<text x="${x + bw - 12}" y="${y + bh - 8}" fill="#8696a0" font-size="13" font-family="${FONT}" text-anchor="end">${m.time}</text>`;

    y += bh + 12;
  }

  const H = y + 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#0b141a"/>
    <rect width="${W}" height="80" fill="#202c33"/>
    <circle cx="50" cy="40" r="24" fill="#6b7c85"/>
    <text x="92" y="38" fill="#e9edef" font-size="24" font-weight="bold" font-family="${FONT}">${esc(s.header)}</text>
    <text x="92" y="62" fill="#8696a0" font-size="16" font-family="${FONT}">Click here for contact info</text>
    ${body}
  </svg>`;
}

async function main() {
  const dir = path.join(process.cwd(), "samples");

  fs.mkdirSync(dir, { recursive: true });

  for (const s of samples) {
    await sharp(Buffer.from(render(s)))
      .png()
      .toFile(path.join(dir, s.file));
  }

  fs.writeFileSync(
    path.join(dir, "expected.json"),
    JSON.stringify(
      samples.map((s) => ({ file: s.file, orders: s.orders })),
      null,
      2,
    ),
  );

  console.log(`Made ${samples.length} sample screenshots in samples/`);
}

main();
