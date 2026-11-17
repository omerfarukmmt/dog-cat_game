# Kedi & Köpek

İki kişilik, tarayıcıda çalışan bir bulmaca-platform oyunu. Biri kediyi, diğeri köpeği oynar; bölümler ancak birlikte çözülür.

- **Davet kodu:** Biri oda kurar, 4 haneli kodu arkadaşına gönderir.
- **Sesli konuşma:** Oynarken mikrofon tuşuyla konuşabilirsiniz.
- **Mobil:** Telefon yatay tutulur; ekrandaki tuşlarla oynanır. Bilgisayarda ok tuşları / WASD, zıplama için boşluk, yetenek için E çalışır.

## Karakterler

| | Kedi | Köpek |
|---|---|---|
| Boyut | Küçük: dar geçitlere sığar | Büyük: dar geçide giremez |
| Zıplama | 2 kare | 3 kare |
| Tırmanma | Tırmalama tahtasına tırmanır (zıpla tuşunu basılı tut) | – |
| İnce tahta / dal | Üstünde yürür | Basınca kırılır |
| İter | Vazo | Kutu |
| Su | Düşerse bölüm yeniden başlar | Yüzer |
| Pati tuşu | Miyavlar | Toprağın yanındaysa kazar, değilse havlar (sensörlü kapıları açar) |
| Uyuyan bekçi | Sessizce geçer | Yaklaşırsa ya da yakınında havlarsa uyandırır |
| Ağır (turuncu) düğme | Basamaz | Basar (kutu ve vazo da basar) |
| Toplar | Balık | Kemik |
| Çıkış | Mama kabı | Kulübe |

## Bölümler

1. **Salon** – temel hareketler, düğme ve kapı
2. **Mutfak** – kutu, ağır düğme, ince raflar, vazo
3. **Bahçe** – su, çamur, toprak kazma
4. **Çatı** – tırmalama tahtası, dallar
5. **Park** – uyuyan bekçi, havlama sensörü
6. **İnşaat** – asansörler, kutu
7. **Final** – hepsi bir arada, süreli

Menüdeki (☰) **Tuş boyutu** kaydırıcısı ekrandaki tuşları büyütüp küçültür; ayar cihazda saklanır.

## Çalıştırma

Derleme adımı yok; dosyalar olduğu gibi yayınlanır.

Yerelde denemek için klasörde basit bir sunucu açmak yeterli:

```
python -m http.server 8080
```

Sonra tarayıcıda `http://localhost:8080` açılır. (Mikrofon yalnızca `https` ya da `localhost` üzerinde çalışır.)

## Yapı

```
index.html            menüler, oyun içi tuşlar
css/style.css         görünüm
js/main.js            akış: menü → oda → oyun
js/game.js            oyun sahnesi, fizik, eşitleme (Phaser 3)
js/levels.js          bölüm haritaları
js/net.js             davet kodu, veri ve ses bağlantısı (PeerJS / WebRTC)
js/art.js             tüm çizimler (kodla çizilir, resim dosyası yok)
js/input.js           dokunmatik + klavye
js/sfx.js             ses efektleri
js/vendor/            Phaser ve PeerJS
```

## Bölüm eklemek

`js/levels.js` içindeki `LEVELS` listesine yeni bir harita eklenir. Harita karakterleri ve nesne listeleri (düğme, kapı, sensör, asansör) dosyanın başında açıklanmıştır.

## Bağlantı nasıl çalışıyor?

Oyun verisi ve ses, WebRTC ile doğrudan iki cihaz arasında akar. Yalnızca iki cihazın birbirini bulması için PeerJS'in ücretsiz eşleştirme sunucusu kullanılır. Sunucu masrafı yoktur.

## Kullanılan kütüphaneler

- [Phaser 3](https://phaser.io) (MIT)
- [PeerJS](https://peerjs.com) (MIT)
