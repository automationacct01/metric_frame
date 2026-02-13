import type { VercelRequest, VercelResponse } from "@vercel/node";

const NOTION_API = "https://api.notion.com/v1/pages";
const ALLOWED_ORIGINS = [
  "https://www.metricframe.ai",
  "https://get.metricframe.ai",
  "https://metricframe.ai",
];
const MIN_SUBMIT_TIME_MS = 3000;

const strip = (s: string) => s.replace(/<[^>]*>/g, "").trim();

function setCorsHeaders(res: VercelResponse, origin: string) {
  const matched = ALLOWED_ORIGINS.find((a) => origin.startsWith(a));
  if (matched) {
    res.setHeader("Access-Control-Allow-Origin", matched);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin || req.headers.referer || "") as string;
  setCorsHeaders(res, origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Origin validation — reject requests from unknown origins
  if (!ALLOWED_ORIGINS.some((a) => origin.startsWith(a))) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, email, company, subject, message, _hp, _t } = req.body || {};

  // Honeypot — if filled, silently accept (bot submission)
  if (_hp) {
    return res.status(200).json({ success: true });
  }

  // Type validation — all fields must be strings
  if (typeof name !== "string" || typeof email !== "string" || typeof subject !== "string" || typeof message !== "string") {
    return res.status(400).json({ error: "Invalid input." });
  }

  // Timing check — reject submissions faster than a human can type
  if (typeof _t === "number" && Date.now() - _t < MIN_SUBMIT_TIME_MS) {
    return res.status(200).json({ success: true }); // Silent reject (looks like success to bots)
  }

  // Validate required fields
  if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
    return res.status(400).json({ error: "Name, email, subject, and message are required." });
  }

  // Email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_CONTACT_DB_ID;

  if (!notionToken || !databaseId) {
    console.error("Missing NOTION_TOKEN or NOTION_CONTACT_DB_ID env vars");
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const response = await fetch(NOTION_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: { title: [{ text: { content: strip(name).slice(0, 200) } }] },
          Email: { email: email.trim().slice(0, 200) },
          Company: { rich_text: [{ text: { content: strip(company || "").slice(0, 200) } }] },
          Subject: { rich_text: [{ text: { content: strip(subject).slice(0, 500) } }] },
          Message: { rich_text: [{ text: { content: strip(message).slice(0, 2000) } }] },
          Status: { select: { name: "New" } },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Notion API error:", response.status, err);
      return res.status(502).json({ error: "Failed to submit. Please try again later." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
