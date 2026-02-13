import type { VercelRequest, VercelResponse } from "@vercel/node";

const NOTION_API = "https://api.notion.com/v1/pages";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, company, subject, message, _hp } = req.body || {};

  // Honeypot — if filled, silently accept (bot submission)
  if (_hp) {
    return res.status(200).json({ success: true });
  }

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "Name, email, subject, and message are required." });
  }

  // Basic email format check
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
          Name: { title: [{ text: { content: name.slice(0, 200) } }] },
          Email: { email: email.slice(0, 200) },
          Company: { rich_text: [{ text: { content: (company || "").slice(0, 200) } }] },
          Subject: { rich_text: [{ text: { content: subject.slice(0, 500) } }] },
          Message: { rich_text: [{ text: { content: message.slice(0, 2000) } }] },
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
