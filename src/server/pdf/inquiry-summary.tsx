import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { site } from "@/lib/site";

/**
 * The inquiry summary that is generated automatically and attached to the
 * confirmation email.
 *
 * This is a record of what was asked for and who asked for it. It carries no
 * prices. It is not a commercial quotation: it carries no terms, no project
 * pricing and no commitment. A manager turns an inquiry into a formal quotation
 * separately, and that document says so on its face.
 */

export type SummaryData = {
  reference: string;
  createdAt: Date;
  status: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string | null;
  projectName: string | null;
  projectLocation: string | null;
  message: string;
  additionalRequirements: string | null;
  items: Array<{
    productName: string;
    productCode: string;
    variantLabel: string | null;
    finishLabel: string | null;
    quantity: number;
    note: string | null;
  }>;
  /** Absent when public pricing is switched off for the business. */
  contact: { phone: string; email: string; addressLines: string[] };
};

const palette = {
  ink: "#1e1815",
  soft: "#574c43",
  muted: "#857567",
  line: "#e7dfd3",
  strong: "#d2c5b4",
  brick: "#a9482c",
  ground: "#faf7f2",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    color: palette.ink,
    fontFamily: "Helvetica",
  },
  brand: { fontSize: 15, letterSpacing: -0.2 },
  tagline: {
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: palette.muted,
    marginTop: 3,
  },
  rule: { height: 1, width: 34, backgroundColor: palette.brick, marginTop: 12 },
  title: { fontSize: 19, marginTop: 26 },
  subtitle: { fontSize: 9.5, color: palette.soft, marginTop: 5, lineHeight: 1.5 },
  referenceBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.ground,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  referenceLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: palette.muted,
  },
  referenceValue: { fontSize: 14, marginTop: 3, letterSpacing: 0.3 },
  sectionLabel: {
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: palette.muted,
    marginTop: 24,
    marginBottom: 8,
  },
  detailRow: { flexDirection: "row", marginBottom: 4 },
  detailLabel: { width: 96, color: palette.muted },
  detailValue: { flex: 1, color: palette.ink },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.strong,
    paddingBottom: 6,
  },
  tableHeadCell: {
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: palette.muted,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    paddingVertical: 8,
  },
  colProduct: { flex: 1, paddingRight: 12 },
  colCode: { width: 88, paddingRight: 10 },
  colQuantity: { width: 40, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingVertical: 3 },
  totalLabel: { flex: 1, textAlign: "right", paddingRight: 10, color: palette.soft },
  totalValue: { width: 74, textAlign: "right", color: palette.ink },
  grandLabel: {
    flex: 1,
    textAlign: "right",
    paddingRight: 10,
    color: palette.ink,
    fontSize: 11.5,
  },
  grandValue: { width: 74, textAlign: "right", color: palette.ink, fontSize: 11.5 },
  productName: { color: palette.ink },
  productMeta: { fontSize: 8.5, color: palette.muted, marginTop: 2 },
  productNote: { fontSize: 8.5, color: palette.soft, marginTop: 4 },
  body: { color: palette.soft, lineHeight: 1.55, marginBottom: 8 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: palette.muted },
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SummaryDocument({ data }: { data: SummaryData }) {
  const totalQuantity = data.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Document
      title={`Inquiry ${data.reference}`}
      author={site.name}
      subject={`Inquiry summary ${data.reference}`}
    >
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.brand}>{site.name}</Text>
          <Text style={styles.tagline}>{site.tagline}</Text>
          <View style={styles.rule} />
        </View>

        <Text style={styles.title}>Inquiry summary</Text>
        <Text style={styles.subtitle}>
          A record of the products requested and the details supplied. This summary is
          not a quotation. Our team will come back in writing with availability, lead
          times and what the work will cost.
        </Text>

        <View style={styles.referenceBox}>
          <View>
            <Text style={styles.referenceLabel}>Inquiry reference</Text>
            <Text style={styles.referenceValue}>{data.reference}</Text>
          </View>
          <View>
            <Text style={styles.referenceLabel}>Date</Text>
            <Text style={styles.referenceValue}>{formatDate(data.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Customer</Text>
        <Detail label="Name" value={data.fullName} />
        <Detail label="Email" value={data.email} />
        <Detail label="Phone" value={data.phone} />
        <Detail label="Company" value={data.companyName} />

        {data.projectName || data.projectLocation ? (
          <>
            <Text style={styles.sectionLabel}>Project</Text>
            <Detail label="Project" value={data.projectName} />
            <Detail label="Location" value={data.projectLocation} />
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Requested products</Text>
        <View style={styles.tableHead}>
          <Text style={[styles.tableHeadCell, styles.colProduct]}>Product</Text>
          <Text style={[styles.tableHeadCell, styles.colCode]}>Code</Text>
          <Text style={[styles.tableHeadCell, styles.colQuantity]}>Qty</Text>
        </View>

        {data.items.map((item, index) => (
          <View key={`${item.productCode}-${index}`} style={styles.tableRow} wrap={false}>
            <View style={styles.colProduct}>
              <Text style={styles.productName}>{item.productName}</Text>
              {item.variantLabel || item.finishLabel ? (
                <Text style={styles.productMeta}>
                  {[item.variantLabel, item.finishLabel].filter(Boolean).join(", ")}
                </Text>
              ) : null}
              {item.note ? <Text style={styles.productNote}>Note: {item.note}</Text> : null}
            </View>
            <Text style={styles.colCode}>{item.productCode}</Text>
            <Text style={styles.colQuantity}>{item.quantity}</Text>
          </View>
        ))}

        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.colProduct}>
            {data.items.length} {data.items.length === 1 ? "line" : "lines"}
          </Text>
          <Text style={styles.colCode} />
          <Text style={styles.colQuantity}>{totalQuantity}</Text>
        </View>

        <Text style={styles.sectionLabel}>Customer message</Text>
        <Text style={styles.body}>{data.message}</Text>

        {data.additionalRequirements ? (
          <>
            <Text style={styles.sectionLabel}>Additional requirements</Text>
            <Text style={styles.body}>{data.additionalRequirements}</Text>
          </>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {site.name}, {data.contact.addressLines.join(", ")}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renders the summary. The caller treats a failure as non fatal: an inquiry is
 * saved whether or not its PDF could be produced, and the document can always
 * be generated again on request.
 */
export async function renderInquirySummary(data: SummaryData): Promise<Buffer> {
  return renderToBuffer(<SummaryDocument data={data} />);
}
