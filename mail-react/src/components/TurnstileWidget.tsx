import { useEffect, useRef } from "react";
import { mountTurnstile } from "../utils/turnstile";
import { useApp } from "../stores/app";

export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const notify = useApp((s) => s.notify);
  useEffect(() => {
    if (!container.current) return;
    return mountTurnstile(container.current, {
      siteKey,
      onToken,
      onError: notify,
    });
  }, [siteKey, onToken, notify]);
  // No id="turnstile": it would shadow the SDK global while the script is loading.
  return <div className="turnstile-widget" ref={container} />;
}
