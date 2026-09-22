"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";

const PAIRS = [
  ["confident", "shy"], ["reliable", "unreliable"], ["hard-working", "lazy"],
  ["enthusiastic", "unenthusiastic"], ["brave", "cowardly"], ["sensible", "careless"],
  ["calm", "angry"], ["positive", "negative"], ["generous", "ungenerous"],
  ["talented", "talentless"], ["sociable", "unsociable"], ["patient", "impatient"],
  ["curious", "uninterested"], ["creative", "uncreative"],
] as const;

function shuffled<T>(items: readonly T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

// GitVerse Pages serves this repository below /adjectivebloom/.
// Relative runtime URLs keep public assets inside that project path instead of
// accidentally requesting them from the domain root.
const asset = (path: string) => `./${path.replace(/^\//, "")}`;
const photoFor = (word: string) => asset(`photos-webp/${word}.webp`);

function growthStageFor(correctAnswers: number) {
  if (correctAnswers <= 1) return 0;
  if (correctAnswers === 2) return 1;
  if (correctAnswers === 3) return 2;
  if (correctAnswers <= 5) return 3;
  if (correctAnswers <= 7) return 4;
  if (correctAnswers <= 9) return 5;
  if (correctAnswers <= 12) return 6;
  return 7;
}

export default function Home() {
  const [screen, setScreen] = useState<"start" | "game" | "finish">("start");
  const [round, setRound] = useState(0);
  const cards = useMemo(() => shuffled(PAIRS.map(([a]) => a)), [round]);
  const [batchIndex, setBatchIndex] = useState(0);
  const activeCards = useMemo(() => cards.slice(batchIndex * 4, batchIndex * 4 + 4), [cards, batchIndex]);
  const activeEnvelopes = useMemo(() => shuffled(activeCards.map(word => PAIRS.find(([a]) => a === word)?.[1] ?? "")), [activeCards]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState("Pick up a Polaroid and find its opposite envelope");
  const [wrongEnvelope, setWrongEnvelope] = useState<string | null>(null);
  const [thread, setThread] = useState<{ cursorX: number; cursorY: number; targetX: number; targetY: number } | null>(null);
  const [sound, setSound] = useState(true);
  const [volume, setVolume] = useState(.38);
  const audioRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const growthStage = growthStageFor(matched.length);

  useEffect(() => {
    const sharedAssets = [
      asset("desk-background.webp"), asset("envelope-fern-closed-opt.webp"), asset("envelope-fern-open-opt.webp"),
      ...Array.from({ length: 8 }, (_, index) => asset(`growth-stages/stage-${index}.webp`)),
      asset("growth-stages/seed.webp"),
    ];
    sharedAssets.forEach(src => {
      const image = new Image();
      image.src = src;
    });
    cards.slice(batchIndex * 4, (batchIndex + 2) * 4).forEach(word => {
      const image = new Image();
      image.src = photoFor(word);
    });
  }, [cards, batchIndex]);

  const audio = () => {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  };

  const tone = (frequency: number, duration: number, level = .035, type: OscillatorType = "sine", delay = 0) => {
    if (!sound) return;
    const ctx = audio();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime(level * volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + delay);
    oscillator.stop(ctx.currentTime + delay + duration);
  };

  const playSound = (kind: "click" | "paper" | "seal" | "wrong" | "finish") => {
    if (!sound) return;
    if (kind === "click") tone(240, .045, .028, "square");
    if (kind === "paper") { tone(620, .08, .018, "triangle"); tone(760, .06, .012, "triangle", .035); }
    if (kind === "seal") { tone(115, .12, .06, "sine"); tone(360, .18, .025, "triangle", .07); }
    if (kind === "wrong") { tone(145, .11, .04, "square"); tone(110, .14, .035, "square", .1); }
    if (kind === "finish") { [523,659,784,1047].forEach((f,i) => tone(f,.42,.035,"sine",i*.13)); }
  };

  const stopMusic = (resetTrack = false) => {
    const track = musicRef.current;
    if (!track) return;
    track.pause();
    if (resetTrack) track.currentTime = 0;
  };

  const startMusic = async (force = false) => {
    if ((!sound && !force) || !musicRef.current) return;
    musicRef.current.volume = volume;
    try { await musicRef.current.play(); } catch {}
  };

  const beginCard = (word: string) => {
    setSelected(word);
    setDragging(word);
    setFeedback(`Find the envelope for “${word}”`);
    playSound("paper");
  };

  const tryMatch = (target: string, source = dragging ?? selected) => {
    if (!source || matched.includes(source)) return;
    const expected = PAIRS.find(([a]) => a === source)?.[1];
    if (expected === target) {
      const nextMatched = [...matched, source];
      const nextStreak = streak + 1;
      setMatched(nextMatched);
      setStreak(nextStreak);
      setBestStreak(Math.max(bestStreak, nextStreak));
      setSelected(null); setDragging(null);
      setFeedback(nextStreak >= 3 ? `${nextStreak} perfect deliveries in a row!` : "Perfect delivery — sealed with care.");
      playSound("seal");
      if (nextMatched.length === PAIRS.length) {
        setTimeout(() => { stopMusic(); setScreen("finish"); playSound("finish"); }, 850);
      } else if (activeCards.every(word => nextMatched.includes(word))) {
        setFeedback("Mailbag complete — bringing the next letters...");
        setTimeout(() => { setBatchIndex(n => n + 1); setFeedback("Pick up a Polaroid and find its opposite envelope"); }, 650);
      }
    } else {
      setWrongEnvelope(target); setStreak(0);
      setFeedback("Wrong address — that Polaroid is coming back.");
      playSound("wrong");
      setTimeout(() => {
        setWrongEnvelope(null); setSelected(null); setDragging(null);
        setFeedback("Pick up a Polaroid and find its opposite envelope");
      }, 750);
    }
  };

  const reset = () => {
    playSound("click"); stopMusic(true); setRound(n => n + 1); setBatchIndex(0); setSelected(null); setDragging(null);
    setMatched([]); setStreak(0); setBestStreak(0);
    setFeedback("Pick up a Polaroid and find its opposite envelope"); setScreen("start");
  };

  return (
    <main className={`site-shell screen-${screen} ${dragging ? "is-dragging" : ""}`}
      onPointerMove={(event) => setThread(current => current ? { ...current, cursorX: event.clientX + 5, cursorY: event.clientY + 7 } : null)}>
      <div className="grain" />
      {thread && (
        <svg className="quill-thread" aria-hidden="true">
          <path d={`M ${thread.cursorX} ${thread.cursorY} Q ${(thread.cursorX + thread.targetX) / 2} ${Math.min(thread.cursorY, thread.targetY) - 34} ${thread.targetX} ${thread.targetY}`} />
          <circle cx={thread.targetX} cy={thread.targetY} r="3" />
        </svg>
      )}
      <audio ref={musicRef} src={asset("pressed-ferns.mp3")} loop preload="metadata" />
      <div className="audio-controls">
        <button className="sound-btn" onClick={() => {
          const musicIsPlaying = Boolean(musicRef.current && !musicRef.current.paused);
          if (sound && musicIsPlaying) { playSound("click"); stopMusic(); setSound(false); }
          else { setSound(true); void startMusic(true); }
        }} aria-label={sound ? "Mute sound and music" : "Turn sound and music on"}>
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <label className="volume-control" aria-label="Volume">
          <input type="range" min="0" max="1" step="0.01" value={volume}
            onChange={(event) => {
              const nextVolume = Number(event.target.value);
              setVolume(nextVolume);
              if (musicRef.current) musicRef.current.volume = nextVolume;
              if (nextVolume > 0 && !sound) { setSound(true); void startMusic(true); }
            }} />
        </label>
      </div>
      <section className="content">
        {screen === "start" && <button className="start-button" onClick={() => { setScreen("game"); void startMusic(); }}>Start</button>}
        {screen === "game" && <>
          <header><h1>Match the opposites</h1><p>Drag a Polaroid into its opposite envelope.</p></header>
          <div className="progress">{matched.length} / {PAIRS.length} pairs</div>
          <div className="cards">
            {activeCards.map((word, index) => <button key={word} className={`polaroid ${matched.includes(word) ? "matched" : ""}`}
              draggable={!matched.includes(word)} onDragStart={() => beginCard(word)} onClick={() => beginCard(word)}>
              <img src={photoFor(word)} alt="" /><span>{word}</span><small>0{index + 1}</small>
            </button>)}
          </div>
          <div className="envelopes">
            {activeEnvelopes.map(target => <button key={target} className={`envelope ${wrongEnvelope === target ? "wrong" : ""}`}
              onDragOver={event => event.preventDefault()} onDrop={() => tryMatch(target)} onClick={() => tryMatch(target)}>
              <span>{target}</span>
            </button>)}
          </div>
          <div className="plant"><img src={asset(`growth-stages/stage-${growthStage}.webp`)} alt="Growing plant" /></div>
          <div className="feedback">{feedback}</div>
        </>}
        {screen === "finish" && <div className="finish"><Sparkles /><h1>Adjective Bloom!</h1><p>All {PAIRS.length} pairs delivered.</p><p>Best streak: {bestStreak}</p><button onClick={reset}><RotateCcw /> Play again</button></div>}
      </section>
    </main>
  );
}
