export function setText(element, value) {
  if (!element) return;
  element.textContent = value ?? "";
}

export function setStatus(element, message, isError = false) {
  if (!element) return;

  element.textContent = String(message || "");
  element.style.background = isError ? "#fdecec" : "#fff4eb";
  element.style.color = isError ? "#b42318" : "#9a4c00";
}

export function normalizeRoomCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

export function createRoomCode(prefix = "TP") {
  const safePrefix = String(prefix || "TP")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "") || "TP";

  const random = Math.floor(1000 + Math.random() * 9000);
  return `${safePrefix}-${random}`;
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
