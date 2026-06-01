export const codeToTimeRange = (code: string): string => {
  try {
    // match prefix letters then number, e.g., M1, Tu4, Th10
    const m = code.match(/^([A-Za-z]+)(\d+)$/);
    if (!m) return code;
    const idx = Number(m[2]);
    if (!Number.isFinite(idx) || idx <= 0) return code;

    // Slot 1 corresponds to 08:00. Each slot is 30 minutes.
    const minutesFrom8 = (idx - 1) * 30;
    const startTotalMinutes = 8 * 60 + minutesFrom8;
    const endTotalMinutes = startTotalMinutes + 30;

    const fmt = (total: number) => {
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };

    return `${fmt(startTotalMinutes)}-${fmt(endTotalMinutes)}`;
  } catch {
    return code;
  }
};

export const codesToTimeRanges = (codes: string[]) => codes.map(codeToTimeRange);

export default { codeToTimeRange, codesToTimeRanges };
