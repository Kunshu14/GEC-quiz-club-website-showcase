export interface RoundMarkingScheme {
  preset: string;
  label: string;
  direct: number;
  pass: number;
  negative: number;
  chips: number[];
}

export interface QuizRoundSettings {
  markingSchemes?: Record<string, RoundMarkingScheme>;
}

export const MARKING_SCHEME_PRESETS: Record<string, RoundMarkingScheme> = {
  POUNCE_10_5_NEG5: {
    preset: "POUNCE_10_5_NEG5",
    label: "Pounce & Bounce (+10 / +5 / -5)",
    direct: 10,
    pass: 5,
    negative: -5,
    chips: [10, 5, -5],
  },
  STANDARD_10_5: {
    preset: "STANDARD_10_5",
    label: "Standard Bounce (+10 / +5)",
    direct: 10,
    pass: 5,
    negative: 0,
    chips: [10, 5],
  },
  HIGH_STAKES_20_10_NEG10: {
    preset: "HIGH_STAKES_20_10_NEG10",
    label: "High Stakes / Finals (+20 / +10 / -10)",
    direct: 20,
    pass: 10,
    negative: -10,
    chips: [20, 10, -10],
  },
  WRITTEN_PRELIMS_1_0: {
    preset: "WRITTEN_PRELIMS_1_0",
    label: "Written / Prelims (+1)",
    direct: 1,
    pass: 0,
    negative: 0,
    chips: [1],
  },
  NEGATIVE_PRELIMS_1_NEG: {
    preset: "NEGATIVE_PRELIMS_1_NEG",
    label: "Penalty Prelims (+1 / -0.5)",
    direct: 1,
    pass: 0,
    negative: -0.5,
    chips: [1, -0.5],
  },
  BUZZER_10_NEG10: {
    preset: "BUZZER_10_NEG10",
    label: "Buzzer / Speed (+10 / -10)",
    direct: 10,
    pass: 0,
    negative: -10,
    chips: [10, -10],
  },
  CUSTOM: {
    preset: "CUSTOM",
    label: "Custom Scheme",
    direct: 10,
    pass: 5,
    negative: -5,
    chips: [10, 5, -5],
  },
};

export const DEFAULT_MARKING_SCHEME: RoundMarkingScheme = MARKING_SCHEME_PRESETS.POUNCE_10_5_NEG5;

/**
 * Resolves the marking scheme for a specific round from quiz roundSettings,
 * with case-insensitive fallback and default fallback.
 */
export function getRoundMarkingScheme(
  roundSettings: unknown,
  roundName: string
): RoundMarkingScheme {
  if (!roundSettings || typeof roundSettings !== "object") {
    return DEFAULT_MARKING_SCHEME;
  }

  const settings = roundSettings as QuizRoundSettings;
  const schemes = settings.markingSchemes;
  if (!schemes || typeof schemes !== "object") {
    return DEFAULT_MARKING_SCHEME;
  }

  // Exact match
  if (schemes[roundName]) {
    return normalizeScheme(schemes[roundName]);
  }

  // Case-insensitive match
  const lower = roundName.trim().toLowerCase();
  for (const [key, scheme] of Object.entries(schemes)) {
    if (key.trim().toLowerCase() === lower) {
      return normalizeScheme(scheme);
    }
  }

  return DEFAULT_MARKING_SCHEME;
}

/**
 * Ensures all required fields and valid chips exist on the scheme.
 */
export function normalizeScheme(raw: Partial<RoundMarkingScheme>): RoundMarkingScheme {
  const direct = typeof raw.direct === "number" ? raw.direct : 10;
  const pass = typeof raw.pass === "number" ? raw.pass : 5;
  const negative = typeof raw.negative === "number" ? raw.negative : -5;
  const preset = raw.preset || "CUSTOM";
  const label = raw.label || (MARKING_SCHEME_PRESETS[preset]?.label ?? "Custom Scheme");

  let chips: number[] = Array.isArray(raw.chips) && raw.chips.length > 0
    ? raw.chips.filter((n) => typeof n === "number")
    : [];

  if (chips.length === 0) {
    chips = [direct];
    if (pass !== 0) chips.push(pass);
    if (negative !== 0) chips.push(negative);
  }

  return {
    preset,
    label,
    direct,
    pass,
    negative,
    chips,
  };
}

/**
 * Calculates Round Tally quick delta options sorted logically (negatives, then positives).
 */
export function getDeltaOptions(scheme: RoundMarkingScheme): number[] {
  const values = new Set<number>();

  if (scheme.negative !== 0) values.add(scheme.negative);
  if (scheme.pass !== 0) values.add(scheme.pass);
  if (scheme.direct !== 0) values.add(scheme.direct);

  for (const chip of scheme.chips) {
    if (chip !== 0) values.add(chip);
  }

  return Array.from(values).sort((a, b) => a - b);
}
