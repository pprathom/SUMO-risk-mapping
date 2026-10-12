import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const ITIC_BASE = "https://api.iticfoundation.org/accidents";
const PORT = process.env.PORT || 3001;

if (!process.env.ITIC_USER || !process.env.ITIC_PASS) {
  console.error("[iTIC proxy] ERROR: ITIC_USER / ITIC_PASS not set in .env");
  process.exit(1);
}

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${ITIC_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      user: process.env.ITIC_USER,
      pass: process.env.ITIC_PASS,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "iTIC login failed");

  cachedToken = json.data.access_token;
  tokenExpiry = Date.now() + (json.data.expires_in - 60) * 1000;
  return cachedToken;
}

app.post("/api/accidents", async (req, res) => {
  try {
    const { source_id, severity_id, geocode, start_date, end_date, limit, offset, buffer, point, line } = req.body;

    if (!geocode || !start_date || !end_date) {
      return res.status(400).json({ error: "geocode, start_date, end_date are required" });
    }

    const token = await getToken();

    const body = {
      source_id: source_id ?? 3,
      severity_id: severity_id ?? 1,
      geocode,
      start_date,
      end_date,
      keyword: "",
      limit: limit ?? 2000,
      offset: offset ?? 0,
    };
    if (buffer !== undefined) body.buffer = buffer;
    if (point) body.point = point;
    if (line) body.line = line;

    const upstream = await fetch(`${ITIC_BASE}/get_list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      res.status(upstream.status).json({ success: false, message: `iTIC upstream returned non-JSON (HTTP ${upstream.status})` });
      return;
    }
    res.status(upstream.status).json(json);
  } catch (err) {
    console.error("[accidents proxy]", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[iTIC proxy] listening on http://localhost:${PORT}`);
});
