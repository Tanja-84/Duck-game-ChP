// Quackerjack Boss Fight (3-tier arena, evasion leaps, falling banana peels, toy minions)
class QuackerjackBoss {
  constructor() {
    this.tiersY = [216, 152, 88]; // Floor, Mid girder, Top girder
    this.tier = 0;
    this.x = 196;
    this.y = this.tiersY[0] - 34;
    this.w = 24;
    this.h = 34;
    this.vx = -64;
    this.vy = 0;
    this.dir = -1;
    this.hp = 16;
    this.maxHp = 16;
    this.jumping = false;
    this.invulnTimer = 0;
    this.bananaTimer = 1.4;
    this.toyTimer = 3.2;
    this.animTimer = 0;
    this.bananas = [];
    this.toys = [];
    this.defeated = false;
    this.explodeTimer = 0;
  }

  getPlayerTier(player) {
    const py = player.y + player.h;
    if (py <= 105) return 2;
    if (py <= 170) return 1;
    return 0;
  }

  update(dt, player, zone, audio) {
    if (this.defeated) {
      this.explodeTimer += dt;
      return;
    }

    this.animTimer += dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;

    // Authentic NES Quackerjack AI:
    // If Darkwing gets on the same tier, Quackerjack leaps to a different tier!
    const pTier = this.getPlayerTier(player);
    if (!this.jumping && pTier === this.tier) {
      const choices = [0, 1, 2].filter(t => t !== this.tier);
      const targetTier = choices[Math.floor(Math.random() * choices.length)];
      this.jumping = true;
      this.targetTier = targetTier;
      this.vy = targetTier > this.tier ? -320 : -150;
      this.vx = (this.x > 128 ? -1 : 1) * 70;
      audio.playSfx('jump');
    }

    if (this.jumping) {
      this.x += this.vx * dt;
      this.vy += 680 * dt;
      this.y += this.vy * dt;
      if (this.x < 16) { this.x = 16; this.vx = Math.abs(this.vx); }
      if (this.x + this.w > 240) { this.x = 240 - this.w; this.vx = -Math.abs(this.vx); }

      const targetFloor = this.tiersY[this.targetTier];
      if (this.vy > 0 && this.y + this.h >= targetFloor) {
        this.y = targetFloor - this.h;
        this.vy = 0;
        this.jumping = false;
        this.tier = this.targetTier;
        this.dir = player.x < this.x ? 1 : -1; // Runs away from DW
        this.vx = this.dir * 74;
      }
    } else {
      // Run back and forth along current tier
      this.x += this.vx * dt;
      if (this.x < 14) { this.x = 14; this.vx = 74; this.dir = 1; }
      if (this.x + this.w > 242) { this.x = 242 - this.w; this.vx = -74; this.dir = -1; }
      this.y = this.tiersY[this.tier] - this.h;
    }

    // Drop Banana Peels from ceiling
    this.bananaTimer -= dt;
    if (this.bananaTimer <= 0) {
      this.bananaTimer = 1.35;
      const bx = Math.max(16, Math.min(230, player.x + (Math.random() * 48 - 24)));
      this.bananas.push({ x: bx, y: 46, vy: 58, life: 4.5 });
    }

    for (let i = this.bananas.length - 1; i >= 0; i--) {
      const b = this.bananas[i];
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.y > 212 || b.life <= 0) {
        this.bananas.splice(i, 1);
        continue;
      }
      if (this.overlaps(player.x + 2, player.y + 2, player.w - 4, player.h - 4, b.x, b.y, 14, 8)) {
        player.takeDamage(1, player.x < b.x ? -1 : 1, audio);
        this.bananas.splice(i, 1);
      }
    }

    // Spawn Mini-Toy minion occasionally
    this.toyTimer -= dt;
    if (this.toyTimer <= 0 && this.toys.length < 2) {
      this.toyTimer = 4.2;
      const dir = player.x < this.x ? -1 : 1;
      this.toys.push({ x: this.x, y: this.tiersY[0] - 22, vx: dir * 55, vy: 0, hp: 1, anim: 0 });
    }

    for (let i = this.toys.length - 1; i >= 0; i--) {
      const t = this.toys[i];
      t.anim += dt;
      t.x += t.vx * dt;
      if (t.x < 8 || t.x > 236) t.vx *= -1;

      let hit = false;
      for (let j = player.projectiles.length - 1; j >= 0; j--) {
        const p = player.projectiles[j];
        if (p.type === 'ARROW' && p.stuck) continue;
        if (this.overlaps(p.x, p.y, 10, 10, t.x, t.y, 15, 22)) {
          player.projectiles.splice(j, 1);
          this.toys.splice(i, 1);
          audio.playSfx('pop');
          hit = true;
          break;
        }
      }
      if (hit) continue;

      if (this.overlaps(player.x + 2, player.y + 2, player.w - 4, player.h - 4, t.x, t.y, 15, 22)) {
        player.takeDamage(1, player.x < t.x ? -1 : 1, audio);
      }
    }

    // Player projectile hits on Quackerjack
    for (let j = player.projectiles.length - 1; j >= 0; j--) {
      const p = player.projectiles[j];
      if (p.type === 'ARROW' && p.stuck) continue;
      if (this.overlaps(p.x, p.y, 10, 10, this.x, this.y, this.w, this.h)) {
        if (p.type !== 'ARROW') player.projectiles.splice(j, 1);
        if (this.invulnTimer <= 0) {
          this.hp = Math.max(0, this.hp - p.dmg);
          this.invulnTimer = 0.35;
          audio.playSfx('boss_hit');
          if (this.hp <= 0) {
            this.defeated = true;
            this.bananas = [];
            this.toys = [];
            player.score += 5000;
            audio.stopMusic();
            audio.playSfx('clear');
          }
        }
      }
    }

    // Contact damage
    if (!this.defeated && this.overlaps(player.x + 2, player.y + 2, player.w - 4, player.h - 4, this.x + 2, this.y + 2, this.w - 4, this.h - 4)) {
      player.takeDamage(1, player.x < this.x ? -1 : 1, audio);
    }
  }

  overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  draw(ctx, qjImg, dwImg) {
    if (this.defeated) {
      if (this.explodeTimer < 1.8 && Math.floor(this.explodeTimer * 16) % 2 === 0) {
        const f = SPRITES.dw.pop[Math.floor(this.explodeTimer * 12) % 2];
        drawSpriteFrame(ctx, dwImg, f, this.x + 4, this.y + 8, false);
      }
      return;
    }

    if (this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 24) % 2 === 0) {
      let f = SPRITES.qj.walk[Math.floor(this.animTimer * 8) % 2];
      if (this.jumping) f = SPRITES.qj.jump[this.vy < 0 ? 0 : 1];
      drawSpriteFrame(ctx, qjImg, f, this.x - 4, this.y + this.h - f.h, this.vx > 0);
    }

    for (const b of this.bananas) {
      drawSpriteFrame(ctx, qjImg, SPRITES.qj.banana, b.x, b.y, false);
    }
    for (const t of this.toys) {
      const f = SPRITES.qj.toy[Math.floor(t.anim * 8) % 3];
      drawSpriteFrame(ctx, qjImg, f, t.x, t.y, t.vx > 0);
    }
  }
}
