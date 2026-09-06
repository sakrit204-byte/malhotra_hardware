import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A link that opens WhatsApp with a message already written.
 *
 * WhatsApp is offered as one ordinary contact option beside the phone number
 * and the email address, not as an oversized floating button.
 */
export function WhatsappLink({
  number,
  message,
  children,
  className,
}: {
  number: string;
  message?: string;
  children: ReactNode;
  className?: string;
}) {
  const digits = number.replace(/[^0-9]/g, "");
  const href = message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-2", className)}
    >
      {children}
      <span className="sr-only">, opens WhatsApp in a new tab</span>
    </a>
  );
}
