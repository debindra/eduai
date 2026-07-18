export interface DocgenRenderResult {
  templateType: string;
  childId: string | null;
  sectionId: string | null;
  sourceRowHash: string;
  storageRef: string;
  documentRenderId: string;
}

/** Thin HTTP client for the isolated DocGen service. */
export class DocgenClient {
  constructor(private readonly baseUrl: string) {}

  async renderAssessmentLog(childId: string): Promise<DocgenRenderResult> {
    return this.get(`/docgen/assessment-log/${childId}`);
  }

  async renderTransitionFile(childId: string): Promise<DocgenRenderResult> {
    return this.get(`/docgen/transition-file/${childId}`);
  }

  async renderLeavingPack(childId: string): Promise<DocgenRenderResult> {
    return this.post(`/docgen/leaving-pack/${childId}`);
  }

  async renderInspectionPack(
    sectionId: string,
    dateStart?: string,
    dateEnd?: string,
  ): Promise<DocgenRenderResult> {
    return this.post('/docgen/inspection-pack', { sectionId, dateStart, dateEnd });
  }

  async renderAnnex2(childId: string, terminalId?: string): Promise<DocgenRenderResult> {
    const q = terminalId ? `?terminalId=${encodeURIComponent(terminalId)}` : '';
    return this.get(`/docgen/annex-2/${childId}${q}`);
  }

  async renderAnnex3(childId: string, subjectId: string): Promise<DocgenRenderResult> {
    return this.get(
      `/docgen/annex-3/${childId}?subjectId=${encodeURIComponent(subjectId)}`,
    );
  }

  async renderAnnex4(childId: string): Promise<DocgenRenderResult> {
    return this.get(`/docgen/annex-4/${childId}`);
  }

  private async get(path: string): Promise<DocgenRenderResult> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`DocGen ${path} failed: ${res.status}`);
    }
    return (await res.json()) as DocgenRenderResult;
  }

  private async post(path: string, body?: unknown): Promise<DocgenRenderResult> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(`DocGen ${path} failed: ${res.status}`);
    }
    return (await res.json()) as DocgenRenderResult;
  }
}

export const DOCGEN_CLIENT = Symbol('DOCGEN_CLIENT');
