// İki oyuncu arasındaki bağlantı: davet kodu, oyun verisi ve sesli konuşma.
// PeerJS (WebRTC) kullanır; veri ve ses doğrudan iki cihaz arasında akar.

const PREFIX = 'kedikopek-v1-';
const SILENCE_LIMIT = 12000; // ms — bu kadar süre hiç veri gelmezse bağlantı kopmuş sayılır

function randomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function peerOptions() {
  // Varsayılan: PeerJS'in ücretsiz eşleştirme sunucusu.
  // Geliştirme için adres çubuğuna ?sig=localhost:9000 yazılabilir.
  const sig = new URLSearchParams(location.search).get('sig');
  if (!sig) return {};
  const [host, port] = sig.split(':');
  return { host, port: Number(port) || 9000, path: '/', secure: false };
}

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
        peer.on('open', () => {
          opened = true;
          this.peer = peer;
          this.code = code;
          this._bindPeer(peer);
          resolve(code);
        });
        peer.on('error', (err) => {
          if (opened) return;
          peer.destroy();
          if (err.type === 'unavailable-id' && ++tries < 6) attempt();
          else reject(new Error('Sunucuya bağlanılamadı. İnternetini kontrol edip tekrar dene.'));
        });
      };
      attempt();
    });
  }

  // Davet koduyla odaya katılır.
  join(code) {
    this.isHost = false;
    this.code = code;
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(undefined, peerOptions());
      let done = false;
      const fail = (msg) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        peer.destroy();
        reject(new Error(msg));
      };
      const timeout = setTimeout(() => fail('Odaya bağlanılamadı. Kodu kontrol edip tekrar dene.'), 15000);
      peer.on('open', () => {
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
        conn.on('error', () => fail('Odaya bağlanılamadı.'));
      });
      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') fail('Bu kodla açık bir oda bulunamadı.');
        else fail('Sunucuya bağlanılamadı. İnternetini kontrol edip tekrar dene.');
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
      // Eşleştirme sunucusuyla bağ koptu; oyun bağlantısı sürer. Yeniden bağlanmayı dene.
      if (!this.closed && !peer.destroyed) {
        try { peer.reconnect(); } catch { /* yoksay */ }
      }
    });
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
    clearInterval(this.timer);
    this.connected = false;
    if (this.micStream) for (const tr of this.micStream.getTracks()) tr.stop();
    this.micStream = null;
    try { this.peer?.destroy(); } catch { /* yoksay */ }
    this.peer = null;
    this.conn = null;
  }
}
