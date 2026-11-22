// Main Game Loop, Camera, Zone Transitions, NES HUD & Input
class DarkwingBridgeGame {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.assets = assets;
    this.audio = new SoundEngine();

    this.state = 'title'; // 'title' | 'playing' | 'paused' | 'gameover' | 'victory'
    this.zoneName = 'zone0';
    this.camX = 0;
    this.player = new Player(40, 100);
    this.enemies = new EnemyManager();
    this.boss = null;
    this.transitionTimer = 0;
    this.checkpoint = { zone: 'zone0', x: 40, y: 100 };

    this.keys = { left: false, right: false, up: false, down: false, jump: false, shoot: false };
    this.prevKeys = { ...this.keys };
    this.lastTime = 0;
    this.acc = 0;

    this.bindInputs();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindInputs() {
    const mapKey = (code) => {
      if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
      if (code === 'ArrowRight' || code === 'KeyD') return 'right';
      if (code === 'ArrowUp' || code === 'KeyW') return 'up';
      if (code === 'ArrowDown' || code === 'KeyS') return 'down';
      if (code === 'KeyZ' || code === 'Space' || code === 'KeyK') return 'jump';
      if (code === 'KeyX' || code === 'KeyJ' || code === 'Enter') return 'shoot';
      return null;
    };

    window.addEventListener('keydown', (e) => {
      const k = mapKey(e.code);
      if (k) {
        e.preventDefault();
        this.keys[k] = true;
      }
      if (e.code === 'KeyC' || e.code === 'KeyQ') {
        e.preventDefault();
        if (this.state === 'playing') this.player.cycleWeapon();
      }
      if (e.code === 'KeyP') {
        if (this.state === 'playing') this.state = 'paused';
        else if (this.state === 'paused') this.state = 'playing';
      }
      if (e.code === 'KeyM') {
        this.toggleMute();
      }
      if ((e.code === 'Enter' || e.code === 'Space') && this.state !== 'playing' && this.state !== 'paused') {
        this.startNewGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = mapKey(e.code);
      if (k) this.keys[k] = false;
    });
  }

  setTouchKey(name, pressed) {
    this.keys[name] = pressed;
  }

  async toggleMute() {
    await this.audio.init();
    const muted = this.audio.toggleMute();
    const btn = document.getElementById('btn-mute');
    if (btn) btn.textContent = muted ? '🔇 Звук: ВЫКЛ' : '🔊 Звук: ВКЛ';
  }

  startNewGame() {
    this.audio.init();
    this.player = new Player(40, 100);
    this.checkpoint = { zone: 'zone0', x: 40, y: 100 };
    this.enterZone('zone0', 40, 100);
    this.state = 'playing';
    this.audio.startMusic('stage');
  }

  enterZone(name, px, py) {
    this.zoneName = name;
    this.player.x = px;
    this.player.y = py;
    this.player.projectiles = [];
    this.player.hanging = null;
    if (name === 'zone3') {
      this.boss = new QuackerjackBoss();
      this.enemies.enemies = [];
      this.enemies.items = [];
      this.enemies.bullets = [];
      this.audio.startMusic('boss');
    } else {
      this.boss = null;
      this.enemies.spawnForZone(name);
    }
    this.updateCamera();
  }

  updateCamera() {
    const zw = LEVEL_ZONES[this.zoneName].src[2];
    this.camX = Math.max(0, Math.min(zw - 256, this.player.x - 112));
  }

  loop(ts) {
    const dt = Math.min(0.05, (ts - this.lastTime) / 1000 || 0);
    this.lastTime = ts;

    if (this.state === 'playing') {
      const step = 1 / 60;
      this.acc += dt;
      while (this.acc >= step) {
        this.update(step);
        this.acc -= step;
      }
    }
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const input = {
      left: this.keys.left,
      right: this.keys.right,
      up: this.keys.up,
      down: this.keys.down,
      jump: this.keys.jump,
      shoot: this.keys.shoot,
      jumpPressed: this.keys.jump && !this.prevKeys.jump,
      shootPressed: this.keys.shoot && !this.prevKeys.shoot
    };
    this.prevKeys = { ...this.keys };

    const zone = LEVEL_ZONES[this.zoneName];
    this.player.update(dt, input, zone, this.audio);

    if (this.zoneName === 'zone3' && this.boss) {
      this.boss.update(dt, this.player, zone, this.audio);
      if (this.boss.defeated && !this.player.victory) {
        this.player.victory = true;
        this.transitionTimer = 2.6;
      }
      if (this.player.victory) {
        this.transitionTimer -= dt;
        if (this.transitionTimer <= 0) {
          this.state = 'victory';
        }
      }
    } else {
      this.enemies.update(dt, this.player, zone, this.camX, this.audio);
    }

    // Zone Transitions (Exact NES Bridge map alignment!)
    if (this.zoneName === 'zone0') {
      // Climb up Brown Tower -> Zone 1
      if (this.player.y < 0 && this.player.x > 1280) {
        this.checkpoint = { zone: 'zone1', x: this.player.x - 1280, y: 205 };
        this.enterZone('zone1', this.player.x - 1280, 205);
        return;
      }
    } else if (this.zoneName === 'zone1') {
      // Drop down right shaft -> Zone 2
      if (this.player.y > 236 && this.player.x > 1536) {
        this.checkpoint = { zone: 'zone2', x: this.player.x - 1536, y: 12 };
        this.enterZone('zone2', this.player.x - 1536, 12);
        return;
      }
    } else if (this.zoneName === 'zone2') {
      // Reach Boss Gate at far right -> Zone 3 (Quackerjack!)
      if (this.player.x >= 1228) {
        this.checkpoint = { zone: 'zone3', x: 32, y: 185 };
        this.enterZone('zone3', 32, 185);
        return;
      }
    }

    // Pitfall or HP == 0
    if (this.player.y > 246 || this.player.hp <= 0) {
      this.player.lives--;
      this.audio.playSfx('hurt');
      if (this.player.lives <= 0) {
        this.state = 'gameover';
        this.audio.stopMusic();
      } else {
        this.player.hp = this.player.maxHp;
        this.player.invulnTimer = 1.5;
        this.enterZone(this.checkpoint.zone, this.checkpoint.x, this.checkpoint.y);
      }
      return;
    }

    this.updateCamera();
  }

  render() {
    const ctx = this.ctx;
    const zone = LEVEL_ZONES[this.zoneName];
    const [zx, zy, zw, zh] = zone.src;

    ctx.fillStyle = '#002a88';
    ctx.fillRect(0, 0, 256, 240);

    // Draw exact Bridge map slice
    if (this.assets.bridge && this.assets.bridge.complete) {
      ctx.drawImage(
        this.assets.bridge,
        zx + Math.round(this.camX), zy, 256, 240,
        0, 0, 256, 240
      );
    }

    // Draw Arrow Gas stuck platforms glow indicator & projectiles
    if (this.zoneName === 'zone3' && this.boss) {
      this.boss.draw(ctx, this.assets.qj, this.assets.dw);
    } else {
      this.enemies.draw(ctx, this.assets.enemies, this.assets.items, this.assets.dw, this.camX);
    }

    this.player.draw(ctx, this.assets.dw, this.camX);

    // Draw Boss Gate marker at end of zone2
    if (this.zoneName === 'zone2' && this.camX > 980) {
      const gx = 1236 - this.camX;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.fillRect(gx, 140, 20, 68);
      ctx.strokeStyle = '#ffd700';
      ctx.strokeRect(gx, 140, 20, 68);
    }

    this.drawHud(ctx);

    if (this.state === 'title') this.drawOverlay(ctx, 'DARKWING DUCK', 'BRIDGE STAGE • QUACKERJACK', 'НАЖМИТЕ ENTER / СТАРТ');
    else if (this.state === 'paused') this.drawOverlay(ctx, 'ПАУЗА', 'УРОВЕНЬ: МОСТ', 'НАЖМИТЕ P ДЛЯ ПРОДОЛЖЕНИЯ');
    else if (this.state === 'gameover') this.drawOverlay(ctx, 'GAME OVER', `СЧЁТ: ${this.player.score}`, 'НАЖМИТЕ ENTER ДЛЯ РЕСТАРТА');
    else if (this.state === 'victory') this.drawOverlay(ctx, 'STAGE CLEAR!', `СЧЁТ: ${this.player.score}`, 'QUACKERJACK ПОВЕРЖЕН! ENTER — ЗАНОВО');
  }

  drawHud(ctx) {
    // Top translucent NES status bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, 256, 22);

    // HP Hearts
    for (let i = 0; i < this.player.maxHp; i++) {
      const f = i < this.player.hp ? SPRITES.items.heartFull : SPRITES.items.heartEmpty;
      ctx.drawImage(this.assets.items, f.x, f.y, f.w, f.h, 4 + i * 12, 3, 10, 10);
    }

    // Weapon & Gas
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(`${this.player.weapon.slice(0, 3)}:${this.player.gas}`, 58, 12);

    // Lives & Score
    ctx.fillStyle = '#fde047';
    ctx.fillText(`1UP:${this.player.lives}`, 110, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText(`SCR:${String(this.player.score).padStart(5, '0')}`, 152, 12);

    // Zone or Boss HP
    if (this.zoneName === 'zone3' && this.boss) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('QJ', 216, 10);
      ctx.fillStyle = '#333';
      ctx.fillRect(216, 13, 34, 5);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(216, 13, Math.round((this.boss.hp / this.boss.maxHp) * 34), 5);
    } else {
      const zNum = this.zoneName === 'zone0' ? '1/3' : (this.zoneName === 'zone1' ? '2/3' : '3/3');
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`Z:${zNum}`, 224, 12);
    }
  }

  drawOverlay(ctx, title, sub, hint) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(16, 68, 224, 96);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 68, 224, 96);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(title, 128, 96);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(sub, 128, 118);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(hint, 128, 144);
    ctx.textAlign = 'left';
  }
}
