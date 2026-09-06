import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Lock, Mail, Paperclip, TriangleAlert } from "lucide-react";

import { MessageComposer } from "@/components/staff/message-composer";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { productHref } from "@/lib/catalogue";
import { cn } from "@/lib/cn";
import {
  formatInquiryDateTime,
  managerStatusOptions,
  statusLabel,
  statusTone,
} from "@/lib/inquiry-status";
import { assignInquiryAction, changeStatusAction } from "@/server/actions/manager";
import { requireRole } from "@/server/auth/guards";
import {
  getInquiryForManager,
  listManagers,
  markReadByManager,
} from "@/server/repositories/manager";

export const metadata: Metadata = {
  title: "Inquiry",
  robots: { index: false, follow: false },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The chat space.
 *
 * Conversation in the middle, because that is the work. Customer and inquiry
 * facts on the right, where they can be read out over the phone without
 * scrolling. Status and owner at the top, because they are the two things that
 * change most often.
 *
 * Internal notes sit in the same thread as replies rather than in a separate
 * tab, so the order of events stays true, and they are marked unmistakably.
 */
export default async function ManagerInquiryPage({
  params,
}: PageProps<"/manager/inquiries/[id]">) {
  const staff = await requireRole("MANAGER", "/manager/inquiries");
  const { id } = await params;

  const [inquiry, managers] = await Promise.all([
    getInquiryForManager(id),
    listManagers(),
  ]);

  if (!inquiry) {
    notFound();
  }

  // Opening the thread is reading it.
  await markReadByManager(inquiry.id).catch(() => undefined);

  const failedEmails = inquiry.emailLogs.filter((log) => log.status === "FAILED");

  const details = [
    { label: "Email", value: inquiry.email },
    { label: "Phone", value: inquiry.phone },
    { label: "Company", value: inquiry.companyName },
    { label: "Project", value: inquiry.projectName },
    { label: "Location", value: inquiry.projectLocation },
    {
      label: "Account",
      value: inquiry.customer
        ? inquiry.customer.emailVerifiedAt
          ? "Registered and confirmed"
          : "Registered, not confirmed"
        : "Guest, no account",
    },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value));

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <Link
        href="/manager/inquiries"
        className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All inquiries
      </Link>

      {/* --------------------------------------------------------- header */}
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-[2rem] leading-none tracking-wide text-ink">
            {inquiry.reference}
          </h1>
          <p className="mt-2 text-ink-soft">
            {inquiry.fullName}
            {inquiry.projectName ? `, ${inquiry.projectName}` : ""}, sent{" "}
            {formatInquiryDateTime(inquiry.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={statusTone(inquiry.status)}>{statusLabel(inquiry.status)}</Chip>

          <form action={changeStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <label htmlFor="status" className="sr-only">
              Change status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={inquiry.status}
              className="h-9 rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
            >
              {managerStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label
              htmlFor="quiet"
              className="flex cursor-pointer items-center gap-1.5 text-[0.8125rem] text-ink-muted"
            >
              <input
                id="quiet"
                name="quiet"
                type="checkbox"
                className="size-3.5 accent-[var(--color-ink)]"
              />
              Quietly
            </label>
            <Button type="submit" size="sm" variant="secondary">
              Update
            </Button>
          </form>

          <form action={assignInquiryAction} className="flex items-center gap-2">
            <input type="hidden" name="inquiryId" value={inquiry.id} />
            <label htmlFor="owner" className="sr-only">
              Assign an owner
            </label>
            <select
              id="owner"
              name="managerId"
              defaultValue={inquiry.assignedManagerId ?? ""}
              className="h-9 rounded-md border border-line-strong bg-surface-raised px-2.5 text-[0.875rem]"
            >
              <option value="">Nobody assigned</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.fullName}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Assign
            </Button>
          </form>
        </div>
      </header>

      {failedEmails.length > 0 ? (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-lg border border-critical/30 bg-critical-wash px-4 py-3 text-[0.875rem] text-ink-soft"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden="true" />
          <p>
            {failedEmails.length} {failedEmails.length === 1 ? "email" : "emails"} to this
            customer could not be delivered. Call them, or check the address below.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ------------------------------------------------ conversation */}
        <div>
          <section aria-labelledby="conversation">
            <h2 id="conversation" className="text-xl">
              Conversation
            </h2>

            <div className="mt-4 space-y-4">
              {/* The inquiry itself opens the thread. */}
              <article className="rounded-lg border border-line bg-surface-sunken p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p className="font-medium text-ink">{inquiry.fullName}</p>
                  <p className="text-[0.8125rem] text-ink-muted">
                    {formatInquiryDateTime(inquiry.createdAt)}
                  </p>
                </div>
                <div className="mt-2 space-y-2 leading-relaxed text-ink-soft">
                  {inquiry.message.split(/\n{2,}/).map((block, index) => (
                    <p key={index}>{block}</p>
                  ))}
                </div>
                {inquiry.additionalRequirements ? (
                  <p className="mt-3 border-t border-line pt-3 text-[0.9375rem] text-ink-soft">
                    <span className="text-ink-muted">Additional requirements. </span>
                    {inquiry.additionalRequirements}
                  </p>
                ) : null}
              </article>

              {inquiry.messages.map((message) => {
                const fromUs = message.senderType !== "CUSTOMER";

                return (
                  <article
                    key={message.id}
                    className={cn(
                      "rounded-lg border p-4",
                      message.isInternalNote
                        ? "border-caution/40 bg-caution-wash"
                        : fromUs
                          ? "border-line bg-surface-raised"
                          : "border-line bg-surface-sunken",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        {message.senderName}
                        {message.isInternalNote ? (
                          <span className="inline-flex items-center gap-1 text-[0.75rem] font-normal uppercase tracking-[0.06em] text-caution">
                            <Lock className="size-3" aria-hidden="true" />
                            Internal note
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[0.8125rem] text-ink-muted">
                        {formatInquiryDateTime(message.createdAt)}
                        {fromUs && !message.isInternalNote
                          ? message.readByCustomerAt
                            ? ", read"
                            : ", sent"
                          : ""}
                      </p>
                    </div>

                    <div className="mt-2 space-y-2 leading-relaxed text-ink-soft">
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
                  </article>
                );
              })}
            </div>

            <div className="mt-6">
              <MessageComposer inquiryId={inquiry.id} customerName={inquiry.fullName} />
            </div>
          </section>

          {/* ------------------------------------------------- products */}
          <section className="mt-12" aria-labelledby="products">
            <h2 id="products" className="text-xl">
              Requested products
            </h2>

            <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface-raised">
              <table className="w-full min-w-[38rem] border-collapse text-[0.9375rem]">
                <caption className="sr-only">
                  Products requested on inquiry {inquiry.reference}
                </caption>
                <thead>
                  <tr className="border-b border-line text-left text-[0.75rem] uppercase tracking-[0.06em] text-ink-muted">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Unit
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {inquiry.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <div className="flex gap-3">
                          {item.imageUrl ? (
                            <div className="relative size-11 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                              <Image
                                src={item.imageUrl}
                                alt=""
                                fill
                                sizes="2.75rem"
                                className="object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <span className="block text-ink">
                              {item.product ? (
                                <Link
                                  href={productHref(item.product.slug)}
                                  className="underline-offset-4 hover:underline"
                                >
                                  {item.productName}
                                </Link>
                              ) : (
                                item.productName
                              )}
                            </span>
                            <span className="block font-mono text-[0.75rem] text-ink-muted">
                              {item.productCode}
                              {item.variantLabel ? `, ${item.variantLabel}` : ""}
                            </span>
                            {item.note ? (
                              <span className="mt-1 block text-[0.8125rem] text-ink-soft">
                                Note: {item.note}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </th>
                      <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </section>
        </div>

        {/* -------------------------------------------------------- aside */}
        <aside className="space-y-5">
          <section className="rounded-lg border border-line bg-surface-raised p-5">
            <h2 className="eyebrow">Customer</h2>
            <p className="mt-3 text-lg text-ink">{inquiry.fullName}</p>

            <dl className="mt-4 space-y-3 text-[0.875rem]">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-ink-muted">{detail.label}</dt>
                  <dd className="break-words text-ink">{detail.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <Button asChild variant="secondary" size="sm">
                <a href={`mailto:${inquiry.email}`}>Email</a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href={`tel:${inquiry.phone.replace(/\s+/g, "")}`}>Call</a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href={`/inquiry/${inquiry.id}/summary`}>
                  <Download className="size-3.5" aria-hidden="true" />
                  Summary
                </a>
              </Button>
            </div>
          </section>

          {inquiry.attachments.length > 0 ? (
            <section className="rounded-lg border border-line bg-surface-raised p-5">
              <h2 className="eyebrow">Files from the customer</h2>
              <ul className="mt-3 space-y-2 text-[0.875rem] text-ink-soft">
                {inquiry.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-start gap-2">
                    <Paperclip
                      className="mt-1 size-3.5 shrink-0 text-ink-muted"
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
            </section>
          ) : null}

          <section className="rounded-lg border border-line bg-surface-raised p-5">
            <h2 className="eyebrow">History</h2>
            <ol className="mt-3 space-y-3 text-[0.875rem]">
              {inquiry.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <p className="text-ink">
                    {entry.fromStatus
                      ? `${statusLabel(entry.fromStatus)} to ${statusLabel(entry.toStatus)}`
                      : statusLabel(entry.toStatus)}
                  </p>
                  <p className="text-[0.8125rem] text-ink-muted">
                    {formatInquiryDateTime(entry.createdAt)}
                    {entry.changedBy ? `, ${entry.changedBy.fullName}` : ""}
                  </p>
                  {entry.note ? (
                    <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{entry.note}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-lg border border-line bg-surface-raised p-5">
            <h2 className="eyebrow">Email delivery</h2>
            <ul className="mt-3 space-y-2.5 text-[0.8125rem]">
              {inquiry.emailLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-2">
                  <Mail
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      log.status === "FAILED" ? "text-critical" : "text-ink-muted",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-ink">{log.subject}</span>
                    <span className="block text-ink-muted">
                      {log.toAddress}, {log.status.toLowerCase()},{" "}
                      {formatInquiryDateTime(log.createdAt)}
                    </span>
                    {log.error ? (
                      <span className="mt-0.5 block text-critical">{log.error}</span>
                    ) : null}
                  </span>
                </li>
              ))}

              {inquiry.emailLogs.length === 0 ? (
                <li className="text-ink-muted">Nothing sent yet.</li>
              ) : null}
            </ul>
          </section>

          <p className="px-1 text-[0.8125rem] text-ink-muted">
            Signed in as {staff.fullName}.
          </p>
        </aside>
      </div>
    </div>
  );
}
