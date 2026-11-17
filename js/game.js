// Oyun sahnesi: bölümü kurar, karakterleri oynatır, iki oyuncuyu eşitler.
/* global Phaser */

import { LEVELS, TILE as T } from './levels.js';
import { buildTextures, S } from './art.js';
import { input } from './input.js';
import { sfx } from './sfx.js';

export const VIEW_H = 480; // ekranda görünen dünya yüksekliği (oyun birimi)
const GRAVITY = 1500;
const FONT = 'ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif';
const IDLE = { dir: 0, jump: false, held: false };
const GROUND_PAD = 96; // zeminin altında görünen pay: dokunmatik tuşlar oyun alanını kapatmasın diye

// Kedi küçüktür: 1 karelik (48) geçitlere sığar. Köpek büyüktür ama 3 kare zıplar (kedi 2).
export const SPECS = {
  cat: { w: 30, h: 26, speed: 240, jump: 590, fh: 48, base: 46, emote: 'Miyav!' },
  dog: { w: 42, h: 56, speed: 215, jump: 720, fh: 72, base: 70, emote: 'Hav!' },
};

const overlap = (a, b) => a.r > b.l && a.l < b.r && a.b > b.t && a.t < b.b;

class Player {
  constructor(scene, role, x, y, local) {
    this.scene = scene;
    this.role = role;
    this.spec = SPECS[role];
    this.local = local;
    this.x = x;
    this.y = y; // ayak hizası
    this.vx = 0;
    this.vy = 0;
    this.flip = false;
    this.anim = 0; // 0 duruyor, 1 koşuyor, 2 havada
    this.ground = true;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumping = false;
    this.snaps = [];
    const sp = this.spec;
    this.sprite = scene.add
      .image(x, y, `${role}_idle`)
      .setOrigin(0.5, sp.base / sp.fh)
      .setScale(1 / S)
      .setDepth(local ? 12 : 11);
    if (local) {
      this.zone = scene.add.zone(x, y - sp.h / 2, sp.w, sp.h);
      scene.physics.add.existing(this.zone);
      const b = this.zone.body;
      b.setCollideWorldBounds(true);
      b.setMaxVelocity(700, 950);
      scene.physics.add.collider(this.zone, scene.solids);
      scene.physics.add.collider(this.zone, scene.doorZones);
    }
  }

  rect() {
    const hw = this.spec.w / 2;
    return { l: this.x - hw, r: this.x + hw, t: this.y - this.spec.h, b: this.y };
  }

  // Kendi cihazımızda oynanan karakter: fizik + kontroller.
  step(dt, ctl) {
    const b = this.zone.body;
    const sp = this.spec;
    const ground = b.blocked.down || b.touching.down;

    this.coyote = ground ? 0.1 : this.coyote - dt;
    this.jumpBuf = ctl.jump ? 0.13 : this.jumpBuf - dt;

    const target = ctl.dir * sp.speed;
    const acc = (ground ? 2600 : 1700) * dt;
    let vx = b.velocity.x;
    vx = vx < target ? Math.min(target, vx + acc) : Math.max(target, vx - acc);
    b.setVelocityX(vx);

    if (this.jumpBuf > 0 && this.coyote > 0) {
      b.setVelocityY(-sp.jump);
      this.jumpBuf = 0;
      this.coyote = 0;
      this.jumping = true;
      sfx.jump(this.role);
    }
    // Tuş erken bırakılırsa zıplama kısa kalır.
    if (this.jumping && !ctl.held && b.velocity.y < -sp.jump * 0.45) {
      b.setVelocityY(b.velocity.y * 0.5);
      this.jumping = false;
    }
    if (b.velocity.y >= 0) this.jumping = false;

    if (ctl.dir) this.flip = ctl.dir < 0;
    this.x = b.center.x;
    this.y = b.bottom;
    this.vx = b.velocity.x;
    this.vy = b.velocity.y;
    this.ground = ground;
    this.anim = !ground ? 2 : Math.abs(vx) > 30 ? 1 : 0;
  }

  // Arkadaşın karakteri: gelen konumlar arasında yumuşak geçiş.
  pushSnap(s) {
    s.at = performance.now();
    this.snaps.push(s);
    if (this.snaps.length > 16) this.snaps.shift();
  }
  stepRemote() {
    const a = this.snaps;
    if (!a.length) return;
    const t = performance.now() - 90;
    let i = a.length - 1;
    while (i > 0 && a[i].at > t) i--;
    const s0 = a[i];
    const s1 = a[i + 1];
    if (s1 && s0.at <= t && Math.abs(s1.x - s0.x) + Math.abs(s1.y - s0.y) < 300) {
      const k = (t - s0.at) / Math.max(1, s1.at - s0.at);
      this.x = s0.x + (s1.x - s0.x) * k;
      this.y = s0.y + (s1.y - s0.y) * k;
    } else {
      const s = s1 && s0.at <= t ? s1 : s0;
      this.x = s.x;
      this.y = s.y;
    }
    const last = s1 || s0;
    this.flip = !!last.f;
    this.anim = last.a;
    this.ground = last.a !== 2;
  }

  draw(time) {
    const frame = this.anim === 2 ? 'jump' : this.anim === 1 ? `run${Math.floor(time / 110) % 2}` : 'idle';
    this.sprite.setTexture(`${this.role}_${frame}`);
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setFlipX(this.flip);
  }
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  init(data) {
    this.app = data.app;
    this.levelIndex = data.level || 0;
    this.mode = data.mode; // 'solo' | 'online'
    this.myRole = data.role || 'cat';
    this.authority = this.mode === 'solo' || !!data.isHost;
  }

  create() {
    buildTextures(this);
    this.level = LEVELS[this.levelIndex];
    this.finished = false;
    this.elapsed = 0;
    this.winT = 0;
    this.sendAcc = 0;
    this.hudAcc = 999;
    this.emoteAt = 0;
    this.counts = { fish: 0, bone: 0, fishTotal: 0, boneTotal: 0 };

    this.buildLevel();
    this.buildPlayers();

    const cam = this.cameras.main;
    cam.setBackgroundColor('#f5e6c9');
    cam.setBounds(0, 0, this.worldW, this.worldH + GROUND_PAD);
    this.applyZoom();
    this.follow(this.me);
    cam.centerOn(this.me.x, this.me.y - 60);

    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.applyZoom, this));

    this.app.onSceneReady(this);
  }

  // Kamera yatayda oyuncuyu izler; dikeyde ise oyuncu ekranın üst ya da alt kısmına
  // yaklaşmadıkça kıpırdamaz. Böylece zemin, dokunmatik tuşların üstünde kalır.
  follow(player) {
    const cam = this.cameras.main;
    cam.startFollow(player.sprite, false, 0.14, 0.14, 0, 12);
    cam.setDeadzone(40, 168);
  }

  applyZoom() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setZoom(Math.min(height / VIEW_H, width / 600));
  }

  // ------------------------------------------------------------ bölüm kurulumu
  buildLevel() {
    const L = this.level;
    const rows = L.tiles;
    const H = rows.length;
    const W = rows[0].length;
    this.worldW = W * T;
    this.worldH = H * T;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || rows[y][x] === '#';

    // arka plan
    this.add.tileSprite(0, 0, this.worldW, this.worldH, 'wall').setOrigin(0).setTileScale(1 / S).setDepth(-20);
    for (const d of L.decor || []) {
      this.add.image(d.x * T, d.y * T, d.art).setOrigin(0.5, 1).setScale(1 / S).setDepth(-10);
    }
    for (const h of L.hints || []) this.addHint(h);

    // zemin ve duvarlar
    const g = this.add.graphics().setDepth(1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (rows[y][x] !== '#') continue;
        const px = x * T;
        const py = y * T;
        this.add.image(px, py, (x * 7 + y * 3) % 2 ? 'tile1' : 'tile0').setOrigin(0).setScale(1 / S).setDepth(0);
        if (!solid(x, y - 1)) {
          g.fillStyle(0xd39a62, 1).fillRect(px, py, T, 9);
          g.fillStyle(0xf2c690, 1).fillRect(px, py, T, 2.5);
          g.fillStyle(0x4e2f1c, 0.28).fillRect(px, py + 9, T, 1.5);
        }
      }
    }
    // zeminin altı (yalnızca görsel)
    for (let y = H; y < H + Math.ceil(GROUND_PAD / T); y++) {
      for (let x = 0; x < W; x++) {
        this.add.image(x * T, y * T, (x * 7 + y * 3) % 2 ? 'tile1' : 'tile0').setOrigin(0).setScale(1 / S).setDepth(0);
      }
    }
    g.fillStyle(0x4e2f1c, 0.16).fillRect(0, H * T, W * T, GROUND_PAD + T);

    g.lineStyle(2.5, 0x4e2f1c, 1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (rows[y][x] !== '#') continue;
        const px = x * T;
        const py = y * T;
        if (!solid(x, y - 1)) g.lineBetween(px, py, px + T, py);
        if (!solid(x, y + 1)) g.lineBetween(px, py + T, px + T, py + T);
        if (!solid(x - 1, y)) g.lineBetween(px, py, px, py + T);
        if (!solid(x + 1, y)) g.lineBetween(px + T, py, px + T, py + T);
      }
    }

    // çarpışma kutuları: bitişik kareler tek dikdörtgende birleştirilir
    this.solids = [];
    const used = rows.map(() => new Array(W).fill(false));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (rows[y][x] !== '#' || used[y][x]) continue;
        let w = 1;
        while (x + w < W && rows[y][x + w] === '#' && !used[y][x + w]) w++;
        let h = 1;
        const rowFree = (yy) => {
          for (let i = 0; i < w; i++) if (rows[yy][x + i] !== '#' || used[yy][x + i]) return false;
          return true;
        };
        while (y + h < H && rowFree(y + h)) h++;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[y + j][x + i] = true;
        const z = this.add.zone(x * T + (w * T) / 2, y * T + (h * T) / 2, w * T, h * T);
        this.physics.add.existing(z, true);
        this.solids.push(z);
      }
    }

    // kapılar
    this.doors = [];
    this.doorZones = [];
    for (const d of L.doors || []) {
      const px = d.x * T;
      const py = d.y * T;
      const hgt = d.h * T;
      const img = this.add.image(px, py, 'door').setOrigin(0).setScale(1 / S, hgt / 144 / S).setDepth(-1);
      const zone = this.add.zone(px + T / 2, py + hgt / 2, T - 10, hgt);
      this.physics.add.existing(zone, true);
      this.doorZones.push(zone);
      this.doors.push({ id: d.id, img, zone, open: false, baseY: py, lift: hgt - 12, rect: { l: px + 5, r: px + T - 5, t: py, b: py + hgt } });
    }

    // düğmeler
    this.plates = [];
    for (const p of L.plates || []) {
      const cx = p.x * T + T / 2;
      const floor = (p.y + 1) * T;
      const img = this.add.image(cx, floor, 'plate_up').setOrigin(0.5, 1).setScale(1 / S).setDepth(2);
      this.plates.push({ door: p.door, img, pressed: false, l: cx - 17, r: cx + 17, top: floor - 9, floor });
    }

    // toplanacaklar, çıkışlar, başlangıç noktaları
    this.collectibles = [];
    this.exits = {};
    this.spawn = {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = rows[y][x];
        const cx = x * T + T / 2;
        const cy = y * T + T / 2;
        const floor = (y + 1) * T;
        if (ch === 'f' || ch === 'b') {
          const kind = ch === 'f' ? 'fish' : 'bone';
          const img = this.add.image(cx, cy, kind).setScale(1 / S).setDepth(5);
          this.tweens.add({ targets: img, y: cy - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x * 137) % 700 });
          this.collectibles.push({ i: this.collectibles.length, kind, img, taken: false, rect: { l: cx - 13, r: cx + 13, t: cy - 13, b: cy + 13 } });
          this.counts[`${kind}Total`]++;
        } else if (ch === 'c' || ch === 'd') {
          const role = ch === 'c' ? 'cat' : 'dog';
          const img = this.add.image(cx, floor, role === 'cat' ? 'bowl' : 'kennel').setOrigin(0.5, 1).setScale(1 / S).setDepth(3);
          const ok = this.add.image(cx, floor - (role === 'cat' ? 44 : 78), 'ok').setScale(1 / S).setDepth(20).setVisible(false);
          const pad = role === 'cat' ? 4 : 10;
          this.exits[role] = { img, ok, inside: false, rect: { l: x * T - pad, r: (x + 1) * T + pad, t: y * T - 12, b: floor + 2 } };
        } else if (ch === 'C') this.spawn.cat = { x: cx, y: floor };
        else if (ch === 'D') this.spawn.dog = { x: cx, y: floor };
      }
    }
  }

  addHint(h) {
    const txt = this.add
      .text(h.x * T, h.y * T, h.text, { fontFamily: FONT, fontSize: '14px', color: '#6a4e33', align: 'center', lineSpacing: 4, resolution: 3 })
      .setOrigin(0.5)
      .setDepth(-5);
    const b = txt.getBounds();
    const bg = this.add.graphics().setDepth(-6);
    bg.fillStyle(0xfffaf0, 0.8).fillRoundedRect(b.x - 12, b.y - 8, b.width + 24, b.height + 16, 10);
    bg.lineStyle(1.5, 0xd9bf94, 1).strokeRoundedRect(b.x - 12, b.y - 8, b.width + 24, b.height + 16, 10);
  }

  buildPlayers() {
    const solo = this.mode === 'solo';
    this.cat = new Player(this, 'cat', this.spawn.cat.x, this.spawn.cat.y, solo || this.myRole === 'cat');
    this.dog = new Player(this, 'dog', this.spawn.dog.x, this.spawn.dog.y, solo || this.myRole === 'dog');
    this.players = [this.cat, this.dog];
    this.me = this.myRole === 'cat' ? this.cat : this.dog;
    this.partner = this.myRole === 'cat' ? this.dog : this.cat;
  }

  switchActive() {
    [this.me, this.partner] = [this.partner, this.me];
    this.myRole = this.me.role;
    this.follow(this.me);
    this.app.onActiveRole(this.myRole);
  }

  // ------------------------------------------------------------ her karede
  update(time, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (!this.finished) this.elapsed += dt;

    if (this.mode === 'solo' && input.take('switch') && !this.finished) this.switchActive();
    const jump = input.take('jump');
    const ability = input.take('ability');
    const ctl = this.finished ? IDLE : { dir: input.dir, jump, held: input.jumpHeld };

    for (const p of this.players) {
      if (p.local) p.step(dt, p === this.me ? ctl : IDLE);
      else p.stepRemote();
    }
    if (ability && !this.finished) this.emote(this.me, true);

    this.updateWorld(dt);
    for (const p of this.players) p.draw(time);
    this.netTick(deltaMs);
    this.hudTick(deltaMs);
  }

  updateWorld(dt) {
    const rects = this.players.map((p) => p.rect());

    // düğmeler
    for (const pl of this.plates) {
      const pressed = rects.some((r) => r.r > pl.l && r.l < pl.r && r.b >= pl.top && r.b <= pl.floor + 3);
      if (pressed !== pl.pressed) {
        pl.pressed = pressed;
        pl.img.setTexture(pressed ? 'plate_down' : 'plate_up');
        sfx.plate();
      }
    }

    // kapılar: bağlı bir düğme basılıysa açık; içinde biri varken kapanmaz
    for (const d of this.doors) {
      let want = this.plates.some((pl) => pl.door === d.id && pl.pressed);
      if (!want && d.open && rects.some((r) => overlap(r, d.rect))) want = true;
      if (want !== d.open) {
        d.open = want;
        d.zone.body.enable = !want;
        this.tweens.killTweensOf(d.img);
        this.tweens.add({ targets: d.img, y: want ? d.baseY - d.lift : d.baseY, duration: 220, ease: 'Sine.easeOut' });
        sfx.door(want);
      }
    }

    // balık ve kemikler
    for (const p of this.players) {
      if (!p.local) continue;
      const kind = p.role === 'cat' ? 'fish' : 'bone';
      const r = p.rect();
      for (const c of this.collectibles) {
        if (!c.taken && c.kind === kind && overlap(r, c.rect)) this.take(c, true);
      }
    }

    // çıkışlar
    let allIn = true;
    for (const p of this.players) {
      const ex = this.exits[p.role];
      const inside = p.ground && overlap(p.rect(), ex.rect);
      if (inside !== ex.inside) {
        ex.inside = inside;
        ex.ok.setVisible(inside);
      }
      if (!inside) allIn = false;
    }
    if (this.authority && !this.finished) {
      this.winT = allIn ? this.winT + dt : 0;
      if (this.winT >= 0.5) {
        const stats = { time: this.elapsed, ...this.counts };
        if (this.mode === 'online') this.app.net.send({ t: 'win', ...stats });
        this.finish(stats);
      }
    }
  }

  take(c, announce) {
    c.taken = true;
    this.counts[c.kind]++;
    this.tweens.killTweensOf(c.img);
    this.tweens.add({ targets: c.img, y: c.img.y - 26, alpha: 0, scale: 1.5 / S, duration: 260, onComplete: () => c.img.destroy() });
    sfx.collect();
    this.hudAcc = 999;
    if (announce && this.mode === 'online') this.app.net.send({ t: 'c', i: c.i });
  }

  emote(p, announce) {
    const now = performance.now();
    if (announce) {
      if (now - this.emoteAt < 600) return;
      this.emoteAt = now;
      if (this.mode === 'online') this.app.net.send({ t: 'e' });
    }
    if (p.role === 'cat') sfx.meow();
    else sfx.bark();
    const txt = this.add.text(0, 0, p.spec.emote, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#4a3423', resolution: 3 }).setOrigin(0.5);
    const w = txt.width + 18;
    const h = txt.height + 10;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    bg.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 7);
    bg.lineStyle(2, 0x4a3423, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    const c = this.add.container(p.x, p.y - p.spec.h - 30, [bg, txt]).setDepth(30).setScale(0.6);
    this.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: c.y - 14, alpha: 0, delay: 550, duration: 450, onComplete: () => c.destroy() });
  }

  finish(stats) {
    if (this.finished) return;
    this.finished = true;
    sfx.win();
    this.app.onWin(stats);
  }

  // ------------------------------------------------------------ ağ
  netTick(deltaMs) {
    if (this.mode !== 'online') return;
    this.sendAcc += deltaMs;
    if (this.sendAcc < 50) return;
    this.sendAcc = 0;
    const m = this.me;
    this.app.net.send({ t: 's', x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10, f: m.flip ? 1 : 0, a: m.anim });
  }

  onNet(msg) {
    switch (msg.t) {
      case 's':
        this.partner.pushSnap(msg);
        break;
      case 'c': {
        const c = this.collectibles[msg.i];
        if (c && !c.taken) this.take(c, false);
        break;
      }
      case 'e':
        this.emote(this.partner, false);
        break;
      case 'win':
        this.finish(msg);
        break;
      default:
    }
  }

  // ------------------------------------------------------------ arayüz bilgisi
  hudTick(deltaMs) {
    this.hudAcc += deltaMs;
    if (this.hudAcc >= 250) {
      this.hudAcc = 0;
      this.app.onHud({ ...this.counts, time: this.elapsed });
    }
    // Arkadaş ekran dışındaysa kenarda yön oku gösterilir.
    const v = this.cameras.main.worldView;
    const p = this.partner;
    const nx = (p.x - v.x) / v.width;
    const ny = (p.y - p.spec.h / 2 - v.y) / v.height;
    const off = nx < 0 || nx > 1 || ny < 0 || ny > 1;
    this.app.onPartner(off ? { nx, ny, role: p.role } : null);
  }
}

function calcSize() {
  const res = Math.min(window.devicePixelRatio || 1, 2);
  return { w: Math.max(2, Math.round(window.innerWidth * res)), h: Math.max(2, Math.round(window.innerHeight * res)), res };
}

export function createGame() {
  const size = calcSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#f5e6c9',
    banner: false,
    scale: { mode: Phaser.Scale.NONE, width: size.w, height: size.h, zoom: 1 / size.res },
    physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY } } },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'high-performance' },
  });
  game.scene.add('game', GameScene, false);

  const onResize = () => {
    const s = calcSize();
    game.scale.zoom = 1 / s.res;
    game.scale.resize(s.w, s.h);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 300));
  return game;
}
