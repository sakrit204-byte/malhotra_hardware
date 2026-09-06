import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomerReplyForm } from "@/components/inquiry/customer-reply-form";
import { InquiryDetailView } from "@/components/inquiry/inquiry-detail";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/server/auth/guards";
import { authoriseInquiryAccess } from "@/server/inquiry/access";
import { getInquiryDetail, markReadByCustomer } from "@/server/repositories/inquiry";

export const metadata: Metadata = {
  title: "Inquiry",
  robots: { index: false, follow: false },
};

export default async function AccountInquiryPage({
  params,
}: PageProps<"/account/inquiries/[id]">) {
  const { id } = await params;
  await requireUser(`/account/inquiries/${id}`);

  // Being signed in is not enough. This confirms the inquiry belongs to this
  // account before a single field of it is read.
  const access = await authoriseInquiryAccess(id);

  if (!access.allowed) {
    notFound();
  }

  const inquiry = await getInquiryDetail(id);

  if (!inquiry) {
    notFound();
  }

  if (inquiry.unreadForCustomer) {
    await markReadByCustomer(inquiry.id).catch(() => undefined);
  }

  return (
    <Container width="wide" className="py-10 lg:py-14">
      <InquiryDetailView inquiry={inquiry} summaryHref={`/inquiry/${inquiry.id}/summary`}>
        <CustomerReplyForm inquiryId={inquiry.id} />
      </InquiryDetailView>
    </Container>
  );
}
