function play(src) {
  try {
    new Audio(src).play();
  } catch {}
}

export function playStart() {
  play("/sounds/start.mp3");
}

export function playPop() {
  play("/sounds/pop.mp3");
}

// export function playClick() {
//   play("/sounds/click.mp3");
// }

export function playScribble() {
  play("/sounds/scribble.mp3");
}

export function playSuccess() {
  // kept as synthesis — no file provided
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  } catch {}
}

export function playSlots() {
  play("/sounds/coins.mp3");
}

export function playBoo() {
  play("/sounds/boo-womp.mp3");
}

export function playWhoosh() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    fetch("/sounds/whoosh.mp3")
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.playbackRate.value = 1.45;
        source.detune.value = -650;
        const gain = ctx.createGain();
        gain.gain.value = 0.8;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
      });
  } catch {}
}

export function playUpSwoosh() {
  try {
    const audio = new Audio("/sounds/upswoosh.mp3");
    audio.playbackRate = 1.1;
    audio.volume = 1;
    audio.play();
  } catch {}
}

export function playDownSwoosh() {
  try {
    const audio = new Audio("/sounds/downswoosh.mp3");
    audio.playbackRate = 1.6;
    audio.volume = 0.6;
    audio.play();
  } catch {}
}

export function playError() {
  try {
    const audio = new Audio("/sounds/error.mp3");
    audio.volume = 0.7;
    audio.play();
  } catch {}
}

export function playJingle1() {
  play("/sounds/jingle1.mp3");
}

export function playJingle2() {
  play("/sounds/jingle2.mp3");
}

export function playJingle3() {
  play("/sounds/jingle3.mp3");
}

export function playFinalJingle() {
  play("/sounds/final-jingle.mp3");
}
