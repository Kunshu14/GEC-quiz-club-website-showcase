"use client";

import { useState, useEffect } from "react";
import { Button, CardShell, Tag, SettingsIcon, ZapIcon, SaveIcon } from "@/components/ui";
import {
  MARKING_SCHEME_PRESETS,
  type RoundMarkingScheme,
  normalizeScheme,
  getDeltaOptions,
} from "@/lib/scoring/markingSchemes";

interface MarkingSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRound: string;
  allRounds: string[];
  currentScheme: RoundMarkingScheme;
  onSave: (scope: "ROUND" | "ALL", scheme: RoundMarkingScheme) => void | Promise<void>;
  isSaving?: boolean;
}

export function MarkingSchemeModal({
  isOpen,
  onClose,
  activeRound,
  allRounds,
  currentScheme,
  onSave,
  isSaving = false,
}: MarkingSchemeModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(currentScheme.preset || "POUNCE_10_5_NEG5");
  const [directPoints, setDirectPoints] = useState<number>(currentScheme.direct ?? 10);
  const [passPoints, setPassPoints] = useState<number>(currentScheme.pass ?? 5);
  const [negativePoints, setNegativePoints] = useState<number>(currentScheme.negative ?? -5);
  const [customChipsStr, setCustomChipsStr] = useState<string>(
    (currentScheme.chips || [10, 5, -5]).join(", ")
  );
  const [scope, setScope] = useState<"ROUND" | "ALL">("ROUND");

  // Sync state when modal opens or currentScheme changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(currentScheme.preset || "POUNCE_10_5_NEG5");
      setDirectPoints(currentScheme.direct ?? 10);
      setPassPoints(currentScheme.pass ?? 5);
      setNegativePoints(currentScheme.negative ?? -5);
      setCustomChipsStr((currentScheme.chips || [10, 5, -5]).join(", "));
      setScope("ROUND");
    }
  }, [isOpen, currentScheme]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = MARKING_SCHEME_PRESETS[presetKey];
    if (preset && presetKey !== "CUSTOM") {
      setDirectPoints(preset.direct);
      setPassPoints(preset.pass);
      setNegativePoints(preset.negative);
      setCustomChipsStr(preset.chips.join(", "));
    }
  };

  const handleDirectChange = (val: number) => {
    setDirectPoints(val);
    setSelectedPreset("CUSTOM");
  };

  const handlePassChange = (val: number) => {
    setPassPoints(val);
    setSelectedPreset("CUSTOM");
  };

  const handleNegativeChange = (val: number) => {
    setNegativePoints(val);
    setSelectedPreset("CUSTOM");
  };

  // Parse chips from customChipsStr or numeric fields
  const parseChips = (): number[] => {
    if (selectedPreset !== "CUSTOM") {
      const p = MARKING_SCHEME_PRESETS[selectedPreset];
      if (p) return p.chips;
    }

    const parsed = customChipsStr
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    if (parsed.length > 0) return parsed;

    const fallback = [directPoints];
    if (passPoints !== 0) fallback.push(passPoints);
    if (negativePoints !== 0) fallback.push(negativePoints);
    return fallback;
  };

  const previewChips = parseChips();
  const previewScheme: RoundMarkingScheme = normalizeScheme({
    preset: selectedPreset,
    direct: directPoints,
    pass: passPoints,
    negative: negativePoints,
    chips: previewChips,
  });
  const previewDeltas = getDeltaOptions(previewScheme);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalScheme: RoundMarkingScheme = normalizeScheme({
      preset: selectedPreset,
      label:
        selectedPreset !== "CUSTOM" && MARKING_SCHEME_PRESETS[selectedPreset]
          ? MARKING_SCHEME_PRESETS[selectedPreset].label
          : `Custom (${directPoints}/${passPoints}${negativePoints !== 0 ? `/${negativePoints}` : ""})`,
      direct: directPoints,
      pass: passPoints,
      negative: negativePoints,
      chips: previewChips,
    });

    onSave(scope, finalScheme);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col">
        <CardShell tone="cream" className="flex flex-col overflow-hidden shadow-[6px_6px_0_var(--ink)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b-3 border-ink bg-yellow px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <SettingsIcon size={20} className="text-ink" />
              <div>
                <h3 className="font-display text-base font-black text-ink uppercase tracking-wider">
                  Marking Scheme Configuration
                </h3>
                <p className="font-body text-xs text-ink/80">
                  Configure scoring values and quick buttons for <strong>{activeRound || "Active Round"}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-8 w-8 items-center justify-center border-2 border-ink bg-white font-display text-sm font-black text-ink shadow-[2px_2px_0_var(--ink)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-pink cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto p-5 gap-5">
            {/* Scope Selection */}
            <div>
              <label className="block font-display text-xs font-black text-ink uppercase tracking-wider mb-2">
                Apply Scope:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setScope("ROUND")}
                  className={`border-2 border-ink p-2.5 text-left font-body text-xs transition-all cursor-pointer ${
                    scope === "ROUND"
                      ? "bg-mint text-ink font-bold shadow-[2px_2px_0_var(--ink)]"
                      : "bg-white text-ink/70 hover:bg-cream"
                  }`}
                >
                  <div className="font-display font-black text-xs">This Round Only</div>
                  <div className="text-[11px] truncate">Apply only to &ldquo;{activeRound}&rdquo;</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScope("ALL")}
                  className={`border-2 border-ink p-2.5 text-left font-body text-xs transition-all cursor-pointer ${
                    scope === "ALL"
                      ? "bg-mint text-ink font-bold shadow-[2px_2px_0_var(--ink)]"
                      : "bg-white text-ink/70 hover:bg-cream"
                  }`}
                >
                  <div className="font-display font-black text-xs flex items-center gap-1.5">
                    <ZapIcon size={13} />
                    All Rounds in Quiz
                  </div>
                  <div className="text-[11px] truncate">Apply across all {allRounds.length} rounds</div>
                </button>
              </div>
            </div>

            {/* Presets List */}
            <div>
              <label className="block font-display text-xs font-black text-ink uppercase tracking-wider mb-2">
                Select Marking Scheme Preset:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(MARKING_SCHEME_PRESETS).map(([key, preset]) => {
                  const isSelected = selectedPreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectPreset(key)}
                      className={`flex flex-col text-left border-2 border-ink p-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-yellow text-ink shadow-[2px_2px_0_var(--ink)] font-bold"
                          : "bg-white text-ink/80 hover:bg-cream"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-black">{preset.label}</span>
                        {isSelected && <Tag tone="ink">Active</Tag>}
                      </div>
                      <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-ink/70">
                        <span>Direct: +{preset.direct}</span>
                        <span>• Pass: {preset.pass > 0 ? `+${preset.pass}` : "0"}</span>
                        {preset.negative !== 0 && (
                          <span className="text-pink font-bold">• Neg: {preset.negative}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Numeric Customization */}
            <div className="border-2 border-ink bg-white p-3.5 shadow-[2px_2px_0_var(--ink)]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-xs font-black uppercase text-ink">
                  Point Values & Steppers:
                </span>
                {selectedPreset === "CUSTOM" && (
                  <Tag tone="pink">Custom Scheme Active</Tag>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold text-ink mb-1">
                    Direct Correct:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={directPoints}
                      onChange={(e) => handleDirectChange(parseFloat(e.target.value) || 0)}
                      className="w-full border-2 border-ink bg-cream/40 px-2 py-1 font-mono font-bold text-sm shadow-[1px_1px_0_var(--ink)] focus:outline-none focus:bg-yellow/20 text-center"
                    />
                    <span className="font-mono text-xs font-bold text-ink/60">pts</span>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold text-ink mb-1">
                    Bounce / Pass:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={passPoints}
                      onChange={(e) => handlePassChange(parseFloat(e.target.value) || 0)}
                      className="w-full border-2 border-ink bg-cream/40 px-2 py-1 font-mono font-bold text-sm shadow-[1px_1px_0_var(--ink)] focus:outline-none focus:bg-mint/20 text-center"
                    />
                    <span className="font-mono text-xs font-bold text-ink/60">pts</span>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold text-ink mb-1">
                    Negative / Penalty:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={negativePoints}
                      onChange={(e) => handleNegativeChange(parseFloat(e.target.value) || 0)}
                      className="w-full border-2 border-ink bg-cream/40 px-2 py-1 font-mono font-bold text-sm shadow-[1px_1px_0_var(--ink)] focus:outline-none focus:bg-pink/20 text-center text-pink font-black"
                    />
                    <span className="font-mono text-xs font-bold text-ink/60">pts</span>
                  </div>
                </div>
              </div>

              {/* Custom Chips String */}
              <div className="mt-3 pt-2.5 border-t border-ink/20">
                <label className="block font-mono text-[11px] font-bold text-ink mb-1">
                  Quick Action Buttons (Comma-separated chips):
                </label>
                <input
                  type="text"
                  value={customChipsStr}
                  onChange={(e) => {
                    setCustomChipsStr(e.target.value);
                    setSelectedPreset("CUSTOM");
                  }}
                  placeholder="e.g. 10, 5, -5"
                  className="w-full border-2 border-ink bg-white px-2 py-1 font-mono font-bold text-xs shadow-[1px_1px_0_var(--ink)] focus:outline-none focus:bg-yellow/15"
                />
                <span className="text-[10px] font-body text-ink/60 mt-0.5 block">
                  Defines the 1-click score chips in Question Matrix Mode and increment steppers in Round Tally Mode.
                </span>
              </div>
            </div>

            {/* Live Interactive Preview */}
            <div className="border-2 border-dashed border-ink bg-cream/60 p-3 flex flex-col gap-2">
              <span className="font-display text-xs font-black uppercase text-ink">
                Live Buttons Preview:
              </span>

              {/* Question Matrix Preview */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-ink/70">Question Matrix:</span>
                <div className="flex items-center gap-1 border border-ink/40 bg-white p-1">
                  {previewChips.map((chip, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 border text-xs font-mono font-bold ${
                        chip > 0
                          ? chip >= 10
                            ? "bg-yellow text-ink border-ink"
                            : "bg-mint text-ink border-ink"
                          : chip < 0
                            ? "bg-pink text-ink border-ink font-black"
                            : "bg-white text-ink border-ink/40"
                      }`}
                    >
                      {chip > 0 ? `+${chip}` : chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* Round Tally Preview */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-ink/70">Round Tally Steppers:</span>
                <div className="flex items-center gap-1 border border-ink/40 bg-white p-1">
                  {previewDeltas.map((delta, idx) => (
                    <span
                      key={idx}
                      className={`h-6 px-1.5 flex items-center justify-center border text-xs font-mono font-bold ${
                        delta < 0
                          ? "bg-pink/20 text-pink border-ink"
                          : "bg-white text-ink border-ink"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t-2 border-ink">
              <Button
                type="button"
                variant="underline"
                onClick={onClose}
                disabled={isSaving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                {isSaving ? "Saving Scheme..." : (
                  <>
                    <SaveIcon size={14} />
                    Apply & Save Scheme
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardShell>
      </div>
    </div>
  );
}
