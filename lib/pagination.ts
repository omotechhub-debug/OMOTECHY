/** Page numbers and ellipsis markers for a compact pagination control. */
export type PaginationItem = number | 'ellipsis';

/**
 * Builds a short list of page numbers with ellipses, e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 478].
 */
export function getPaginationPageItems(
  currentPage: number,
  totalPages: number,
  siblingDelta = 2
): PaginationItem[] {
  if (totalPages < 1) return [];
  if (totalPages === 1) return [1];

  const compactThreshold = siblingDelta * 2 + 5;
  if (totalPages <= compactThreshold) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const range: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - siblingDelta && i <= currentPage + siblingDelta)
    ) {
      range.push(i);
    }
  }

  const out: PaginationItem[] = [];
  let prev: number | undefined;
  for (const i of range) {
    if (prev !== undefined) {
      if (i - prev === 2) {
        out.push(prev + 1);
      } else if (i - prev > 2) {
        out.push('ellipsis');
      }
    }
    out.push(i);
    prev = i;
  }
  return out;
}
