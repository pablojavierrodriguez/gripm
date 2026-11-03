export const normalizePriorityNum = (p?: string): number => {
  if (!p) return 2;
  const lower = String(p).toLowerCase().trim();
  if (lower === 'p0' || lower === 'urgent') return 0;
  if (lower === 'p1' || lower === 'high') return 1;
  if (lower === 'p2' || lower === 'medium') return 2;
  if (lower === 'p3' || lower === 'low') return 3;
  return 2;
};

export const normalizeStatusNum = (s?: string): number => {
  if (!s) return 99;
  const sOrder: Record<string, number> = {
    ideas: 0,
    backlog: 1,
    draft: 2,
    doing: 3,
    in_progress: 3,
    review: 4,
    testing_qa: 5,
    ready: 6,
    finish: 7,
    done: 8,
    dismissed: 9,
    cancelled: 10
  };
  return sOrder[s.toLowerCase().trim()] ?? 99;
};
