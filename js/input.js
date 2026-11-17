// Dokunmatik tuşlar + klavye tek bir "input" nesnesinde toplanır.

export const input = {
  left: false,
  right: false,
  jumpHeld: false,
  _jump: false,
  _ability: false,
  _switch: false,
  get dir() {
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  },
  // Tek seferlik basışları okur ve sıfırlar.
  take(name) {
    const v = this[`_${name}`];
    this[`_${name}`] = false;
    return v;
  },
  reset() {
    this.left = this.right = this.jumpHeld = false;
    this._jump = this._ability = this._switch = false;
  },
};

export function bindInput({ dpad, jumpBtn, abilityBtn }) {
  // --- yön tuşu: parmağı kaldırmadan sola/sağa kaydırılabilir
  let pid = null;
  const setDir = (e) => {
    const r = dpad.getBoundingClientRect();
    const left = e.clientX < r.left + r.width / 2;
    input.left = left;
    input.right = !left;
    dpad.dataset.dir = left ? 'l' : 'r';
  };
  const endDir = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    input.left = input.right = false;
    dpad.dataset.dir = '';
  };
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    try { dpad.setPointerCapture(pid); } catch { /* yoksay */ }
    setDir(e);
  });
  dpad.addEventListener('pointermove', (e) => {
    if (e.pointerId === pid) setDir(e);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, endDir);

  // --- zıpla
  const jumpUp = () => {
    input.jumpHeld = false;
    jumpBtn.classList.remove('down');
  };
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { jumpBtn.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    input.jumpHeld = true;
    input._jump = true;
    jumpBtn.classList.add('down');
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jumpBtn.addEventListener(ev, jumpUp);

  // --- yetenek
  abilityBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input._ability = true;
    abilityBtn.classList.add('down');
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
    abilityBtn.addEventListener(ev, () => abilityBtn.classList.remove('down'));
  }

  // --- klavye (bilgisayarda denemek için)
  const typing = (e) => e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = true; break;
      case 'ArrowRight': case 'KeyD': input.right = true; break;
      case 'ArrowUp': case 'KeyW': case 'Space':
        if (!e.repeat) input._jump = true;
        input.jumpHeld = true;
        break;
      case 'KeyE': case 'KeyX': if (!e.repeat) input._ability = true; break;
      case 'KeyQ': case 'Tab': if (!e.repeat) input._switch = true; break;
      default: return;
    }
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': input.left = false; break;
      case 'ArrowRight': case 'KeyD': input.right = false; break;
      case 'ArrowUp': case 'KeyW': case 'Space': input.jumpHeld = false; break;
      default:
    }
  });
  window.addEventListener('blur', () => input.reset());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.reset();
  });
}
