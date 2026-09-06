"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Reveals content as it comes into view.
 *
 * The obvious way to do this is a pure CSS scroll timeline, and the first
 * attempt did exactly that. It has a nasty failure: an element close to the end
 * of the document may never reach the scroll position its range starts at, so
 * it stays at the first keyframe and is invisible for ever. Content that cannot
 * be read is a far worse outcome than content that does not animate.
 *
 * So the hidden state is switched on from here, by script, after checking the
 * reader has not asked for reduced motion. Three consequences, all deliberate:
 *
 * - With no JavaScript, nothing is ever hidden. The page is simply static.
 * - With reduced motion, nothing is ever hidden.
 * - Anything the observer has not reached within a few seconds is revealed
 *   anyway, so a missed callback can never bury a section.
 *
 * The reveal itself is a keyframe animation rather than a transition, so that
 * the element's transition property stays free for its hover effects. A
 * transition here would make every hover on the same element snap, or lag by
 * whatever stagger delay this observer had given it.
 *
 * The drift on photographs is separate and stays in CSS, because it only moves
 * something already visible and can fail safely.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.dataset.reveal = "off";
      return;
    }

    root.dataset.reveal = "on";

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal, .stagger > *"),
    ).filter((element) => !element.dataset.revealed);

    const show = (element: HTMLElement) => {
      element.dataset.revealed = "true";
      element.classList.add("is-revealed");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const element = entry.target as HTMLElement;

          // Items in the same grid arrive one after another rather than all at
          // once, which reads as a wave instead of a flash.
          const siblings = element.parentElement?.classList.contains("stagger")
            ? Array.from(element.parentElement.children)
            : null;
          const index = siblings ? siblings.indexOf(element) : 0;

          element.style.animationDelay = `${Math.min(index, 7) * 90}ms`;
          show(element);
          observer.unobserve(element);
        }
      },
      // Starts a little before the element is fully on screen, so the movement
      // finishes about when the reader gets to it.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    for (const element of targets) observer.observe(element);

    // Last resort. If anything is still hidden after this, show it: a reveal
    // that did not fire must never cost somebody the content.
    const failsafe = window.setTimeout(() => {
      for (const element of targets) {
        if (!element.dataset.revealed) show(element);
      }
    }, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [pathname]);

  return null;
}
