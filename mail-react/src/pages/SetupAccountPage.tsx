import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { auth } from "../api/auth";
import { AuthLayout } from "../components/AuthLayout";
import { ErrorState, Skeleton } from "../components/Feedback";
import { useFinishLogin } from "../hooks/useFinishLogin";

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
  if (localStorage.getItem("token")) return <Navigate to="/inbox" replace />;
  const expired =
    !session?.setupToken ||
    !session.expiresAt ||
    session.expiresAt <= Date.now();
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
    <AuthLayout
      settings={settings}
      subtitle={`创建你的 ${settings.title || "VirMail"} 邮箱地址`}
    >
      {config.isPending ? (
        <div className="login-form">
          <Skeleton />
        </div>
      ) : config.isError ? (
        <div className="login-form">
          <ErrorState error={config.error} retry={() => config.refetch()} />
        </div>
      ) : expired ? (
        <section className="login-form setup-form">
          <h2 className="setup-heading">设置会话已过期</h2>
          <p className="setup-description">
            请重新登录，验证身份后继续设置邮箱。
          </p>
          <Link className="primary-button setup-continue" to="/login">
            返回登录
          </Link>
        </section>
      ) : (
        <form className="login-form setup-form" onSubmit={submit}>
          <div className="setup-status">
            {session.provider === "google"
              ? "Google"
              : session.provider === "github"
                ? "GitHub"
                : "LinuxDo"}{" "}
            身份验证已成功
          </div>
          <h2 className="setup-heading">完成账号设置</h2>
          <p className="setup-description">
            只需选择邮箱地址，即可开始使用。此步骤仅在首次登录时需要。
          </p>
          <label>
            <span className="login-field-label">{t("emailAccount")}</span>
            <span className="address-input">
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
              <span className="login-field-label">{t("regKey")}</span>
              <input
                placeholder={t("regKey")}
                required={settings.regKey === 0}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}
          {error && (
            <p className="setup-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary-button setup-continue"
            disabled={busy || !domains.length}
          >
            {busy ? t("loading") : "继续"}
          </button>
          <Link
            className="text-button setup-back"
            to="/login"
            onClick={() => sessionStorage.removeItem("oauthSetup")}
          >
            使用其他账号
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
