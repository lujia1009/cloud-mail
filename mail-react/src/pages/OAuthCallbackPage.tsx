import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { auth } from "../api/auth";
import { Mail, LoaderCircle, CircleAlert } from "lucide-react";
import { useFinishLogin } from "../hooks/useFinishLogin";

export function OAuthCallbackPage() {
  const { provider } = useParams();
  const navigate = useNavigate();
  const finish = useFinishLogin();
  const started = useRef(false);
  const [error, setError] = useState("");
  const config = useQuery({ queryKey: ["config"], queryFn: auth.config });
  useEffect(() => {
    document.title = `正在完成登录 · ${config.data?.title || "VirMail"}`;
  }, [config.data?.title]);
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
    <main className="oauth-transition">
      <div className="oauth-brand">
        <Mail size={26} aria-hidden="true" />
        <span>{config.data?.title || "VirMail"}</span>
      </div>
      <section className="oauth-status" aria-live="polite" aria-busy={!error}>
        {error ? (
          <CircleAlert size={28} aria-hidden="true" />
        ) : (
          <LoaderCircle
            className="oauth-spinner"
            size={28}
            aria-hidden="true"
          />
        )}
        <h1>{error ? "暂时无法完成登录" : "正在完成登录"}</h1>
        <p>{error || "正在确认你的身份，即将为你准备好邮箱。"}</p>
        {error && (
          <Link className="onboarding-primary" to="/login">
            返回登录
          </Link>
        )}
      </section>
    </main>
  );
}
