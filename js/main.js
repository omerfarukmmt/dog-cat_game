// Uygulamanın akışı: menü → oda → oyun. Menüler HTML, oyun dünyası Phaser.

import { Net } from './net.js';
import { createGame } from './game.js';
import { drawArt } from './art.js';
import { input, bindInput } from './input.js';
import { sfx } from './sfx.js';
import { LEVELS } from './levels.js';

const $ = (id) => document.getElementById(id);
const other = (role) => (role === 'cat' ? 'dog' : 'cat');
const ROLE_NAME = { cat: 'Kedi', dog: 'Köpek' };

const app = {
  net: null,
  game: null,
  scene: null,
  mode: null, // 'solo' | 'online'
  hostRole: 'cat', // odayı kuranın karakteri
  level: 0,
  playing: false,
  runId: 0, // her bölüm başlangıcında artar; gecikmeli işler eski bölüme dokunmasın diye

  get myRole() {
    if (!this.net) return 'cat';
    return this.net.isHost ? this.hostRole : other(this.hostRole);
  },

  // --- sahneden gelen bildirimler
  onSceneReady(scene) {
    this.scene = scene;
  },
  onHud(h) {
    $('hudFish').textContent = `${h.fish}/${h.fishTotal}`;
    $('hudBone').textContent = `${h.bone}/${h.boneTotal}`;
    const timed = h.left !== null && h.left !== undefined;
    $('hudTime').textContent = timed ? `⏳ ${fmtTime(Math.ceil(h.left))}` : fmtTime(h.time);
    $('hudTime').parentElement.classList.toggle('low', timed && h.left < 30);
  },
  onPartner(p) {
    const el = $('partner');
    if (!p || !this.playing) {
      el.hidden = true;
      return;
    }
    if (el.dataset.role !== p.role) {
      el.dataset.role = p.role;
      drawArt(el.querySelector('canvas'), `${p.role}_idle`, 34);
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = Math.min(w - 44, Math.max(44, p.nx * w));
    const y = Math.min(h - 120, Math.max(86, p.ny * h));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--a', `${Math.atan2(p.ny - 0.5, p.nx - 0.5)}rad`);
    el.hidden = false;
  },
  onActiveRole(role) {
    toast(`Şimdi ${ROLE_NAME[role]} sende`);
  },
  onWin(stats) {
    markDone(this.level);
    const last = this.level + 1 >= LEVELS.length;
    $('winStats').innerHTML =
      `Süre: ${fmtTime(stats.time)}<br>Balık: ${stats.fish}/${stats.fishTotal} · Kemik: ${stats.bone}/${stats.boneTotal}`;
    $('winNote').textContent = last ? 'Tebrikler, bütün bölümleri bitirdiniz!' : '';
    $('btnNext').hidden = last;
    const run = this.runId;
    setTimeout(() => {
      if (this.playing && this.runId === run) $('win').hidden = false;
    }, 700);
  },
  // Bölüm başarısız oldu: kısa bir bildirim, sonra iki cihaz da bölümü baştan başlatır.
  onFail(why) {
    $('failWhy').textContent = why;
    $('fail').hidden = false;
    $('pause').hidden = true;
    const run = this.runId;
    setTimeout(() => {
      if (this.playing && this.runId === run) startGame(this.level);
    }, 1500);
  },
};
app.input = input;
window.__kk = app; // hata ayıklama ve otomatik testler için

// --- cihazda saklanan küçük ayarlar (tuş boyutu, biten bölümler)
function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* gizli sekmede saklanamayabilir; sorun değil */ }
}
function markDone(level) {
  const done = load('kk-done', []);
  if (!done.includes(level)) save('kk-done', [...done, level]);
}
function setCtlSize(percent) {
  const v = Math.min(150, Math.max(70, Number(percent) || 100));
  document.documentElement.style.setProperty('--ctl', String(v / 100));
  $('ctlSize').value = v;
  $('ctlSizeVal').textContent = `%${v}`;
  return v;
}

// Bölüm seçme ekranı: seçilen bölümün numarasıyla onPick çağrılır.
let levelPick = null;
function openLevels(onPick) {
  levelPick = onPick;
  const done = load('kk-done', []);
  const grid = $('levelGrid');
  grid.textContent = '';
  LEVELS.forEach((lv, i) => {
    const btn = document.createElement('button');
    btn.className = `level${done.includes(i) ? ' done' : ''}`;
    btn.innerHTML = `<b>${i + 1}</b><span>${lv.name}</span>`;
    btn.addEventListener('click', () => {
      $('levels').hidden = true;
      if (levelPick) levelPick(i);
    });
    grid.appendChild(btn);
  });
  $('levels').hidden = false;
}

function fmtTime(t) {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function menuMsg(text, isErr = false) {
  const el = $('menuMsg');
  el.textContent = text;
  el.classList.toggle('err', isErr);
}

function showScreen(name) {
  $('menu').hidden = name !== 'menu';
  $('room').hidden = name !== 'room';
  for (const id of ['win', 'pause', 'lost', 'levels', 'fail']) $(id).hidden = true;
}

function goFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

let wakeLock = null;
async function keepAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch { /* desteklenmiyorsa sorun değil */ }
}

// ------------------------------------------------------------ oda
function wireNet(net) {
  net.on('connected', () => {
    if (net.isHost) net.send({ t: 'roles', hostRole: app.hostRole });
    renderRoom();
    if (!app.playing && net.isHost) toast('Arkadaşın odaya katıldı');
  });
  net.on('disconnected', () => {
    if (app.playing) {
      $('pause').hidden = true;
      $('win').hidden = true;
      $('lost').hidden = false;
    } else if (net.isHost) {
      renderRoom();
      toast('Arkadaşın odadan ayrıldı');
    } else {
      leave();
      menuMsg('Oda kapandı.', true);
    }
  });
  net.on('full', () => {
    leave();
    menuMsg('Bu oda dolu.', true);
  });
  net.on('mic', renderMic);
  net.on('signal', (ok) => {
    // Oda kuran, arkadaşı katılmadan önce sunucuyla bağlantısını kaybettiyse bunu görsün.
    if (!net.isHost || net.connected || app.playing) return;
    $('roomStatus').textContent = ok
      ? 'Arkadaşın bekleniyor… Kodu ona gönder.'
      : 'Sunucu bağlantısı yenileniyor… Bu ekranı açık tut.';
  });
  net.on('voice', (stream) => {
    const audio = $('remoteAudio');
    audio.srcObject = stream;
    $('voiceBadge').hidden = !stream;
    if (stream) {
      audio.play().catch(() => {
        // Bazı tarayıcılar sesi ancak bir dokunuştan sonra başlatır.
        document.addEventListener('pointerdown', () => audio.play().catch(() => {}), { once: true });
      });
    }
  });
  net.on('msg', (m) => {
    switch (m.t) {
      case 'roles':
        app.hostRole = m.hostRole;
        renderRoom();
        break;
      case 'start':
        app.hostRole = m.hostRole;
        startGame(m.level);
        break;
      default:
        if (app.playing && app.scene) app.scene.onNet(m);
    }
  });
}

function renderRoom() {
  const net = app.net;
  if (!net) return;
  const connected = net.connected;
  $('roomCode').textContent = net.code || '----';
  $('roomStatus').textContent = connected
    ? net.isHost
      ? 'Arkadaşın katıldı. Hazırsanız başlat!'
      : 'Bağlandın. Kurucunun başlatması bekleniyor…'
    : 'Arkadaşın bekleniyor… Kodu ona gönder.';
  for (const el of document.querySelectorAll('#room .role')) {
    const mine = el.dataset.role === app.myRole;
    el.classList.toggle('mine', mine);
    el.querySelector('.who').textContent = mine ? 'Sen' : connected ? 'Arkadaşın' : '';
  }
  $('btnStart').disabled = !(connected && net.isHost);
  $('btnStart').textContent = net.isHost ? 'Başla' : 'Bekleniyor';
  $('btnShare').hidden = !net.isHost;
  renderMic();
}

function renderMic() {
  const state = app.net ? app.net.mic : 'off';
  const room = $('btnMicRoom');
  room.textContent = state === 'on' ? '🎤 Ses açık' : state === 'muted' ? '🔇 Ses kapalı' : '🎤 Sesi aç';
  room.classList.toggle('on', state === 'on');
  room.classList.toggle('muted', state === 'muted');
  const hud = $('btnMic');
  hud.textContent = state === 'muted' ? '🔇' : '🎤';
  hud.classList.toggle('on', state === 'on');
  hud.classList.toggle('muted', state === 'muted');
}

async function toggleMic() {
  const net = app.net;
  if (!net) return;
  sfx.unlock();
  if (net.mic === 'off') {
    try {
      await net.enableMic();
      toast('Mikrofon açık');
    } catch (err) {
      toast(err && err.name === 'NotAllowedError' ? 'Mikrofon izni verilmedi' : 'Mikrofon açılamadı');
    }
  } else {
    net.setMuted(net.mic === 'on');
  }
}

async function hostRoom() {
  sfx.unlock();
  goFullscreen();
  menuMsg('Oda kuruluyor…');
  const net = new Net();
  wireNet(net);
  try {
    await net.host();
  } catch (err) {
    net.close();
    menuMsg(err.message, true);
    return;
  }
  app.net = net;
  app.mode = 'online';
  app.hostRole = 'cat';
  menuMsg('');
  showScreen('room');
  renderRoom();
}

async function joinRoom(code) {
  sfx.unlock();
  if (!/^\d{4}$/.test(code)) {
    menuMsg('Oda kodu 4 haneli olmalı.', true);
    return;
  }
  goFullscreen();
  menuMsg('Odaya bağlanılıyor…');
  const net = new Net();
  wireNet(net);
  app.net = net;
  app.mode = 'online';
  try {
    await net.join(code, (text) => menuMsg(text));
  } catch (err) {
    net.close();
    if (app.net === net) app.net = null;
    menuMsg(err.message, true);
    return;
  }
  menuMsg('');
  showScreen('room');
  renderRoom();
}

function share() {
  const code = app.net?.code;
  if (!code) return;
  const url = `${location.origin}${location.pathname}?oda=${code}`;
  const text = `Kedi & Köpek oynayalım! Oda kodu: ${code}`;
  if (navigator.share) navigator.share({ title: 'Kedi & Köpek', text, url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(`${text}\n${url}`).then(() => toast('Davet kopyalandı'), () => {});
}

// ------------------------------------------------------------ oyun
function startGame(level) {
  app.level = level;
  app.playing = true;
  app.runId++;
  input.reset();
  showScreen('none');
  document.body.classList.add('in-game');
  const solo = app.mode === 'solo';
  $('hud').hidden = false;
  $('controls').hidden = false;
  $('btnSwitch').hidden = !solo;
  $('btnMic').hidden = solo;
  $('voiceBadge').hidden = solo || !$('remoteAudio').srcObject;
  $('btnAbility').textContent = '🐾';
  keepAwake();
  toast(`${level + 1}. Bölüm: ${LEVELS[level].name}`);
  app.game.scene.start('game', {
    app,
    level,
    mode: app.mode,
    role: solo ? 'cat' : app.myRole,
    isHost: solo || app.net.isHost,
  });
}

function stopGame() {
  app.playing = false;
  app.scene = null;
  app.game.scene.stop('game');
  document.body.classList.remove('in-game');
  $('hud').hidden = true;
  $('controls').hidden = true;
  $('partner').hidden = true;
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}

// Bölümü iki cihazda birden başlatır (yeniden başlatma ve sonraki bölüm de buradan geçer).
function launch(level) {
  if (app.mode === 'online') app.net.send({ t: 'start', level, hostRole: app.hostRole });
  startGame(level);
}
function restartLevel() {
  launch(app.level);
}

function leave() {
  if (app.playing) stopGame();
  app.net?.close();
  app.net = null;
  app.mode = null;
  $('remoteAudio').srcObject = null;
  showScreen('menu');
}

// ------------------------------------------------------------ başlangıç
function init() {
  for (const c of document.querySelectorAll('canvas[data-art]')) drawArt(c, c.dataset.art, Number(c.dataset.w));
  bindInput({ dpad: $('dpad'), jumpBtn: $('btnJump'), abilityBtn: $('btnAbility') });
  app.game = createGame();

  $('btnHost').addEventListener('click', hostRoom);
  $('joinForm').addEventListener('submit', (e) => {
    e.preventDefault();
    $('codeInput').blur();
    joinRoom($('codeInput').value.trim());
  });
  $('codeInput').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
  });
  $('btnSolo').addEventListener('click', () => {
    sfx.unlock();
    goFullscreen();
    app.mode = 'solo';
    app.net = null;
    openLevels((level) => {
      goFullscreen();
      startGame(level);
      setTimeout(() => toast('Tek başına: ⇄ ile kedi ve köpek arasında geç'), 2700);
    });
  });

  $('btnShare').addEventListener('click', share);
  $('btnSwap').addEventListener('click', () => {
    if (!app.net) return;
    app.hostRole = other(app.hostRole);
    app.net.send({ t: 'roles', hostRole: app.hostRole });
    renderRoom();
  });
  $('btnMicRoom').addEventListener('click', toggleMic);
  $('btnMic').addEventListener('click', toggleMic);
  $('btnStart').addEventListener('click', () => {
    if (!app.net?.connected || !app.net.isHost) return;
    openLevels((level) => {
      if (app.net?.connected) launch(level);
    });
  });
  $('btnLevelsBack').addEventListener('click', () => {
    $('levels').hidden = true;
    if (app.mode === 'solo') app.mode = null;
  });
  $('btnNext').addEventListener('click', () => {
    if (app.level + 1 < LEVELS.length) launch(app.level + 1);
  });
  setCtlSize(load('kk-ctl', 100));
  $('ctlSize').addEventListener('input', (e) => save('kk-ctl', setCtlSize(e.target.value)));
  $('btnLeaveRoom').addEventListener('click', leave);

  $('btnSwitch').addEventListener('click', () => {
    input._switch = true;
  });
  $('btnPause').addEventListener('click', () => {
    $('pause').hidden = false;
  });
  $('btnResume').addEventListener('click', () => {
    $('pause').hidden = true;
  });
  $('btnRestart').addEventListener('click', restartLevel);
  $('btnFullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else goFullscreen();
    $('pause').hidden = true;
  });
  $('btnQuit').addEventListener('click', leave);
  $('btnAgain').addEventListener('click', restartLevel);
  $('btnWinMenu').addEventListener('click', leave);
  $('btnLostMenu').addEventListener('click', leave);

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // iOS'ta iki parmakla yakınlaştırmayı engeller
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && app.playing) keepAwake();
  });

  // Davet bağlantısıyla gelindiyse kod hazır gelsin.
  const invited = new URLSearchParams(location.search).get('oda');
  if (invited && /^\d{4}$/.test(invited)) {
    $('codeInput').value = invited;
    menuMsg('Davet kodun hazır. "Katıl"a dokun.');
  }
}

init();
