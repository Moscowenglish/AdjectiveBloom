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

const photoFor = (word: string) => `/photos-webp/${word}.webp`;

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
      "/desk-background.webp", "/envelope-fern-closed-opt.webp", "/envelope-fern-open-opt.webp",
      ...Array.from({ length: 8 }, (_, index) => `/growth-stages/stage-${index}.webp`),
      "/growth-stages/seed.webp",
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
      <audio ref={musicRef} src="/pressed-ferns.mp3" loop preload="metadata" />
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

      {screen === "start" && (
        <section className="start-letter enter">
          <div className="start-props" aria-hidden="true">
            <div className="start-polaroid"><img src={photoFor("confident")} alt="" /><span>confident</span></div>
            <img className="start-envelope" src="/envelope-fern-closed-opt.webp" alt="" />
            <img className="start-quill" src="/quill-cursor.png" alt="" />
          </div>
          <div className="wax-seal">A</div>
          <p className="eyebrow">The Academy Mailroom · Special Delivery</p>
          <h1>Match the<br /><em>opposites</em></h1>
          <div className="rule" />
          <p className="intro">Deliver every Polaroid to the envelope<br />marked with its opposite adjective.</p>
          <div className="preview-mail" aria-hidden="true">
            <div className="mini-photo">confident</div><span>→</span><div className="mini-envelope">shy</div>
          </div>
          <button className="primary-btn" onClick={() => { playSound("click"); void startMusic(); setScreen("game"); }}>Open the mailroom <span>→</span></button>
          <p className="tiny-note">14 deliveries · no timer · take your time</p>
        </section>
      )}

      {screen === "game" && (
        <section className="mailroom enter">
          <header className="game-header">
            <div><h2>Match the opposites</h2><p>Drag a Polaroid into its opposite envelope.</p></div>
          </header>
          <div className="counter"><strong>{matched.length}</strong><span>/ {PAIRS.length} pairs</span><i><b style={{width:`${matched.length/PAIRS.length*100}%`}} /></i><Sparkles size={22}/></div>
          <div className="desk-layout">
            <section className="polaroid-tray">
              <div className="polaroid-grid">
                {activeCards.map((word, i) => (
                  <button key={word} draggable={!matched.includes(word)}
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", word); beginCard(word); }}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => { if (!matched.includes(word)) beginCard(word); }}
                    disabled={matched.includes(word)}
                    className={`polaroid angle-${i%4} ${selected === word ? "selected" : ""} ${matched.includes(word) ? "sent" : ""}`}>
                    <span className="photo-window">
                      <img src={photoFor(word)} alt="" draggable={false} loading="eager" decoding="async" />
                      <i>{String(batchIndex * 4 + i + 1).padStart(2,"0")}</i>
                    </span>
                    <strong>{word}</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className="envelope-tray">
              <div className="envelope-grid">
                {activeEnvelopes.map((word, i) => {
                  const source = PAIRS.find(([, b]) => b === word)?.[0] ?? "";
                  const sealed = matched.includes(source);
                  return <button key={word}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); tryMatch(word, e.dataTransfer.getData("text/plain")); }}
                    onClick={() => tryMatch(word)}
                    onPointerEnter={(event) => {
                      if (sealed) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      setThread({ cursorX: event.clientX + 5, cursorY: event.clientY + 7, targetX: rect.left + rect.width / 2, targetY: rect.top + rect.height * .68 });
                    }}
                    onPointerLeave={() => setThread(null)}
                    disabled={sealed}
                    className={`envelope angle-${(i+2)%4} ${selected ? "ready" : ""} ${wrongEnvelope === word ? "wrong" : ""} ${sealed ? "sealed" : ""}`}>
                    <span className="envelope-art" aria-hidden="true">
                      <img className="envelope-closed" src="/envelope-fern-closed-opt.webp" alt="" decoding="async" />
                      <img className="envelope-open" src="/envelope-fern-open-opt.webp" alt="" decoding="async" />
                    </span>
                    <span className="envelope-word">{word}</span>
                    {sealed && <span className="seal-mark">✓</span>}
                  </button>;
                })}
              </div>
            </section>

            <aside className="garden-card">
              <div className="plant-stage">
                <img key={growthStage} src={`/growth-stages/stage-${growthStage}.webp`}
                  alt={growthStage === 0 ? "A terracotta pot ready for a seed" : `Peony growth stage ${growthStage} of 7`}
                  className="growing-plant growth-stage-image" />
                {matched.length === 1 && <img src="/growth-stages/seed.webp" alt="" className="falling-seed" />}
                {streak >= 3 && <Sparkles className="sparkle" size={26} />}
              </div>
            </aside>
          </div>
          <div className="feedback-plaque"><span>{feedback}</span><small>{streak > 1 ? `✦ ${streak} in a row` : "Special delivery"}</small></div>
        </section>
      )}

      {screen === "finish" && (
        <section className="finish-letter enter">
          <div className="finish-plant"><img src="/growth-stages/stage-7.webp" alt="A fully grown potted peony" /></div>
          <p className="eyebrow">All fourteen letters delivered</p>
          <h1>Perfectly<br /><em>addressed!</em></h1>
          <p className="intro">Every opposite found. Every envelope sealed.<br />The conservatory is in full bloom.</p>
          <div className="result-note"><Sparkles size={17} /> Best delivery streak: <strong>{bestStreak}</strong></div>
          <button className="primary-btn" onClick={reset}><RotateCcw size={17} /> Play again</button>
        </section>
      )}
    </main>
  );
}
