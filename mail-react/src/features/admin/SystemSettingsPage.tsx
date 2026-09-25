import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { settings } from "../../api/settings";
import { ErrorState, Skeleton } from "../../components/Feedback";
import { hasPerm, useApp } from "../../stores/app";
import { r2url } from "../../utils/mail";

// These are the fields edited by each card in mail-vue/src/views/sys-setting/index.vue.
// Keep this list in sync with the controls below and the compatibility audit.
export const legacySettingGroups: Record<string, string[]> = {
  websiteSetting: [
    "register",
    "loginDomain",
    "regKey",
    "addEmail",
    "manyEmail",
    "syncDelete",
    "minEmailPrefix",
    "emailPrefixFilter",
  ],
  customization: ["title", "loginOpacity", "background"],
  emailSetting: [
    "receive",
    "autoRefresh",
    "send",
    "noRecipient",
    "resendTokens",
    "blackFrom",
    "blackSubject",
    "blackContent",
    "autoCleanDays",
    "autoCleanExclude",
  ],
  emailPush: [
    "tgBotStatus",
    "tgBotToken",
    "tgChatId",
    "customDomain",
    "tgMsgFrom",
    "tgMsgTo",
    "tgMsgText",
    "forwardStatus",
    "forwardEmail",
    "webhookStatus",
    "webhookUrl",
    "webhookSecret",
    "webhookRetry",
    "ruleType",
    "ruleEmail",
  ],
  oss: [
    "r2Domain",
    "bucket",
    "endpoint",
    "region",
    "s3AccessKey",
    "s3SecretKey",
    "forcePathStyle",
  ],
  turnstileSetting: [
    "registerVerify",
    "regVerifyCount",
    "addEmailVerify",
    "addVerifyCount",
    "siteKey",
    "secretKey",
  ],
  noticeTitle: [
    "notice",
    "noticeTitle",
    "noticeContent",
    "noticeType",
    "noticeDuration",
    "noticePosition",
    "noticeOffset",
    "noticeWidth",
  ],
  workersAi: ["aiCode", "aiCodeFilter"],
  oauthLogin: [
    "googleSwitch",
    "googleClientId",
    "googleClientSecret",
    "githubSwitch",
    "githubClientId",
    "githubClientSecret",
    "linuxdoSwitch",
    "linuxdoClientId",
    "linuxdoClientSecret",
  ],
};

const systemTabs = [
  { id: "websiteSetting", label: "websiteSetting" },
  { id: "customization", label: "customization" },
  { id: "emailSetting", label: "emailSetting" },
  { id: "emailPush", label: "emailPush" },
  { id: "oss", label: "oss" },
  { id: "turnstileSetting", label: "turnstileSetting" },
  { id: "noticeTitle", label: "noticeTitle" },
  { id: "workersAi", label: "Workers AI" },
  { id: "oauthLogin", label: "oauthLogin" },
  { id: "about", label: "about" },
] as const;

type DialogKey =
  | "title"
  | "emailPrefix"
  | "background"
  | "r2Domain"
  | "resendToken"
  | "resendList"
  | "blackList"
  | "autoClean"
  | "aiCodeFilter"
  | "tgBot"
  | "otherEmail"
  | "webhook"
  | "forwardingRules"
  | "s3"
  | "turnstile"
  | "regVerifyCount"
  | "addVerifyCount"
  | "notice"
  | "oauth:google"
  | "oauth:github"
  | "oauth:linuxdo";
type Draft = Record<string, any>;
type TagKind = "email" | "emailOrDomain" | "number" | "any";

const emailPattern =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const domainPattern = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const splitTags = (value: unknown) =>
  Array.isArray(value)
    ? value.map(String)
    : String(value ?? "")
        .split(",")
        .filter(Boolean);
const num = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const toOssDomain = (domain: string) => {
  if (!domain) return "";
  if (!domain.startsWith("http")) return `https://${domain}`;
  return domain.endsWith("/") ? domain.slice(0, -1) : domain;
};
const isIpUrl = (value: string) => {
  if (!value) return false;
  try {
    const host = new URL(value.startsWith("http") ? value : `https://${value}`)
      .hostname;
    return (
      /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(
        host,
      ) || host.includes(":")
    );
  } catch {
    return false;
  }
};

function TagField({
  value,
  onChange,
  kind = "any",
  placeholder = "",
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  kind?: TagKind;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [entry, setEntry] = useState("");
  const add = () => {
    const valid = (part: string) =>
      kind === "any" ||
      (kind === "email" && emailPattern.test(part)) ||
      (kind === "emailOrDomain" &&
        (emailPattern.test(part) || domainPattern.test(part))) ||
      (kind === "number" && !Number.isNaN(Number(part)));
    const next = entry
      .split(/[,，\n]+/)
      .map((part) => part.trim())
      .filter((part) => part && valid(part));
    if (next.length) onChange([...new Set([...value, ...next])]);
    setEntry("");
  };
  return (
    <div className="system-tag-field">
      {value.map((tag) => (
        <span className="system-tag" key={tag}>
          {tag}
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((item) => item !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        disabled={disabled}
        value={entry}
        placeholder={placeholder}
        onChange={(e) => setEntry(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "," || e.key === "，") {
            e.preventDefault();
            add();
          }
        }}
      />
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`system-switch ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}

export function SystemSettingsPage() {
  const { t } = useTranslation();
  const user = useApp((s) => s.user);
  const notify = useApp((s) => s.notify);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["system"], queryFn: settings.query });
  const data: Draft = query.data || {};
  const canSet = hasPerm(user, "setting:set");
  const [saving, setSaving] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [section, setSection] =
    useState<(typeof systemTabs)[number]["id"]>("websiteSetting");
  const [dialog, setDialog] = useState<DialogKey | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [backgroundMode, setBackgroundMode] = useState<"url" | "upload">("url");
  const [noticePreview, setNoticePreview] = useState<Draft | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(
    null,
  );
  const [webhookFormat, setWebhookFormat] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [opacity, setOpacity] = useState("0.88");
  const opacityTimer = useRef<number | null>(null);

  useEffect(
    () => setOpacity(String(data.loginOpacity ?? 0.88)),
    [data.loginOpacity],
  );
  useEffect(
    () => () => {
      if (opacityTimer.current) window.clearTimeout(opacityTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!noticePreview || !num(noticePreview.noticeDuration)) return;
    const timer = window.setTimeout(
      () => setNoticePreview(null),
      num(noticePreview.noticeDuration),
    );
    return () => window.clearTimeout(timer);
  }, [noticePreview]);
  useEffect(() => {
    let cancelled = false;
    let retry = 0;
    let timer: number;
    const check = () =>
      fetch("https://api.github.com/repos/maillab/cloud-mail/releases/latest")
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((release) => {
          if (!cancelled) setHasUpdate(release.name !== "v3.3.0");
        })
        .catch(() => {
          if (!cancelled && ++retry < 5) timer = window.setTimeout(check, 2000);
        });
    check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const update = (key: string, value: unknown) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const commit = async (task: () => Promise<unknown>) => {
    if (saving || !canSet) return false;
    setSaving(true);
    try {
      await task();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["system"] }),
        qc.invalidateQueries({ queryKey: ["config"] }),
      ]);
      notify(t("saveSuccessMsg"));
      setDialog(null);
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const savePatch = (patch: Draft) => commit(() => settings.save(patch));
  const open = (name: DialogKey) => {
    setDraft({
      ...data,
      siteKey: "",
      secretKey: "",
      s3AccessKey: "",
      s3SecretKey: "",
      tgBotToken: "",
      background: data.background?.startsWith("http") ? data.background : "",
      resendDomain: (data.domainList || [])[0] || "",
      resendToken: "",
      tgChatId: splitTags(data.tgChatId),
      forwardEmail: splitTags(data.forwardEmail),
      ruleEmail: splitTags(data.ruleEmail),
      autoCleanExclude: splitTags(data.autoCleanExclude),
      emailPrefixFilter: splitTags(data.emailPrefixFilter),
      blackFrom: splitTags(data.blackFrom),
      blackSubject: splitTags(data.blackSubject),
      blackContent: splitTags(data.blackContent),
      aiCodeFilter: splitTags(data.aiCodeFilter),
    });
    setBackgroundMode("url");
    setWebhookFormat(false);
    setDialog(name);
  };
  const active = (key: string, on = 0) => num(data[key], 1) === on;
  const switchRow = (label: string, key: string, on = 0, hint?: string) => (
    <div className="system-item" key={key}>
      <div className="system-item-label">
        <span>{t(label)}</span>
        {hint && <small title={t(hint)}>ⓘ</small>}
      </div>
      <Switch
        label={t(label)}
        checked={active(key, on)}
        disabled={!canSet || saving}
        onChange={() =>
          savePatch({ [key]: active(key, on) ? (on === 0 ? 1 : 0) : on })
        }
      />
    </div>
  );
  const actionRow = (
    label: string,
    dialogKey: DialogKey,
    value?: string,
    hint?: string,
  ) => (
    <div className="system-item" key={label}>
      <div className="system-item-label">
        <span>{t(label)}</span>
        {hint && <small title={t(hint)}>ⓘ</small>}
      </div>
      <div className="system-item-action">
        {value && <span>{value}</span>}
        <button
          type="button"
          disabled={!canSet}
          onClick={() => open(dialogKey)}
          aria-label={`${t(label)} ${t("edit")}`}
        >
          {dialogKey === "title" || dialogKey === "r2Domain" ? "✎" : "⚙"}
        </button>
      </div>
    </div>
  );
  const card = (title: string, content: React.ReactNode) => (
    <section
      className="system-card"
      key={title}
      id="system-panel"
      role="tabpanel"
      aria-labelledby={`system-tab-${section}`}
    >
      <h2>{t(title)}</h2>
      <div>{content}</div>
    </section>
  );
  const status = (key: string) => (active(key) ? t("enabled") : t("disabled"));
  const select = (
    key: string,
    label: string,
    options: { value: string | number; label: string }[],
    hint?: string,
  ) => (
    <div className="system-item" key={key}>
      <span>
        {t(label)} {hint && <small title={t(hint)}>ⓘ</small>}
      </span>
      <select
        aria-label={t(label)}
        disabled={!canSet || saving}
        value={data[key] ?? options[0].value}
        onChange={(e) => savePatch({ [key]: Number(e.target.value) })}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
  const field = (
    label: string,
    key: string,
    type: "text" | "number" = "text",
    props: Record<string, unknown> = {},
  ) => (
    <label className="system-field" key={key}>
      <span>{t(label)}</span>
      <input
        type={type}
        value={draft[key] ?? ""}
        onChange={(e) => update(key, e.target.value)}
        {...props}
      />
    </label>
  );
  const unitField = (
    label: string,
    key: string,
    unit: string,
    min: number,
    max?: number,
  ) => (
    <label className="system-field" key={key}>
      <span>{t(label)}</span>
      <span className="system-unit-field">
        <input
          type="number"
          min={min}
          max={max}
          value={draft[key] ?? ""}
          onChange={(e) => update(key, e.target.value)}
        />
        <span>{unit}</span>
      </span>
    </label>
  );
  const choice = (
    label: string,
    key: string,
    options: { value: string | number; label: string }[],
  ) => (
    <label className="system-field" key={key}>
      <span>{t(label)}</span>
      <select
        value={draft[key] ?? options[0].value}
        onChange={(e) =>
          update(
            key,
            typeof options[0].value === "number"
              ? Number(e.target.value)
              : e.target.value,
          )
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
  const tags = (
    label: string,
    key: string,
    kind: TagKind = "any",
    placeholder = "",
  ) => (
    <label className="system-field" key={key}>
      <span>{t(label)}</span>
      <TagField
        value={splitTags(draft[key])}
        kind={kind}
        placeholder={placeholder && t(placeholder)}
        onChange={(value) => update(key, value)}
      />
    </label>
  );
  const dialogSwitch = (key: string) => (
    <div className="system-dialog-switch">
      <Switch
        label={t("enable")}
        checked={num(draft[key], 1) === 0}
        disabled={saving}
        onChange={() => update(key, num(draft[key], 1) === 0 ? 1 : 0)}
      />
      <span>{num(draft[key], 1) === 0 ? t("enable") : t("disable")}</span>
    </div>
  );
  const changeOpacity = (next: string) => {
    setOpacity(next);
    if (opacityTimer.current) window.clearTimeout(opacityTimer.current);
    const amount = Number(next);
    if (next !== "" && Number.isFinite(amount) && amount >= 0 && amount <= 1)
      opacityTimer.current = window.setTimeout(() => {
        void savePatch({ loginOpacity: amount });
      }, 1000);
  };

  const saveDialog = async () => {
    if (!dialog || dialog === "resendList") return;
    if (dialog === "background") {
      const image = String(draft.background || "");
      if (
        image &&
        !image.startsWith("http") &&
        !image.startsWith("data:image/")
      ) {
        notify(t("imageLinkErrorMsg"));
        return;
      }
      await commit(() => settings.background(image));
      return;
    }
    if (dialog === "blackList") {
      await commit(() =>
        settings.blacklist({
          blackFrom: splitTags(draft.blackFrom).join(","),
          blackSubject: splitTags(draft.blackSubject).join(","),
          blackContent: splitTags(draft.blackContent).join(","),
        }),
      );
      return;
    }
    const patch: Draft = {};
    switch (dialog) {
      case "title":
        patch.title = draft.title;
        break;
      case "emailPrefix":
        patch.minEmailPrefix = Math.min(
          20,
          Math.max(1, num(draft.minEmailPrefix, 1)),
        );
        patch.emailPrefixFilter = splitTags(draft.emailPrefixFilter);
        break;
      case "r2Domain":
        patch.r2Domain = draft.r2Domain || "";
        break;
      case "resendToken": {
        const domain = String(draft.resendDomain || "").replace(/^@/, "");
        if (!domain) return;
        patch.resendTokens = { [domain]: String(draft.resendToken || "") };
        break;
      }
      case "autoClean":
        patch.autoCleanDays = Math.min(
          3650,
          Math.max(0, num(draft.autoCleanDays)),
        );
        patch.autoCleanExclude = splitTags(draft.autoCleanExclude).join(",");
        break;
      case "aiCodeFilter":
        patch.aiCodeFilter = splitTags(draft.aiCodeFilter).join(",");
        break;
      case "tgBot":
        Object.assign(patch, {
          customDomain: draft.customDomain || "",
          tgBotStatus: num(draft.tgBotStatus, 1),
          tgChatId: splitTags(draft.tgChatId).join(","),
          tgMsgFrom: draft.tgMsgFrom,
          tgMsgTo: draft.tgMsgTo,
          tgMsgText: draft.tgMsgText,
        });
        if (draft.tgBotToken) patch.tgBotToken = draft.tgBotToken;
        break;
      case "otherEmail":
        Object.assign(patch, {
          forwardStatus: num(draft.forwardStatus, 1),
          forwardEmail: splitTags(draft.forwardEmail).join(","),
        });
        break;
      case "webhook": {
        const url = toOssDomain(String(draft.webhookUrl || "").trim());
        if (isIpUrl(url)) {
          notify(t("webhookIpNotSupported"));
          return;
        }
        Object.assign(patch, {
          webhookStatus: num(draft.webhookStatus, 1),
          webhookUrl: url,
          webhookRetry: Math.min(5, Math.max(0, num(draft.webhookRetry))),
          webhookSecret: String(draft.webhookSecret || "").trim(),
        });
        break;
      }
      case "forwardingRules":
        Object.assign(patch, {
          ruleType: num(draft.ruleType),
          ruleEmail: splitTags(draft.ruleEmail).join(","),
        });
        break;
      case "s3":
        Object.assign(patch, {
          bucket: draft.bucket || "",
          endpoint: draft.endpoint || "",
          region: draft.region || "",
          forcePathStyle: num(draft.forcePathStyle, 1),
        });
        if (draft.s3AccessKey) patch.s3AccessKey = draft.s3AccessKey;
        if (draft.s3SecretKey) patch.s3SecretKey = draft.s3SecretKey;
        break;
      case "turnstile":
        Object.assign(patch, {
          siteKey: draft.siteKey || "",
          secretKey: draft.secretKey || "",
        });
        break;
      case "regVerifyCount":
        patch.regVerifyCount = Math.max(1, num(draft.regVerifyCount, 1));
        break;
      case "addVerifyCount":
        patch.addVerifyCount = Math.max(1, num(draft.addVerifyCount, 1));
        break;
      case "notice":
        Object.assign(patch, {
          notice: num(draft.notice, 1),
          noticeTitle: draft.noticeTitle || "",
          noticeContent: draft.noticeContent || "",
          noticeType: draft.noticeType || "none",
          noticePosition: draft.noticePosition || "top-right",
          noticeWidth: num(draft.noticeWidth),
          noticeOffset: num(draft.noticeOffset),
          noticeDuration: num(draft.noticeDuration),
        });
        break;
      default: {
        if (!dialog.startsWith("oauth:")) return;
        const platform = dialog.slice(6);
        patch[platform + "ClientId"] = draft[platform + "ClientId"] || "";
        patch[platform + "ClientSecret"] =
          draft[platform + "ClientSecret"] || "";
        patch[platform + "Switch"] = num(draft[platform + "Switch"], 1);
      }
    }
    await savePatch(patch);
  };

  const dialogTitle = dialog?.startsWith("oauth:")
    ? `${t("oauthSetting")} - ${dialog.slice(6) === "linuxdo" ? "LinuxDo" : dialog.slice(6) === "github" ? "GitHub" : "Google"}`
    : dialog === "title"
      ? t("changeTitle")
      : dialog === "emailPrefix"
        ? t("emailPrefix")
        : dialog === "background"
          ? t("backgroundTitle")
          : dialog === "r2Domain"
            ? t("addOsDomain")
            : dialog === "resendToken"
              ? t("resendToken")
              : dialog === "resendList"
                ? t("resendTokenList")
                : dialog === "blackList"
                  ? t("blackList")
                  : dialog === "autoClean"
                    ? t("autoClean")
                    : dialog === "aiCodeFilter"
                      ? t("codeRecognitionRules")
                      : dialog === "tgBot"
                        ? t("tgBot")
                        : dialog === "otherEmail"
                          ? t("otherEmail")
                          : dialog === "webhook"
                            ? t("webhook")
                            : dialog === "forwardingRules"
                              ? t("forwardingRules")
                              : dialog === "s3"
                                ? t("s3Configuration")
                                : dialog === "turnstile"
                                  ? t("addTurnstileSecret")
                                  : dialog === "regVerifyCount" ||
                                      dialog === "addVerifyCount"
                                    ? t("rulesVerifyTitle", {
                                        count: draft[dialog],
                                      })
                                    : dialog === "notice"
                                      ? t("noticePopup")
                                      : "";

  if (query.isLoading)
    return (
      <div className="settings-page">
        <Skeleton />
      </div>
    );
  if (query.isError)
    return (
      <div className="settings-page">
        <ErrorState error={query.error} retry={() => query.refetch()} />
      </div>
    );
  return (
    <div className="settings-page system-legacy" ref={pageRef}>
      <div className="settings-header system-tabs">
        <h1>{t("SystemSettings")}</h1>
        <nav role="tablist" aria-label={t("SystemSettings")}>
          {systemTabs.map((tab) => (
            <button
              type="button"
              role="tab"
              id={`system-tab-${tab.id}`}
              aria-selected={section === tab.id}
              aria-controls="system-panel"
              className={section === tab.id ? "active" : ""}
              key={tab.id}
              onClick={() => {
                setSection(tab.id);
                pageRef.current?.scrollTo({ top: 0 });
              }}
            >
              {t(tab.label)}
            </button>
          ))}
        </nav>
      </div>
      {section === "websiteSetting" &&
        card(
          "websiteSetting",
          <>
            {switchRow("websiteReg", "register")}
            {switchRow("loginDomain", "loginDomain", 1)}
            {select("regKey", "regKey", [
              { value: 0, label: t("enable") },
              { value: 1, label: t("disable") },
              { value: 2, label: t("optional") },
            ])}
            {switchRow("addAccount", "addEmail")}
            {switchRow("multipleEmail", "manyEmail", 0, "multipleEmailDesc")}
            {switchRow("syncDelete", "syncDelete", 0, "syncDeleteDesc")}
            {actionRow("emailPrefix", "emailPrefix")}
          </>,
        )}

      {section === "customization" &&
        card(
          "customization",
          <>
            {actionRow("websiteTitle", "title", String(data.title || ""))}
            <div className="system-item">
              <span>{t("loginBoxOpacity")}</span>
              <input
                className="system-number"
                aria-label={t("loginBoxOpacity")}
                disabled={!canSet || saving}
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={opacity}
                onChange={(e) => changeOpacity(e.target.value)}
              />
            </div>
            <div className="system-item system-background-row">
              <span>{t("loginBackground")}</span>
              <div className="system-item-action">
                {data.background ? (
                  <button
                    className="system-background-thumbnail"
                    type="button"
                    onClick={() =>
                      setBackgroundPreview(r2url(data.background, data))
                    }
                    aria-label={`${t("loginBackground")} ${t("preview")}`}
                  >
                    <img
                      src={r2url(data.background, data)}
                      alt={t("loginBackground")}
                    />
                  </button>
                ) : (
                  <span>—</span>
                )}
                <button
                  type="button"
                  disabled={!canSet}
                  onClick={() => open("background")}
                  aria-label={`${t("loginBackground")} ${t("edit")}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  disabled={!canSet || !data.background || saving}
                  onClick={() => {
                    if (confirm(t("delBackgroundConfirm")))
                      void commit(() => settings.deleteBackground());
                  }}
                  aria-label={`${t("loginBackground")} ${t("delete")}`}
                >
                  ×
                </button>
              </div>
            </div>
          </>,
        )}

      {section === "emailSetting" &&
        card(
          "emailSetting",
          <>
            {switchRow("receiveEmail", "receive")}
            {select(
              "autoRefresh",
              "autoRefresh",
              [0, 3, 5, 10, 15, 20].map((value) => ({
                value,
                label: value ? `${value}s` : t("disable"),
              })),
              "autoRefreshDesc",
            )}
            {switchRow("sendEmail", "send")}
            {switchRow("noRecipientTitle", "noRecipient", 0, "noRecipientDesc")}
            <div className="system-item">
              <span>
                {data.hasCfEmail
                  ? t("cloudflareEmailSending")
                  : t("resendToken")}
              </span>
              {data.hasCfEmail ? (
                <span>{t("enabled")}</span>
              ) : (
                <div className="system-item-action">
                  <button
                    type="button"
                    onClick={() => open("resendList")}
                    aria-label={t("resendTokenList")}
                  >
                    ☷
                  </button>
                  <button
                    type="button"
                    disabled={!canSet}
                    onClick={() => open("resendToken")}
                    aria-label={t("resendToken")}
                  >
                    ＋
                  </button>
                </div>
              )}
            </div>
            {actionRow("blackList", "blackList")}
            {actionRow(
              "autoClean",
              "autoClean",
              num(data.autoCleanDays) > 0
                ? t("autoCleanRetain", { days: data.autoCleanDays })
                : t("disabled"),
              "autoCleanDesc",
            )}
          </>,
        )}

      {section === "emailPush" &&
        card(
          "emailPush",
          <>
            {actionRow("tgBot", "tgBot", status("tgBotStatus"), "tgBotDesc")}
            {actionRow(
              "otherEmail",
              "otherEmail",
              status("forwardStatus"),
              "otherEmailDesc",
            )}
            {actionRow(
              "webhook",
              "webhook",
              status("webhookStatus"),
              "webhookDesc",
            )}
            {actionRow(
              "forwardingRules",
              "forwardingRules",
              num(data.ruleType) === 0 ? t("forwardAll") : t("rules"),
              "forwardingRulesDesc",
            )}
          </>,
        )}

      {section === "oss" &&
        card(
          "oss",
          <>
            {actionRow(
              "osDomain",
              "r2Domain",
              String(data.r2Domain || ""),
              "ossDomainDesc",
            )}
            {actionRow("s3Configuration", "s3")}
            <div className="system-item">
              <span>{t("storageType")}</span>
              <span>{String(data.storageType || "—")}</span>
            </div>
          </>,
        )}

      {section === "turnstileSetting" &&
        card(
          "turnstileSetting",
          <>
            <div className="system-item">
              <span>{t("signUpVerification")}</span>
              <div className="system-item-action">
                <button
                  type="button"
                  disabled={!canSet}
                  onClick={() => open("regVerifyCount")}
                  aria-label={t("rulesVerifyTitle", {
                    count: data.regVerifyCount,
                  })}
                >
                  ⚙
                </button>
                <select
                  aria-label={t("signUpVerification")}
                  disabled={!canSet || saving}
                  value={data.registerVerify ?? 1}
                  onChange={(e) =>
                    savePatch({ registerVerify: Number(e.target.value) })
                  }
                >
                  <option value="0">{t("enable")}</option>
                  <option value="1">{t("disable")}</option>
                  <option value="2">{t("rulesVerify")}</option>
                </select>
              </div>
            </div>
            <div className="system-item">
              <span>{t("addEmailVerification")}</span>
              <div className="system-item-action">
                <button
                  type="button"
                  disabled={!canSet}
                  onClick={() => open("addVerifyCount")}
                  aria-label={t("rulesVerifyTitle", {
                    count: data.addVerifyCount,
                  })}
                >
                  ⚙
                </button>
                <select
                  aria-label={t("addEmailVerification")}
                  disabled={!canSet || saving}
                  value={data.addEmailVerify ?? 1}
                  onChange={(e) =>
                    savePatch({ addEmailVerify: Number(e.target.value) })
                  }
                >
                  <option value="0">{t("enable")}</option>
                  <option value="1">{t("disable")}</option>
                  <option value="2">{t("rulesVerify")}</option>
                </select>
              </div>
            </div>
            <div className="system-item">
              <span>Site Key</span>
              <div className="system-item-action">
                <span>{String(data.siteKey || "")}</span>
                <button
                  type="button"
                  disabled={!canSet}
                  onClick={() => open("turnstile")}
                  aria-label="Edit Site Key"
                >
                  ✎
                </button>
              </div>
            </div>
            <div className="system-item">
              <span>Secret Key</span>
              <div className="system-item-action">
                <span>{String(data.secretKey || "")}</span>
                <button
                  type="button"
                  disabled={!canSet}
                  onClick={() => open("turnstile")}
                  aria-label="Edit Secret Key"
                >
                  ✎
                </button>
              </div>
            </div>
          </>,
        )}

      {section === "noticeTitle" &&
        card(
          "noticeTitle",
          <>
            {actionRow("noticePopup", "notice", status("notice"))}
            <div className="system-item">
              <span>{t("popUp")}</span>
              <button
                type="button"
                onClick={() => setNoticePreview({ ...data, notice: 0 })}
                aria-label={t("popUp")}
              >
                ◉
              </button>
            </div>
          </>,
        )}

      {section === "workersAi" &&
        card(
          "Workers AI",
          <>
            {switchRow("codeRecognition", "aiCode")}
            {actionRow(
              "codeRecognitionRules",
              "aiCodeFilter",
              undefined,
              "codeRecognitionRulesDesc",
            )}
          </>,
        )}

      {section === "oauthLogin" &&
        card(
          "oauthLogin",
          <>
            {(["google", "github", "linuxdo"] as const).map((platform) =>
              actionRow(
                platform === "linuxdo"
                  ? "LinuxDo"
                  : platform === "github"
                    ? "GitHub"
                    : "Google",
                `oauth:${platform}`,
                status(platform + "Switch"),
              ),
            )}
          </>,
        )}

      {section === "about" &&
        card(
          "about",
          <>
            <div className="system-item">
              <span>{t("version")}</span>
              <a
                href="https://github.com/maillab/cloud-mail/releases"
                target="_blank"
                rel="noreferrer"
              >
                v3.3.0{hasUpdate && <span className="system-update-dot" />}
              </a>
            </div>
            <div className="system-item">
              <span>{t("community")}</span>
              <div className="system-item-action">
                <a
                  href="https://github.com/maillab/cloud-mail"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
                <a
                  href="https://t.me/cloud_mail_tg"
                  target="_blank"
                  rel="noreferrer"
                >
                  Telegram
                </a>
              </div>
            </div>
            <div className="system-item">
              <span>{t("support")}</span>
              <a
                href="https://doc.skymail.ink/support.html"
                target="_blank"
                rel="noreferrer"
              >
                {t("supportDesc")}
              </a>
            </div>
            <div className="system-item">
              <span>{t("help")}</span>
              <a
                href="https://doc.skymail.ink"
                target="_blank"
                rel="noreferrer"
              >
                {t("document")}
              </a>
            </div>
          </>,
        )}

      {dialog && (
        <div className="modal-backdrop">
          <form
            className="system-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDialog();
            }}
          >
            <div className="system-dialog-header">
              <h2>
                {dialogTitle}{" "}
                {dialog === "background" && (
                  <small title={t("backgroundWarning")}>ⓘ</small>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setDialog(null)}
                aria-label={t("close")}
              >
                ×
              </button>
            </div>
            <div className="system-dialog-body">
              {dialog === "title" && field("websiteTitle", "title")}
              {dialog === "emailPrefix" && (
                <>
                  {unitField(
                    "atLeast",
                    "minEmailPrefix",
                    t("character"),
                    1,
                    20,
                  )}
                  {tags("mustNotContain", "emailPrefixFilter")}
                </>
              )}
              {dialog === "background" && (
                <>
                  <div className="system-segmented">
                    <button
                      type="button"
                      className={backgroundMode === "url" ? "active" : ""}
                      onClick={() => {
                        setBackgroundMode("url");
                        update(
                          "background",
                          data.background?.startsWith("http")
                            ? data.background
                            : "",
                        );
                      }}
                    >
                      {t("imageLink")}
                    </button>
                    <button
                      type="button"
                      className={backgroundMode === "upload" ? "active" : ""}
                      onClick={() => {
                        setBackgroundMode("upload");
                        update("background", "");
                      }}
                    >
                      {t("localUpload")}
                    </button>
                  </div>
                  {backgroundMode === "url" ? (
                    field("backgroundUrlDesc", "background", "text", {
                      placeholder: t("backgroundUrlDesc"),
                    })
                  ) : (
                    <label className="system-field">
                      <span>{t("localUpload")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () =>
                            update("background", String(reader.result));
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                  {draft.background && (
                    <button
                      className="system-background-preview-button"
                      type="button"
                      onClick={() =>
                        setBackgroundPreview(String(draft.background))
                      }
                      aria-label={`${t("loginBackground")} ${t("preview")}`}
                    >
                      <img
                        className="system-background-preview"
                        src={
                          String(draft.background).startsWith("http") ||
                          String(draft.background).startsWith("data:")
                            ? draft.background
                            : r2url(draft.background, data)
                        }
                        alt={t("loginBackground")}
                      />
                    </button>
                  )}
                </>
              )}
              {dialog === "r2Domain" && field("domainDesc", "r2Domain")}
              {dialog === "resendToken" && (
                <>
                  {choice(
                    "selectDomain",
                    "resendDomain",
                    (data.domainList || []).map((domain: string) => ({
                      value: domain,
                      label: domain,
                    })),
                  )}
                  {field("resendToken", "resendToken", "text", {
                    placeholder: t("addResendTokenDesc"),
                  })}
                </>
              )}
              {dialog === "resendList" && (
                <div className="system-token-list">
                  <div>
                    <strong>{t("domain")}</strong>
                    <strong>Token</strong>
                  </div>
                  {Object.entries(data.resendTokens || {}).map(
                    ([domain, token]) => (
                      <div key={domain}>
                        <span>{domain}</span>
                        <span>{String(token)}</span>
                      </div>
                    ),
                  )}
                </div>
              )}
              {dialog === "blackList" && (
                <>
                  {tags("blackFromDesc", "blackFrom", "emailOrDomain")}
                  {tags("blackSubjectDesc", "blackSubject")}
                  {tags("blackContentDesc", "blackContent")}
                </>
              )}
              {dialog === "autoClean" && (
                <>
                  {field("autoCleanDays", "autoCleanDays", "number", {
                    min: 0,
                    max: 3650,
                  })}
                  {tags(
                    "autoCleanExclude",
                    "autoCleanExclude",
                    "email",
                    "autoCleanExcludeDesc",
                  )}
                </>
              )}
              {dialog === "aiCodeFilter" &&
                tags("senderRules", "aiCodeFilter", "emailOrDomain")}
              {dialog === "tgBot" && (
                <>
                  {field("tgBotToken", "tgBotToken", "text", {
                    placeholder: data.tgBotToken || t("tgBotToken"),
                  })}
                  {tags("toBotTokenDesc", "tgChatId", "number")}
                  {field("customDomainDesc", "customDomain")}
                  {choice("from", "tgMsgFrom", [
                    { value: "show", label: t("show") },
                    { value: "hide", label: t("hide") },
                    { value: "only-name", label: t("onlyName") },
                  ])}
                  {choice("recipient", "tgMsgTo", [
                    { value: "show", label: t("show") },
                    { value: "hide", label: t("hide") },
                  ])}
                  {choice("emailText", "tgMsgText", [
                    { value: "show", label: t("show") },
                    { value: "hide", label: t("hide") },
                  ])}
                </>
              )}
              {dialog === "otherEmail" &&
                tags("otherEmailInputDesc", "forwardEmail", "email")}
              {dialog === "webhook" && (
                <>
                  {field("webhookUrl", "webhookUrl")}
                  {field("webhookSecret", "webhookSecret")}
                  {field("webhookRetry", "webhookRetry", "number", {
                    min: 0,
                    max: 5,
                  })}
                  <button
                    type="button"
                    className="system-format-toggle"
                    onClick={() => setWebhookFormat(!webhookFormat)}
                  >
                    {t("webhookFormat")} ▾
                  </button>
                  {webhookFormat && (
                    <pre>{`Content-Type: application/json\nAuthorization: <secret>\n\n{\n  "emailId": 1,\n  "sendEmail": "hello@example.com",\n  "sendName": "hello",\n  "toEmail": "admin@example.com",\n  "toName": "admin",\n  "subject": "Hello",\n  "text": "Hello",\n  "content": "<div>Hello</div>",\n  "code": "123456",\n  "createTime": "2099-12-30 23:59:59"\n}`}</pre>
                  )}
                </>
              )}
              {dialog === "forwardingRules" && (
                <>
                  {tags("ruleEmailsInputDesc", "ruleEmail", "email")}
                  <div className="system-radio-group">
                    <label>
                      <input
                        type="radio"
                        checked={num(draft.ruleType) === 0}
                        onChange={() => update("ruleType", 0)}
                      />
                      {t("forwardAll")}
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={num(draft.ruleType) === 1}
                        onChange={() => update("ruleType", 1)}
                      />
                      {t("rules")}
                    </label>
                  </div>
                </>
              )}
              {dialog === "s3" && (
                <>
                  {[
                    "bucket",
                    "endpoint",
                    "region",
                    "s3AccessKey",
                    "s3SecretKey",
                  ].map((key) =>
                    field(
                      key === "bucket"
                        ? "Bucket"
                        : key === "endpoint"
                          ? "Endpoint"
                          : key === "region"
                            ? "Region"
                            : key === "s3AccessKey"
                              ? "Access Key"
                              : "Secret Key",
                      key,
                      "text",
                      {
                        placeholder:
                          key === "s3AccessKey"
                            ? data.s3AccessKey || "Access Key"
                            : key === "s3SecretKey"
                              ? data.s3SecretKey || "Secret Key"
                              : undefined,
                      },
                    ),
                  )}
                  <div className="system-item">
                    <span title={t("forcePathStyleDesc")}>
                      ForcePathStyle ⓘ
                    </span>
                    {dialogSwitch("forcePathStyle")}
                  </div>
                </>
              )}
              {dialog === "turnstile" && (
                <>
                  {field("Site Key", "siteKey")}
                  {field("Secret Key", "secretKey")}
                </>
              )}
              {dialog === "regVerifyCount" && (
                <input
                  aria-label={t("rulesVerifyTitle", {
                    count: draft.regVerifyCount,
                  })}
                  type="number"
                  min="1"
                  value={draft.regVerifyCount ?? 1}
                  onChange={(e) => update("regVerifyCount", e.target.value)}
                />
              )}
              {dialog === "addVerifyCount" && (
                <input
                  aria-label={t("rulesVerifyTitle", {
                    count: draft.addVerifyCount,
                  })}
                  type="number"
                  min="1"
                  value={draft.addVerifyCount ?? 1}
                  onChange={(e) => update("addVerifyCount", e.target.value)}
                />
              )}
              {dialog === "notice" && (
                <>
                  {field("titleDesc", "noticeTitle")}
                  {choice(
                    "icon",
                    "noticeType",
                    ["none", "primary", "success", "warning", "info"].map(
                      (value) => ({
                        value,
                        label: value[0].toUpperCase() + value.slice(1),
                      }),
                    ),
                  )}
                  {choice("position", "noticePosition", [
                    { value: "top-left", label: t("topLeft") },
                    { value: "top-right", label: t("topRight") },
                    { value: "bottom-left", label: t("bottomLeft") },
                    { value: "bottom-right", label: t("bottomRight") },
                  ])}
                  {unitField("width", "noticeWidth", "px", 0)}
                  {unitField("offset", "noticeOffset", "px", 0)}
                  {unitField("duration", "noticeDuration", "ms", 0)}
                  <label className="system-field">
                    <span>{t("noticeContentDesc")}</span>
                    <textarea
                      rows={10}
                      value={draft.noticeContent ?? ""}
                      onChange={(e) => update("noticeContent", e.target.value)}
                    />
                  </label>
                </>
              )}
              {dialog?.startsWith("oauth:") && (
                <>
                  {field("clientId", `${dialog.slice(6)}ClientId`)}
                  {field("clientSecret", `${dialog.slice(6)}ClientSecret`)}
                </>
              )}
            </div>
            <div className="system-dialog-footer">
              {dialog === "s3" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void savePatch({
                      bucket: "",
                      endpoint: "",
                      region: "",
                      s3AccessKey: "",
                      s3SecretKey: "",
                      forcePathStyle: 1,
                    })
                  }
                >
                  {t("clear")}
                </button>
              )}
              {dialog === "notice" && (
                <button
                  type="button"
                  onClick={() => setNoticePreview({ ...draft, notice: 0 })}
                >
                  {t("preview")}
                </button>
              )}
              {(dialog === "notice" ||
                dialog === "tgBot" ||
                dialog === "otherEmail" ||
                dialog === "webhook" ||
                dialog?.startsWith("oauth:")) &&
                dialogSwitch(
                  dialog === "notice"
                    ? "notice"
                    : dialog === "tgBot"
                      ? "tgBotStatus"
                      : dialog === "otherEmail"
                        ? "forwardStatus"
                        : dialog === "webhook"
                          ? "webhookStatus"
                          : `${dialog.slice(6)}Switch`,
                )}
              <button type="button" onClick={() => setDialog(null)}>
                {dialog === "resendList" ? t("close") : t("cancel")}
              </button>
              {dialog !== "resendList" && (
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving || !canSet}
                >
                  {saving ? t("loading") : t("save")}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {noticePreview && (
        <div
          className={`site-notice ${noticePreview.noticeType || ""}`}
          style={{
            width: Math.min(
              num(noticePreview.noticeWidth, 400),
              window.innerWidth - 30,
            ),
            ...(String(noticePreview.noticePosition || "top-right").includes(
              "bottom",
            )
              ? { bottom: num(noticePreview.noticeOffset) }
              : { top: num(noticePreview.noticeOffset) }),
            ...(String(noticePreview.noticePosition || "top-right").includes(
              "left",
            )
              ? { left: 16, right: "auto" }
              : { right: 16, left: "auto" }),
          }}
        >
          <button
            className="notice-close"
            onClick={() => setNoticePreview(null)}
            aria-label={t("close")}
          >
            ×
          </button>
          <strong>{noticePreview.noticeTitle}</strong>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(noticePreview.noticeContent || ""),
            }}
          />
        </div>
      )}
      {backgroundPreview && (
        <div
          className="modal-backdrop system-image-preview"
          onClick={() => setBackgroundPreview(null)}
        >
          <button
            type="button"
            onClick={() => setBackgroundPreview(null)}
            aria-label={t("close")}
          >
            ×
          </button>
          <img
            src={backgroundPreview}
            alt={t("loginBackground")}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
