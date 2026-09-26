import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink, Github, Mail } from "lucide-react";
import { auth } from "../api/auth";
import { ApiError } from "../api/client";
import { useApp } from "../stores/app";
import { r2url } from "../utils/mail";
import { ErrorState, Skeleton } from "../components/Feedback";
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
  // The Vue bootstrap waits for websiteConfig before exposing the login form.
  // Without it, the domain suffix and registration policy cannot be trusted.
  if (config.isPending)
    return (
      <div className="login-page">
        <Skeleton />
      </div>
    );
  if (config.isError)
    return (
      <div className="login-page">
        <ErrorState error={config.error} retry={() => config.refetch()} />
      </div>
    );
  const enabledProviders = (
    [
      { name: "google", enabled: settings.googleSwitch === 0 },
      { name: "github", enabled: settings.githubSwitch === 0 },
      { name: "linuxdo", enabled: settings.linuxdoSwitch === 0 },
    ] as const
  ).filter((provider) => provider.enabled);
  return (
    <div
      className="login-page"
      style={
        {
          "--login-opacity": `${Math.max(0, Math.min(1, Number(settings.loginOpacity ?? 0.88))) * 100}%`,
        } as React.CSSProperties
      }
    >
      <div className="login-brand" aria-hidden="true">
        <div className="login-mark">
          <Mail size={27} />
        </div>
      </div>
      <main className="login-content">
        <div className="login-intro">
          <h1>{settings.title ?? "Virevan Mail"}</h1>
          <p>{t(mode === "register" ? "regTitle" : "loginTitle")}</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <h2>
            {mode === "login"
              ? t("loginBtn")
              : mode === "register"
                ? t("regBtn")
                : t("registration")}
          </h2>
          {enabledProviders.length > 0 && (
            <div className="login-oauth-actions">
              {enabledProviders.map(({ name }) => (
                <button
                  className="oauth-button"
                  type="button"
                  key={name}
                  onClick={() => oauth(name)}
                >
                  {name === "google" ? (
                    <svg className="oauth-mark" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.68 46.98 24.55z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.2C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  ) : name === "github" ? (
                    <Github className="oauth-mark" aria-hidden="true" />
                  ) : (
                    <span className="oauth-mark oauth-monogram" aria-hidden="true">L</span>
                  )}
                  <span>Continue with {name === "linuxdo" ? "LinuxDo" : name === "github" ? "GitHub" : "Google"}</span>
                </button>
              ))}
            </div>
          )}
          {enabledProviders.length > 0 && <div className="login-divider">OR</div>}
          <label>
            <span className="login-field-label">{t("emailAccount")}</span>
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
              {settings.loginDomain !== 1 && (
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
              <span className="login-field-label">{t("password")}</span>
              <input
                type="password"
                placeholder={t("password")}
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
              <span className="login-field-label">{t("confirmPwd")}</span>
              <input
                type="password"
                placeholder={t("confirmPwd")}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          )}
          {mode !== "login" && settings.regKey !== 1 && (
            <label>
              <span className="login-field-label">{t("regKey")}</span>
              <input
                placeholder={t("regKey")}
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
        </form>
        {settings.projectLink && (
          <a
            className="project-link"
            href="https://github.com/maillab/cloud-mail"
            target="_blank"
            rel="noreferrer"
            aria-label={t("projectLink")}
          >
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        )}
      </main>
      <aside
        className={`login-visual${settings.background ? " has-background" : ""}`}
        style={
          settings.background
            ? {
                backgroundImage: `url("${r2url(settings.background, settings)}")`,
              }
            : undefined
        }
        aria-hidden="true"
      />
    </div>
  );
}
