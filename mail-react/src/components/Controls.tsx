import type { ButtonHTMLAttributes } from "react";

// Shared neutral action button used by toolbars, dialogs, and detail actions.
export function Button({
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`ui-button ${className}`.trim()}
      {...props}
    />
  );
}
