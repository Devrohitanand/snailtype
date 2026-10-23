"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TuneIcon, UserIcon, CloseIcon, TrashIcon, CheckIcon } from "@/components/Icon";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  loadStats,
  Preferences,
  resetStats,
  savePreferences,
  StoredResult,
} from "@/lib/storage";

type Panel = null | "settings" | "profile";

interface DerivedStats {
  bestWpm: number;
  averageWpm: number;
  bestAccuracy: number;
  totalCompleted: number;
}

function deriveStats(results: StoredResult[]): DerivedStats {
  if (results.length === 0) {
    return { bestWpm: 0, averageWpm: 0, bestAccuracy: 0, totalCompleted: 0 };
  }
  let bestWpm = 0;
  let bestAccuracy = 0;
  let wpmSum = 0;
  for (const r of results) {
    if (r.wpm > bestWpm) bestWpm = r.wpm;
    if (r.accuracy > bestAccuracy) bestAccuracy = r.accuracy;
    wpmSum += r.wpm;
  }
  return {
    bestWpm,
    averageWpm: Math.round(wpmSum / results.length),
    bestAccuracy,
    totalCompleted: results.length,
  };
}

export default function NaBar({
  textSize,
  onTextSizeChange,
  caretVisible,
  onCaretToggle,
  soundOn,
  onSoundToggle,
  previewOn,
  onPreviewToggle,
}: {
  textSize: "sm" | "md" | "lg";
  onTextSizeChange: (size: "sm" | "md" | "lg") => void;
  caretVisible: boolean;
  onCaretToggle: (visible: boolean) => void;
  soundOn: boolean;
  onSoundToggle: (on: boolean) => void;
  previewOn: boolean;
  onPreviewToggle: (on: boolean) => void;
}) {
  const [open, setOpen] = useState<Panel>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const triggerSettingsRef = useRef<HTMLButtonElement | null>(null);
  const triggerProfileRef = useRef<HTMLButtonElement | null>(null);
  const [snapshot, setSnapshot] = useState<StoredResult[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const panelId = useId();

  // reload stats every time the profile panel opens
  useEffect(() => {
    if (open === "profile") {
      setSnapshot(loadStats().results);
      setConfirmReset(false);
    }
  }, [open]);

  // close on Escape or click outside
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(null);
        setConfirmReset(false);
        // give focus back to the button
        (open === "settings" ? triggerSettingsRef.current : triggerProfileRef.current)?.focus();
      }
    }
    function onDocumentMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const container = open === "settings" ? settingsRef.current : profileRef.current;
      const trigger =
        open === "settings" ? triggerSettingsRef.current : triggerProfileRef.current;
      if (container?.contains(target)) return;
      if (trigger?.contains(target)) return;
      setOpen(null);
      setConfirmReset(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, [open]);

  const derived = deriveStats(snapshot);

  function togglePanel(name: Exclude<Panel, null>) {
    setOpen((current) => (current === name ? null : name));
    setConfirmReset(false);
  }

  function commitPreferences(next: Preferences) {
    savePreferences(next);
  }

  function handleResetStats() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetStats();
    setSnapshot([]);
    setConfirmReset(false);
  }

  return (
    <header className="relative z-20 mx-auto w-full max-w-4xl flex items-center justify-between px-2 sm:px-4 py-3 select-none">
      <a
        href="#"
        className="flex items-center gap-3 group"
        aria-label="snailtype home"
        onClick={(e) => {
          e.preventDefault();
        }}
      >
  <img
  src="https://res.cloudinary.com/o324f6ly/image/upload/v1786147382/mecore_voink7.jpg"
  alt="SnailType logo"
  className="block h-9 w-9 rounded-[6px] border border-[#ff6b9f] object-cover transition-transform group-hover:scale-105"
/>
        <span className="text-[15px] font-medium tracking-tight text-[#f0eaed]">
          snailtype
        </span>
      </a>

      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={triggerSettingsRef}
          aria-haspopup="dialog"
          aria-expanded={open === "settings"}
          aria-controls={`${panelId}-settings`}
          onClick={() => togglePanel("settings")}
          className="flex h-9 w-9 items-center justify-center rounded text-[#94858D] hover:text-[#f0eaed] hover:bg-[rgba(70,24,46,0.25)] transition-colors"
          title="Settings"
        >
          <TuneIcon style={{ fontSize: "18px" }} />
        </button>

        {open === "settings" && (
          <div
            ref={settingsRef}
            id={`${panelId}-settings`}
            role="dialog"
            aria-label="Settings"
            className="absolute right-12 top-[56px] z-30 w-[280px] rounded-lg border border-[#30212A] bg-[#090709] p-3 shadow-[0_0_0_1px_rgba(48,33,42,0.4)]"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#94858D]">
                settings
              </span>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="text-[#94858D] hover:text-[#f0eaed]"
                aria-label="Close settings"
              >
                <CloseIcon style={{ fontSize: "14px" }} />
              </button>
            </div>

            <div className="flex flex-col gap-3 px-1 py-1">
              <SettingRow label="text size">
                <PillGroup
                  value={textSize}
                  onChange={(v) => {
                    onTextSizeChange(v);
                    commitPreferences({ ...loadPreferencesOrCurrent(textSize, caretVisible, soundOn, previewOn), textSize: v });
                  }}
                  options={[
                    { value: "sm", label: "sm" },
                    { value: "md", label: "md" },
                    { value: "lg", label: "lg" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="caret">
                <Toggle
                  checked={caretVisible}
                  onChange={(v) => {
                    onCaretToggle(v);
                    commitPreferences({ ...loadPreferencesOrCurrent(textSize, caretVisible, soundOn, previewOn), caret: v });
                  }}
                />
              </SettingRow>
              <SettingRow label="sound">
                <Toggle
                  checked={soundOn}
                  onChange={(v) => {
                    onSoundToggle(v);
                    commitPreferences({ ...loadPreferencesOrCurrent(textSize, caretVisible, soundOn, previewOn), sound: v });
                  }}
                />
              </SettingRow>
              <SettingRow label="preview">
                <Toggle
                  checked={previewOn}
                  onChange={(v) => {
                    onPreviewToggle(v);
                    commitPreferences({ ...loadPreferencesOrCurrent(textSize, caretVisible, soundOn, previewOn), preview: v });
                  }}
                />
              </SettingRow>
            </div>
          </div>
        )}

        <button
          type="button"
          ref={triggerProfileRef}
          aria-haspopup="dialog"
          aria-expanded={open === "profile"}
          aria-controls={`${panelId}-profile`}
          onClick={() => togglePanel("profile")}
          className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#ff6b9f] text-[#3f001c] hover:opacity-95 transition-opacity"
          title="Profile"
        >
          <UserIcon style={{ fontSize: "16px" }} />
        </button>

        {open === "profile" && (
          <div
            ref={profileRef}
            id={`${panelId}-profile`}
            role="dialog"
            aria-label="Profile"
            className="absolute right-0 top-[56px] z-30 w-[300px] rounded-lg border border-[#30212A] bg-[#090709] p-3 shadow-[0_0_0_1px_rgba(48,33,42,0.4)]"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#94858D]">
                profile
              </span>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="text-[#94858D] hover:text-[#f0eaed]"
                aria-label="Close profile"
              >
                <CloseIcon style={{ fontSize: "14px" }} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 px-1 pb-3">
              <StatCard label="best wpm" value={String(derived.bestWpm)} />
              <StatCard label="avg wpm" value={String(derived.averageWpm)} />
              <StatCard label="best acc" value={`${derived.bestAccuracy}%`} />
              <StatCard label="tests" value={String(derived.totalCompleted)} />
            </div>

            <div className="flex items-center justify-between px-1 pt-1 border-t border-[#30212A]/60">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#5C4E56]">
                {confirmReset ? "confirm reset?" : "personal stats"}
              </span>
              <button
                type="button"
                onClick={handleResetStats}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] uppercase tracking-[0.06em] transition-colors ${
                  confirmReset
                    ? "bg-[#ff6b9f] text-[#3f001c] hover:opacity-90"
                    : "text-[#94858D] hover:text-[#f0eaed]"
                }`}
              >
                {confirmReset ? (
                  <>
                    <CheckIcon style={{ fontSize: "12px" }} />
                    <span>yes, reset</span>
                  </>
                ) : (
                  <>
                    <TrashIcon style={{ fontSize: "12px" }} />
                    <span>reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#94858D]">{label}</span>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center rounded border border-[#30212A] bg-[#0f0e10] text-[11px] uppercase tracking-[0.06em] text-[#94858D]">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2 py-1 transition-colors ${
              selected
                ? "bg-[rgba(70,24,46,0.45)] text-[#f0eaed] border-y border-[#46182E]"
                : "hover:text-[#f0eaed]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full border border-[#30212A] transition-colors ${
        checked ? "bg-[rgba(70,24,46,0.6)]" : "bg-[#0f0e10]"
      }`}
    >
      <span
        className={`absolute top-[1px] h-3.5 w-3.5 rounded-full transition-all ${
          checked ? "left-[18px] bg-[#ff6b9f]" : "left-[2px] bg-[#94858D]"
        }`}
      />
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#30212A]/70 bg-[#0f0e10] p-2">
      <span className="block text-[10px] uppercase tracking-[0.08em] text-[#5C4E56]">
        {label}
      </span>
      <span className="block text-[16px] tabular-nums text-[#f0eaed]">{value}</span>
    </div>
  );
}

function loadPreferencesOrCurrent(
  textSize: "sm" | "md" | "lg",
  caret: boolean,
  sound: boolean,
  preview: boolean,
): Preferences {
  // start from what's saved, only change these four
  const stored = loadPreferences();
  return {
    ...stored,
    textSize,
    caret,
    sound,
    preview,
  };
}