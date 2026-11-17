// Bölüm verileri.
//
// Harita karakterleri:
//   #  duvar / zemin          .  boşluk
//   C  kedinin başlangıcı     D  köpeğin başlangıcı
//   f  balık (kedi toplar)    b  kemik (köpek toplar)
//   c  mama kabı (kedinin çıkışı)
//   d  kulübe (köpeğin çıkışı)
//
// Düğmeler (plates) ve kapılar (doors) ayrı listelerde, kare (tile) koordinatıyla verilir.
// Bir kapı, kendisine bağlı düğmelerden herhangi biri basılıyken açık kalır.

export const TILE = 48;

export const LEVELS = [
  {
    name: 'Salon',
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
    plates: [
      { x: 23, y: 7, door: 'A' },
      { x: 31, y: 10, door: 'A' },
    ],
    doors: [{ id: 'A', x: 27, y: 8, h: 3 }],
    hints: [
      { x: 5, y: 7.2, text: 'Yürü ve zıpla.\nZıpla tuşunu basılı tutarsan daha yükseğe çıkarsın.' },
      { x: 12.2, y: 6.4, text: 'Kedi dar geçitten geçer.\nKöpek yükseğe zıplar.' },
      { x: 21, y: 6.1, text: 'Köpek yukarıdaki düğmeye bassın,\nkapı açılınca kedi geçsin.' },
      { x: 31.5, y: 6.6, text: 'Şimdi sıra kedide: rafın altındaki\ndüğmeye bas, köpek geçsin.' },
      { x: 39.2, y: 5.8, text: 'Kedi mama kabına,\nköpek kulübesine!' },
    ],
    decor: [
      { art: 'window', x: 5, y: 5.6 },
      { art: 'plant', x: 12.5, y: 11 },
      { art: 'frame', x: 17.6, y: 4.6 },
      { art: 'lamp', x: 19.5, y: 11 },
      { art: 'plant', x: 25.6, y: 11 },
      { art: 'frame', x: 30, y: 3.4 },
      { art: 'window', x: 35, y: 4.2 },
      { art: 'lamp', x: 34.6, y: 11 },
    ],
  },
];
