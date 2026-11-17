// İki oyuncu arasındaki bağlantı: davet kodu, oyun verisi ve sesli konuşma.
// PeerJS (WebRTC) kullanır; veri ve ses doğrudan iki cihaz arasında akar.

const PREFIX = 'kedikopek-v1-';
const SILENCE_LIMIT = 12000; // ms — bu kadar süre hiç veri gelmezse bağlantı kopmuş sayılır

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Bağlantı yolu bulmak için kullanılan sunucular. STUN: cihazın dış adresini öğrenir.
// TURN: iki cihaz doğrudan bağlanamazsa (mobil veri, sıkı modemler) veriyi aktarır.
const TURN_USER = '7cb58095af4d59878b52fc17';
const TURN_PASS = 'LKPfY7QS5P6asbZm';
const ICE_SERVERS = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  // Metered TURN (ücretsiz plan): telefonlar farklı ağlardayken veriyi ve sesi aktarır.
  {
    urls: [
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:80?transport=tcp',
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp',
    ],
    username: TURN_USER,
    credential: TURN_PASS,
  },
];

function peerOptions() {
  const opts = { config: { iceServers: ICE_SERVERS, sdpSemantics: 'unified-plan' }, debug: 1 };
  // Varsayılan: PeerJS'in ücretsiz eşleştirme sunucusu.
  // Geliştirme için adres çubuğuna ?sig=localhost:9000 yazılabilir.
  const sig = new URLSearchParams(location.search).get('sig');
  if (!sig) return opts;
  const [host, port] = sig.split(':');
  return { ...opts, host, port: Number(port) || 9000, path: '/', secure: false };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Net {
  constructor() {
    this.handlers = {};
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.code = null;
    this.connected = false;
    this.mic = 'off'; // 'off' | 'on' | 'muted'
    this.micStream = null;
    this.outCall = null;
    this.inCall = null;
    this.lastSeen = 0;
    this.timer = null;
    this.closed = false;
  }

  on(ev, fn) {
    (this.handlers[ev] ||= []).push(fn);
  }
  emit(ev, data) {
    for (const fn of this.handlers[ev] || []) fn(data);
  }

  // Oda kurar, davet kodunu döndürür.
  host() {
    this.isHost = true;
    return new Promise((resolve, reject) => {
      let tries = 0;
      const attempt = () => {
        const code = randomCode();
        const peer = new window.Peer(PREFIX + code, peerOptions());
        let opened = false;
        const timer = setTimeout(() => {
          if (opened) return;
          peer.destroy();
          reject(new Error('Sunucuya bağlanılamadı (zaman aşımı). İnternetini kontrol edip tekrar dene.'));
        }, 20000);
        peer.on('open', () => {
          opened = true;
          clearTimeout(timer);
          this.peer = peer;
          this.code = code;
          this._bindPeer(peer);
          resolve(code);
        });
        peer.on('error', (err) => {
          if (opened) return;
          clearTimeout(timer);
          peer.destroy();
          if (err.type === 'unavailable-id' && ++tries < 6) attempt();
          else reject(new Error(`Sunucuya bağlanılamadı (${err.type || 'hata'}). İnternetini kontrol edip tekrar dene.`));
        });
      };
      attempt();
    });
  }

  // Davet koduyla odaya katılır. Oda kuranın telefonu kısa süreliğine arka plana geçmiş olabilir
  // (ör. kodu WhatsApp'tan gönderirken); bu yüzden "oda bulunamadı" hemen pes etmek yerine birkaç kez yeniden denenir.
  async join(code, onStatus = () => {}) {
    this.isHost = false;
    this.code = code;
    const deadline = performance.now() + 30000;
    let lastErr = null;
    for (let attempt = 1; performance.now() < deadline && !this.closed; attempt++) {
      if (attempt > 1) onStatus(`Oda aranıyor… (${attempt}. deneme)`);
      try {
        await this._joinOnce(code, onStatus);
        return;
      } catch (err) {
        lastErr = err;
        if (!err.retry) break;
        await wait(2500);
      }
    }
    throw lastErr || new Error('Odaya bağlanılamadı.');
  }

  _joinOnce(code, onStatus) {
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(undefined, peerOptions());
      let done = false;
      let timeout = null;
      const fail = (msg, retry = false) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        peer.destroy();
        const e = new Error(msg);
        e.retry = retry;
        reject(e);
      };
      timeout = setTimeout(() => fail('Sunucuya bağlanılamadı (zaman aşımı). İnternetini kontrol edip tekrar dene.'), 20000);
      peer.on('open', () => {
        clearTimeout(timeout);
        onStatus('Oda aranıyor, arkadaşının telefonuna bağlanılıyor…');
        // Oda bulunduysa ama doğrudan bağlantı kurulamıyorsa (ağ engeli) burada takılır.
        timeout = setTimeout(
          () => fail('İki telefon birbirine bağlanamadı (ağ engeli). Biraz sonra tekrar deneyin.'),
          25000,
        );
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          this.peer = peer;
          this._bindPeer(peer);
          this._bindConn(conn);
          resolve();
        });
        conn.on('error', () => fail('İki telefon birbirine bağlanamadı (ağ engeli).'));
      });
      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') fail('Bu kodla açık bir oda bulunamadı. Oda kuranın ekranı açık mı?', true);
        else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
          fail(`Sunucuya bağlanılamadı (${err.type}). İnternetini kontrol edip tekrar dene.`, true);
        } else fail(`Odaya bağlanılamadı (${err.type || 'hata'}).`);
      });
    });
  }

  _bindPeer(peer) {
    peer.on('connection', (conn) => {
      // Odaya yalnızca bir arkadaş girebilir.
      if (this.conn && this.conn.open) {
        conn.on('open', () => {
          conn.send({ t: 'full' });
          setTimeout(() => conn.close(), 400);
        });
        return;
      }
      conn.on('open', () => this._bindConn(conn));
    });
    peer.on('call', (call) => {
      // Arkadaşın mikrofonu: yanıtla ve sesi çal.
      this.inCall = call;
      call.answer();
      call.on('stream', (stream) => this.emit('voice', stream));
      call.on('close', () => this.emit('voice', null));
    });
    peer.on('disconnected', () => {
      // Eşleştirme sunucusuyla bağ koptu (çoğunlukla telefon arka plana geçince); oyun bağlantısı sürer.
      this.emit('signal', false);
      this._reconnectSignal();
    });
    peer.on('open', () => this.emit('signal', true));
    peer.on('error', (err) => {
      // Oda kurulduktan sonraki sunucu hataları: bekleyip yeniden bağlan.
      if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) this._reconnectSignal(1500);
    });
    // Sayfa yeniden görünür olunca sunucu bağlantısını hemen tazele.
    this._onVisible = () => {
      if (!document.hidden && this.peer && this.peer.disconnected) this._reconnectSignal();
    };
    document.addEventListener('visibilitychange', this._onVisible);
    window.addEventListener('online', this._onVisible);
  }

  _reconnectSignal(delay = 0) {
    clearTimeout(this._recon);
    this._recon = setTimeout(() => {
      const peer = this.peer;
      if (this.closed || !peer || peer.destroyed || !peer.disconnected) return;
      if (document.hidden) return; // görünür olunca tekrar denenir
      try { peer.reconnect(); } catch { /* yoksay */ }
      this._reconnectSignal(4000); // olmazsa birkaç saniye sonra yine dene
    }, delay);
  }

  _bindConn(conn) {
    this.conn = conn;
    this.connected = true;
    this.lastSeen = performance.now();
    conn.on('data', (msg) => {
      this.lastSeen = performance.now();
      if (!msg || msg.t === 'p') return;
      if (msg.t === 'full') {
        this.emit('full');
        return;
      }
      this.emit('msg', msg);
    });
    conn.on('close', () => this._lost());
    conn.on('error', () => this._lost());
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.connected) return;
      this.send({ t: 'p' });
      if (!document.hidden && performance.now() - this.lastSeen > SILENCE_LIMIT) this._lost();
    }, 2000);
    this.emit('connected');
    this._callOut();
  }

  _lost() {
    if (!this.connected) return;
    this.connected = false;
    clearInterval(this.timer);
    try { this.outCall?.close(); } catch { /* yoksay */ }
    try { this.inCall?.close(); } catch { /* yoksay */ }
    this.outCall = this.inCall = null;
    try { this.conn?.close(); } catch { /* yoksay */ }
    this.conn = null;
    this.emit('voice', null);
    if (!this.closed) this.emit('disconnected');
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(msg); } catch { /* yoksay */ }
    }
  }

  // Mikrofonu açar (ilk seferde tarayıcı izin ister).
  async enableMic() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Bu tarayıcı mikrofonu desteklemiyor.');
    if (!this.micStream) {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    }
    this.setMuted(false);
    this._callOut();
  }

  setMuted(muted) {
    if (!this.micStream) return;
    for (const tr of this.micStream.getAudioTracks()) tr.enabled = !muted;
    this.mic = muted ? 'muted' : 'on';
    this.emit('mic', this.mic);
  }

  _callOut() {
    if (!this.micStream || !this.connected || !this.conn || this.outCall) return;
    this.outCall = this.peer.call(this.conn.peer, this.micStream);
    this.outCall?.on('close', () => { this.outCall = null; });
    this.outCall?.on('error', () => { this.outCall = null; });
  }

  close() {
    this.closed = true;
    clearTimeout(this._recon);
    if (this._onVisible) {
      document.removeEventListener('visibilitychange', this._onVisible);
      window.removeEventListener('online', this._onVisible);
    }
    clearInterval(this.timer);
    this.connected = false;
    if (this.micStream) for (const tr of this.micStream.getTracks()) tr.stop();
    this.micStream = null;
    try { this.peer?.destroy(); } catch { /* yoksay */ }
    this.peer = null;
    this.conn = null;
  }
}
