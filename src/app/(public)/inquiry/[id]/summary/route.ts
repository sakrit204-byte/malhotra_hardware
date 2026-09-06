import { prisma } from "@/server/db/prisma";
import { authoriseInquiryAccess } from "@/server/inquiry/access";
import { renderInquirySummary } from "@/server/pdf/inquiry-summary";
import { getContactContent } from "@/server/repositories/content";
import { readPrivateFile, savePrivateFile } from "@/server/storage";

/**
 * Serves the inquiry summary as a PDF.
 *
 * The file lives outside any directory the web server will serve, so this
 * handler is the only way to reach it and it checks who is asking first. If the
 * stored file is missing, because generation failed when the inquiry was
 * created or because storage was cleared, it is rendered again from the record
 * rather than returning an error.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");

  const access = await authoriseInquiryAccess(id, { token });

  if (!access.allowed) {
    return new Response("Not found", { status: 404 });
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      createdAt: true,
      status: true,
      fullName: true,
      email: true,
      phone: true,
      companyName: true,
      projectName: true,
      projectLocation: true,
      message: true,
      additionalRequirements: true,
      summaryPath: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          productName: true,
          productCode: true,
          variantLabel: true,
          finishLabel: true,
          quantity: true,
          note: true,
        },
      },
    },
  });

  if (!inquiry) {
    return new Response("Not found", { status: 404 });
  }

  const fileName = `Inquiry ${inquiry.reference}.pdf`;

  const headers = new Headers({
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${fileName}"`,
    // A customer's own paperwork must never be cached by a shared proxy.
    "cache-control": "private, no-store",
  });

  if (inquiry.summaryPath) {
    try {
      const stored = await readPrivateFile(inquiry.summaryPath);
      return new Response(new Uint8Array(stored), { headers });
    } catch {
      // Fall through and rebuild it below.
    }
  }

  try {
    const contact = await getContactContent();

    const pdf = await renderInquirySummary({
      reference: inquiry.reference,
      createdAt: inquiry.createdAt,
      status: inquiry.status,
      fullName: inquiry.fullName,
      email: inquiry.email,
      phone: inquiry.phone,
      companyName: inquiry.companyName,
      projectName: inquiry.projectName,
      projectLocation: inquiry.projectLocation,
      message: inquiry.message,
      additionalRequirements: inquiry.additionalRequirements,
      items: inquiry.items,
      contact,
    });

    // Keep the rebuilt copy so the next request does not pay for it again.
    const stored = await savePrivateFile({
      folder: inquiry.id.replace(/[^a-zA-Z0-9]/g, ""),
      fileName,
      mimeType: "application/pdf",
      content: pdf,
    });

    await prisma.inquiry
      .update({ where: { id: inquiry.id }, data: { summaryPath: stored.storagePath } })
      .catch(() => undefined);

    return new Response(new Uint8Array(pdf), { headers });
  } catch (error) {
    console.error(`Could not produce the summary for ${inquiry.reference}`, error);
    return new Response("The summary could not be produced. Please contact us.", {
      status: 500,
    });
  }
}
