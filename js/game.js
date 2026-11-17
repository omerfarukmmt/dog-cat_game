// Oyun sahnesi: bölümü kurar, karakterleri oynatır, iki oyuncuyu eşitler.
/* global Phaser */

import { LEVELS, TILE as T } from './levels.js';
import { buildTextures, buildTheme, S } from './art.js';
import { input } from './input.js';
import { sfx } from './sfx.js';

export const VIEW_H = 480; // ekranda görünen dünya yüksekliği (oyun birimi)
const GRAVITY = 1500;
const FONT = 'ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui, sans-serif';
const IDLE = { dir: 0, jump: false, held: false };
const BAND = 144; // zemin çizgisinin altında görünen pay: dokunmatik tuşlar oyun alanını kapatmasın diye

// Kedi küçüktür: 1 karelik (48) geçitlere sığar. Köpek büyüktür ama 3 kare zıplar (kedi 2).
export const SPECS = {
  cat: { w: 30, h: 26, speed: 240, jump: 590, fh: 48, base: 46, emote: 'Miyav!' },
  dog: { w: 42, h: 56, speed: 215, jump: 720, fh: 72, base: 70, emote: 'Hav!' },
};

// İtilebilen nesneler: kutuyu köpek, vazoyu kedi iter.
const PUSH = {
  B: { kind: 'crate', by: 'dog', w: 44, h: 44, speed: 105 },
  P: { kind: 'vase', by: 'cat', w: 24, h: 30, speed: 110 },
};

const GUARD_RANGE = 150; // köpek bu kadar yaklaşırsa bekçi uyanır
const GUARD_HEAR = 330; // bu mesafeden havlamayı duyar
const SENSOR_RANGE = 280;
const LIFT_H = 14;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.r > b.l && a.l < b.r && a.b > b.t && a.t < b.b;
const bodyRect = (b) => ({ l: b.x, r: b.right, t: b.y, b: b.bottom });

class Player {
  constructor(scene, role, x, y, local) {
    this.scene = scene;
    this.role = role;
    this.spec = SPECS[role];
    this.local = local;
    this.x = x;
    this.y = y; // ayak hizası
    this.vx = 0;
    this.flip = false;
    this.anim = 0; // 0 duruyor, 1 koşuyor, 2 havada
    this.ground = true;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumping = false;
    this.swim = false;
    this.climb = false;
    this.leap = 0;
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
      for (const set of scene.colliderSets) scene.physics.add.collider(this.zone, set);
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
    const sc = this.scene;
    this.x = b.center.x;
    this.y = b.bottom;
    const ground = b.blocked.down || b.touching.down;

    this.coyote = ground ? 0.1 : this.coyote - dt;
    this.jumpBuf = ctl.jump ? 0.13 : this.jumpBuf - dt;
    this.leap = Math.max(0, this.leap - dt);
    let max = ctl.cap || sp.speed;

    // --- su: köpek yüzer (kedi suya değerse bölüm yeniden başlar)
    const surf = this.role === 'dog' ? sc.waterSurface(this) : null;
    const wasSwim = this.swim;
    this.swim = surf !== null;
    if (this.swim) {
      max = Math.min(max, sp.speed * 0.62);
      if (!wasSwim) sfx.splash();
      if (this.jumpBuf > 0 && this.leap <= 0.15) {
        b.setVelocityY(-sp.jump * 0.86);
        this.jumpBuf = 0;
        this.coyote = 0;
        this.leap = 0.4;
        this.jumping = true;
        sfx.jump(this.role);
      } else if (this.leap <= 0) {
        b.setVelocityY(clamp((surf + 40 - this.y) * 10, -260, 200)); // başı suyun üstünde kalacak şekilde yüzer
      }
    }
    b.setAllowGravity(!this.swim || this.leap > 0);

    // --- tırmalama tahtası: kedi zıpla tuşunu basılı tutarak tırmanır
    const wasClimb = this.climb;
    this.climb = false;
    let target = ctl.dir * max;
    if (this.role === 'cat') {
      const board = sc.boardAt(this.x, this.y - sp.h / 2);
      if (board) {
        if (ctl.held) {
          b.setVelocityY(-165);
          this.climb = true;
          this.jumping = false;
          // Tırmanırken tahtanın ortasında kalır (kenardaki çıkıntılara takılmasın); yön tepede verilir.
          target = clamp(((board.l + board.r) / 2 - this.x) * 10, -90, 90);
        } else if (b.velocity.y > 70) b.setVelocityY(70);
      } else if (wasClimb && ctl.held) b.setVelocityY(-340); // tahtanın tepesinde küçük bir sıçrama
    }

    // --- yürüme
    const acc = (ground || this.swim ? 2600 : 1700) * dt;
    let vx = b.velocity.x;
    vx = vx < target ? Math.min(target, vx + acc) : Math.max(target, vx - acc);
    b.setVelocityX(vx);

    // --- zıplama
    if (!this.swim && !this.climb && this.jumpBuf > 0 && this.coyote > 0) {
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
    this.vx = b.velocity.x;
    this.ground = ground || this.coyote > 0.04;
    this.anim = this.swim || this.climb ? 1 : !this.ground ? 2 : Math.abs(vx) > 30 ? 1 : 0;
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
    this.themeName = this.level.theme || 'salon';
    this.theme = buildTheme(this, this.themeName);
    this.finished = false;
    this.elapsed = 0;
    this.winT = 0;
    this.sendAcc = 0;
    this.sendN = 0;
    this.hudAcc = 999;
    this.abilityAt = 0;
    this.pushCap = 0;
    this.counts = { fish: 0, bone: 0, fishTotal: 0, boneTotal: 0 };

    this.buildLevel();
    this.buildPlayers();

    const cam = this.cameras.main;
    cam.setBackgroundColor(this.theme.wallA);
    cam.setBounds(0, 0, this.worldW, this.worldH + this.pad);
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
    this.grid = rows.map((r) => r.split(''));
    this.gridW = W;
    this.gridH = H;
    this.worldW = W * T;
    this.worldH = H * T;
    const groundRow = L.ground ?? H - 1;
    this.pad = Math.max(0, BAND - (H - groundRow) * T);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    const tileKey = (x, y) => `${(x * 7 + y * 3) % 2 ? 'tile1' : 'tile0'}_${this.themeName}`;
    const img = (x, y, key, depth) => this.add.image(x, y, key).setScale(1 / S).setDepth(depth);

    // arka plan
    this.add.tileSprite(0, 0, this.worldW, this.worldH, `wall_${this.themeName}`).setOrigin(0).setTileScale(1 / S).setDepth(-20);
    for (const d of L.decor || []) img(d.x * T, d.y * T, d.art, -10).setOrigin(0.5, 1);
    for (const h of L.hints || []) this.addHint(h);

    // çarpışma listeleri (oyuncular ve itilen nesneler bunlara çarpar)
    this.solids = [];
    this.soilZones = [];
    this.doorZones = [];
    this.thinZones = [];
    this.pushZones = [];
    this.liftZones = [];
    this.colliderSets = [this.solids, this.soilZones, this.doorZones, this.thinZones, this.pushZones, this.liftZones];

    this.soil = new Map();
    this.hazards = [];
    this.boards = [];
    this.thins = [];
    this.pushables = [];
    this.guards = [];
    this.collectibles = [];
    this.exits = {};
    this.spawn = {};

    const staticZone = (cx, cy, w, h) => {
      const z = this.add.zone(cx, cy, w, h);
      this.physics.add.existing(z, true);
      return z;
    };

    // --- kare kare: görseller ve tekil nesneler
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = rows[y][x];
        const px = x * T;
        const py = y * T;
        const cx = px + T / 2;
        const cy = py + T / 2;
        const floor = py + T;
        if (ch === '#') {
          img(px, py, tileKey(x, y), 0).setOrigin(0);
        } else if (ch === 's') {
          const im = img(px, py, 'soil', 0).setOrigin(0);
          const zone = staticZone(cx, cy, T, T);
          this.soilZones.push(zone);
          this.soil.set(`${x},${y}`, { zone, img: im });
        } else if (ch === '~' || ch === 'm') {
          const top = rows[y - 1][x] !== ch;
          let sy = y;
          while (rows[sy - 1][x] === ch) sy--;
          const lip = ch === '~' ? 10 : 12;
          const kind = ch === '~' ? 'water' : 'mud';
          img(px, py, top ? `${kind}_top` : kind, 14).setOrigin(0);
          this.hazards.push({ kind, surf: sy * T + lip, rect: { l: px, r: px + T, t: py + (top ? lip : 0), b: floor } });
        } else if (ch === 'h') {
          img(px, py, 'board', -2).setOrigin(0);
          this.boards.push({ l: px - 2, r: px + T + 2, t: py, b: floor });
        } else if (ch === 'f' || ch === 'b') {
          const kind = ch === 'f' ? 'fish' : 'bone';
          const im = img(cx, cy, kind, 5);
          this.tweens.add({ targets: im, y: cy - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: (x * 137) % 700 });
          this.collectibles.push({ i: this.collectibles.length, kind, img: im, taken: false, rect: { l: cx - 13, r: cx + 13, t: cy - 13, b: cy + 13 } });
          this.counts[`${kind}Total`]++;
        } else if (ch === 'c' || ch === 'd') {
          const role = ch === 'c' ? 'cat' : 'dog';
          const im = img(cx, floor, role === 'cat' ? 'bowl' : 'kennel', 3).setOrigin(0.5, 1);
          const ok = img(cx, floor - (role === 'cat' ? 44 : 78), 'ok', 20).setVisible(false);
          const padX = role === 'cat' ? 4 : 10;
          this.exits[role] = { img: im, ok, inside: false, rect: { l: px - padX, r: px + T + padX, t: py - 12, b: floor + 2 } };
        } else if (ch === 'C') this.spawn.cat = { x: cx, y: floor };
        else if (ch === 'D') this.spawn.dog = { x: cx, y: floor };
        else if (ch === 'B' || ch === 'P') this.addPushable(PUSH[ch], cx, floor);
        else if (ch === 'Z') this.addGuard(cx, floor);
      }
    }
    // zeminin altı (yalnızca görsel)
    for (let y = H; y < H + Math.ceil(this.pad / T); y++) {
      for (let x = 0; x < W; x++) img(x * T, y * T, tileKey(x, y), 0).setOrigin(0);
    }

    this.edgeG = this.add.graphics().setDepth(1);
    this.drawEdges();

    // --- duvar ve zemin çarpışma kutuları: bitişik kareler tek dikdörtgende birleştirilir
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
        this.solids.push(staticZone(x * T + (w * T) / 2, y * T + (h * T) / 2, w * T, h * T));
      }
    }

    // --- ince tahtalar / dallar: yalnızca üstten basılır, köpeğin ağırlığıyla kırılır
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (rows[y][x] !== '=' || (x > 0 && rows[y][x - 1] === '=')) continue;
        let w = 1;
        while (rows[y][x + w] === '=') w++;
        const zone = staticZone(x * T + (w * T) / 2, y * T + 5, w * T, 10);
        zone.body.checkCollision.down = false;
        zone.body.checkCollision.left = false;
        zone.body.checkCollision.right = false;
        const imgs = [];
        for (let i = 0; i < w; i++) imgs.push(img((x + i) * T, y * T, 'thin', 2).setOrigin(0));
        this.thinZones.push(zone);
        this.thins.push({ i: this.thins.length, zone, imgs, broken: false, t: 0, rect: { l: x * T, r: (x + w) * T, t: y * T, b: y * T + 10 } });
      }
    }

    // --- kapılar
    this.doors = [];
    for (const d of L.doors || []) {
      const px = d.x * T;
      const py = d.y * T;
      const hgt = d.h * T;
      const im = img(px, py, 'door', -1).setOrigin(0).setScale(1 / S, hgt / 144 / S);
      const zone = staticZone(px + T / 2, py + hgt / 2, T - 10, hgt);
      this.doorZones.push(zone);
      this.doors.push({ id: d.id, img: im, zone, open: false, timer: 0, baseY: py, lift: hgt - 12, rect: { l: px + 5, r: px + T - 5, t: py, b: py + hgt } });
    }

    // --- düğmeler (turuncu olan ağırdır: yalnızca köpek ya da itilen bir nesne basabilir)
    this.plates = [];
    for (const p of L.plates || []) {
      const cx = p.x * T + T / 2;
      const floor = (p.y + 1) * T;
      const tex = p.heavy ? 'hplate' : 'plate';
      const im = img(cx, floor, `${tex}_up`, 2).setOrigin(0.5, 1);
      this.plates.push({ door: p.door, lift: p.lift, heavy: !!p.heavy, tex, img: im, pressed: false, l: cx - 17, r: cx + 17, top: floor - 9, floor });
    }

    // --- asansörler: bağlı düğme basılıyken "to" konumuna gider, bırakılınca geri döner
    this.lifts = [];
    for (const l of L.lifts || []) {
      const w = l.w * T;
      const ax = l.x * T + w / 2;
      const ay = l.y * T + LIFT_H / 2;
      const zone = this.add.zone(ax, ay, w, LIFT_H);
      this.physics.add.existing(zone);
      zone.body.setAllowGravity(false);
      zone.body.setImmovable(true);
      const parts = [];
      for (let i = 0; i < l.w; i++) parts.push(this.add.image(i * T, 0, 'lift').setOrigin(0).setScale(1 / S));
      const cont = this.add.container(ax - w / 2, ay - LIFT_H / 2, parts).setDepth(4);
      this.liftZones.push(zone);
      this.lifts.push({ id: l.id, zone, cont, w, ax, ay, bx: l.toX * T + w / 2, by: l.toY * T + LIFT_H / 2, speed: l.speed || 95 });
    }

    // --- havlama sensörleri
    this.sensors = [];
    for (const s of L.sensors || []) {
      const x = s.x * T;
      const y = s.y * T;
      const ring = this.add.graphics().setDepth(-3);
      ring.lineStyle(2, 0x3fa7a0, 0.28).strokeCircle(x, y, SENSOR_RANGE);
      this.sensors.push({ x, y, door: s.door, time: s.time || 6, img: img(x, y, 'sensor', 3), on: false });
    }
  }

  // Zemin ve duvarların üst kaplamasını ve kenar çizgilerini çizer (toprak kazılınca yeniden çağrılır).
  drawEdges() {
    const g = this.edgeG;
    const th = this.theme;
    const grid = this.grid;
    const W = this.gridW;
    const H = this.gridH;
    const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || grid[y][x] === '#' || grid[y][x] === 's';
    g.clear();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y][x] !== '#' || solid(x, y - 1) || grid[y - 1][x] === '~' || grid[y - 1][x] === 'm') continue;
        const px = x * T;
        const py = y * T;
        g.fillStyle(th.cap, 1).fillRect(px, py, T, 9);
        g.fillStyle(th.capHi, 1).fillRect(px, py, T, 2.5);
        g.fillStyle(th.line, 0.28).fillRect(px, py + 9, T, 1.5);
      }
    }
    g.fillStyle(th.line, 0.16).fillRect(0, H * T, W * T, this.pad + T);
    g.lineStyle(2.5, th.line, 1);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y][x] !== '#' && grid[y][x] !== 's') continue;
        const px = x * T;
        const py = y * T;
        if (!solid(x, y - 1)) g.lineBetween(px, py, px + T, py);
        if (!solid(x, y + 1)) g.lineBetween(px, py + T, px + T, py + T);
        if (!solid(x - 1, y)) g.lineBetween(px, py, px, py + T);
        if (!solid(x + 1, y)) g.lineBetween(px + T, py, px + T, py + T);
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
    bg.fillStyle(0xfffaf0, 0.86).fillRoundedRect(b.x - 12, b.y - 8, b.width + 24, b.height + 16, 10);
    bg.lineStyle(1.5, 0xd9bf94, 1).strokeRoundedRect(b.x - 12, b.y - 8, b.width + 24, b.height + 16, 10);
  }

  addPushable(def, cx, floor) {
    const solo = this.mode === 'solo';
    const zone = this.add.zone(cx, floor - def.h / 2, def.w, def.h);
    this.physics.add.existing(zone);
    const b = zone.body;
    const owner = solo || this.myRole === def.by; // nesnenin fiziğini, onu itebilen oyuncunun cihazı yürütür
    b.pushable = false;
    b.setMaxVelocity(300, 900);
    if (owner) b.setCollideWorldBounds(true);
    else {
      b.setAllowGravity(false);
      b.setImmovable(true);
    }
    const im = this.add.image(cx, floor, def.kind).setOrigin(0.5, 1).setScale(1 / S).setDepth(6);
    this.pushZones.push(zone);
    this.pushables.push({ i: this.pushables.length, ...def, zone, img: im, owner, tx: cx, ty: floor - def.h / 2, sx: cx, sy: floor - def.h / 2 });
  }

  addGuard(cx, floor) {
    const im = this.add.image(cx, floor + 2, 'guard_sleep').setOrigin(0.5, 1).setScale(1 / S).setDepth(7);
    const zzz = this.add.text(cx - 18, floor - 70, 'Zzz', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#6a7c99', resolution: 3 }).setDepth(8);
    this.tweens.add({ targets: zzz, y: floor - 82, alpha: 0.35, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const mark = this.add.graphics().setDepth(2);
    mark.fillStyle(0xd9534f, 0.6);
    for (let x = cx - GUARD_RANGE; x < cx + GUARD_RANGE - 4; x += 16) mark.fillRect(x, floor - 3, 9, 3);
    this.guards.push({ i: this.guards.length, x: cx, y: floor, img: im, zzz, awake: false });
  }

  buildPlayers() {
    const solo = this.mode === 'solo';
    // itilen nesneler de dünyaya çarpar
    for (const o of this.pushables) {
      if (!o.owner) continue;
      for (const set of [this.solids, this.soilZones, this.doorZones, this.thinZones, this.liftZones]) this.physics.add.collider(o.zone, set);
      for (const other of this.pushables) if (other.i > o.i && other.owner) this.physics.add.collider(o.zone, other.zone);
    }
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

  // ------------------------------------------------------------ dünya sorguları
  waterSurface(p) {
    const r = p.rect();
    for (const h of this.hazards) {
      if (h.kind === 'water' && r.r > h.rect.l && r.l < h.rect.r && r.b > h.rect.t + 6 && r.t < h.rect.b) return h.surf;
    }
    return null;
  }

  boardAt(x, y) {
    for (const b of this.boards) if (x > b.l && x < b.r && y > b.t && y < b.b) return b;
    return null;
  }

  // ------------------------------------------------------------ her karede
  update(time, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;
    if (!this.finished) this.elapsed += dt;

    if (this.mode === 'solo' && input.take('switch') && !this.finished) this.switchActive();
    const jump = input.take('jump');
    const ability = input.take('ability');
    const ctl = this.finished ? IDLE : { dir: input.dir, jump, held: input.jumpHeld, cap: 0 };

    this.updatePushables(ctl);
    if (!this.finished) ctl.cap = this.pushCap;
    for (const p of this.players) {
      if (p.local) p.step(dt, p === this.me ? ctl : IDLE);
      else p.stepRemote();
    }
    if (ability && !this.finished) this.useAbility(this.me);

    this.updateWorld(dt);
    for (const p of this.players) p.draw(time);
    this.netTick(deltaMs);
    this.hudTick(deltaMs);
  }

  // Kutu ve vazolar: sahibi olan cihazda itilir, diğerinde ağdan gelen konuma kayar.
  updatePushables(ctl) {
    this.pushCap = 0;
    for (const o of this.pushables) {
      const b = o.zone.body;
      if (o.owner) {
        const p = this[o.by];
        let v = 0;
        if (p === this.me && ctl.dir && p.ground) {
          const pr = p.rect();
          if (pr.b > b.y + 4 && pr.t < b.bottom - 2) {
            if (ctl.dir > 0 && Math.abs(pr.r - b.x) <= 4) v = o.speed;
            else if (ctl.dir < 0 && Math.abs(pr.l - b.right) <= 4) v = -o.speed;
          }
        }
        b.setVelocityX(v);
        if (v) this.pushCap = o.speed;
      } else {
        const nx = b.center.x + (o.tx - b.center.x) * 0.4;
        const ny = b.center.y + (o.ty - b.center.y) * 0.4;
        if (Math.abs(nx - b.center.x) + Math.abs(ny - b.center.y) > 0.05) b.reset(nx, ny);
      }
      o.img.setPosition(b.center.x, b.bottom);
    }
  }

  updateWorld(dt) {
    const rects = this.players.map((p) => p.rect());
    const dogRect = rects[1];
    const weights = this.pushables.map((o) => bodyRect(o.zone.body));
    const local = this.players.filter((p) => p.local);

    // --- düğmeler
    const onPlate = (pl, r) => r.r > pl.l && r.l < pl.r && r.b >= pl.top && r.b <= pl.floor + 3;
    for (const pl of this.plates) {
      const pressed = (pl.heavy ? onPlate(pl, dogRect) : rects.some((r) => onPlate(pl, r))) || weights.some((r) => onPlate(pl, r));
      if (pressed !== pl.pressed) {
        pl.pressed = pressed;
        pl.img.setTexture(`${pl.tex}_${pressed ? 'down' : 'up'}`);
        sfx.plate();
      }
    }

    // --- kapılar: düğme basılıysa ya da sensör süresi dolmadıysa açık; içinde biri varken kapanmaz
    for (const d of this.doors) {
      d.timer = Math.max(0, d.timer - dt);
      let want = d.timer > 0 || this.plates.some((pl) => pl.door === d.id && pl.pressed);
      if (!want && d.open && rects.some((r) => overlap(r, d.rect))) want = true;
      if (want !== d.open) {
        d.open = want;
        d.zone.body.enable = !want;
        this.tweens.killTweensOf(d.img);
        this.tweens.add({ targets: d.img, y: want ? d.baseY - d.lift : d.baseY, duration: 220, ease: 'Sine.easeOut' });
        sfx.door(want);
      }
    }
    for (const s of this.sensors) {
      const on = this.doors.some((d) => d.id === s.door && d.timer > 0);
      if (on !== s.on) {
        s.on = on;
        s.img.setTexture(on ? 'sensor_on' : 'sensor');
      }
    }

    // --- asansörler
    for (const l of this.lifts) {
      const b = l.zone.body;
      const pressed = this.plates.some((pl) => pl.lift === l.id && pl.pressed);
      const tx = pressed ? l.bx : l.ax;
      const ty = pressed ? l.by : l.ay;
      const dx = tx - b.center.x;
      const dy = ty - b.center.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= Math.max(l.speed * dt, 0.5)) {
        if (dist > 0.01) b.reset(tx, ty);
        else b.setVelocity(0, 0);
      } else {
        const vx = (dx / dist) * l.speed;
        const vy = (dy / dist) * l.speed;
        // Önünde (üstünde durmayan) biri ya da bir nesne varsa bekler; kimseyi ezmez.
        const cur = bodyRect(b);
        const next = { l: cur.l + vx * dt - 1, r: cur.r + vx * dt + 1, t: cur.t + vy * dt - 1, b: cur.b + vy * dt + 1 };
        const inWay = (r) => overlap(r, next) && r.b > cur.t + 5;
        const blocked = [...rects, ...weights].some(inWay);
        b.setVelocity(blocked ? 0 : vx, blocked ? 0 : vy);
        // Yolun kenarına taşan oyuncu hafifçe kenara itilir (ör. basamağın ucunda bekleyen köpek).
        for (const p of local) {
          if (!inWay(p.rect())) continue;
          if (p.x < cur.l) p.zone.body.setVelocityX(-80);
          else if (p.x > cur.r) p.zone.body.setVelocityX(80);
        }
      }
      l.cont.setPosition(b.x, b.y);
    }

    // --- ince tahtalar: köpek üstünde durursa kısa süre sonra kırılır
    const dog = this.dog;
    for (const th of this.thins) {
      if (th.broken || !dog.local) continue;
      const on = dog.ground && Math.abs(dog.y - th.rect.t) < 4 && dogRect.r > th.rect.l + 4 && dogRect.l < th.rect.r - 4;
      th.t = on ? th.t + dt : 0;
      for (const im of th.imgs) im.setAngle(on ? Math.sin(th.t * 70) * 2 : 0);
      if (th.t > 0.2) this.breakThin(th, true);
    }

    // --- balık ve kemikler
    for (const p of local) {
      const kind = p.role === 'cat' ? 'fish' : 'bone';
      const r = p.rect();
      for (const c of this.collectibles) {
        if (!c.taken && c.kind === kind && overlap(r, c.rect)) this.take(c, true);
      }
    }

    // --- tehlikeler: su (kedi), çamur (ikisi de), bekçi (köpek), süre
    if (!this.finished) {
      for (const p of local) {
        const r = p.rect();
        for (const h of this.hazards) {
          if (h.kind === 'water' && p.role !== 'cat') continue;
          if (r.r > h.rect.l + 3 && r.l < h.rect.r - 3 && r.b > h.rect.t + 4 && r.t < h.rect.b) {
            this.fail(h.kind === 'water' ? 'Kedi suya düştü!' : p.role === 'cat' ? 'Kedi çamura saplandı!' : 'Köpek çamura saplandı!', true);
            break;
          }
        }
        if (this.finished) break;
      }
      if (!this.finished && dog.local) {
        for (const g of this.guards) {
          if (Math.abs(dog.x - g.x) < GUARD_RANGE && Math.abs(dog.y - g.y) < 110) this.wakeGuard(g, true);
        }
      }
      const limit = this.level.timeLimit;
      if (!this.finished && limit && this.authority && this.elapsed >= limit) this.fail('Süre doldu!', true);
    }

    // --- çıkışlar
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

  breakThin(th, announce) {
    if (th.broken) return;
    th.broken = true;
    th.zone.destroy();
    this.thinZones.splice(this.thinZones.indexOf(th.zone), 1);
    sfx.crack();
    th.imgs.forEach((im, i) => {
      this.tweens.add({ targets: im, y: im.y + 150, angle: (i % 2 ? 1 : -1) * 50, alpha: 0, duration: 520, ease: 'Quad.easeIn', onComplete: () => im.destroy() });
    });
    if (announce && this.mode === 'online') this.app.net.send({ t: 'brk', i: th.i });
  }

  // Köpeğin önündeki (yoksa ayağının altındaki) yumuşak toprağı bulur.
  soilTarget(p) {
    const f = p.flip ? -1 : 1;
    const cy = Math.floor((p.y - 2) / T);
    const cx = Math.floor((p.x + f * (p.spec.w / 2 + 40)) / T);
    for (const [x, y] of [[cx, cy], [cx, cy - 1], [Math.floor(p.x / T), cy + 1]]) {
      if (this.soil.has(`${x},${y}`)) return [x, y];
    }
    return null;
  }

  dig(x, y, announce) {
    const key = `${x},${y}`;
    const s = this.soil.get(key);
    if (!s) return;
    this.soil.delete(key);
    s.zone.destroy();
    this.soilZones.splice(this.soilZones.indexOf(s.zone), 1);
    s.img.destroy();
    this.grid[y][x] = '.';
    this.drawEdges();
    sfx.dig();
    for (let i = 0; i < 7; i++) {
      const bit = this.add.rectangle(x * T + 8 + ((i * 13) % 32), y * T + 10 + ((i * 17) % 28), 7, 7, 0x74512f).setDepth(9);
      this.tweens.add({ targets: bit, x: bit.x + (i % 2 ? 26 : -26), y: bit.y + 34, alpha: 0, angle: 180, duration: 420, onComplete: () => bit.destroy() });
    }
    if (announce && this.mode === 'online') this.app.net.send({ t: 'dig', x, y });
  }

  wakeGuard(g, announce) {
    if (g.awake) return;
    g.awake = true;
    g.img.setTexture('guard_awake');
    g.zzz.setText('!').setColor('#d9534f').setFontSize(26);
    sfx.bark();
    this.fail('Bekçi köpek uyandı!', announce, { g: g.i });
  }

  // Pati tuşu: köpek toprağın yanındaysa kazar, değilse havlar; kedi miyavlar.
  useAbility(p) {
    const now = performance.now();
    if (now - this.abilityAt < 320) return;
    this.abilityAt = now;
    if (p.role === 'dog') {
      const cell = this.soilTarget(p);
      if (cell) {
        this.dig(cell[0], cell[1], true);
        return;
      }
    }
    if (this.mode === 'online') this.app.net.send({ t: 'e' });
    this.emote(p, true);
  }

  emote(p, mine) {
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

    if (p.role !== 'dog') return;
    // Havlama: yakındaki sensörlü kapıları bir süre açar, yakındaki bekçiyi uyandırır.
    const cy = p.y - p.spec.h / 2;
    for (const s of this.sensors) {
      if (Math.hypot(p.x - s.x, cy - s.y) > SENSOR_RANGE) continue;
      for (const d of this.doors) if (d.id === s.door) d.timer = s.time;
    }
    if (mine && !this.finished) {
      for (const g of this.guards) if (Math.hypot(p.x - g.x, p.y - g.y) < GUARD_HEAR) this.wakeGuard(g, true);
    }
  }

  finish(stats) {
    if (this.finished) return;
    this.finished = true;
    sfx.win();
    this.app.onWin(stats);
  }

  // Bölüm başarısız: kısa bir bildirimden sonra iki oyuncuda da yeniden başlar.
  fail(why, announce, extra = {}) {
    if (this.finished) return;
    this.finished = true;
    sfx.fail();
    this.cameras.main.shake(220, 0.004);
    if (announce && this.mode === 'online') this.app.net.send({ t: 'fail', why, ...extra });
    this.app.onFail(why);
  }

  // ------------------------------------------------------------ ağ
  netTick(deltaMs) {
    if (this.mode !== 'online') return;
    this.sendAcc += deltaMs;
    if (this.sendAcc < 50) return;
    this.sendAcc = 0;
    this.sendN++;
    const m = this.me;
    const msg = { t: 's', x: Math.round(m.x * 10) / 10, y: Math.round(m.y * 10) / 10, f: m.flip ? 1 : 0, a: m.anim };
    // Sahibi olduğumuz itilebilir nesnelerin konumu (yalnızca değiştiyse, arada bir de tümü)
    let moved = null;
    for (const o of this.pushables) {
      if (!o.owner) continue;
      const c = o.zone.body.center;
      if (this.sendN % 20 === 0 || Math.abs(c.x - o.sx) + Math.abs(c.y - o.sy) > 0.4) {
        o.sx = c.x;
        o.sy = c.y;
        (moved ||= []).push([o.i, Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10]);
      }
    }
    if (moved) msg.p = moved;
    this.app.net.send(msg);
  }

  onNet(msg) {
    switch (msg.t) {
      case 's':
        this.partner.pushSnap(msg);
        for (const [i, x, y] of msg.p || []) {
          const o = this.pushables[i];
          if (o && !o.owner) {
            o.tx = x;
            o.ty = y;
          }
        }
        break;
      case 'c': {
        const c = this.collectibles[msg.i];
        if (c && !c.taken) this.take(c, false);
        break;
      }
      case 'e':
        this.emote(this.partner, false);
        break;
      case 'dig':
        this.dig(msg.x, msg.y, false);
        break;
      case 'brk':
        if (this.thins[msg.i]) this.breakThin(this.thins[msg.i], false);
        break;
      case 'fail':
        if (msg.g !== undefined && this.guards[msg.g]) {
          const g = this.guards[msg.g];
          g.awake = true;
          g.img.setTexture('guard_awake');
          g.zzz.setText('!').setColor('#d9534f').setFontSize(26);
        }
        this.fail(msg.why, false);
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
      const limit = this.level.timeLimit;
      this.app.onHud({ ...this.counts, time: this.elapsed, left: limit ? Math.max(0, limit - this.elapsed) : null });
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
