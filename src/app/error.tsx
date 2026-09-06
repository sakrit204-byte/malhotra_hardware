"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Recovery page for an unexpected failure.
 *
 * The customer is told what to do next in plain words. The technical detail
 * goes to the server log, never onto the screen, because an error message that
 * quotes a stack trace helps nobody who is trying to buy a door handle.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main id="main" className="flex flex-1 items-center">
      <Container width="narrow" className="py-24 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-4xl">This page could not be loaded</h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
          The problem is on our side, not yours. Try again in a moment. If it keeps
          happening, call us and we will help directly.
        </p>

        {error.digest ? (
          <p className="mt-4 font-mono text-[0.75rem] text-ink-muted">
            Reference {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="/contact">Contact us</a>
          </Button>
        </div>
      </Container>
    </main>
  );
}
