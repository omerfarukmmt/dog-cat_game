// Bölüm verileri.
//
// Harita karakterleri:
//   #  duvar / zemin            .  boşluk
//   C  kedinin başlangıcı       D  köpeğin başlangıcı
//   f  balık (kedi toplar)      b  kemik (köpek toplar)
//   c  mama kabı (kedinin çıkışı)
//   d  kulübe (köpeğin çıkışı)
//   ~  su (kedi düşerse bölüm yeniden başlar, köpek yüzer)
//   m  çamur (ikisi için de tehlikeli)
//   s  yumuşak toprak (köpek pati tuşuyla kazar)
//   =  ince tahta / dal (kediyi taşır, köpek basınca kırılır; alttan içinden geçilir)
//   h  tırmalama tahtası (kedi zıpla tuşunu basılı tutarak tırmanır)
//   B  kutu (köpek iter)        P  vazo (kedi iter)
//   Z  uyuyan bekçi köpek (köpek yaklaşırsa ya da yakınında havlarsa uyanır)
//
// Listeler kare (tile) koordinatıyla verilir:
//   plates   düğmeler. door: açtığı kapı, lift: çağırdığı asansör, heavy: yalnızca köpek/kutu/vazo basabilir
//   doors    kapılar (h: yükseklik). Bağlı düğmelerden biri basılıyken ya da sensörü tetiklenince açıktır
//   sensors  havlama sensörleri: köpek yakınında havlarsa kapıyı birkaç saniye açar
//   lifts    asansörler: (x, y) dinlenme konumu; bağlı düğme basılıyken (toX, toY) konumuna gider
//   ground   zemin satırı (kamera payı için), timeLimit: saniye cinsinden süre sınırı

export const TILE = 48;

export const LEVELS = [
  {
    name: 'Salon',
    theme: 'salon',
    tiles: [
      '############################################',
      '#..........................#...............#',
      '#..........................#...............#',
      '#..........................#...............#',
      '#..........................#...............#',
      '#..........................#...............#',
      '#..........................#...............#',
      '#...............b.......b..#......b..d.....#',
      '#........f.....###....###...........#####..#',
      '#..............###............###......##..#',
      '#.C.D...##......f......................f.c.#',
      '############################################',
    ],
    plates: [{ x: 23, y: 7, door: 'A' }, { x: 31, y: 10, door: 'A' }],
    doors: [{ id: 'A', x: 27, y: 8, h: 3 }],
    hints: [
      { x: 5, y: 7.2, text: 'Yürü ve zıpla.\nZıpla tuşunu basılı tutarsan daha yükseğe çıkarsın.' },
      { x: 12.2, y: 6.4, text: 'Kedi dar geçitten geçer.\nKöpek yükseğe zıplar.' },
      { x: 21, y: 6.1, text: 'Köpek yukarıdaki düğmeye bassın,\nkapı açılınca kedi geçsin.' },
      { x: 31.5, y: 6.6, text: 'Şimdi sıra kedide: rafın altındaki\ndüğmeye bas, köpek geçsin.' },
      { x: 39.2, y: 5.8, text: 'Kedi mama kabına,\nköpek kulübesine!' },
    ],
    decor: [{ art: 'window', x: 5, y: 5.6 }, { art: 'plant', x: 12.5, y: 11 }, { art: 'frame', x: 17.6, y: 4.6 }, { art: 'lamp', x: 19.5, y: 11 }, { art: 'plant', x: 25.6, y: 11 }, { art: 'frame', x: 30, y: 3.4 }, { art: 'window', x: 35, y: 4.2 }, { art: 'lamp', x: 34.6, y: 11 }],
  },
  {
    name: 'Mutfak',
    theme: 'mutfak',
    tiles: [
      '############################################',
      '#...........#................#.............#',
      '#...........#................#.............#',
      '#...........#................#.............#',
      '#...........#................#.............#',
      '#...........#.........P.f....#.............#',
      '#...........#.......######...#.............#',
      '#...........#.....f..........#.............#',
      '#........b..#....==..........#..b...d......#',
      '#..............f.......b...........####....#',
      '#.............==...................####....#',
      '#C.D..B..................................c.#',
      '############################################',
    ],
    plates: [{ x: 9, y: 11, door: 'A', heavy: true }, { x: 26, y: 11, door: 'B', heavy: true }],
    doors: [{ id: 'A', x: 12, y: 9, h: 3 }, { id: 'B', x: 29, y: 9, h: 3 }],
    hints: [
      { x: 5.4, y: 8.3, text: 'Köpek kutuyu iter.\nTuruncu düğmeye yalnızca köpek\nya da ağır bir şey basabilir.' },
      { x: 16.5, y: 6.2, text: 'İnce raflar yalnızca kediyi taşır.\nKöpek basarsa kırılır!' },
      { x: 23, y: 3.3, text: 'Kedi vazoyu iterek\naşağı düşürebilir.' },
      { x: 33, y: 6.2, text: 'Vazo düğmeye düşünce\nkapı açık kalır.' },
    ],
    decor: [{ art: 'window', x: 5, y: 6.4 }, { art: 'plant', x: 10.6, y: 12 }, { art: 'frame', x: 27, y: 5 }, { art: 'window', x: 33, y: 5.2 }, { art: 'plant', x: 31, y: 12 }],
  },
  {
    name: 'Bahçe',
    theme: 'bahce',
    ground: 11,
    tiles: [
      '##################################################',
      '#.......................###............#.........#',
      '#.......................###............#.........#',
      '#.......................###............#.........#',
      '#.......................###............#.........#',
      '#.......................###......................#',
      '#.......................###......................#',
      '#...........b....B......sss......................#',
      '#........f......===.f...sss.......######.........#',
      '#.......................sbs.......s.f.##....b....#',
      '#.C.D...................sss.......s..c##........d#',
      '########~~#####~~~~~~########mm##########~~~~~~###',
      '#########################################~~~~~~###',
      '##################################################',
    ],
    plates: [{ x: 35, y: 10, door: 'E' }],
    doors: [{ id: 'E', x: 39, y: 5, h: 3 }],
    hints: [
      { x: 4.6, y: 7.4, text: 'Kedi suya düşerse bölüm baştan başlar.\nKöpek yüzebilir.' },
      { x: 11.2, y: 4.9, text: 'Köpek yukarıdaki tahtaya zıplasın:\ntahta kırılır, kutu suya düşer.\nKedi kutunun üstünden atlar.' },
      { x: 21.6, y: 8, text: 'Köpek pati tuşuyla\nyumuşak toprağı kazar.' },
      { x: 29.5, y: 8.4, text: 'Çamura basmayın!' },
      { x: 31.3, y: 6.2, text: 'Köpek toprağı kazsın,\nkedi içerideki düğmeye bassın.' },
    ],
    decor: [{ art: 'tree', x: 6.4, y: 11 }, { art: 'cloud', x: 21.5, y: 4.4 }, { art: 'bush', x: 22.4, y: 11 }, { art: 'bush', x: 27.6, y: 11 }, { art: 'cloud', x: 44, y: 5 }],
  },
  {
    name: 'Çatı',
    theme: 'cati',
    tiles: [
      '########################################',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#......................................#',
      '#.................................f.c..#',
      '#............................h########h#',
      '#............................h...#....h#',
      '#............................h........h#',
      '#............................h.......bh#',
      '#.....f...............f......h.....d..h#',
      '#.....h#######h######====##==#########h#',
      '#.....h.....#.h.......................h#',
      '#.....h.....#.h..b.........b..........h#',
      '#.....h.......h.......###.............h#',
      '#.....h.......h.......###.............h#',
      '#.C.D.h.......h.......###.............h#',
      '########################################',
    ],
    plates: [{ x: 9, y: 10, door: 'G1' }, { x: 32, y: 5, door: 'G2' }],
    doors: [{ id: 'G1', x: 12, y: 14, h: 3 }, { id: 'G2', x: 33, y: 8, h: 3 }],
    hints: [
      { x: 3, y: 13, text: 'Kedi tahtaya tırmanır:\nzıpla tuşunu\nbasılı tut.' },
      { x: 10.6, y: 9, text: 'Kedi düğmeye bassın,\nköpek aşağıdan geçsin.' },
      { x: 18, y: 9, text: 'Dal yalnızca kediyi taşır.\nÖnce kedi geçsin!' },
      { x: 18, y: 14.4, text: 'Köpek: kedi dalı geçince\nbloğun üstünden yukarı zıpla.' },
      { x: 32.4, y: 3.9, text: 'Kedi düğmeye bassın,\nköpek kulübeye girsin.' },
    ],
    decor: [{ art: 'cloud', x: 4, y: 9 }, { art: 'cloud', x: 17, y: 6 }, { art: 'cloud', x: 26, y: 4 }, { art: 'cloud', x: 9, y: 3 }],
  },
];
