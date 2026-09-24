import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { auth } from "../api/auth";
import { ApiError } from "../api/client";
import { useApp } from "../stores/app";
import { r2url } from "../utils/mail";
declare global {
  interface Window {
    turnstile?: {
      render: (selector: string, options?: Record<string, unknown>) => string;
      reset: (id: string) => void;
    };
  }
}
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notify = useApp((s) => s.notify);
  const setUser = useApp((s) => s.setUser);
  const setAccount = useApp((s) => s.setAccount);
  const [mode, setMode] = useState<"login" | "register" | "bind">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthUserId, setOauthUserId] = useState("");
  const [token, setToken] = useState("");
  const [suffix, setSuffix] = useState("");
  const [forcedVerify, setForcedVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const config = useQuery({ queryKey: ["config"], queryFn: auth.config });
  const settings = config.data || {};
  const domains = settings.domainList || [];
  const fullEmail =
    settings.loginDomain === 1 ? email : email + (suffix || domains[0] || "");
  const verifyRequired =
    mode === "register" &&
    (settings.registerVerify === 0 ||
      (settings.registerVerify === 2 && settings.regVerifyOpen) ||
      forcedVerify);
  useEffect(() => {
    if (domains.length && !domains.includes(suffix)) setSuffix(domains[0]);
    document.title = settings.title ?? "Virevan Mail";
  }, [settings.title, domains.join(",")]);
  const finish = async (value: string) => {
    localStorage.setItem("token", value);
    const user = await auth.user();
    setUser(user);
    setAccount(user.account);
    qc.setQueryData(["me"], user);
    sessionStorage.setItem("showLoginNotice", "1");
    qc.invalidateQueries({ queryKey: ["config"] });
    navigate("/inbox", { replace: true });
  };
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthCode = params.get("code");
    const provider =
      params.get("state") || sessionStorage.getItem("oauthProvider");
    if (!oauthCode || !["linuxdo", "github", "google"].includes(provider || ""))
      return;
    history.replaceState({}, "", location.pathname);
    sessionStorage.removeItem("oauthProvider");
    setBusy(true);
    auth
      .oauth(
        provider === "linuxdo" ? "linuxDo" : (provider as "github" | "google"),
        oauthCode,
        location.origin + "/login",
      )
      .then((data) => {
        if (data.token) return finish(data.token);
        setOauthUserId(data.userInfo?.oauthUserId || "");
        setMode("bind");
      })
      .catch((e) => notify(String(e)))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    if (!settings.siteKey || !verifyRequired) return;
    let id: string | undefined;
    let active = true;
    const render = () => {
      if (!active || !window.turnstile || !document.querySelector("#turnstile"))
        return;
      id = window.turnstile.render("#turnstile", {
        sitekey: settings.siteKey,
        callback: (value: string) => setToken(value),
      });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>(
        'script[data-turnstile="true"]',
      );
      if (!script) {
        script = document.createElement("script");
        script.dataset.turnstile = "true";
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render, { once: true });
    }
    return () => {
      active = false;
      if (id) window.turnstile?.reset(id);
    };
  }, [verifyRequired, settings.siteKey]);
  const oauth = (provider: "linuxdo" | "github" | "google") => {
    const clientId = settings[provider + "ClientId"];
    const redirectUri = encodeURIComponent(location.origin + "/login");
    sessionStorage.setItem("oauthProvider", provider);
    const urls = {
      linuxdo: `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${provider}`,
      github: `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${provider}`,
      google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${provider}`,
    };
    location.assign(urls[provider]);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = fullEmail.split("@")[0];
    if (
      mode !== "login" &&
      prefix.length < Number(settings.minEmailPrefix || 0)
    ) {
      notify(t("minEmailPrefix", { msg: settings.minEmailPrefix }));
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fullEmail)) {
      notify(t("notEmailMsg"));
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      notify(t("confirmPwdFailMsg"));
      return;
    }
    if (verifyRequired && !token) {
      notify(t("botVerifyMsg"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const data = await auth.login(fullEmail, password);
        await finish(data.token);
      } else if (mode === "register") {
        await auth.register({ email: fullEmail, password, code, token });
        qc.invalidateQueries({ queryKey: ["config"] });
        setToken("");
        setForcedVerify(false);
        setMode("login");
        notify(t("regSuccessMsg"));
      } else {
        const data: any = await auth.bind({
          email: fullEmail,
          oauthUserId,
          code,
        });
        if (data?.token) await finish(data.token);
        else notify(t("success"));
      }
    } catch (e) {
      if (mode === "register" && e instanceof ApiError && e.code === 400) {
        setToken("");
        setForcedVerify(true);
      }
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={`login-page${settings.background ? " has-background" : ""}`}
      style={
        {
          ...(settings.background
            ? {
                backgroundImage: `url("${r2url(settings.background, settings)}")`,
              }
            : {}),
          "--login-opacity": `${Math.max(0, Math.min(1, Number(settings.loginOpacity ?? 0.88))) * 100}%`,
        } as React.CSSProperties
      }
    >
      <div className="login-intro">
        <div className="login-mark">
          <Mail size={32} />
        </div>
        <h1>{settings.title ?? "Virevan Mail"}</h1>
        <p>{t("loginTitle")}</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <h2>
          {mode === "login"
            ? t("loginBtn")
            : mode === "register"
              ? t("regBtn")
              : t("registration")}
        </h2>
        <label>
          {t("emailAccount")}
          <span className="address-input">
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder={
                settings.loginDomain === 1 ? "name@example.com" : "name"
              }
            />
            {settings.loginDomain !== 1 && domains.length > 0 && (
              <select
                aria-label={t("selectDomain")}
                value={suffix || domains[0]}
                onChange={(e) => setSuffix(e.target.value)}
              >
                {domains.map((domain: string) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            )}
          </span>
        </label>
        {mode !== "bind" && (
          <label>
            {t("password")}
            <input
              type="password"
              required
              minLength={mode === "register" ? 6 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>
        )}
        {mode === "register" && (
          <label>
            {t("confirmPwd")}
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        )}
        {mode !== "login" && settings.regKey !== 1 && (
          <label>
            {t("regKey")}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required={settings.regKey === 0}
            />
          </label>
        )}
        {verifyRequired && settings.siteKey && <div id="turnstile" />}
        <button className="primary-button" disabled={busy}>
          {busy
            ? t("loading")
            : mode === "login"
              ? t("loginBtn")
              : mode === "register"
                ? t("regBtn")
                : t("save")}
        </button>
        {(settings.register === 0 || mode !== "login") && (
          <button
            type="button"
            className="text-button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? t("regSwitch") : t("loginSwitch")}
          </button>
        )}
        {(["google", "github", "linuxdo"] as const)
          .filter((p) => settings[p + "Switch"] === 0)
          .map((p) => (
            <button
              className="oauth-button"
              type="button"
              key={p}
              onClick={() => oauth(p)}
            >
              {p === "linuxdo"
                ? "LinuxDo"
                : p === "github"
                  ? "GitHub"
                  : "Google"}
            </button>
          ))}
      </form>
      {settings.projectLink && (
        <a
          className="project-link"
          href="https://github.com/maillab/cloud-mail"
          target="_blank"
          rel="noreferrer"
        >
          {t("projectLink")}
        </a>
      )}
    </div>
  );
}
