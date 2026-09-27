import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auth } from "../api/auth";
import { AuthLayout } from "../components/AuthLayout";
import { useFinishLogin } from "../hooks/useFinishLogin";

export function OAuthCallbackPage() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const finish = useFinishLogin();
  const started = useRef(false);
  const [error, setError] = useState("");
  const config = useQuery({ queryKey: ["config"], queryFn: auth.config });
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      const params = new URLSearchParams(location.search);
      // Authorization codes must not remain in browser history, including failures.
      history.replaceState({}, "", location.pathname);
      const request = JSON.parse(
        sessionStorage.getItem("oauthRequest") || "null",
      );
      if (
        !request ||
        request.state !== params.get("state") ||
        (provider && provider !== request.provider)
      )
        throw new Error("登录请求已失效，请重新发起第三方登录。");
      if (params.has("error"))
        throw new Error("第三方授权未完成，请重新登录。");
      const code = params.get("code");
      if (!code || !["google", "github", "linuxdo"].includes(request.provider))
        throw new Error("登录回调缺少有效授权信息。");
      sessionStorage.removeItem("oauthRequest");
      sessionStorage.removeItem("oauthProvider");
      const data = await auth.oauth(
        request.provider === "linuxdo" ? "linuxDo" : request.provider,
        code,
        request.redirectUri,
      );
      if (data.token) {
        await finish(data.token);
        return;
      }
      if (!data.setupToken)
        throw new Error("无法创建账号设置会话，请重新登录。");
      localStorage.removeItem("token");
      sessionStorage.setItem(
        "oauthSetup",
        JSON.stringify({
          setupToken: data.setupToken,
          provider: request.provider,
          expiresAt: data.expiresAt,
        }),
      );
      navigate("/setup-account", { replace: true });
    };
    void run().catch((e) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);
  return (
    <AuthLayout settings={config.data || {}} subtitle="正在完成身份验证">
      <section className="login-form setup-form" aria-live="polite">
        <h2 className="setup-heading">
          {error ? "暂时无法完成登录" : "正在验证登录信息"}
        </h2>
        <p className="setup-description">
          {error || "验证完成后，将自动进入邮箱或首次账号设置。"}
        </p>
        {error && (
          <Link className="primary-button setup-continue" to="/login">
            返回登录
          </Link>
        )}
      </section>
    </AuthLayout>
  );
}
