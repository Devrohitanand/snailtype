"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NaBar from "@/components/NaBar";
import Footer from "@/components/Footer";
import { KeyboardIcon, RestartIcon } from "@/components/Icon";
import {
  PASSAGES,
  PREVIEW_PHRASES,
  pickPassage,
  truncateToWords,
} from "@/lib/passages";
import {
  buildResult,
  completedWordCount,
  computeAccuracy,
  computeWpm,
  tokensFor,
  Token,
} from "@/lib/typing-engine";
import {
  appendResult,
  DEFAULT_PREFERENCES,
  loadPreferences,
  loadStats,
  Preferences,
  saveStats,
  StoredResult,
  StoredStats,
} from "@/lib/storage";

type Mode = "time" | "words";

interface LiveStateSnapshot {
  wpmVisible: string;
  accVisible: string;
  errVisible: string;
  progressVisible: string;
  progressLabel: "time" | "words";
}

const TIME_OPTIONS = [15, 30, 60] as const;
const WORDS_OPTIONS = [10, 25, 50] as const;

const TEXT_SIZE_TO_PX: Record<Preferences["textSize"], number> = {
  sm: 22,
  md: 28,
  lg: 32,
};
const TEXT_SIZE_LINE_HEIGHT: Record<Preferences["textSize"], number> = {
  sm: 38,
  md: 46,
  lg: 52,
};

// keep in sync with the .caret height in globals.css
const CARET_HEIGHT_PX = 34;

export default function TypingTest() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [stats, setStats] = useState<StoredStats>({ results: [] });
  const [statsLoaded, setStatsLoaded] = useState(false);

  // load saved prefs and stats once on mount
  useEffect(() => {
    setPrefs(loadPreferences());
    const stored = loadStats();
    setStats(stored);
    setStatsLoaded(true);
  }, []);

  const [mode, setMode] = useState<Mode>("time");
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [wordsLimit, setWordsLimit] = useState<number>(25);

  const [isPreview, setPreview] = useState<boolean>(true);
  const [previewPhraseIndex, setPreviewPhraseIndex] = useState(0);
  const [previewCharIndex, setPreviewCharIndex] = useState(0);

  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [passage, setPassage] = useState<string>("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState<number>(timeLimit);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const [liveSnapshot, setLiveSnapshot] = useState<LiveStateSnapshot>({
    wpmVisible: "00",
    accVisible: "100%",
    errVisible: "0",
    progressVisible: `${timeLimit}s`,
    progressLabel: "time",
  });
  const [result, setResult] = useState<{
    wpm: number;
    accuracy: number;
    correct: number;
    errors: number;
    durationSec: number;
  } | null>(null);

  const stageCardRef = useRef<HTMLDivElement | null>(null);
  const wordsFlowRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const finishTestRef = useRef<(() => void) | null>(null);
  const previewCharIndexRef = useRef(0);
  const previewPhraseIndexRef = useRef(0);
  const previewActiveRef = useRef(true);
  const reduceMotionRef = useRef(false);

  // latest state for the key handler, so it doesn't re-bind on every change
  const stateRef = useRef({
    isPreview: true,
    testStarted: false,
    testFinished: false,
    mode: "time" as Mode,
    timeLimit: 30,
    wordsLimit: 25,
    timerRemaining: 30,
    currentIndex: 0,
    correctCount: 0,
    errorCount: 0,
    startMs: null as number | null,
    passage: "",
    tokens: [] as Token[],
  });

  useEffect(() => {
    stateRef.current = {
      isPreview: isPreview,
      testStarted,
      testFinished,
      mode,
      timeLimit,
      wordsLimit,
      timerRemaining,
      currentIndex,
      correctCount,
      errorCount,
      startMs,
      passage,
      tokens,
    };
  }, [
    isPreview,
    testStarted,
    testFinished,
    mode,
    timeLimit,
    wordsLimit,
    timerRemaining,
    currentIndex,
    correctCount,
    errorCount,
    startMs,
    passage,
    tokens,
  ]);

  // keep the phrase index in a ref so the key handler sees what's on screen
  useEffect(() => {
    previewPhraseIndexRef.current = previewPhraseIndex;
  }, [previewPhraseIndex]);

  // check reduced motion so the typewriter and blink can be turned off
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const handler = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
    };
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  /** pick a new passage for the current mode */
  const choosePassage = useCallback(
    (previousPassage: string | null): string => {
      const candidate = pickPassage(previousPassage);
      if (mode === "words") {
        return truncateToWords(candidate, wordsLimit);
      }
      return candidate;
    },
    [mode, wordsLimit],
  );

  /** Place the caret on the glyph that's actually rendered. Preview uses
   * the first character, typing uses the current token, so the caret
   * doesn't jump when preview turns into the real test. */
  const updateCaretPosition = useCallback((liveIndex?: number) => {
    const caret = caretRef.current;
    const stage = stageCardRef.current;
    const flow = wordsFlowRef.current;
    if (!caret || !stage || !flow) return;

    let glyph: DOMRect | null = null;
    if (flow.querySelector("[data-token-index]")) {
      // typing mode
      const idx = liveIndex ?? stateRef.current.currentIndex;
      const target = flow.querySelector<HTMLElement>(`[data-token-index="${idx}"]`);
      if (!target) return; // past the last token: keep the last position
      glyph = target.getBoundingClientRect();
    } else {
      // preview mode: use the first rendered character
      const walker = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.textContent) node = walker.nextNode();
      if (!node) return;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 1);
      glyph = range.getBoundingClientRect();
    }
    if (glyph.width === 0 && glyph.height === 0) return; // not laid out yet

    // the caret sits inside the card's border, so measure from there
    const stageRect = stage.getBoundingClientRect();
    const originX = stageRect.left + stage.clientLeft;
    const originY = stageRect.top + stage.clientTop;

    const x = glyph.left - originX;
    const y = glyph.top - originY + (glyph.height - CARET_HEIGHT_PX) / 2;

    // round to device pixels so the bar stays sharp
    const dpr = window.devicePixelRatio || 1;
    const sx = Math.round(x * dpr) / dpr;
    const sy = Math.round(y * dpr) / dpr;
    caret.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
    // stay hidden until the first measurement so it doesn't flash in the corner on load
    caret.dataset.ready = "true";
  }, []);

  /** refresh the stats strip in one state update */
  const refreshLiveMetrics = useCallback(
    (overrides?: Partial<{ currentIndex: number; correctCount: number; errorCount: number; timerRemaining: number; startMs: number | null; testStarted: boolean }>) => {
      const ref = stateRef.current;
      const cc = overrides?.correctCount ?? ref.correctCount;
      const ec = overrides?.errorCount ?? ref.errorCount;
      const ts = overrides?.testStarted ?? ref.testStarted;
      const idx = overrides?.currentIndex ?? ref.currentIndex;
      const rem = overrides?.timerRemaining ?? ref.timerRemaining;
      const start = overrides?.startMs ?? ref.startMs;

      if (!ts || start == null) {
        setLiveSnapshot({
          wpmVisible: "00",
          accVisible: "100%",
          errVisible: "0",
          progressVisible:
            mode === "time" ? `${timeLimit}s` : `0/${wordsLimit}`,
          progressLabel: mode === "time" ? "time" : "words",
        });
        return;
      }
      const elapsed = Date.now() - start;
      const wpm = computeWpm(cc, elapsed);
      const acc = computeAccuracy(cc, ec);
      let progress: string;
      if (mode === "time") {
        progress = `${Math.max(0, rem)}s`;
      } else {
        progress = `${completedWordCount(ref.passage, idx)}/${wordsLimit}`;
      }
      setLiveSnapshot({
        wpmVisible: String(Math.max(0, wpm)).padStart(2, "0"),
        accVisible: `${acc}%`,
        errVisible: String(ec),
        progressVisible: progress,
        progressLabel: mode === "time" ? "time" : "words",
      });
    },
    [mode, timeLimit, wordsLimit],
  );

  /** stop the timer and the preview timeouts */
  const clearTimers = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    if (previewTimeoutRef.current !== null) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  /** reset everything for a new test (restart, mode change or new passage) */
  const setupNewTest = useCallback(
    (passageOverride?: string) => {
      clearTimers();
      const fresh = passageOverride ?? choosePassage(passage || null);
      const freshTokens = tokensFor(fresh);
      stateRef.current.passage = fresh;
      stateRef.current.tokens = freshTokens;
      setPassage(fresh);
      setTokens(freshTokens);
      setCurrentIndex(0);
      setCorrectCount(0);
      setErrorCount(0);
      setTestStarted(false);
      setTestFinished(false);
      setStartMs(null);
      setElapsedMs(0);
      setTimerRemaining(timeLimit);
      setResult(null);
      previewCharIndexRef.current = 0;
      setPreviewCharIndex(0);
      setPreview(true);
      stateRef.current.isPreview = true;
      previewActiveRef.current = true;
      refreshLiveMetrics({
        currentIndex: 0,
        correctCount: 0,
        errorCount: 0,
        timerRemaining: timeLimit,
        startMs: null,
        testStarted: false,
      });
    },
    [clearTimers, choosePassage, passage, refreshLiveMetrics, timeLimit],
  );

  /** save a finished test to localStorage and state */
  const persistResult = useCallback(
    (wpm: number, accuracy: number, correct: number, errors: number, durationMs: number) => {
      const target = stateRef.current.mode === "time" ? stateRef.current.timeLimit : stateRef.current.wordsLimit;
      const record: StoredResult = {
        finishedAt: Date.now(),
        wpm,
        accuracy,
        correct,
        errors,
        durationMs,
        mode: stateRef.current.mode,
        target,
      };
      setStats((prev) => {
        const next = appendResult(prev, record);
        saveStats(next);
        return next;
      });
    },
    [],
  );

  /** wrap up the test: stop timers, work out the result and save it */
  const finishTest = useCallback(() => {
    if (stateRef.current.testFinished) return;
    clearTimers();
    const finalElapsedMs =
      stateRef.current.startMs != null ? Date.now() - stateRef.current.startMs : 0;
    const durationSec = Math.max(1, Math.round(finalElapsedMs / 1000));
    const computed = buildResult({
      correctChars: stateRef.current.correctCount,
      errorChars: stateRef.current.errorCount,
      elapsedMs: finalElapsedMs,
    });
    stateRef.current.testFinished = true;
    stateRef.current.timerRemaining = 0;
    setTestFinished(true);
    setElapsedMs(finalElapsedMs);
    setTimerRemaining(0);
    setResult({
      wpm: computed.wpm,
      accuracy: computed.accuracy,
      correct: computed.correctChars,
      errors: computed.errorChars,
      durationSec,
    });
    persistResult(
      computed.wpm,
      computed.accuracy,
      computed.correctChars,
      computed.errorChars,
      finalElapsedMs,
    );
  }, [clearTimers, persistResult]);

  // ref so the timer always calls the latest finishTest
  finishTestRef.current = finishTest;

  /** start the timer on the first keystroke */
  const beginLiveTest = useCallback(() => {
    if (stateRef.current.testStarted) return;
    const start = Date.now();
    stateRef.current.startMs = start;
    stateRef.current.testStarted = true;
    setStartMs(start);
    setTestStarted(true);
    refreshLiveMetrics({
      currentIndex: stateRef.current.currentIndex,
      correctCount: stateRef.current.correctCount,
      errorCount: stateRef.current.errorCount,
      timerRemaining: stateRef.current.timerRemaining,
      startMs: start,
      testStarted: true,
    });

    if (stateRef.current.mode === "time") {
      timerIdRef.current = window.setInterval(() => {
        const next = stateRef.current.timerRemaining - 1;
        const finished = next <= 0;
        stateRef.current.timerRemaining = Math.max(0, next);
        setTimerRemaining(stateRef.current.timerRemaining);
        if (stateRef.current.testStarted && !stateRef.current.testFinished) {
          refreshLiveMetrics();
        }
        if (finished) {
          finishTestRef.current?.();
        }
      }, 1000);
    } else {
      timerIdRef.current = window.setInterval(() => {
        if (stateRef.current.testStarted && !stateRef.current.testFinished) {
          refreshLiveMetrics();
        }
      }, 500);
    }
  }, [refreshLiveMetrics]);

  // typewriter animation for the preview phrase
  useEffect(() => {
    if (!prefs.preview || reduceMotionRef.current) {
      // preview off or reduced motion: show the first phrase without animating
      if (!stateRef.current.passage) {
        const first = PREVIEW_PHRASES[0]!;
        setPreviewCharIndex(first.length);
        previewCharIndexRef.current = first.length;
      }
      return;
    }

    let cancelled = false;
    function step() {
      if (cancelled || !previewActiveRef.current) return;
      const phrase = PREVIEW_PHRASES[previewPhraseIndex]!;
      previewPhraseIndexRef.current = previewPhraseIndex;
      previewCharIndexRef.current += 1;
      const idx = previewCharIndexRef.current;
      setPreviewCharIndex(idx);

      if (idx <= phrase.length) {
        const delay = 65 + Math.floor(Math.random() * 45);
        previewTimeoutRef.current = window.setTimeout(step, delay);
      } else {
        previewTimeoutRef.current = window.setTimeout(() => {
          if (cancelled || !previewActiveRef.current) return;
          previewCharIndexRef.current = 0;
          setPreviewCharIndex(0);
          setPreviewPhraseIndex((i) => {
            previewPhraseIndexRef.current = (i + 1) % PREVIEW_PHRASES.length;
            return previewPhraseIndexRef.current;
          });
        }, 2200);
      }
    }
    previewTimeoutRef.current = window.setTimeout(step, 650);
    return () => {
      cancelled = true;
      if (previewTimeoutRef.current !== null) {
        window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    };
  }, [previewPhraseIndex, prefs.preview]);

  // window keydown listener, the hidden input is only for IME / mobile keyboards
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ref = stateRef.current;

      // any key leaves preview and starts a test with the phrase on screen
      if (ref.isPreview) {
        if (
          ["Control", "Alt", "Shift", "Meta", "Tab", "Escape", "CapsLock"].includes(e.key)
        )
          return;
        e.preventDefault();
        const displayedPhrase = PREVIEW_PHRASES[previewPhraseIndexRef.current] ?? PREVIEW_PHRASES[0]!;
        exitPreviewAndArm(displayedPhrase);
        // pass the same key to the new test so the first press counts
        if (shouldConsumeKey(e)) {
          if (e.key === "Backspace") handleBackspace();
          else handleCharacterInput(e.key === " " ? " " : e.key);
        }
        return;
      }

      // results screen: Enter retries, Esc gives a new passage
      if (ref.testFinished) {
        if (e.key === "Enter") {
          e.preventDefault();
          setupNewTest(ref.passage);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setupNewTest(choosePassage(ref.passage));
          return;
        }
        return;
      }

      // tab restarts the test
      if (e.key === "Tab") {
        e.preventDefault();
        setupNewTest(ref.passage);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setupNewTest(choosePassage(ref.passage));
        return;
      }

      if (e.key === "Enter") {
        // enter restarts too
        e.preventDefault();
        setupNewTest(ref.passage);
        return;
      }

      // let browser shortcuts through
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        handleCharacterInput(" ");
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        handleCharacterInput(e.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupNewTest]);

  function exitPreviewAndArm(targetPassage: string) {
    clearTimers();
    previewActiveRef.current = false;
    setPreview(false);
    stateRef.current.isPreview = false;
    // swap the preview for a real passage
    const freshTokens = tokensFor(targetPassage);
    stateRef.current.passage = targetPassage;
    stateRef.current.tokens = freshTokens;
    setPassage(targetPassage);
    setTokens(freshTokens);
    setCurrentIndex(0);
    setCorrectCount(0);
    setErrorCount(0);
    setTimerRemaining(timeLimit);
    setStartMs(null);
    setElapsedMs(0);
    setTestStarted(false);
    setTestFinished(false);
    refreshLiveMetrics({
      currentIndex: 0,
      correctCount: 0,
      errorCount: 0,
      timerRemaining: timeLimit,
      startMs: null,
      testStarted: false,
    });
  }

  function shouldConsumeKey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (["Control", "Alt", "Shift", "Meta", "Tab", "Escape", "CapsLock"].includes(e.key))
      return false;
    return e.key === "Backspace" || e.key === " " || e.code === "Space" || e.key.length === 1;
  }

  function getRandomPassage(): string {
    return choosePassage(passage || null);
  }

  function handleBackspace() {
    if (stateRef.current.testFinished) return;
    if (stateRef.current.currentIndex === 0) return;
    const idxPrev = stateRef.current.currentIndex - 1;
    const token = stateRef.current.tokens[idxPrev]!;
    if (token.status === "correct") {
      const next = Math.max(0, stateRef.current.correctCount - 1);
      stateRef.current.correctCount = next;
      setCorrectCount(next);
    } else if (token.status === "incorrect") {
      const next = Math.max(0, stateRef.current.errorCount - 1);
      stateRef.current.errorCount = next;
      setErrorCount(next);
    }
    token.status = "untyped";
    stateRef.current.currentIndex = idxPrev;
    setCurrentIndex(idxPrev);
    // update the span directly instead of re-rendering
    const span = wordsFlowRef.current?.querySelector<HTMLElement>(
      `[data-token-index="${idxPrev}"]`,
    );
    if (span) {
      span.className = tokenUntypedClass;
      span.removeAttribute("data-status");
    }
    refreshLiveMetrics({
      currentIndex: idxPrev,
      correctCount: stateRef.current.correctCount,
      errorCount: stateRef.current.errorCount,
    });
  }

  function handleCharacterInput(char: string) {
    if (stateRef.current.testFinished) return;
    beginLiveTest();

    if (
      stateRef.current.currentIndex >= stateRef.current.tokens.length &&
      stateRef.current.mode !== "words"
    ) {
      finishTest();
      return;
    }

    const idx = stateRef.current.currentIndex;
    const token = stateRef.current.tokens[idx];
    if (!token) {
      if (stateRef.current.mode === "words") {
        finishTest();
      }
      return;
    }

    const isCorrect = char === token.char;
    token.status = isCorrect ? "correct" : "incorrect";
    const nextCorrect = stateRef.current.correctCount + (isCorrect ? 1 : 0);
    const nextError = stateRef.current.errorCount + (isCorrect ? 0 : 1);
    stateRef.current.correctCount = nextCorrect;
    stateRef.current.errorCount = nextError;
    const nextIndex = idx + 1;
    stateRef.current.currentIndex = nextIndex;
    setCorrectCount(nextCorrect);
    setErrorCount(nextError);
    setCurrentIndex(nextIndex);

    const span = wordsFlowRef.current?.querySelector<HTMLElement>(
      `[data-token-index="${idx}"]`,
    );
    if (span) {
      span.className = isCorrect ? tokenCorrectClass : tokenErrorClass;
      span.setAttribute("data-status", isCorrect ? "correct" : "incorrect");
    }

    refreshLiveMetrics({
      currentIndex: nextIndex,
      correctCount: nextCorrect,
      errorCount: nextError,
    });

    // words mode: finish when the last character is typed
    if (stateRef.current.mode === "words") {
      const typed = stateRef.current.passage.slice(0, nextIndex);
      const lastSpace = typed.lastIndexOf(" ");
      const lastTypedWord = lastSpace === -1 ? typed : typed.slice(lastSpace + 1);
      // last character reached, target complete
      if (char === " " && nextIndex >= stateRef.current.tokens.length) {
        finishTest();
        return;
      }
      if (nextIndex >= stateRef.current.tokens.length) {
        finishTest();
      }
      void lastTypedWord;
    } else if (nextIndex >= stateRef.current.tokens.length) {
      finishTest();
    }
  }

  // sizes used by the caret effect and the JSX below
  const textSizePx = TEXT_SIZE_TO_PX[prefs.textSize];
  const lineHeightPx = TEXT_SIZE_LINE_HEIGHT[prefs.textSize];

  // place the caret before paint when the active character changes
  // (the preview caret stays on the first character)
  useLayoutEffect(() => {
    updateCaretPosition(currentIndex);
  }, [
    currentIndex,
    passage,
    textSizePx,
    updateCaretPosition,
    testFinished,
    isPreview,
    previewPhraseIndex,
  ]);

  // re-measure on resize / re-wrap and when fonts finish loading
  useEffect(() => {
    const flow = wordsFlowRef.current;
    const onLayoutChange = () => updateCaretPosition();

    let observer: ResizeObserver | null = null;
    if (flow && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(onLayoutChange);
      observer.observe(flow);
    }

    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let disposed = false;
    if (fonts) {
      fonts.addEventListener("loadingdone", onLayoutChange);
      void fonts.ready.then(() => {
        if (!disposed) onLayoutChange();
      });
    }

    return () => {
      disposed = true;
      observer?.disconnect();
      fonts?.removeEventListener("loadingdone", onLayoutChange);
    };
  }, [updateCaretPosition]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // keep focus on the hidden input for mobile keyboards
  useEffect(() => {
    if (testFinished || isPreview) return;
    hiddenInputRef.current?.focus({ preventScroll: true });
  }, [testFinished, isPreview, mode, timeLimit, wordsLimit]);

  // preview text split into typed and remaining part
  const previewPhrase = PREVIEW_PHRASES[previewPhraseIndex]!;
  const typedSlice = previewPhrase.slice(0, previewCharIndex);

  // blink in preview, steady while typing, hidden if caret is off
  const caretDisplay = prefs.caret && (isPreview || testStarted) ? "block" : "none";
  const caretBlink = isPreview;

  // class strings only change when the text size changes
  const tokenUntypedClass = tokenUntypedClassFactory(prefs.textSize);
  const tokenCorrectClass = tokenCorrectClassFactory(prefs.textSize);
  const tokenErrorClass = tokenErrorClassFactory(prefs.textSize);

  function onTextSizeChange(value: Preferences["textSize"]) {
    setPrefs((prev) => ({ ...prev, textSize: value }));
  }
  function onCaretToggle(value: boolean) {
    setPrefs((prev) => ({ ...prev, caret: value }));
  }
  function onSoundToggle(value: boolean) {
    setPrefs((prev) => ({ ...prev, sound: value }));
    void value;
  }
  function onPreviewToggle(value: boolean) {
    setPrefs((prev) => ({ ...prev, preview: value }));
    if (!value) {
      clearTimers();
      if (!stateRef.current.passage) {
        const first = PREVIEW_PHRASES[0]!;
        previewCharIndexRef.current = first.length;
        setPreviewCharIndex(first.length);
      }
    } else {
      previewCharIndexRef.current = 0;
      setPreviewCharIndex(0);
      setPreviewPhraseIndex((i) => (i + 1) % PREVIEW_PHRASES.length);
    }
  }

  return (
    <main
      className="relative grid min-h-screen grid-rows-[auto_1fr_auto] pt-2 sm:pt-4"
      aria-label="SnailType minimal typing test"
    >
      {/* soft glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-start justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div className="mt-[260px] h-[440px] w-[820px] rounded-full bg-[#6d384f] opacity-15 blur-[120px]" />
      </div>

      <NaBar
        textSize={prefs.textSize}
        onTextSizeChange={onTextSizeChange}
        caretVisible={prefs.caret}
        onCaretToggle={onCaretToggle}
        soundOn={prefs.sound}
        onSoundToggle={onSoundToggle}
        previewOn={prefs.preview}
        onPreviewToggle={onPreviewToggle}
      />

      <div className="relative z-10 mt-2 flex w-full max-w-4xl place-self-center self-center flex-col items-center px-2 sm:px-4 sm:my-auto">
        {/* stats and mode bar */}
        <div className="mb-4 flex w-full items-end justify-between px-2">
          <div
            className={`flex items-center gap-[18px] font-mono text-[13px] tracking-[0.02em] text-[#a58a90] transition-opacity duration-300 ${
              isPreview ? "opacity-40" : "opacity-100"
            }`}
            aria-label="Live metrics"
          >
            <Metric label="wpm" value={liveSnapshot.wpmVisible} />
            <Metric label="acc" value={liveSnapshot.accVisible} />
            <Metric label={liveSnapshot.progressLabel} value={liveSnapshot.progressVisible} />
            <Metric label="err" value={liveSnapshot.errVisible} muted />
          </div>

          <div className="flex items-center gap-4">
            <ModeSelector
              mode={mode}
              timeLimit={timeLimit}
              wordsLimit={wordsLimit}
              onModeChange={(next) => {
                clearTimers();
                setMode(next);
                if (next === "time") {
                  stateRef.current.timeLimit = timeLimit;
                } else {
                  stateRef.current.wordsLimit = wordsLimit;
                }
                if (!isPreview) {
                  const fresh = next === "words" ? truncateToWords(pickPassage(passage || null), wordsLimit) : pickPassage(passage || null);
                  setupNewTest(fresh);
                }
                stateRef.current.mode = next;
              }}
              onTimeLimitChange={(value) => {
                setTimeLimit(value);
                stateRef.current.timeLimit = value;
                if (!isPreview && mode === "time") setupNewTest();
                else refreshLiveMetrics({ timerRemaining: value });
              }}
              onWordsLimitChange={(value) => {
                setWordsLimit(value);
                stateRef.current.wordsLimit = value;
                if (!isPreview && mode === "words") setupNewTest();
                else refreshLiveMetrics();
              }}
            />
            <div className="h-3.5 w-px bg-[#363436]" aria-hidden="true" />
            <button
              type="button"
              aria-label="Restart test"
              title="Restart test"
              onClick={() => {
                if (isPreview) {
                  exitPreviewAndArm(getRandomPassage());
                } else {
                  setupNewTest(stateRef.current.passage);
                }
              }}
              className="rounded p-1 text-[#a58a90] transition-colors hover:bg-[#2b292c] hover:text-[#ff6b9f]"
            >
              <RestartIcon style={{ fontSize: "18px" }} />
            </button>
          </div>
        </div>

        {/* stage card */}
        <div
          ref={stageCardRef}
          className="relative w-full cursor-text overflow-hidden rounded-[22px] border border-[#30212A] bg-[#090709] px-6 py-8 sm:px-10 sm:py-10 select-none transition-shadow duration-200 min-h-[300px] sm:min-h-[320px]"
          onMouseDown={(e) => {
            // ignore clicks on buttons and inputs
            const tag = (e.target as HTMLElement | null)?.tagName ?? "";
            if (["BUTTON", "A", "INPUT", "SELECT"].includes(tag)) return;
            if (isPreview) {
              exitPreviewAndArm(getRandomPassage());
            } else if (!testFinished) {
              hiddenInputRef.current?.focus({ preventScroll: true });
            }
          }}
          tabIndex={0}
          role="textbox"
          aria-live="polite"
          aria-label={
            isPreview
              ? "Press any key to begin typing test"
              : testFinished
                ? "Test complete. Press enter to retry, escape for a new passage."
                : "Typing test in progress. Focus this area with click or tab."
          }
        >
          {/* top highlight line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#6d384f] to-transparent opacity-50" />
          {/* bottom glow */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(109,56,79,0.18)] to-transparent" />

          {/* preview banner */}
          <div
            className={`flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.06em] text-[#a58a90] transition-opacity duration-300 ${
              isPreview ? "opacity-60" : "opacity-0"
            }`}
            aria-hidden={!isPreview}
          >
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full bg-[#ff6b9f] ${reduceMotionRef.current ? "" : "animate-pulse"}`} />
              <span>preview mode · press any key to begin</span>
            </span>
            <span className="text-[#574146]">snail cadence</span>
          </div>

          {/* typing text */}
          <div
            ref={wordsFlowRef}
            className="relative my-auto w-full min-h-[140px] whitespace-pre-wrap break-words py-4 font-sans leading-[1.65] tracking-[0.01em] text-[#5C4E56] transition-opacity duration-200"
            style={{ fontSize: `${textSizePx}px`, lineHeight: `${lineHeightPx}px` }}
          >
            {isPreview ? (
              <PreviewPhrase
                phrase={previewPhrase}
                typed={typedSlice}
                textSize={prefs.textSize}
              />
            ) : (
              <TokenStream tokens={tokens} textSize={prefs.textSize} />
            )}
          </div>

          {/* caret */}
          <div
            ref={caretRef}
            className={`caret ${caretBlink ? "caret--idle" : ""}`}
            style={{
              display: caretDisplay,
              opacity: caretBlink ? undefined : 1,
              animation: caretBlink && reduceMotionRef.current ? "none" : undefined,
            }}
            aria-hidden="true"
          />

          {/* hidden input for IME / soft keyboard */}
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            tabIndex={-1}
            aria-hidden="true"
            className="absolute -top-[9999px] -left-[9999px] h-1 w-1 opacity-0"
            onBlur={() => {
              if (!isPreview && !testFinished) {
                hiddenInputRef.current?.focus({ preventScroll: true });
              }
            }}
          />

          {/* results overlay */}
          {testFinished && result && (
            <ResultsCard
              wpm={result.wpm}
              accuracy={result.accuracy}
              correct={result.correct}
              errors={result.errors}
              durationSec={result.durationSec}
              onRetry={() => setupNewTest(stateRef.current.passage)}
              onNewPassage={() => setupNewTest(choosePassage(stateRef.current.passage))}
            />
          )}
        </div>

        {/* hint line under the card */}
        <div
          className={`mt-4 flex w-full items-center justify-between px-2 font-mono text-[11px] tracking-[0.04em] text-[#574146]`}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#6d384f]" aria-hidden="true" />
            <span>no rush · cadence over sprint</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span>tab + enter to quickly restart</span>
          </div>
        </div>
      </div>

      <Footer />

      {/* screen reader announcement */}
      <div className="sr-only" aria-live="polite" role="status">
        {testFinished && result
          ? `Test complete. ${result.wpm} words per minute, ${result.accuracy}% accuracy, ${result.errors} errors.`
          : ""}
      </div>

      <span className="sr-only" data-stats-loaded={statsLoaded ? "1" : "0"} />
    </main>
  );
}

function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.04em] text-[#a58a90]">{label}</span>
      <span className={`tabular-nums text-[13px] ${muted ? "text-[#574146]" : "text-[#a58a90]"}`}>{value}</span>
    </span>
  );
}

function ModeSelector({
  mode,
  timeLimit,
  wordsLimit,
  onModeChange,
  onTimeLimitChange,
  onWordsLimitChange,
}: {
  mode: Mode;
  timeLimit: number;
  wordsLimit: number;
  onModeChange: (next: Mode) => void;
  onTimeLimitChange: (value: number) => void;
  onWordsLimitChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="tablist"
        aria-label="Test mode"
        className="flex items-center gap-1 rounded-full border border-[#30212A] bg-[#1d1b1d] px-2 py-1 text-[12px] tracking-[0.02em] text-[#a58a90] font-mono"
      >
        <ModeChip
          label="time"
          selected={mode === "time"}
          onClick={() => onModeChange("time")}
        />
        <ModeChip
          label="words"
          selected={mode === "words"}
          onClick={() => onModeChange("words")}
        />
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Mode value options">
        {mode === "time"
          ? TIME_OPTIONS.map((v) => (
              <SubOption
                key={v}
                label={String(v)}
                selected={v === timeLimit}
                onClick={() => onTimeLimitChange(v)}
              />
            ))
          : WORDS_OPTIONS.map((v) => (
              <SubOption
                key={v}
                label={String(v)}
                selected={v === wordsLimit}
                onClick={() => onWordsLimitChange(v)}
              />
            ))}
      </div>
    </div>
  );
}

function ModeChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] transition-colors ${
        selected ? "text-[#f0eaed] font-medium" : "text-[#a58a90] hover:text-[#f0eaed]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1 w-1 rounded-full ${selected ? "bg-[#ff6b9f]" : "bg-transparent"}`}
      />
      {label}
    </button>
  );
}

function SubOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-1.5 py-0.5 text-[12px] tabular-nums transition-colors ${
        selected ? "text-[#f0eaed] font-medium" : "text-[#574146] hover:text-[#f0eaed]"
      }`}
    >
      {label}
    </button>
  );
}

function PreviewPhrase({
  phrase,
  typed,
  textSize,
}: {
  phrase: string;
  typed: string;
  textSize: Preferences["textSize"];
}) {
  const sizeClass = textClassForUntyped(textSize);
  const rest = phrase.slice(typed.length);
  return (
    <>
      <span className={tokenCorrectClassFactory(textSize)} style={{ whiteSpace: "pre-wrap" }}>
        {typed}
      </span>
      <span className={`${sizeClass} opacity-50`} style={{ whiteSpace: "pre-wrap" }}>
        {rest}
      </span>
    </>
  );
}

function TokenStream({ tokens, textSize }: { tokens: Token[]; textSize: Preferences["textSize"] }) {
  const correct = tokenCorrectClassFactory(textSize);
  const error = tokenErrorClassFactory(textSize);
  const untyped = tokenUntypedClassFactory(textSize);
  return (
    <>
      {tokens.map((token, idx) => {
        const cls =
          token.status === "correct"
            ? correct
            : token.status === "incorrect"
              ? error
              : untyped;
        return (
          <span
            key={idx}
            data-token-index={idx}
            data-status={token.status}
            className={cls}
            style={{ whiteSpace: "pre-wrap" }}
          >
            {token.char === " " ? "\u00A0" : token.char}
          </span>
        );
      })}
    </>
  );
}

function ResultsCard({
  wpm,
  accuracy,
  correct,
  errors,
  durationSec,
  onRetry,
  onNewPassage,
}: {
  wpm: number;
  accuracy: number;
  correct: number;
  errors: number;
  durationSec: number;
  onRetry: () => void;
  onNewPassage: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between rounded-[22px] bg-[#090709]/95 p-6 backdrop-blur-sm sm:p-10">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#ff6b9f]" aria-hidden="true" />
          <span className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-[#f0eaed]">
            Test Complete
          </span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#a58a90]">
          pace recorded
        </span>
      </div>

      <div className="my-auto grid grid-cols-2 gap-3 md:grid-cols-4">
        <ResultStat label="net wpm" value={String(wpm)} emphasis="primary" />
        <ResultStat label="accuracy" value={`${accuracy}%`} emphasis="accent" />
        <div className="flex flex-col justify-center rounded-lg border border-[#30212A]/60 bg-[#1d1b1d] p-3">
          <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[#a58a90]">
            characters
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-[22px] tabular-nums text-[#f0eaed]">{correct}</span>
            <span className="text-[#a58a90]">/</span>
            <span className="text-[22px] tabular-nums text-[#E05263]">{errors}</span>
          </div>
          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#574146]">
            correct / errors
          </span>
        </div>
        <ResultStat label="duration" value={`${durationSec}s`} />
      </div>

      <div className="flex flex-col items-start justify-between gap-3 pt-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[#a58a90]">
          <KeyHint>enter</KeyHint>
          <span>try again</span>
          <span className="mx-1">·</span>
          <KeyHint>esc</KeyHint>
          <span>new quote</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewPassage}
            className="rounded px-3 py-1.5 text-[12px] text-[#a58a90] hover:bg-[#2b292c] hover:text-[#f0eaed]"
          >
            new passage
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="rounded bg-[#ff6b9f] px-4 py-1.5 text-[12px] font-medium text-[#3f001c] hover:opacity-90"
          >
            try again
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "primary" | "accent";
}) {
  const valueClass =
    emphasis === "accent" ? "text-[#ff6b9f]" : "text-[#f0eaed]";
  return (
    <div className="flex flex-col justify-center rounded-lg border border-[#30212A]/60 bg-[#1d1b1d] p-3">
      <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[#a58a90]">
        {label}
      </span>
      <span className={`text-[34px] tabular-nums sm:text-[40px] ${valueClass} font-bold`}>
        {value}
      </span>
    </div>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[#2b292c] px-1.5 py-0.5 font-medium text-[#f0eaed]">{children}</span>
  );
}

// class strings per token state, so spans can be edited without re-rendering
function tokenCorrectClassFactory(size: Preferences["textSize"]) {
  return `${textClassForUntyped(size)} text-[#f0eaed]`;
}
function tokenErrorClassFactory(size: Preferences["textSize"]) {
  return `${textClassForUntyped(size)} text-[#E05263] underline underline-offset-4 decoration-[rgba(224,82,99,0.55)]`;
}
function tokenUntypedClassFactory(size: Preferences["textSize"]) {
  return `${textClassForUntyped(size)} text-[#5C4E56]`;
}
function textClassForUntyped(size: Preferences["textSize"]) {
  // same base class for every state, only the colour changes
  void size;
  return `font-sans whitespace-pre-wrap`;
}