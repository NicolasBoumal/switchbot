import { numberOrNull } from "./domain/humidity.js";

export function colorWithAlpha(hexColor, alpha) {
  const value = hexColor.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

export function formatValue(value, unit, digits) {
  const number = numberOrNull(value);
  return number === null ? "-" : `${number.toFixed(digits)} ${unit}`;
}

export function formatTime(timeMs) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timeMs));
}

export function formatDateTime(timeMs) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(timeMs));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
