// Audio Engine: Plays real NES WAV SFX & MP3 Stage/Boss Music via Web Audio API
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.musicBuffers = {};
    this.musicSource = null;
    this.musicGain = null;
    this.muted = false;
    this.musicMode = null; // 'stage' | 'boss' | null
    this.initialized = false;
    this.initPromise = null;
  }

  _decodeDataUri(uri) {
    const b64 = uri.split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return this.ctx.decodeAudioData(bytes.buffer);
  }

  init() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) {
        return Promise.resolve();
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.initPromise) return this.initPromise;

    this.initialized = true;
    const tasks = [];

    // Decode SFX WAVs
    for (const [key, uri] of Object.entries(SFX_DATA || {})) {
      tasks.push(
        this._decodeDataUri(uri)
          .then((buf) => { this.buffers[key] = buf; })
          .catch(() => {})
      );
    }

    // Decode Stage & Boss MP3s
    if (typeof STAGE_MUSIC_DATA !== 'undefined') {
      tasks.push(
        this._decodeDataUri(STAGE_MUSIC_DATA)
          .then((buf) => {
            this.musicBuffers.stage = buf;
            if (this.musicMode === 'stage' && !this.muted && !this.musicSource) {
              this._playMusicBuffer('stage');
            }
          })
          .catch(() => {})
      );
    }
    if (typeof BOSS_MUSIC_DATA !== 'undefined') {
      tasks.push(
        this._decodeDataUri(BOSS_MUSIC_DATA)
          .then((buf) => {
            this.musicBuffers.boss = buf;
            if (this.musicMode === 'boss' && !this.muted && !this.musicSource) {
              this._playMusicBuffer('boss');
            }
          })
          .catch(() => {})
      );
    }

    this.initPromise = Promise.all(tasks);
    return this.initPromise;
  }

  playSfx(name, volume = 0.5) {
    if (this.muted || !this.ctx || !this.buffers[name]) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers[name];
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0);
    } catch (e) {}
  }

  _playMusicBuffer(mode) {
    this.stopMusic();
    if (this.muted || !this.ctx || !this.musicBuffers[mode]) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.musicBuffers[mode];
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.42;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(0);
      this.musicSource = src;
      this.musicGain = gain;
    } catch (e) {}
  }

  startMusic(mode) {
    this.musicMode = mode;
    this.stopMusic();
    if (this.muted || !mode) return;
    if (this.musicBuffers[mode]) {
      this._playMusicBuffer(mode);
    } else {
      this.init();
    }
  }

  stopMusic() {
    if (this.musicSource) {
      try { this.musicSource.stop(0); } catch (e) {}
      try { this.musicSource.disconnect(); } catch (e) {}
      this.musicSource = null;
    }
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch (e) {}
      this.musicGain = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopMusic();
    else if (this.musicMode) this.startMusic(this.musicMode);
    return this.muted;
  }
}
