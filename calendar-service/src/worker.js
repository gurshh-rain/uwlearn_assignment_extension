const FEED_LIFETIME_SECONDS = 365 * 24 * 60 * 60;
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_ASSIGNMENTS = 500;
const encoder = new TextEncoder();

export default {
  async fetch(request, env, context) {
    try {
      return await routeRequest(request, env, context);
    } catch {
      return jsonResponse({ error: "Calendar service request failed." }, 500);
    }
  },
  async scheduled(event, env, context) {
    context.waitUntil(
      env.DB.prepare("DELETE FROM calendar_feeds WHERE expires_at <= ?").bind(Date.now()).run()
    );
  }
};

async function routeRequest(request, env, context) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (request.method === "GET" && url.pathname === "/health") {
    return jsonResponse({ ok: true });
  }
  if (request.method === "POST" && url.pathname === "/v1/calendars") {
    return createFeed(request, env, url.origin);
  }

  const match = url.pathname.match(/^\/v1\/calendars\/([A-Za-z0-9_-]{20,})\.ics$/);
  if (!match) return jsonResponse({ error: "Not found." }, 404);
  const feedId = match[1];
  if (request.method === "GET") return readFeed(feedId, env, context);
  if (request.method === "PUT") return updateFeed(request, feedId, env, url.origin);
  if (request.method === "DELETE") return deleteFeed(request, feedId, env);
  return jsonResponse({ error: "Method not allowed." }, 405);
}

async function createFeed(request, env, origin) {
  const parsed = await readAssignments(request);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status);

  const feedId = randomToken(24);
  const updateToken = randomToken(32);
  const updateTokenHash = await hashToken(updateToken);
  const now = Date.now();
  const expiresAt = now + FEED_LIFETIME_SECONDS * 1000;
  await env.DB.prepare(
    "INSERT INTO calendar_feeds (id, update_token_hash, calendar_json, expires_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(feedId, updateTokenHash, JSON.stringify(parsed.assignments), expiresAt, now).run();

  return jsonResponse({
    feedId,
    updateToken,
    feedUrl: `${origin}/v1/calendars/${feedId}.ics`,
    expiresAt: new Date(expiresAt).toISOString()
  }, 201);
}

async function updateFeed(request, feedId, env, origin) {
  const record = await env.DB.prepare(
    "SELECT update_token_hash FROM calendar_feeds WHERE id = ?"
  ).bind(feedId).first();
  if (!record) return jsonResponse({ error: "Calendar feed not found." }, 404);
  if (!(await isAuthorized(request, record.update_token_hash))) {
    return jsonResponse({ error: "Invalid update token." }, 401);
  }

  const parsed = await readAssignments(request);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, parsed.status);
  const now = Date.now();
  const expiresAt = now + FEED_LIFETIME_SECONDS * 1000;
  await env.DB.prepare(
    "UPDATE calendar_feeds SET calendar_json = ?, expires_at = ?, updated_at = ? WHERE id = ?"
  ).bind(JSON.stringify(parsed.assignments), expiresAt, now, feedId).run();

  return jsonResponse({
    feedId,
    feedUrl: `${origin}/v1/calendars/${feedId}.ics`,
    expiresAt: new Date(expiresAt).toISOString()
  });
}

async function readFeed(feedId, env, context) {
  const record = await env.DB.prepare(
    "SELECT calendar_json, expires_at, updated_at FROM calendar_feeds WHERE id = ?"
  ).bind(feedId).first();
  if (!record) return jsonResponse({ error: "Calendar feed not found." }, 404);
  if (record.expires_at <= Date.now()) {
    context?.waitUntil(
      env.DB.prepare("DELETE FROM calendar_feeds WHERE id = ?").bind(feedId).run()
    );
    return jsonResponse({ error: "Calendar feed expired." }, 410);
  }

  const calendar = buildCalendar(JSON.parse(record.calendar_json), new Date(record.updated_at));
  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=waterloo-learn-assignments.ics",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function deleteFeed(request, feedId, env) {
  const record = await env.DB.prepare(
    "SELECT update_token_hash FROM calendar_feeds WHERE id = ?"
  ).bind(feedId).first();
  if (!record) return jsonResponse({ error: "Calendar feed not found." }, 404);
  if (!(await isAuthorized(request, record.update_token_hash))) {
    return jsonResponse({ error: "Invalid update token." }, 401);
  }
  await env.DB.prepare("DELETE FROM calendar_feeds WHERE id = ?").bind(feedId).run();
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function readAssignments(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_PAYLOAD_BYTES) {
    return { ok: false, status: 413, error: "Calendar payload is too large." };
  }
  const text = await request.text();
  if (encoder.encode(text).length > MAX_PAYLOAD_BYTES) {
    return { ok: false, status: 413, error: "Calendar payload is too large." };
  }
  try {
    return validateAssignments(JSON.parse(text).assignments);
  } catch {
    return { ok: false, status: 400, error: "Request body must be valid JSON." };
  }
}

export function validateAssignments(assignments) {
  if (!Array.isArray(assignments) || !assignments.length || assignments.length > MAX_ASSIGNMENTS) {
    return { ok: false, status: 400, error: `Assignments must contain 1 to ${MAX_ASSIGNMENTS} items.` };
  }
  const normalized = [];
  for (const assignment of assignments) {
    const dueDate = new Date(assignment?.dueDate);
    const url = safeLearnUrl(assignment?.url);
    if (
      !assignment ||
      !String(assignment.id || "").slice(0, 100) ||
      !String(assignment.courseId || "").slice(0, 100) ||
      !String(assignment.name || "").trim() ||
      !String(assignment.courseName || "").trim() ||
      Number.isNaN(dueDate.getTime()) ||
      !url
    ) {
      return { ok: false, status: 400, error: "An assignment contains invalid data." };
    }
    normalized.push({
      id: String(assignment.id).slice(0, 100),
      courseId: String(assignment.courseId).slice(0, 100),
      name: String(assignment.name).trim().slice(0, 500),
      courseName: String(assignment.courseName).trim().slice(0, 300),
      dueDate: dueDate.toISOString(),
      url
    });
  }
  return { ok: true, assignments: normalized };
}

export function buildCalendar(assignments, generatedAt = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waterloo LEARN Assignment Dashboard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Waterloo LEARN Assignments",
    "X-WR-CALDESC:Assignment due dates from Waterloo LEARN"
  ];
  for (const assignment of assignments) {
    const dueDate = new Date(assignment.dueDate);
    const startDate = new Date(dueDate.getTime() - 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${assignment.courseId}-${assignment.id}@learn.uwaterloo.ca`,
      `DTSTAMP:${formatIcsDate(generatedAt)}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(dueDate)}`,
      `SUMMARY:${escapeIcs(`Due: ${assignment.name}`)}`,
      `DESCRIPTION:${escapeIcs(`Course: ${assignment.courseName}\nOpen in LEARN: ${assignment.url}`)}`,
      `URL:${assignment.url}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR", "");
  return lines.map(foldIcsLine).join("\r\n");
}

function safeLearnUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "learn.uwaterloo.ca" ? url.href : null;
  } catch {
    return null;
  }
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldIcsLine(line) {
  const chunks = [];
  let chunk = "";
  let bytes = 0;
  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    const limit = chunks.length ? 74 : 75;
    if (chunk && bytes + characterBytes > limit) {
      chunks.push(chunk);
      chunk = character;
      bytes = characterBytes;
    } else {
      chunk += character;
      bytes += characterBytes;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks.map((value, index) => index ? ` ${value}` : value).join("\r\n");
}

function randomToken(byteLength) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function isAuthorized(request, expectedHash) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  return (await hashToken(authorization.slice(7))) === expectedHash;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, PUT, DELETE, OPTIONS"
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders()
    }
  });
}
