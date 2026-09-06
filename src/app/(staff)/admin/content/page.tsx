import type { Metadata } from "next";

import { ContentEditor } from "@/components/staff/content-editor";
import { requireRole } from "@/server/auth/guards";
import { listSiteContent } from "@/server/repositories/admin";

export const metadata: Metadata = {
  title: "Site content",
  robots: { index: false, follow: false },
};

/**
 * Editable site content.
 *
 * The home page copy, the hero photograph and the points marked on it, the
 * showroom address and the phone numbers all live here. A business that cannot
 * change its own opening hours without a developer is a business waiting on
 * somebody else, so none of this is in the code.
 */
export default async function AdminContentPage() {
  await requireRole("ADMIN", "/admin/content");
  const blocks = await listSiteContent();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
      <header>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-2 text-[2rem] leading-[1.1]">Site content</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          The words, the addresses and the numbers used across the public site and in the
          emails it sends. A save takes effect on the site straight away.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        {blocks.map((block) => (
          <ContentEditor
            key={block.key}
            contentKey={block.key}
            description={block.description}
            value={JSON.stringify(block.value, null, 2)}
          />
        ))}
      </div>
    </div>
  );
}
