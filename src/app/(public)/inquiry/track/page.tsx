import type { Metadata } from "next";
import Link from "next/link";

import { CustomerReplyForm } from "@/components/inquiry/customer-reply-form";
import { InquiryDetailView } from "@/components/inquiry/inquiry-detail";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/states";
import { findValidToken } from "@/server/auth/tokens";
import { getInquiryDetail, markReadByCustomer } from "@/server/repositories/inquiry";

export const metadata: Metadata = {
  title: "Your inquiry",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Opens one inquiry from the private link emailed to a guest.
 *
 * The link is the credential, so it is treated like one. The token is looked up
 * rather than trusted, it only ever opens the single inquiry it was issued for,
 * it expires, and the page is marked never to be indexed or cached. A customer
 * with an account does not need this page: their history is in their account.
 */
export default async function TrackInquiryPage({
  searchParams,
}: PageProps<"/inquiry/track">) {
  const params = await searchParams;
  const raw = params.token;
  const token = typeof raw === "string" ? raw : undefined;

  const record = token ? await findValidToken(token, "INQUIRY_ACCESS") : null;
  const inquiry = record?.inquiryId ? await getInquiryDetail(record.inquiryId) : null;

  if (!inquiry) {
    return (
      <Container width="narrow" className="py-16 lg:py-24">
        <ErrorState
          title="This link is not valid"
          description="It may have expired, or it may have been copied incompletely from the email. Search your inbox for the confirmation, or contact us with your reference number and we will help."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/contact">Contact us</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/products">Browse products</Link>
              </Button>
            </div>
          }
        />
      </Container>
    );
  }

  // Opening the thread clears the unread marker, in the same way that reading a
  // message anywhere else does.
  if (inquiry.unreadForCustomer) {
    await markReadByCustomer(inquiry.id).catch(() => undefined);
  }

  return (
    <Container width="wide" className="py-10 lg:py-14">
      <InquiryDetailView
        inquiry={inquiry}
        summaryHref={`/inquiry/${inquiry.id}/summary?token=${encodeURIComponent(token ?? "")}`}
      >
        <CustomerReplyForm inquiryId={inquiry.id} token={token} />
      </InquiryDetailView>
    </Container>
  );
}
