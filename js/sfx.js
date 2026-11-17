// Küçük ses efektleri — ses dosyası yok, hepsi WebAudio ile üretilir.

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ type = 'sine', f0, f1 = f0, dur = 0.12, vol = 0.12, delay = 0 }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

export const sfx = {
  unlock() {
    ac();
  },
  jump(role) {
    if (role === 'cat') tone({ f0: 520, f1: 860, dur: 0.11, vol: 0.07 });
    else tone({ f0: 300, f1: 520, dur: 0.13, vol: 0.08 });
  },
  collect() {
    tone({ type: 'triangle', f0: 880, dur: 0.08, vol: 0.1 });
    tone({ type: 'triangle', f0: 1320, dur: 0.12, vol: 0.1, delay: 0.07 });
  },
  plate() {
    tone({ type: 'square', f0: 220, f1: 160, dur: 0.06, vol: 0.05 });
  },
  door(open) {
    tone({ type: 'triangle', f0: open ? 150 : 260, f1: open ? 260 : 150, dur: 0.2, vol: 0.09 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.11, delay: i * 0.11 }));
  },
  meow() {
    tone({ f0: 620, f1: 1050, dur: 0.14, vol: 0.1 });
    tone({ f0: 1050, f1: 560, dur: 0.26, vol: 0.1, delay: 0.13 });
  },
  bark() {
    tone({ type: 'sawtooth', f0: 330, f1: 150, dur: 0.1, vol: 0.1 });
    tone({ type: 'sawtooth', f0: 300, f1: 140, dur: 0.12, vol: 0.1, delay: 0.16 });
  },
};
