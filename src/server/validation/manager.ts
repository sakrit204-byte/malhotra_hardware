import { z } from "zod";

import { INQUIRY_STATUSES } from "@/lib/inquiry-status";

/**
 * Parsing for the manager inquiry list.
 *
 * Same rule as the catalogue: the query string is untrusted, every value is
 * parsed, and anything unexpected falls back to a default rather than throwing
 * a working page away.
 */

export const INQUIRIES_PER_PAGE = 25;

export const MANAGER_SORTS = [
  { value: "activity", label: "Recent activity" },
  { value: "created", label: "Newest first" },
  { value: "items", label: "Most items" },
  { value: "oldest", label: "Oldest first" },
] as const;

export type ManagerSort = (typeof MANAGER_SORTS)[number]["value"];

const statusList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return [];
    const raw = Array.isArray(value) ? value : [value];

    return raw
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry): entry is (typeof INQUIRY_STATUSES)[number] =>
        (INQUIRY_STATUSES as readonly string[]).includes(entry),
      );
  });

export const managerQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  status: statusList,
  assigned: z
    .string()
    .optional()
    .transform((value) =>
      value === "mine" || value === "unassigned" ? value : "all",
    ),
  unread: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true"),
  sort: z
    .string()
    .optional()
    .transform((value): ManagerSort => {
      const allowed = MANAGER_SORTS.map((option) => option.value) as string[];
      return allowed.includes(value ?? "") ? (value as ManagerSort) : "activity";
    }),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      const parsed = Number(value ?? 1);
      return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
    }),
});

export type ManagerQuery = z.infer<typeof managerQuerySchema> & {
  /** Filled in from the session, never from the query string. */
  managerId?: string;
};

export function parseManagerQuery(
  input: Record<string, string | string[] | undefined>,
  managerId: string,
): ManagerQuery {
  const result = managerQuerySchema.safeParse(input);
  const parsed = result.success ? result.data : managerQuerySchema.parse({});

  return { ...parsed, managerId };
}

/** Rebuilds the list address with one value changed. */
export function managerListHref(
  query: ManagerQuery,
  changes: Partial<{
    status: string[];
    assigned: string;
    unread: boolean;
    sort: string;
    page: number;
    q: string;
  }> = {},
): string {
  const params = new URLSearchParams();

  const status = changes.status ?? query.status;
  const assigned = changes.assigned ?? query.assigned;
  const unread = changes.unread ?? query.unread;
  const sort = changes.sort ?? query.sort;
  const page = changes.page ?? 1;
  const q = changes.q ?? query.q;

  for (const value of status) params.append("status", value);
  if (assigned !== "all") params.set("assigned", assigned);
  if (unread) params.set("unread", "1");
  if (sort !== "activity") params.set("sort", sort);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/manager/inquiries?${search}` : "/manager/inquiries";
}

/** The message a manager sends into a thread. */
export const managerMessageSchema = z.object({
  inquiryId: z.string().min(1).max(60),
  body: z
    .string()
    .trim()
    .min(2, "Write a message before sending.")
    .max(6000, "That message is longer than we can store."),
  isInternalNote: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true"),
});

export const statusChangeSchema = z.object({
  inquiryId: z.string().min(1).max(60),
  status: z.enum(INQUIRY_STATUSES),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const assignSchema = z.object({
  inquiryId: z.string().min(1).max(60),
  managerId: z
    .string()
    .max(60)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});
