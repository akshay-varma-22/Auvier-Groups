/**
 * POST /api/lead: delivers a website enquiry (project brief form or chat assistant) to the
 * owner's Telegram.
 *
 * Runs as a Vercel Function (Web-standard Request/Response). Environment variables, set on
 * the Vercel project for Production and Preview, never in this repo:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_OWNER_CHAT_ID
 *
 * Abuse controls: same-origin only, JSON only, 8 KB body limit, strict field limits, a hidden
 * honeypot field ("website") that bots fill in, and a minimum fill time. Messages are sent as
 * plain text (no parse mode), so visitor input can never be interpreted as formatting or links.
 * When delivery fails the endpoint says so, and the page falls back to email.
 */

const MAX_BODY = 8_000;
const SOURCES = { chat: "Chat assistant", brief: "Project brief form", form: "Website form" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function clean(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return json({ ok: false, error: "forbidden" }, 403);
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, error: "json only" }, 415);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "too large" }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "invalid body" }, 400);

  // Honeypot and fill-time checks: pretend success so bots learn nothing.
  if (clean(body.website, 200)) return json({ ok: true });
  const elapsed = Number(body.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2500) return json({ ok: true });

  const lead = {
    source: SOURCES[body.source] || SOURCES.form,
    name: clean(body.name, 80),
    business: clean(body.business, 120),
    email: clean(body.email, 120),
    phone: clean(body.phone, 40),
    contact: clean(body.contact, 120),
    needs: clean(body.needs, 200),
    timeline: clean(body.timeline, 60),
    message: clean(body.message, 1500),
    page: clean(body.page, 120),
  };
  const reach = [lead.email, lead.phone, lead.contact].filter(Boolean);
  if (!lead.name || reach.length === 0) return json({ ok: false, error: "name and contact required" }, 400);
  if (!reach.some((r) => /@/.test(r) || r.replace(/\D/g, "").length >= 7)) return json({ ok: false, error: "invalid contact" }, 400);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!token || !chatId) return json({ ok: false, error: "not configured" }, 503);

  const text = [
    `🟢 New lead: ${new URL(request.url).host}`,
    `Source: ${lead.source}`,
    `Name: ${lead.name}`,
    lead.business && `Business: ${lead.business}`,
    lead.email && `Email: ${lead.email}`,
    lead.phone && `Mobile: ${lead.phone}`,
    lead.contact && lead.contact !== lead.email && `Contact: ${lead.contact}`,
    lead.needs && `Looking for: ${lead.needs}`,
    lead.timeline && `Timeline: ${lead.timeline}`,
    lead.message && `\nMessage:\n${lead.message}`,
    lead.page && `\nPage: ${lead.page}`,
    "\nReply from hello@auviergroups.com within one business day.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return json({ ok: false, error: "delivery failed" }, 502);
  } catch {
    return json({ ok: false, error: "delivery failed" }, 502);
  }
  return json({ ok: true });
}

export function GET() {
  return json({ ok: false, error: "method not allowed" }, 405);
}
