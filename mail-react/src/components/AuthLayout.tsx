import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ExternalLink, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SiteConfig } from "../types";
import { r2url } from "../utils/mail";

export function AuthLayout({
  settings,
  subtitle,
  children,
}: {
  settings: SiteConfig;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useEffect(() => { document.title = settings.title ?? "Virevan Mail"; }, [settings.title]);
  return (
    <div
      className="login-page"
      style={
        {
          "--login-opacity": `${Math.max(0, Math.min(1, Number(settings.loginOpacity ?? 0.88))) * 100}%`,
        } as CSSProperties
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
          <p>{subtitle}</p>
        </div>
        {children}
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
