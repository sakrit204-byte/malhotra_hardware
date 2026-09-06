import Image from "next/image";
import Link from "next/link";
import { Download, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { productHref } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import {
  formatInquiryDate,
  formatInquiryDateTime,
  statusLabel,
  statusNote,
  statusTone,
} from "@/lib/inquiry-status";
import type { InquiryDetail as InquiryDetailData } from "@/server/repositories/inquiry";

/**
 * One inquiry as the customer sees it.
 *
 * Used by the tracking page a guest reaches from their email and by the
 * customer account, so both show exactly the same thing and there is only one
 * place to change what a customer is told.
 */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InquiryDetailView({
  inquiry,
  summaryHref,
  children,
}: {
  inquiry: InquiryDetailData;
  /** Link to the summary, already carrying whatever credential the viewer has. */
  summaryHref: string;
  /** The reply form, when the viewer is allowed to send one. */
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_19rem] lg:gap-14">
      <div>
        {/* ----------------------------------------------------- headline */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="eyebrow">Inquiry</p>
            <h1 className="mt-2 font-display text-3xl tracking-wide text-ink">
              {inquiry.reference}
            </h1>
            <p className="mt-2 text-[0.8125rem] text-ink-muted">
              Sent {formatInquiryDate(inquiry.createdAt)}
              {inquiry.projectName ? `, for ${inquiry.projectName}` : ""}
            </p>
          </div>
          <Chip tone={statusTone(inquiry.status)}>{statusLabel(inquiry.status)}</Chip>
        </div>

        <p className="mt-5 leading-relaxed text-ink-soft">{statusNote(inquiry.status)}</p>

        {/* --------------------------------------------------- conversation */}
        <section className="mt-12" aria-labelledby="conversation">
          <h2 id="conversation" className="text-xl">
            Conversation
          </h2>

          {inquiry.messages.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-line-strong bg-surface-raised px-4 py-6 text-center text-sm text-ink-soft">
              No replies yet. When our team answers, the message appears here and is sent
              to your email address.
            </p>
          ) : (
            <ol className="mt-5 space-y-5">
              {inquiry.messages.map((message) => {
                const fromUs = message.senderType !== "CUSTOMER";

                return (
                  <li
                    key={message.id}
                    className={cn(
                      "rounded-md border px-4 py-4",
                      fromUs
                        ? "border-line bg-surface-raised"
                        : "border-line bg-surface-sunken",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-medium text-ink">
                        {fromUs ? message.senderName : "You"}
                      </p>
                      <p className="text-[0.75rem] text-ink-muted">
                        {formatInquiryDateTime(message.createdAt)}
                      </p>
                    </div>
                    <div className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {message.body.split(/\n{2,}/).map((block, index) => (
                        <p key={index}>{block}</p>
                      ))}
                    </div>

                    {message.attachments.length > 0 ? (
                      <ul className="mt-3 space-y-1">
                        {message.attachments.map((attachment) => (
                          <li
                            key={attachment.id}
                            className="flex items-center gap-2 text-[0.8125rem] text-ink-muted"
                          >
                            <Paperclip className="size-3.5" aria-hidden="true" />
                            {attachment.fileName}
                            <span>{formatFileSize(attachment.fileSize)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}

          {children ? <div className="mt-8">{children}</div> : null}
        </section>

        {/* -------------------------------------------------------- products */}
        <section className="mt-14 border-t border-line pt-10" aria-labelledby="products">
          <h2 id="products" className="text-xl">
            Requested products
          </h2>

          <ul className="mt-5 divide-y divide-line border-y border-line">
            {inquiry.items.map((item) => {
              const stillListed =
                item.product && item.product.isPublished && !item.product.deletedAt;

              return (
                <li key={item.id} className="flex gap-4 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden border border-line bg-surface-sunken">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="4rem"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      {stillListed && item.product ? (
                        <Link
                          href={productHref(item.product.slug)}
                          className="underline-offset-4 hover:underline"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-[0.75rem] text-ink-muted">
                      {item.productCode}
                      {item.variantLabel ? `, ${item.variantLabel}` : ""}
                    </p>
                    {item.note ? (
                      <p className="mt-1.5 text-[0.8125rem] text-ink-soft">
                        Note: {item.note}
                      </p>
                    ) : null}
                  </div>

                  <p className="shrink-0 text-sm tabular-nums text-ink-soft">
                    {item.quantity}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* --------------------------------------------------- your message */}
        <section className="mt-12" aria-labelledby="original">
          <h2 id="original" className="eyebrow">
            Your original message
          </h2>
          <div className="mt-3 space-y-2 leading-relaxed text-ink-soft">
            {inquiry.message.split(/\n{2,}/).map((block, index) => (
              <p key={index}>{block}</p>
            ))}
          </div>

          {inquiry.additionalRequirements ? (
            <>
              <h3 className="eyebrow mt-6">Additional requirements</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">
                {inquiry.additionalRequirements}
              </p>
            </>
          ) : null}
        </section>
      </div>

      {/* -------------------------------------------------------------- aside */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-surface-raised p-5">
          <h2 className="eyebrow">Details</h2>
          <dl className="mt-4 space-y-3 text-[0.8125rem]">
            <div>
              <dt className="text-ink-muted">Name</dt>
              <dd className="text-ink">{inquiry.fullName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Email</dt>
              <dd className="break-all text-ink">{inquiry.email}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Phone</dt>
              <dd className="text-ink">{inquiry.phone}</dd>
            </div>
            {inquiry.companyName ? (
              <div>
                <dt className="text-ink-muted">Company</dt>
                <dd className="text-ink">{inquiry.companyName}</dd>
              </div>
            ) : null}
            {inquiry.projectLocation ? (
              <div>
                <dt className="text-ink-muted">Location</dt>
                <dd className="text-ink">{inquiry.projectLocation}</dd>
              </div>
            ) : null}
            {inquiry.manager ? (
              <div>
                <dt className="text-ink-muted">Looked after by</dt>
                <dd className="text-ink">{inquiry.manager.fullName}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 border-t border-line pt-4">
            <Button asChild variant="secondary" size="sm" block>
              <a href={summaryHref}>
                <Download className="size-3.5" aria-hidden="true" />
                Download the summary
              </a>
            </Button>
          </div>
        </div>

        {inquiry.attachments.length > 0 ? (
          <div className="mt-5 border border-line bg-surface-raised p-5">
            <h2 className="eyebrow">Files you sent</h2>
            <ul className="mt-3 space-y-2 text-[0.8125rem] text-ink-soft">
              {inquiry.attachments.map((attachment) => (
                <li key={attachment.id} className="flex items-start gap-2">
                  <Paperclip
                    className="mt-0.5 size-3.5 shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block break-words">{attachment.fileName}</span>
                    <span className="text-ink-muted">
                      {formatFileSize(attachment.fileSize)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
