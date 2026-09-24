import { useTranslation } from "react-i18next";
import { useApp } from "../stores/app";
export function IconButton({
  title,
  onClick,
  children,
  disabled,
  className = "",
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Skeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
export function Empty({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <span className="empty-icon">✉</span>
      <h3>{text || t("noMessagesFound")}</h3>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <h3>{t("error")}</h3>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button onClick={retry}>{t("retry")}</button>
    </div>
  );
}
export function Toast() {
  const toast = useApp((s) => s.toast);
  return toast ? (
    <div className="toast" role="status">
      {toast}
    </div>
  ) : null;
}
