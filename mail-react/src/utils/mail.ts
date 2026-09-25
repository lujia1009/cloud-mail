import type { Mail, SiteConfig } from "../types";
export function r2url(key: string, config: SiteConfig) {
  if (!key) return "";
  if (/^https?:\/\//.test(key)) return key;
  const domain = config.r2Domain;
  if (!domain) return key;
  return (
    `${/^https?:\/\//.test(domain) ? domain : "https://" + domain}`.replace(
      /\/$/,
      "",
    ) +
    "/" +
    key
  );
}
export function mailHtml(content: string, config: SiteConfig) {
  const raw = config.r2Domain || "";
  const domain = raw ? (/^https?:\/\//.test(raw) ? raw : "https://" + raw) : "";
  return content.replaceAll("{{domain}}", domain.replace(/\/$/, "") + "/");
}
export function recipients(value: string) {
  try {
    const v = JSON.parse(value || "[]");
    return Array.isArray(v)
      ? v.map((item) => typeof item === "string" ? item : item?.address || "").filter(Boolean).join(", ")
      : value;
  } catch {
    return value || "";
  }
}
export function dateLabel(value: string, lang = "zh") {
  const d = new Date(value?.replace(" ", "T") + "Z");
  return isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat(lang, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
}
export function subject(mail: Mail) {
  return mail.subject || "(No subject)";
}
export function bytes(n: number) {
  return n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;
}
