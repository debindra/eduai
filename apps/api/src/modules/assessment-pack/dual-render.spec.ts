import { describe, expect, it } from 'vitest';
import {
  assertDigestSelfContained,
  renderDualPack,
} from './dual-render';

describe('renderDualPack', () => {
  const source = {
    schoolName: 'School X',
    periodLabel: 'Baisakh 2083',
    items: [
      {
        code: 'PP-LANG-001',
        statement: 'Points to a familiar picture when named',
        areaCode: 'language',
        descriptors: ['not yet', 'developing', 'can do'],
      },
    ],
    activities: [
      {
        title: 'Picture naming circle',
        steps: ['Show 4 pictures', 'Ask child to point', 'Note response'],
      },
    ],
  };

  it('produces web interactive + self-contained WhatsApp digest from one source', () => {
    const pack = renderDualPack(source);
    expect(pack.web.kind).toBe('web_interactive');
    expect(pack.web.sweepReady).toBe(true);
    expect(pack.whatsapp.kind).toBe('whatsapp_pdf_digest');
    expect(pack.whatsapp.selfContained).toBe(true);
    expect(pack.whatsapp.messageBody).toContain('PP-LANG-001');
    expect(pack.whatsapp.messageBody).toContain('Picture naming circle');
    expect(pack.whatsapp.messageBody).toContain('can do');
    assertDigestSelfContained(pack.whatsapp);
  });

  it('rejects empty packs', () => {
    expect(() =>
      renderDualPack({ ...source, items: [] }),
    ).toThrow(/at least one/);
  });

  it('rejects teaser-style digests', () => {
    expect(() =>
      assertDigestSelfContained({
        kind: 'whatsapp_pdf_digest',
        messageBody: 'Your pack is ready — open the link to view',
        pdfSections: [{ heading: 'x', lines: ['y'] }],
        selfContained: true,
      }),
    ).toThrow(/teaser/);
  });
});
