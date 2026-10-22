const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const requestForm = $("#requestForm");
const formMessage = $("#formMessage");
const submitBtn = $("#submitBtn");
const trackingResult = $("#trackingResult");
const modal = $("#adminModal");
let adminPassword = "";

$("#year").textContent = new Date().getFullYear();
$("#deliveryDate").min = new Date().toISOString().slice(0, 10);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}
function showMessage(el, message, error = false) {
  el.textContent = message; el.classList.toggle("error", error);
}
$$("[data-scroll]").forEach(button => button.addEventListener("click", () => {
  document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
}));
$("#menuToggle").addEventListener("click", () => $("nav").classList.toggle("open"));
$$("nav a").forEach(a => a.addEventListener("click", () => $("nav").classList.remove("open")));

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(requestForm).entries());
  data.quantity = Number(data.quantity);
  submitBtn.disabled = true; submitBtn.textContent = "Submitting…";
  showMessage(formMessage, "");
  try {
    const response = await fetch("/api/requests", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Could not submit your request.");
    formMessage.innerHTML = "";
    formMessage.classList.remove("error");
    formMessage.innerHTML = `Request submitted successfully! Your tracking ID is <strong>${escapeHTML(result.request.id)}</strong>. Save this ID to track your request.`;
    const trackingId = result.request.id;
    requestForm.reset(); $("#deliveryDate").min = new Date().toISOString().slice(0, 10);
    $("#trackingId").value = trackingId;
    showToast("Your request has been submitted.");
    setTimeout(() => $("#track").scrollIntoView({ behavior: "smooth" }), 500);
  } catch (error) { showMessage(formMessage, error.message, true); }
  finally { submitBtn.disabled = false; submitBtn.innerHTML = 'Submit request <span>↗</span>'; }
});

function statusClass(status) { return status.toLowerCase().replace(/\s+/g, "-"); }
$("#trackForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("#trackingId").value.trim();
  trackingResult.innerHTML = '<p class="loading-text">Looking up your request…</p>';
  try {
    const response = await fetch(`/api/requests?trackingId=${encodeURIComponent(id)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Request not found.");
    const date = new Date(result.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    const delivery = new Date(result.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    const timeline = (result.timeline || []).map(item => `<p>• <b>${escapeHTML(item.status)}</b> — ${escapeHTML(item.note)} <span>${new Date(item.at).toLocaleString()}</span></p>`).join("");
    trackingResult.innerHTML = `<div class="result-card"><div class="result-top"><strong>${escapeHTML(result.id)}</strong><span class="status-pill ${statusClass(result.status)}">${escapeHTML(result.status)}</span></div><p><b>Area:</b> ${escapeHTML(result.area)}<br><b>Tankers:</b> ${result.quantity}<br><b>Delivery date:</b> ${delivery}<br><b>Submitted:</b> ${date}</p><details><summary>View status history</summary>${timeline}</details></div>`;
  } catch (error) { trackingResult.innerHTML = `<div class="result-card"><p class="error-text">${escapeHTML(error.message)}</p></div>`; }
});

$("#adminOpen").addEventListener("click", () => {
  modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
  $("#adminPassword").focus();
});
function closeModal() { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); }
$("#adminClose").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

$("#adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("#adminMessage");
  const password = $("#adminPassword").value;
  showMessage(message, "Signing in…");
  try {
    const response = await fetch("/api/admin/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ password }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    adminPassword = password;
    $("#adminLoginForm").classList.add("hidden");
    message.classList.add("hidden");
    $("#adminDashboard").classList.remove("hidden");
    await loadAdminRequests();
  } catch (error) { showMessage(message, error.message, true); }
});
async function loadAdminRequests() {
  const list = $("#adminRequests"); list.innerHTML = "<p>Loading requests…</p>";
  try {
    const response = await fetch("/api/admin/requests", { headers: { "x-admin-password": adminPassword } });
    const requests = await response.json();
    if (!response.ok) throw new Error(requests.message || "Unable to load requests.");
    $("#adminStats").innerHTML = [
      ["Total", requests.length],
      ["Pending", requests.filter(r => r.status === "Pending").length],
      ["Delivered", requests.filter(r => r.status === "Delivered").length]
    ].map(([label, value]) => `<div class="admin-stat"><strong>${value}</strong><small>${label} requests</small></div>`).join("");
    if (!requests.length) { list.innerHTML = "<p>No requests have been submitted yet.</p>"; return; }
    const statuses = ["Pending", "Approved", "Assigned", "In Transit", "Delivered", "Rejected"];
    list.innerHTML = requests.map(r => `<article class="admin-request" data-id="${escapeHTML(r.id)}"><div class="admin-request-head"><strong>${escapeHTML(r.id)} · ${escapeHTML(r.name)}</strong><span class="status-pill ${statusClass(r.status)}">${escapeHTML(r.status)}</span></div><small>${escapeHTML(r.area)} · ${r.quantity} tanker(s) · ${escapeHTML(r.date)}<br>${escapeHTML(r.phone)} · ${escapeHTML(r.address)}</small><div class="admin-request-controls"><select aria-label="New status">${statuses.map(s => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select><button data-action="update">Update status</button><button data-action="delete" title="Delete request">×</button></div></article>`).join("");
  } catch (error) { list.innerHTML = `<p class="error-text">${escapeHTML(error.message)}</p>`; }
}
$("#adminRequests").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".admin-request");
  const id = card.dataset.id;
  try {
    if (button.dataset.action === "update") {
      const status = card.querySelector("select").value;
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: {"Content-Type":"application/json", "x-admin-password": adminPassword},
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      showToast("Request status updated.");
    } else {
      if (!confirm(`Delete request ${id}? This cannot be undone.`)) return;
      const response = await fetch(`/api/admin/requests/${encodeURIComponent(id)}`, { method: "DELETE", headers: {"x-admin-password": adminPassword} });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      showToast("Request deleted.");
    }
    await loadAdminRequests();
  } catch (error) { showToast(error.message); }
});
$("#adminRefresh").addEventListener("click", loadAdminRequests);
$("#adminLogout").addEventListener("click", () => {
  adminPassword = "";
  $("#adminLoginForm").classList.remove("hidden");
  $("#adminLoginForm").reset();
  $("#adminDashboard").classList.add("hidden");
  $("#adminMessage").classList.remove("hidden");
  showMessage($("#adminMessage"), "Signed out.");
});
