// Canonical NAT (Numerical Answer Type) parsing and scoring.
//
// This is the ONLY place NAT correctness is computed. Every consumer
// (practice grading, results, statistics, QA scripts) must import
// `isNatAnswerCorrect` / `parseNatAnswer` from here rather than
// re-implementing comparison logic.
//
// ── Answer grammar (derived from inspecting the actual dataset, not assumed) ──
// A stored `answer` string is one or more ';'-separated segments, each of
// which is either:
//   - a single value:  "42"  "42.0"  "-2.1"
//   - a range:          "197.9 : 198.1"   "195:195"   "-2.1:-1.9"
// Whitespace around ':' and ';' is insignificant. A range with min===max
// (e.g. "195:195") is a valid range that happens to accept one value.
// Multi-segment answers such as "13.3:13.3;13.5:13.5" mean "either of
// these is acceptable" (found in 2 of 508 NAT questions — a real, valid
// authoring pattern, not a data error).

export type NatSegment =
  | { type: 'single'; value: number }
  | { type: 'range'; min: number; max: number };

export type ParsedNatAnswer =
  | { type: 'valid'; segments: NatSegment[] }
  | { type: 'invalid' };

/**
 * Parses a single numeric token safely. Uses the `Number()` constructor
 * rather than `parseFloat`, because `parseFloat` silently accepts garbage
 * suffixes (`parseFloat("12abc") === 12`) while `Number("12abc") === NaN`.
 * That distinction matters for requirement: "12abc" must be treated as
 * invalid input, not silently parsed as 12.
 */
export function parseNumericToken(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseNatSegment(raw: string): NatSegment | null {
  const parts = raw.split(':');
  if (parts.length === 1) {
    const value = parseNumericToken(parts[0]);
    return value === null ? null : { type: 'single', value };
  }
  if (parts.length === 2) {
    const a = parseNumericToken(parts[0]);
    const b = parseNumericToken(parts[1]);
    if (a === null || b === null) return null;
    return a <= b ? { type: 'range', min: a, max: b } : { type: 'range', min: b, max: a };
  }
  // More than one colon in a single segment (e.g. "1:2:3") is not a
  // recognized shape — invalid rather than guessed at.
  return null;
}

/** Normalizes a stored NAT answer string into a structured representation. Never throws. */
export function parseNatAnswer(answer: string | null | undefined): ParsedNatAnswer {
  if (answer == null) return { type: 'invalid' };
  const raw = answer.trim();
  if (!raw) return { type: 'invalid' };

  const rawSegments = raw.split(';').map(s => s.trim()).filter(Boolean);
  if (!rawSegments.length) return { type: 'invalid' };

  const segments: NatSegment[] = [];
  for (const seg of rawSegments) {
    const parsed = parseNatSegment(seg);
    if (!parsed) return { type: 'invalid' };
    segments.push(parsed);
  }
  return { type: 'valid', segments };
}

/**
 * Tolerance policy for single-value comparisons: relative 1e-6 of the
 * expected magnitude, with an absolute floor of 1e-9 for values near zero.
 * This is the exact rule the previous single-value-only implementation
 * used (`Math.max(1e-9, Math.abs(expected) * 1e-6)`) — preserved as-is,
 * not a new policy. Range boundaries reuse the same tolerance so that
 * genuine floating-point representation noise at the edges doesn't cause
 * a false rejection, while staying far too small to admit values like
 * 197.89 against a 197.9–198.1 range (which must be rejected).
 */
export function natTolerance(magnitude: number): number {
  return Math.max(1e-9, Math.abs(magnitude) * 1e-6);
}

function segmentAccepts(segment: NatSegment, userValue: number): boolean {
  if (segment.type === 'single') {
    return Math.abs(segment.value - userValue) <= natTolerance(segment.value);
  }
  const lo = segment.min - natTolerance(segment.min);
  const hi = segment.max + natTolerance(segment.max);
  return userValue >= lo && userValue <= hi;
}

/**
 * The single canonical NAT correctness check. Returns false (never
 * throws) for any invalid/unparseable expected or user input — including
 * "", "abc", "12abc", "1:2:3", or a malformed stored answer.
 */
export function isNatAnswerCorrect(expectedRaw: string | null | undefined, userRaw: string | null | undefined): boolean {
  const parsed = parseNatAnswer(expectedRaw);
  if (parsed.type === 'invalid') return false;
  const userValue = parseNumericToken(userRaw);
  if (userValue === null) return false;
  return parsed.segments.some(seg => segmentAccepts(seg, userValue));
}
