// Oyundaki bütün görseller burada kodla çizilir (hazır resim dosyası yok).
// Karakterler bu oyun için özgün tasarlanmıştır.

export const S = 2; // dokular 2 kat çözünürlükte çizilir, oyunda 1/S ölçekle gösterilir

const TAU = Math.PI * 2;

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
function paint(ctx, fill, stroke, lw = 2) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}
function seg(ctx, x1, y1, x2, y2, color, lw) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}
function limb(ctx, x1, y1, x2, y2, color, outline, lw) {
  seg(ctx, x1, y1, x2, y2, outline, lw + 3);
  seg(ctx, x1, y1, x2, y2, color, lw);
}
function paw(ctx, x, y, r, color) {
  ell(ctx, x, y + r * 0.35, r * 0.62, r * 0.5);
  paint(ctx, color);
  for (const [dx, dy] of [[-0.62, -0.3], [-0.22, -0.72], [0.22, -0.72], [0.62, -0.3]]) {
    ell(ctx, x + dx * r, y + dy * r, r * 0.2, r * 0.25);
    paint(ctx, color);
  }
}

// ---------------------------------------------------------------- KEDİ
// Çerçeve 64x48, ayak hizası y=46, sağa bakar.
export function drawCat(ctx, pose = 'idle') {
  const O = '#7a4313', F = '#f29a3d', D = '#d9792b', C = '#fde6c4', P = '#f4a6a0';
  const feet = {
    idle: [[0, 46], [0, 46], [0, 46], [0, 46]],
    run0: [[-5, 45], [4, 46], [-4, 46], [5, 45]],
    run1: [[4, 46], [-5, 45], [5, 45], [-4, 46]],
    jump: [[-7, 44], [-5, 45], [6, 42], [8, 41]],
  }[pose];
  const hips = [[21, 37], [27, 37], [36, 37], [42, 37]];
  const t = {
    idle: [17, 35, 5, 37, 3, 22, 10, 13],
    run0: [17, 34, 8, 33, 3, 27, 5, 17],
    run1: [17, 34, 8, 35, 2, 30, 3, 21],
    jump: [17, 33, 9, 31, 3, 26, 2, 15],
  }[pose];

  // kuyruk
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(t[0], t[1]);
    ctx.bezierCurveTo(t[2], t[3], t[4], t[5], t[6], t[7]);
  };
  tail(); paint(ctx, null, O, 8.5);
  tail(); paint(ctx, null, F, 5.5);
  ell(ctx, t[6], t[7], 2.6, 2.6); paint(ctx, D);

  // arkadaki bacaklar
  for (const i of [1, 3]) limb(ctx, hips[i][0], hips[i][1], hips[i][0] + feet[i][0], feet[i][1] - 2, D, O, 4.5);

  // gövde
  ell(ctx, 29, 33, 15, 9.5); paint(ctx, F, O, 2);
  ell(ctx, 29, 38, 10, 3.6); paint(ctx, C);
  for (const x of [21, 26.5, 32]) seg(ctx, x, 24.6, x + 1, 29.5, D, 2.4);

  // öndeki bacaklar
  for (const i of [0, 2]) {
    limb(ctx, hips[i][0], hips[i][1], hips[i][0] + feet[i][0], feet[i][1] - 2, F, O, 4.5);
    ell(ctx, hips[i][0] + feet[i][0] + 0.8, feet[i][1] - 1.6, 2.6, 1.8); paint(ctx, C);
  }

  // kulaklar
  poly(ctx, [34.5, 18, 35.5, 4.5, 43.5, 13]); paint(ctx, F, O, 2);
  poly(ctx, [45.5, 13, 53, 4.5, 54.5, 18]); paint(ctx, F, O, 2);
  poly(ctx, [36.8, 15, 37.3, 8.6, 41, 13]); paint(ctx, P);
  poly(ctx, [48, 13, 51.6, 8.6, 52.4, 15]); paint(ctx, P);

  // kafa
  ell(ctx, 44.5, 24, 12, 11); paint(ctx, F, O, 2);
  for (const x of [41.5, 44.5, 47.5]) seg(ctx, x, 14.6, x, 17.8, D, 2);
  ell(ctx, 45.5, 29.4, 6.2, 4); paint(ctx, C);

  // yüz
  for (const x of [40.6, 49.4]) {
    ell(ctx, x, 23.6, 2, 2.9); paint(ctx, '#3a2414');
    ell(ctx, x + 0.6, 22.6, 0.75, 0.9); paint(ctx, '#fff');
  }
  poly(ctx, [44, 27.2, 47, 27.2, 45.5, 29]); paint(ctx, '#e27a7a');
  ctx.beginPath();
  ctx.moveTo(43, 30.6); ctx.quadraticCurveTo(44.4, 32, 45.5, 30.4); ctx.quadraticCurveTo(46.6, 32, 48, 30.6);
  paint(ctx, null, O, 1.1);
  seg(ctx, 52.5, 28, 60, 26.4, O, 0.9);
  seg(ctx, 52.5, 30, 60, 31, O, 0.9);
  seg(ctx, 37, 28.4, 30.5, 27, O, 0.9);
  seg(ctx, 37, 30.4, 30.5, 31.4, O, 0.9);
}

// ---------------------------------------------------------------- KÖPEK
// Çerçeve 80x72, ayak hizası y=70, sağa bakar.
export function drawDog(ctx, pose = 'idle') {
  const O = '#2d3d57', F = '#7f97bd', D = '#566d92', W = '#f6f3ec', R = '#e2574c';
  const feet = {
    idle: [[0, 70], [0, 70], [0, 70], [0, 70]],
    run0: [[-6, 69], [5, 70], [-5, 70], [6, 69]],
    run1: [[5, 70], [-6, 69], [6, 69], [-5, 70]],
    jump: [[-8, 67], [-6, 68], [7, 65], [9, 64]],
  }[pose];
  const hips = [[23, 57], [30, 57], [45, 57], [52, 57]];
  const tailTip = { idle: [9, 30], run0: [7, 33], run1: [11, 28], jump: [6, 36] }[pose];

  // kuyruk
  limb(ctx, 18, 44, tailTip[0], tailTip[1], F, O, 6);
  ell(ctx, tailTip[0], tailTip[1], 2.6, 2.6); paint(ctx, W);

  // arkadaki bacaklar
  for (const i of [1, 3]) limb(ctx, hips[i][0], hips[i][1], hips[i][0] + feet[i][0], feet[i][1] - 3, D, O, 7);

  // gövde
  rrect(ctx, 15, 36, 42, 26, 12); paint(ctx, F, O, 2.2);
  ell(ctx, 36, 58, 14, 3.6); paint(ctx, W);

  // öndeki bacaklar
  for (const i of [0, 2]) {
    limb(ctx, hips[i][0], hips[i][1], hips[i][0] + feet[i][0], feet[i][1] - 3, F, O, 7);
    ell(ctx, hips[i][0] + feet[i][0] + 1, feet[i][1] - 2.4, 4, 2.6); paint(ctx, W);
  }

  // kafa
  rrect(ctx, 33, 8, 34, 31, 13); paint(ctx, F, O, 2.2);

  // tasma
  rrect(ctx, 38, 36.5, 22, 5.6, 2.8); paint(ctx, R, O, 1.6);
  ell(ctx, 50, 44, 3, 3); paint(ctx, '#f5cf5b', O, 1.3);

  // burun bölgesi
  ell(ctx, 60, 29.5, 10.5, 7.8); paint(ctx, W, O, 2);
  ell(ctx, 66.5, 25.2, 3.6, 2.8); paint(ctx, '#232a36');
  ctx.beginPath();
  ctx.moveTo(56, 32.4); ctx.quadraticCurveTo(60.5, 36, 65, 32);
  paint(ctx, null, O, 1.3);
  if (pose !== 'idle') {
    rrect(ctx, 58.6, 33.4, 4.6, 5.4, 2.2); paint(ctx, '#f08b98', O, 1);
  }

  // gözler
  for (const x of [49.5, 58.5]) {
    ell(ctx, x, 19.5, 2.2, 3); paint(ctx, '#232a36');
    ell(ctx, x + 0.7, 18.4, 0.8, 1); paint(ctx, '#fff');
  }
  seg(ctx, 47, 14.4, 51.6, 13.4, O, 1.5);
  seg(ctx, 56.4, 13.4, 61, 14.4, O, 1.5);

  // sarkık kulak
  const earRot = pose === 'jump' ? 0.9 : pose === 'idle' ? 0.12 : 0.4;
  ctx.save();
  ctx.translate(38.5, 12);
  ctx.rotate(earRot);
  ell(ctx, 0, 10, 6.6, 12.5); paint(ctx, D, O, 2);
  ctx.restore();
}

// ---------------------------------------------------------------- DÜNYA
function drawTile(ctx, v, base = '#9b6b45') {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 48, 48);
  ctx.strokeStyle = 'rgba(40,24,12,.28)';
  ctx.lineWidth = 1.4;
  for (const y of [0, 16, 32, 48]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(48, y); ctx.stroke(); }
  const xs = v ? [[12, 0], [36, 16], [20, 32]] : [[30, 0], [10, 16], [40, 32]];
  for (const [x, y] of xs) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,240,215,.14)';
  ctx.lineWidth = 1.2;
  const gs = v ? [[4, 6, 14], [26, 22, 10], [6, 40, 9], [30, 43, 12]] : [[6, 9, 12], [24, 5, 9], [20, 25, 16], [14, 38, 12]];
  for (const [x, y, w] of gs) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
}

function drawWall(ctx, th = THEMES.salon) {
  ctx.fillStyle = th.wallA;
  ctx.fillRect(0, 0, 128, 128);
  if (th.plain) {
    // açık hava: düz gökyüzü, seyrek benekler
    ctx.fillStyle = th.motif;
    for (const [x, y, r] of [[20, 30, 2.2], [84, 14, 1.6], [58, 76, 2], [108, 98, 1.8], [30, 112, 1.5]]) { ell(ctx, x, y, r, r); ctx.fill(); }
    return;
  }
  ctx.fillStyle = th.wallB;
  for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 128);
  ctx.fillStyle = th.motif;
  for (let x = 8; x < 128; x += 32) {
    for (let y = 16; y < 128; y += 64) {
      const yy = y + ((x - 8) / 32 % 2) * 32;
      poly(ctx, [x, yy - 4, x + 3, yy, x, yy + 4, x - 3, yy]); ctx.fill();
    }
  }
}

function drawDoor(ctx) {
  rrect(ctx, 5, 1.5, 38, 141, 5); paint(ctx, '#3fa7a0', '#1c5f5b', 2.6);
  ctx.strokeStyle = 'rgba(20,80,76,.45)'; ctx.lineWidth = 1.4;
  for (const x of [17.5, 30.5]) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, 140); ctx.stroke(); }
  for (const y of [14, 122]) { rrect(ctx, 3, y, 42, 9, 3); paint(ctx, '#8d99a6', '#3d4854', 1.8); }
  ell(ctx, 24, 70, 13, 13); paint(ctx, '#e9fbf8', '#1c5f5b', 1.8);
  paw(ctx, 24, 70.5, 8.6, '#3fa7a0');
}

function drawPlate(ctx, down) {
  const h = down ? 2.6 : 7;
  rrect(ctx, 6, 12 - 4 - h, 32, h + 2, 3); paint(ctx, '#3fa7a0', '#1c5f5b', 1.8);
  rrect(ctx, 1.5, 7.5, 41, 4.2, 2); paint(ctx, '#7c8794', '#3d4854', 1.6);
}

function drawFish(ctx) {
  poly(ctx, [9, 11, 1.5, 4, 3.5, 11, 1.5, 18]); paint(ctx, '#f07f2e', '#8a3d0c', 1.8);
  ell(ctx, 17, 11, 10.5, 7.4); paint(ctx, '#f6a13c', '#8a3d0c', 1.8);
  ell(ctx, 17.5, 14, 6.5, 2.6); paint(ctx, '#fcd38a');
  poly(ctx, [13, 4.4, 19, 1.5, 20.5, 5]); paint(ctx, '#f07f2e', '#8a3d0c', 1.4);
  ell(ctx, 22.4, 9, 1.7, 1.7); paint(ctx, '#3a2414');
  ell(ctx, 22.9, 8.5, 0.6, 0.6); paint(ctx, '#fff');
}

function drawBone(ctx) {
  const O = '#51678a';
  const shape = () => {
    ctx.beginPath();
    for (const [x, y] of [[5, 4.6], [5, 11.4], [25, 4.6], [25, 11.4]]) { ctx.moveTo(x + 3.8, y); ctx.arc(x, y, 3.8, 0, TAU); }
    ctx.rect(5, 5.2, 20, 5.6);
  };
  shape(); ctx.strokeStyle = O; ctx.lineWidth = 3.4; ctx.stroke();
  shape(); ctx.fillStyle = '#fdfaf2'; ctx.fill();
}

function drawBowl(ctx) {
  ell(ctx, 22, 9.5, 14.5, 5.5); paint(ctx, '#b9793f', '#6a3c14', 1.6);
  for (const [x, y] of [[14, 8], [20, 6.4], [26, 7.4], [30.5, 9]]) { ell(ctx, x, y, 2.6, 2.2); paint(ctx, '#d99a55', '#6a3c14', 1); }
  poly(ctx, [4, 10, 40, 10, 35.5, 25, 8.5, 25]); paint(ctx, '#e2574c', '#8a2b23', 2);
  rrect(ctx, 2.5, 8.4, 39, 4.6, 2.3); paint(ctx, '#f07a6f', '#8a2b23', 1.8);
  ctx.save(); ctx.translate(13.5, 13.4); ctx.scale(0.58, 0.58);
  poly(ctx, [9, 11, 1.5, 4, 3.5, 11, 1.5, 18]); paint(ctx, '#fff');
  ell(ctx, 17, 11, 10.5, 7.4); paint(ctx, '#fff');
  ctx.restore();
}

function drawKennel(ctx) {
  rrect(ctx, 9, 24, 50, 37, 3); paint(ctx, '#dcae72', '#6a431f', 2.2);
  ctx.strokeStyle = 'rgba(106,67,31,.35)'; ctx.lineWidth = 1.3;
  for (const x of [21.5, 34, 46.5]) { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 60); ctx.stroke(); }
  ctx.beginPath();
  ctx.moveTo(22, 61); ctx.lineTo(22, 44); ctx.arc(34, 44, 12, Math.PI, 0); ctx.lineTo(46, 61); ctx.closePath();
  paint(ctx, '#4a3423', '#3a2414', 1.6);
  poly(ctx, [2, 27, 34, 2.5, 66, 27, 62.5, 31.5, 34, 10, 5.5, 31.5]); paint(ctx, '#d9534f', '#7f231f', 2.2);
  ctx.save(); ctx.translate(34, 22.5); ctx.scale(0.5, 0.5); ctx.translate(-15, -8); drawBone(ctx); ctx.restore();
}

function drawOk(ctx) {
  ell(ctx, 12, 12, 10, 10); paint(ctx, '#58b368', '#2b6a3a', 2);
  ctx.beginPath(); ctx.moveTo(7, 12.4); ctx.lineTo(10.6, 16); ctx.lineTo(17, 8.6);
  paint(ctx, null, '#fff', 2.6);
}

function drawWindow(ctx) {
  rrect(ctx, 6, 6, 92, 108, 6); paint(ctx, '#fffaf0', '#c9a777', 2.4);
  const g = ctx.createLinearGradient(0, 14, 0, 106);
  g.addColorStop(0, '#bfe3f5'); g.addColorStop(1, '#eaf7fb');
  rrect(ctx, 14, 14, 76, 92, 3); paint(ctx, g, '#c9a777', 1.6);
  ctx.fillStyle = '#fff';
  for (const [x, y, r] of [[36, 42, 8], [46, 38, 10], [57, 43, 8], [46, 46, 9]]) { ell(ctx, x, y, r, r * 0.8); ctx.fill(); }
  seg(ctx, 52, 14, 52, 106, '#fffaf0', 5);
  seg(ctx, 14, 62, 90, 62, '#fffaf0', 5);
  ctx.fillStyle = '#eab3a8';
  ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(34, 8); ctx.quadraticCurveTo(30, 60, 10, 104); ctx.lineTo(8, 104); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(96, 8); ctx.lineTo(70, 8); ctx.quadraticCurveTo(74, 60, 94, 104); ctx.lineTo(96, 104); ctx.closePath(); ctx.fill();
  rrect(ctx, 2, 2, 100, 8, 4); paint(ctx, '#c9a777');
}

function drawFrame(ctx) {
  seg(ctx, 30, 2, 30, 8, '#b89a70', 1.4);
  rrect(ctx, 3, 7, 54, 40, 4); paint(ctx, '#c49a66', '#9a7446', 2);
  rrect(ctx, 9, 13, 42, 28, 2); paint(ctx, '#fff7e6');
  paw(ctx, 30, 27.5, 10.5, '#e6c79a');
}

function drawPlant(ctx) {
  ctx.fillStyle = '#7fb77e';
  for (const [x, y, rx, ry, rot] of [[22, 30, 6.5, 22, 0], [12, 36, 6, 18, -0.55], [32, 36, 6, 18, 0.55], [7, 46, 5, 12, -1.05], [37, 46, 5, 12, 1.05]]) {
    ell(ctx, x, y, rx, ry, rot); ctx.fill();
  }
  ctx.strokeStyle = '#659f66'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(22, 12); ctx.lineTo(22, 52); ctx.stroke();
  poly(ctx, [9, 52, 35, 52, 31.5, 75, 12.5, 75]); paint(ctx, '#d59a72', '#b07b55', 1.8);
  rrect(ctx, 7, 49.5, 30, 6, 3); paint(ctx, '#e0a983', '#b07b55', 1.6);
}

function drawLamp(ctx) {
  const g = ctx.createRadialGradient(20, 26, 4, 20, 26, 30);
  g.addColorStop(0, 'rgba(255,236,170,.75)'); g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g; ctx.fillRect(-12, -6, 64, 64);
  seg(ctx, 20, 30, 20, 116, '#b89a70', 3);
  ell(ctx, 20, 117, 11, 3); paint(ctx, '#b89a70');
  poly(ctx, [9, 6, 31, 6, 37, 32, 3, 32]); paint(ctx, '#f6d37a', '#cfa74a', 1.8);
}


function drawCrate(ctx) {
  const O = '#6a4517';
  rrect(ctx, 1.2, 1.2, 41.6, 41.6, 4); paint(ctx, '#e6bd6c', O, 2.2);
  rrect(ctx, 6.5, 6.5, 31, 31, 2); paint(ctx, '#d8a850', '#a8782f', 1.5);
  seg(ctx, 8, 8, 36, 36, '#a8782f', 4.5);
  seg(ctx, 36, 8, 8, 36, '#a8782f', 4.5);
  seg(ctx, 8, 8, 36, 36, '#efcd88', 2);
  seg(ctx, 36, 8, 8, 36, '#efcd88', 2);
  for (const [x, y] of [[4.6, 4.6], [39.4, 4.6], [4.6, 39.4], [39.4, 39.4]]) { ell(ctx, x, y, 1.3, 1.3); paint(ctx, O); }
}

function drawVase(ctx) {
  seg(ctx, 12, 9, 12, 3.5, '#4e9a54', 1.8);
  for (const [x, y] of [[12, 1.2], [9.4, 3.4], [14.6, 3.4]]) { ell(ctx, x, y, 2.3, 2.3); paint(ctx, '#f0719c'); }
  ell(ctx, 12, 3, 1.5, 1.5); paint(ctx, '#ffd866');
  rrect(ctx, 7.5, 8, 9, 5.5, 2); paint(ctx, '#7fb4e6', '#28507f', 1.6);
  rrect(ctx, 2.2, 12, 19.6, 17, 7.5); paint(ctx, '#5b9bd5', '#28507f', 1.8);
  rrect(ctx, 4, 18.4, 16, 3.4, 1.5); paint(ctx, '#eaf4ff');
}

function drawHeavyPlate(ctx, down) {
  const h = down ? 2.6 : 7;
  rrect(ctx, 4, 12 - 4 - h, 36, h + 2, 2.5); paint(ctx, '#ee9438', '#8a4a0c', 1.8);
  if (!down) for (const x of [12, 22, 32]) { poly(ctx, [x - 2.6, 3.2, x + 2.6, 3.2, x, 6.2]); paint(ctx, '#8a4a0c'); }
  rrect(ctx, 1, 7.5, 42, 4.2, 2); paint(ctx, '#5d6570', '#2f3640', 1.6);
}

function drawLiquid(ctx, top, col, hi, lip) {
  ctx.fillStyle = col;
  if (!top) { ctx.fillRect(0, 0, 48, 48); return; }
  ctx.beginPath();
  ctx.moveTo(0, lip);
  for (let x = 0; x <= 48; x += 4) ctx.lineTo(x, lip + Math.sin((x / 48) * TAU) * 1.6);
  ctx.lineTo(48, 48); ctx.lineTo(0, 48); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  for (let x = 0; x <= 48; x += 4) ctx[x ? 'lineTo' : 'moveTo'](x, lip + Math.sin((x / 48) * TAU) * 1.6);
  ctx.strokeStyle = hi; ctx.lineWidth = 2.4; ctx.stroke();
}

function drawMud(ctx, top) {
  drawLiquid(ctx, top, 'rgba(112,88,48,.96)', '#a3884f', 12);
  ctx.fillStyle = 'rgba(160,136,84,.9)';
  for (const [x, y, r] of top ? [[11, 24, 3], [30, 20, 2.2], [38, 34, 3.2]] : [[10, 12, 2.6], [32, 30, 3]]) { ell(ctx, x, y, r, r * 0.8); ctx.fill(); }
}

function drawSoil(ctx) {
  ctx.fillStyle = '#74512f'; ctx.fillRect(0, 0, 48, 48);
  ctx.fillStyle = '#62432a';
  for (const [x, y, rx, ry] of [[10, 9, 7, 4], [34, 16, 8, 5], [16, 30, 9, 5], [38, 38, 7, 4], [4, 42, 5, 3]]) { ell(ctx, x, y, rx, ry); ctx.fill(); }
  ctx.fillStyle = '#a58763';
  for (const [x, y, r] of [[24, 8, 2], [8, 22, 1.6], [42, 27, 2.2], [27, 40, 1.8], [14, 44, 1.4]]) { ell(ctx, x, y, r, r * 0.85); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,235,200,.16)';
  for (const [x, y] of [[20, 20], [36, 6], [6, 34], [44, 44], [30, 28]]) ctx.fillRect(x, y, 2, 2);
}

function drawThin(ctx) {
  rrect(ctx, 0.8, 1, 46.4, 9, 2.4); paint(ctx, '#e3c58d', '#7a5a2c', 1.8);
  seg(ctx, 5, 4, 20, 4, 'rgba(122,90,44,.4)', 1);
  seg(ctx, 26, 6.6, 42, 6.6, 'rgba(122,90,44,.4)', 1);
  for (const x of [4.6, 43.4]) { ell(ctx, x, 5.5, 1.2, 1.2); paint(ctx, '#7a5a2c'); }
}

function drawBoard(ctx) {
  ctx.fillStyle = '#ead7ab'; ctx.fillRect(4, 0, 40, 48);
  ctx.strokeStyle = '#cdb07a'; ctx.lineWidth = 1.6;
  for (let y = 3; y < 48; y += 6) { ctx.beginPath(); ctx.moveTo(5, y); ctx.lineTo(43, y); ctx.stroke(); }
  ctx.fillStyle = '#9a7446'; ctx.fillRect(2, 0, 4, 48); ctx.fillRect(42, 0, 4, 48);
  ctx.strokeStyle = 'rgba(122,90,44,.55)'; ctx.lineWidth = 1.1;
  for (const [x, y] of [[14, 8], [28, 22], [18, 36]]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 3, y); ctx.lineTo(x + i * 3 - 1.5, y + 8); ctx.stroke(); }
}

function drawLift(ctx) {
  rrect(ctx, 0.8, 0.8, 46.4, 12.4, 2.5); paint(ctx, '#aab3be', '#39414c', 1.8);
  ctx.save(); ctx.beginPath(); ctx.rect(2, 2, 44, 4.6); ctx.clip();
  ctx.fillStyle = '#f2c84b'; ctx.fillRect(2, 2, 44, 4.6);
  ctx.fillStyle = '#39414c';
  for (let x = -4; x < 52; x += 10) poly(ctx, [x, 6.6, x + 5, 6.6, x + 9, 2, x + 4, 2]), ctx.fill();
  ctx.restore();
  for (const x of [6, 42]) { ell(ctx, x, 9.6, 1.3, 1.3); paint(ctx, '#39414c'); }
}

function drawSensor(ctx, on) {
  ell(ctx, 15, 15, 12, 12); paint(ctx, on ? '#d9f7e2' : '#eef1f5', '#39414c', 2);
  ell(ctx, 15, 15, 5, 5); paint(ctx, on ? '#58b368' : '#8d99a6', '#39414c', 1.5);
  ctx.strokeStyle = on ? '#3d8b4c' : '#8d99a6'; ctx.lineWidth = 1.6;
  for (const r of [8, 10.6]) { ctx.beginPath(); ctx.arc(15, 15, r, -0.7, 0.7); ctx.stroke(); ctx.beginPath(); ctx.arc(15, 15, r, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke(); }
}

// Uyuyan bekçi: iri bir buldok. Çerçeve 88x58, ayak hizası y=56.
function drawGuard(ctx, awake) {
  const O = '#4f2d14', F = '#b47a4b', D = '#8e5a33', C = '#edd0ab';
  ell(ctx, 56, 38, 28, 17); paint(ctx, F, O, 2.2);
  ell(ctx, 72, 45, 12, 10.5); paint(ctx, D, O, 2);
  ell(ctx, 83, 30, 3, 3); paint(ctx, F, O, 1.6);
  rrect(ctx, 40, 27, 8, 22, 3); paint(ctx, '#d9534f', O, 1.6);
  for (const y of [31, 37, 43]) { poly(ctx, [47, y - 2, 52, y, 47, y + 2]); paint(ctx, '#e8e8e8', O, 0.8); }
  poly(ctx, [9, 22, 6, 9, 17, 16]); paint(ctx, D, O, 2);
  poly(ctx, [37, 22, 40, 9, 29, 16]); paint(ctx, D, O, 2);
  rrect(ctx, 6, 14, 34, 34, 14); paint(ctx, F, O, 2.2);
  ell(ctx, 23, 42, 18, 9.5); paint(ctx, C, O, 2);
  ell(ctx, 23, 35.5, 5, 3.6); paint(ctx, '#2a1a10');
  seg(ctx, 23, 39, 23, 44, O, 1.4);
  if (awake) {
    for (const x of [15, 31]) { ell(ctx, x, 27, 3.6, 3.8); paint(ctx, '#fff', O, 1.4); ell(ctx, x, 27.6, 1.7, 1.9); paint(ctx, '#2a1a10'); }
    seg(ctx, 10, 21.5, 19, 24.5, O, 2.4); seg(ctx, 36, 21.5, 27, 24.5, O, 2.4);
    rrect(ctx, 15, 44, 16, 6, 2.5); paint(ctx, '#7a1f1f', O, 1.4);
    for (const x of [17, 26.4]) { poly(ctx, [x, 44, x + 2.6, 44, x + 1.3, 47.4]); paint(ctx, '#fff'); }
  } else {
    for (const x of [15, 31]) { ctx.beginPath(); ctx.arc(x, 27, 3.4, 0.15, Math.PI - 0.15); paint(ctx, null, O, 1.8); }
  }
  ell(ctx, 10, 52, 9, 4.5); paint(ctx, C, O, 2);
  ell(ctx, 36, 52, 9, 4.5); paint(ctx, C, O, 2);
}

function drawTree(ctx) {
  rrect(ctx, 41, 78, 14, 62, 4); paint(ctx, '#b08a62');
  ctx.fillStyle = '#8fc98a';
  for (const [x, y, r] of [[48, 48, 34], [26, 64, 22], [70, 64, 22], [36, 30, 20], [62, 30, 20]]) { ell(ctx, x, y, r, r * 0.92); ctx.fill(); }
  ctx.fillStyle = '#a7d9a0';
  for (const [x, y, r] of [[40, 38, 9], [60, 54, 7], [28, 60, 6]]) { ell(ctx, x, y, r, r * 0.8); ctx.fill(); }
}

function drawBush(ctx) {
  ctx.fillStyle = '#8fc98a';
  for (const [x, y, r] of [[16, 28, 14], [34, 20, 18], [50, 28, 13]]) { ell(ctx, x, y, r, r * 0.9); ctx.fill(); }
  ctx.fillRect(4, 28, 56, 12);
  ctx.fillStyle = '#a7d9a0';
  for (const [x, y, r] of [[30, 16, 6], [14, 26, 4]]) { ell(ctx, x, y, r, r * 0.8); ctx.fill(); }
}

function drawCloud(ctx) {
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const [x, y, r] of [[26, 28, 14], [46, 20, 18], [68, 28, 14], [48, 32, 16]]) { ell(ctx, x, y, r, r * 0.78); ctx.fill(); }
}

// ---------------------------------------------------------------- TEMALAR
export const THEMES = {
  salon: { wallA: '#f5e6c9', wallB: '#f0deba', motif: '#e8d2a6', tile: '#9b6b45', cap: 0xd39a62, capHi: 0xf2c690, line: 0x4e2f1c },
  mutfak: { wallA: '#e4f1ea', wallB: '#d8ebe2', motif: '#c4ddd2', tile: '#8f7663', cap: 0xf0ebe3, capHi: 0xffffff, line: 0x4a3a2e },
  bahce: { plain: true, wallA: '#cdeaf8', motif: '#ffffff', tile: '#8a5f3e', cap: 0x7fbf5f, capHi: 0xa9dc7f, line: 0x3f2a17 },
  cati: { plain: true, wallA: '#f9dcc6', motif: '#fdeee2', tile: '#b05a4c', cap: 0xdd9479, capHi: 0xf3bba3, line: 0x5a221b },
  park: { plain: true, wallA: '#d8f0dc', motif: '#f4fbf5', tile: '#7d6247', cap: 0x7fbf5f, capHi: 0xa9dc7f, line: 0x3a2b1c },
  insaat: { wallA: '#e1e5ec', wallB: '#d8dde6', motif: '#c7ced9', tile: '#8f949d', cap: 0xf2c84b, capHi: 0xffe08a, line: 0x3b3f47 },
  final: { wallA: '#ded8f1', wallB: '#d4cdeb', motif: '#c3bae3', tile: '#6f5a8a', cap: 0xb79be0, capHi: 0xd8c6f4, line: 0x35284a },
};

// ---------------------------------------------------------------- KAYIT
export const ART = {
  cat_idle: { w: 64, h: 48, draw: (c) => drawCat(c, 'idle') },
  cat_run0: { w: 64, h: 48, draw: (c) => drawCat(c, 'run0') },
  cat_run1: { w: 64, h: 48, draw: (c) => drawCat(c, 'run1') },
  cat_jump: { w: 64, h: 48, draw: (c) => drawCat(c, 'jump') },
  dog_idle: { w: 80, h: 72, draw: (c) => drawDog(c, 'idle') },
  dog_run0: { w: 80, h: 72, draw: (c) => drawDog(c, 'run0') },
  dog_run1: { w: 80, h: 72, draw: (c) => drawDog(c, 'run1') },
  dog_jump: { w: 80, h: 72, draw: (c) => drawDog(c, 'jump') },
  door: { w: 48, h: 144, draw: drawDoor },
  plate_up: { w: 44, h: 12, draw: (c) => drawPlate(c, false) },
  plate_down: { w: 44, h: 12, draw: (c) => drawPlate(c, true) },
  fish: { w: 30, h: 22, draw: drawFish },
  bone: { w: 30, h: 16, draw: drawBone },
  bowl: { w: 44, h: 26, draw: drawBowl },
  kennel: { w: 68, h: 62, draw: drawKennel },
  ok: { w: 24, h: 24, draw: drawOk },
  window: { w: 104, h: 116, draw: drawWindow },
  frame: { w: 60, h: 48, draw: drawFrame },
  plant: { w: 44, h: 76, draw: drawPlant },
  lamp: { w: 40, h: 120, draw: drawLamp },
  crate: { w: 44, h: 44, draw: drawCrate },
  vase: { w: 24, h: 30, draw: drawVase },
  hplate_up: { w: 44, h: 12, draw: (c) => drawHeavyPlate(c, false) },
  hplate_down: { w: 44, h: 12, draw: (c) => drawHeavyPlate(c, true) },
  water_top: { w: 48, h: 48, draw: (c) => drawLiquid(c, true, 'rgba(84,170,226,.72)', '#d9f1ff', 10) },
  water: { w: 48, h: 48, draw: (c) => drawLiquid(c, false, 'rgba(84,170,226,.72)') },
  mud_top: { w: 48, h: 48, draw: (c) => drawMud(c, true) },
  mud: { w: 48, h: 48, draw: (c) => drawMud(c, false) },
  soil: { w: 48, h: 48, draw: drawSoil },
  thin: { w: 48, h: 12, draw: drawThin },
  board: { w: 48, h: 48, draw: drawBoard },
  lift: { w: 48, h: 14, draw: drawLift },
  sensor: { w: 30, h: 30, draw: (c) => drawSensor(c, false) },
  sensor_on: { w: 30, h: 30, draw: (c) => drawSensor(c, true) },
  guard_sleep: { w: 88, h: 58, draw: (c) => drawGuard(c, false) },
  guard_awake: { w: 88, h: 58, draw: (c) => drawGuard(c, true) },
  tree: { w: 96, h: 140, draw: drawTree },
  bush: { w: 64, h: 40, draw: drawBush },
  cloud: { w: 96, h: 44, draw: drawCloud },
};

function prep(ctx, k) {
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

// Phaser dokularını üretir (bir kez).
export function buildTextures(scene) {
  for (const [key, a] of Object.entries(ART)) {
    if (scene.textures.exists(key)) continue;
    const t = scene.textures.createCanvas(key, a.w * S, a.h * S);
    prep(t.context, S);
    a.draw(t.context);
    t.refresh();
  }
}

// Bir temanın zemin ve duvar dokularını üretir (bir kez).
export function buildTheme(scene, name) {
  const th = THEMES[name] || THEMES.salon;
  const make = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w * S, h * S);
    prep(t.context, S);
    draw(t.context);
    t.refresh();
  };
  make(`tile0_${name}`, 48, 48, (c) => drawTile(c, 0, th.tile));
  make(`tile1_${name}`, 48, 48, (c) => drawTile(c, 1, th.tile));
  make(`wall_${name}`, 128, 128, (c) => drawWall(c, th));
  return th;
}

// Aynı çizimi menüdeki bir <canvas> öğesine basar.
export function drawArt(canvas, key, cssWidth) {
  const a = ART[key];
  if (!a) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const k = cssWidth / a.w;
  canvas.width = Math.round(a.w * k * dpr);
  canvas.height = Math.round(a.h * k * dpr);
  canvas.style.width = `${a.w * k}px`;
  canvas.style.height = `${a.h * k}px`;
  const ctx = canvas.getContext('2d');
  prep(ctx, k * dpr);
  a.draw(ctx);
}
