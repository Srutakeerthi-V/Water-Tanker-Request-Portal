require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "requests.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
}
function readRequests() {
  ensureStore();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function writeRequests(items) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}
function makeId() {
  return "WT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}
function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}
function adminOnly(req, res, next) {
  const password = req.get("x-admin-password");
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid admin password." });
  }
  next();
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "Water Tanker Request Portal" }));

// Public requests are returned without private phone numbers.
app.get("/api/requests", (req, res) => {
  const { trackingId } = req.query;
  const requests = readRequests();
  if (trackingId) {
    const found = requests.find(r => r.id.toLowerCase() === String(trackingId).trim().toLowerCase());
    if (!found) return res.status(404).json({ message: "No request found with that tracking ID." });
    const { phone, ...publicRequest } = found;
    return res.json(publicRequest);
  }
  res.json(requests.map(({ phone, ...r }) => r).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post("/api/requests", (req, res) => {
  const body = req.body || {};
  const name = clean(body.name), phone = clean(body.phone), address = clean(body.address);
  const area = clean(body.area), quantity = Number(body.quantity), date = clean(body.date);
  const urgency = clean(body.urgency), notes = clean(body.notes);
  if (!name || !phone || !address || !area || !date || !Number.isFinite(quantity)) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }
  if (!/^[0-9+\-\s()]{8,18}$/.test(phone)) return res.status(400).json({ message: "Enter a valid contact number." });
  if (quantity < 1 || quantity > 10) return res.status(400).json({ message: "Tankers must be between 1 and 10." });
  if (!["Normal", "Urgent", "Emergency"].includes(urgency)) return res.status(400).json({ message: "Choose a valid priority." });
  if (Number.isNaN(Date.parse(date)) || new Date(date + "T00:00:00") < new Date(new Date().toDateString())) {
    return res.status(400).json({ message: "Choose today or a future delivery date." });
  }
  const requests = readRequests();
  const request = {
    id: makeId(), name, phone, address, area, quantity, date, urgency,
    notes, status: "Pending", createdAt: new Date().toISOString(),
    timeline: [{ status: "Pending", at: new Date().toISOString(), note: "Request received" }]
  };
  requests.push(request);
  writeRequests(requests);
  const { phone: _privatePhone, ...publicRequest } = request;
  res.status(201).json({ message: "Your request has been submitted.", request: publicRequest });
});

app.post("/api/admin/login", (req, res) => {
  if (clean(req.body?.password) !== ADMIN_PASSWORD) return res.status(401).json({ message: "Incorrect password." });
  res.json({ message: "Signed in successfully." });
});

app.get("/api/admin/requests", adminOnly, (_req, res) => {
  res.json(readRequests().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.patch("/api/admin/requests/:id", adminOnly, (req, res) => {
  const allowed = ["Pending", "Approved", "Assigned", "In Transit", "Delivered", "Rejected"];
  const status = clean(req.body?.status);
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid request status." });
  const requests = readRequests();
  const index = requests.findIndex(r => r.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Request not found." });
  requests[index].status = status;
  requests[index].timeline.push({
    status, at: new Date().toISOString(),
    note: clean(req.body?.note) || `Status changed to ${status}`
  });
  writeRequests(requests);
  const { phone, ...publicRequest } = requests[index];
  res.json({ message: "Request updated.", request: publicRequest });
});

app.delete("/api/admin/requests/:id", adminOnly, (req, res) => {
  const requests = readRequests();
  const filtered = requests.filter(r => r.id !== req.params.id);
  if (filtered.length === requests.length) return res.status(404).json({ message: "Request not found." });
  writeRequests(filtered);
  res.json({ message: "Request deleted." });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ message: "API route not found." });
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Water Tanker Portal running at http://localhost:${PORT}`));
