import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { auth } from "../api/auth";
import { Mail, Check } from "lucide-react";
import { ErrorState, Skeleton } from "../components/Feedback";
import { useFinishLogin } from "../hooks/useFinishLogin";
import { startOAuth } from "../utils/oauth";

export function SetupAccountPage() {
  const { t } = useTranslation();
  const finish = useFinishLogin();
  const [session] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("oauthSetup") || "null");
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState("");
  const [suffix, setSuffix] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const config = useQuery({ queryKey: ["config"], queryFn: auth.config });
  const settings = config.data || {};
  const domains = settings.domainList || [];
  useEffect(() => {
    document.title = `完成账号设置 · ${settings.title || "VirMail"}`;
  }, [settings.title]);
  const providerName =
    session?.provider === "google"
      ? "Google"
      : session?.provider === "github"
        ? "GitHub"
        : "LinuxDo";
  if (localStorage.getItem("token")) return <Navigate to="/inbox" replace />;
  const expired =
    !session?.setupToken ||
    !session.expiresAt ||
    session.expiresAt <= Date.now();
  const switchGoogleAccount = () => {
    startOAuth("google", settings.googleClientId || "", {
      selectAccount: true,
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (session.expiresAt <= Date.now()) {
      setError("设置会话已过期，请重新登录。");
      return;
    }
    if (email.length < Number(settings.minEmailPrefix || 0)) {
      setError(t("minEmailPrefix", { msg: settings.minEmailPrefix }));
      return;
    }
    setBusy(true);
    try {
      const data = await auth.bind({
        email: email + (suffix || domains[0] || ""),
        code,
        setupToken: session.setupToken,
      });
      await finish(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="onboarding-page">
      <header className="onboarding-brand">
        <Mail size={24} aria-hidden="true" />
        <span>{settings.title || "VirMail"}</span>
        <span className="onboarding-context">账号初始化</span>
      </header>
      <main className="onboarding-main">
        {!expired && (
          <ol className="onboarding-steps" aria-label="账号设置进度">
            <li>
              <span>
                <Check size={14} aria-hidden="true" />
              </span>
              身份验证
            </li>
            <li aria-current="step">
              <span>2</span>创建邮箱
            </li>
            <li>
              <span>3</span>开始使用
            </li>
          </ol>
        )}
        {config.isPending ? (
          <div className="onboarding-panel">
            <Skeleton />
          </div>
        ) : config.isError ? (
          <div className="onboarding-panel">
            <ErrorState error={config.error} retry={() => config.refetch()} />
          </div>
        ) : expired ? (
          <section className="onboarding-panel">
            <h1 className="onboarding-heading">设置会话已过期</h1>
            <p className="onboarding-description">
              请重新登录，验证身份后继续设置邮箱。
            </p>
            <Link className="onboarding-primary" to="/login">
              返回登录
            </Link>
          </section>
        ) : (
          <form className="onboarding-panel" onSubmit={submit}>
            <div className="onboarding-verified">
              <Check size={16} aria-hidden="true" />
              {providerName} 身份验证已成功
            </div>
            <h1 className="onboarding-heading">欢迎，创建你的邮箱</h1>
            <p className="onboarding-description">
              身份验证已完成。为你的新邮箱选择一个地址，完成这一步就能开始收发邮件。
            </p>
            <div className="onboarding-fields">
              <label>
                <span className="onboarding-label">邮箱用户名</span>
                <span className="onboarding-address">
                  <input
                    required
                    pattern="[^@\s]+"
                    maxLength={64}
                    autoComplete="username"
                    placeholder="name"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <select
                    aria-label={t("selectDomain")}
                    value={suffix || domains[0]}
                    onChange={(e) => setSuffix(e.target.value)}
                  >
                    {domains.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              {settings.regKey !== 1 && (
                <label>
                  <span className="onboarding-label">{t("regKey")}</span>
                  <input
                    placeholder={t("regKey")}
                    required={settings.regKey === 0}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
              )}
              <div className="onboarding-preview">
                <span>你的邮箱地址</span>
                <output aria-live="polite">
                  {email || "name"}
                  {suffix || domains[0] || ""}
                </output>
              </div>
            </div>
            {error && (
              <p className="setup-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="onboarding-primary"
              disabled={busy || !domains.length}
            >
              {busy ? t("loading") : "完成设置，进入邮箱"}
            </button>
            {session.provider === "google" &&
            settings.googleSwitch === 0 &&
            settings.googleClientId ? (
              <button
                type="button"
                className="onboarding-switch"
                onClick={switchGoogleAccount}
                disabled={busy}
              >
                切换其他 Google 账号
              </button>
            ) : (
              <Link
                className="onboarding-switch"
                to="/login"
                onClick={() => sessionStorage.removeItem("oauthSetup")}
              >
                切换其他 {providerName} 账号
              </Link>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
