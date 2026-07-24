/**
 * Assessment Pack dual-render (BidyaSetu v3.3 9 / Assessment Pack Spec v1.1).
 * One generation → interactive web payload + self-contained WhatsApp/PDF digest.
 * Zero AI in this adapter — content assembly is deterministic over pack rows.
 */

export interface PackMilestoneItem {
  code: string;
  statement: string;
  areaCode?: string;
  descriptors: string[];
}

export interface PackActivityItem {
  title: string;
  steps: string[];
}

export interface PackSource {
  schoolName: string;
  periodLabel: string;
  items: PackMilestoneItem[];
  activities: PackActivityItem[];
}

export interface WebPackPayload {
  kind: 'web_interactive';
  schoolName: string;
  periodLabel: string;
  items: PackMilestoneItem[];
  activities: PackActivityItem[];
  sweepReady: true;
}

export interface WhatsAppDigestPayload {
  kind: 'whatsapp_pdf_digest';
  /** Full text usable without opening the web — never a teaser. */
  messageBody: string;
  pdfSections: {
    heading: string;
    lines: string[];
  }[];
  selfContained: true;
}

export interface DualRenderPack {
  web: WebPackPayload;
  whatsapp: WhatsAppDigestPayload;
}

/**
 * Dual-render from one source. WhatsApp digest must include active items,
 * starter activities, and descriptors so a teacher can assess offline.
 */
export function renderDualPack(source: PackSource): DualRenderPack {
  if (source.items.length === 0) {
    throw new Error('Assessment pack requires at least one active item');
  }

  const web: WebPackPayload = {
    kind: 'web_interactive',
    schoolName: source.schoolName,
    periodLabel: source.periodLabel,
    items: source.items,
    activities: source.activities,
    sweepReady: true,
  };

  const itemLines = source.items.map((item) => {
    const desc =
      item.descriptors.length > 0
        ? ` Bands: ${item.descriptors.join('; ')}`
        : '';
    return `• ${item.code}: ${item.statement}${desc}`;
  });

  const activityLines =
    source.activities.length > 0
      ? source.activities.flatMap((a) => [
          `• ${a.title}`,
          ...a.steps.map((s) => `  - ${s}`),
        ])
      : ['• (No starter activities listed for this period)'];

  const messageBody = [
    `${source.schoolName} — Assessment pack (${source.periodLabel})`,
    '',
    'Active this period (usable without opening the web):',
    ...itemLines,
    '',
    'Starter activities:',
    ...activityLines,
    '',
    'Place each child with a teacher tap. Do not invent levels.',
  ].join('\n');

  const whatsapp: WhatsAppDigestPayload = {
    kind: 'whatsapp_pdf_digest',
    messageBody,
    pdfSections: [
      {
        heading: `Active — ${source.periodLabel}`,
        lines: itemLines,
      },
      {
        heading: 'Starter activities',
        lines: activityLines,
      },
    ],
    selfContained: true,
  };

  return { web, whatsapp };
}

/** Guard: WA digest must not be a teaser that requires the web. */
export function assertDigestSelfContained(digest: WhatsAppDigestPayload): void {
  const lower = digest.messageBody.toLowerCase();
  if (
    lower.includes('open the link') ||
    lower.includes('tap here to view') ||
    lower.includes('see the web pack')
  ) {
    throw new Error('Dual-render violation: WhatsApp digest must not be a web teaser');
  }
  if (!digest.selfContained) {
    throw new Error('Dual-render violation: digest must be marked selfContained');
  }
  if (digest.pdfSections.length === 0) {
    throw new Error('Dual-render violation: PDF digest needs sections');
  }
}
