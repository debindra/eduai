/**
 * The `docx` library swaps page width/height when landscape is set.
 * Apply this corrective transform once, shared by every landscape template.
 */
export interface PageSize {
  width: number;
  height: number;
}

const A4_PORTRAIT: PageSize = { width: 11906, height: 16838 }; // DXA (twips)

export function applyLandscapeFix(size: PageSize = A4_PORTRAIT): PageSize {
  // Corrective swap: library will swap again when landscape=true, yielding intended landscape.
  return { width: size.height, height: size.width };
}

export function landscapePageSize(): PageSize {
  return applyLandscapeFix(A4_PORTRAIT);
}
