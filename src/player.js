// Darkwing Duck Player Controller (Physics, Collisions, Cape Block, Hanging, 4 Gas Weapons)
const WEAPONS = ['NORMAL', 'THUNDER', 'HEAVY', 'ARROW'];

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 26;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 right, -1 left
    this.grounded = false;
    this.ducking = false;
    this.caping = false;
    this.hanging = null; // { type: 'hook'|'ledge', x, y }
    this.dropThroughTimer = 0;
    this.shootTimer = 0;
    this.invulnTimer = 0;
    this.hurtTimer = 0;
    this.animTimer = 0;
    this.capeTimer = 0;
    this.hp = 4;
    this.maxHp = 4;
    this.gas = 20;
    this.maxGas = 30;
    this.lives = 3;
    this.score = 0;
    this.weaponIdx = 0;
    this.projectiles = [];
    this.victory = false;
  }

  get weapon() {
    return WEAPONS[this.weaponIdx];
  }

  cycleWeapon() {
    this.weaponIdx = (this.weaponIdx + 1) % WEAPONS.length;
  }

  update(dt, input, zone, audio) {
    if (this.victory) {
      this.animTimer += dt;
      return;
    }

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.shootTimer > 0) this.shootTimer -= dt;
    if (this.dropThroughTimer > 0) this.dropThroughTimer -= dt;

    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
      this.vy += 680 * dt;
      this.moveAndCollide(dt, zone);
      return;
    }

    // Hanging on hook or girder ledge
    if (this.hanging) {
      this.vx = 0;
      this.vy = 0;
      if (input.left) this.facing = -1;
      if (input.right) this.facing = 1;
      if (input.jumpPressed) {
        if (input.down) {
          this.hanging = null;
          this.vy = 40;
        } else {
          this.hanging = null;
          this.vy = -275;
          audio.playSfx('jump');
        }
      } else if (input.shootPressed) {
        this.fireWeapon(audio);
      }
      this.updateProjectiles(dt, zone);
      return;
    }

    // Ducking & Caping (NES authentic: Down = duck, Up = cape shield)
    this.ducking = this.grounded && input.down && !input.left && !input.right;
    const wasCaping = this.caping;
    this.caping = this.grounded && input.up && !this.ducking && !input.left && !input.right && this.shootTimer <= 0;
    if (this.caping) this.capeTimer = wasCaping ? this.capeTimer + dt : 0;
    else this.capeTimer = 0;

    // Horizontal movement
    const speed = 102;
    if (this.ducking || this.caping) {
      this.vx = 0;
    } else if (input.left) {
      this.vx = -speed;
      this.facing = -1;
    } else if (input.right) {
      this.vx = speed;
      this.facing = 1;
    } else {
      this.vx = 0;
    }

    // Drop through one-way platform (Down + Jump)
    if (this.grounded && input.down && input.jumpPressed) {
      this.dropThroughTimer = 0.22;
      this.grounded = false;
      this.y += 2;
      this.vy = 40;
    } else if (this.grounded && input.jumpPressed) {
      this.vy = -295;
      this.grounded = false;
      audio.playSfx('jump');
    }

    // Variable jump height (release jump early)
    if (!input.jump && this.vy < -110) {
      this.vy = -110;
    }

    // Shooting
    if (input.shootPressed && !this.caping) {
      this.fireWeapon(audio);
    }

    // Gravity
    this.vy = Math.min(this.vy + 720 * dt, 340);

    // Move & Collide
    const prevY = this.y;
    this.moveAndCollide(dt, zone);

    // Check Hook Grab (when airborne and holding Up or falling near a hook)
    if (!this.grounded && !this.hanging && this.vy >= -40) {
      const cx = this.x + this.w / 2;
      const topY = this.y;
      for (const h of zone.hooks) {
        const hx = h[0] + h[2] / 2;
        const hy = h[1] + h[3] / 2;
        if (Math.abs(cx - hx) <= 12 && Math.abs(topY - hy) <= 14) {
          this.hanging = { type: 'hook', x: hx, y: hy };
          this.x = hx - this.w / 2;
          this.y = hy + 2;
          this.vx = 0;
          this.vy = 0;
          audio.playSfx('grab');
          break;
        }
      }
    }

    // Check Ledge/Platform Bottom Grab (holding Up while jumping up under a girder)
    if (!this.grounded && !this.hanging && input.up && this.vy < 0) {
      for (const p of zone.platforms) {
        const pBottom = p[1] + 8;
        if (this.x + this.w > p[0] + 4 && this.x < p[0] + p[2] - 4) {
          if (prevY >= pBottom - 4 && this.y <= pBottom + 4) {
            this.hanging = { type: 'ledge', x: this.x + this.w / 2, y: pBottom };
            this.y = pBottom + 2;
            this.vx = 0;
            this.vy = 0;
            audio.playSfx('grab');
            break;
          }
        }
      }
    }

    // Spike hazard check
    for (const s of zone.spikes) {
      if (this.overlaps(this.x + 2, this.y + 2, this.w - 4, this.h - 4, s[0], s[1], s[2], s[3])) {
        this.takeDamage(1, this.facing * -1, audio);
        break;
      }
    }

    this.animTimer += dt;
    this.updateProjectiles(dt, zone);
  }

  fireWeapon(audio) {
    const w = this.weapon;
    if (w !== 'NORMAL' && this.gas <= 0) {
      this.weaponIdx = 0; // fallback to NORMAL
    }
    const activeW = this.weapon;
    const gunY = this.ducking ? this.y + 14 : (this.hanging ? this.y + 12 : this.y + 10);
    const gunX = this.facing > 0 ? this.x + this.w + 2 : this.x - 8;

    if (activeW === 'NORMAL') {
      if (this.projectiles.filter(p => p.type === 'NORMAL').length >= 3) return;
      this.projectiles.push({ type: 'NORMAL', x: gunX, y: gunY, vx: this.facing * 260, vy: 0, dmg: 1, life: 1.1 });
    } else if (activeW === 'THUNDER') {
      this.gas = Math.max(0, this.gas - 1);
      this.projectiles.push({ type: 'THUNDER', x: gunX, y: gunY, vx: this.facing * 210, vy: -120, dmg: 2, life: 1.0 });
      this.projectiles.push({ type: 'THUNDER', x: gunX, y: gunY, vx: this.facing * 210, vy: 120, dmg: 2, life: 1.0 });
    } else if (activeW === 'HEAVY') {
      this.gas = Math.max(0, this.gas - 1);
      this.projectiles.push({ type: 'HEAVY', x: gunX, y: gunY, vx: this.facing * 50, vy: 140, dmg: 2, life: 1.6, landed: false });
    } else if (activeW === 'ARROW') {
      this.gas = Math.max(0, this.gas - 2);
      this.projectiles.push({ type: 'ARROW', x: gunX, y: gunY, vx: this.facing * 250, vy: 0, dmg: 3, life: 3.5, stuck: false });
    }
    this.shootTimer = 0.16;
    audio.playSfx('shoot');
  }

  updateProjectiles(dt, zone) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.type === 'ARROW' && p.stuck) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'HEAVY' && !p.landed) {
        p.vy = Math.min(p.vy + 500 * dt, 260);
        // Check floor/platform landing
        for (const s of [...zone.solids, ...zone.platforms]) {
          if (p.x + 10 > s[0] && p.x < s[0] + s[2] && p.y + 12 >= s[1] && p.y + 12 <= s[1] + 12) {
            p.y = s[1] - 12;
            p.vy = 0;
            p.vx = (p.vx >= 0 ? 1 : -1) * 140;
            p.landed = true;
            break;
          }
        }
      }

      if (p.type === 'ARROW' && !p.stuck) {
        for (const s of zone.solids) {
          if (this.overlaps(p.x, p.y, 20, 6, s[0], s[1], s[2], s[3])) {
            p.stuck = true;
            p.vx = 0;
            p.life = 3.2;
            break;
          }
        }
      }
    }
  }

  moveAndCollide(dt, zone) {
    // Horizontal
    this.x += this.vx * dt;
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > zone.src[2]) this.x = zone.src[2] - this.w;

    for (const s of zone.solids) {
      if (this.overlaps(this.x, this.y, this.w, this.h, s[0], s[1], s[2], s[3])) {
        if (this.vx > 0) this.x = s[0] - this.w;
        else if (this.vx < 0) this.x = s[0] + s[2];
      }
    }

    // Vertical
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.grounded = false;

    for (const s of zone.solids) {
      if (this.overlaps(this.x, this.y, this.w, this.h, s[0], s[1], s[2], s[3])) {
        if (this.vy > 0) {
          this.y = s[1] - this.h;
          this.vy = 0;
          this.grounded = true;
        } else if (this.vy < 0) {
          this.y = s[1] + s[3];
          this.vy = 0;
        }
      }
    }

    // One-way platforms + stuck Arrow Gas platforms
    if (this.vy >= 0 && this.dropThroughTimer <= 0) {
      for (const p of zone.platforms) {
        if (this.x + this.w > p[0] + 2 && this.x < p[0] + p[2] - 2) {
          if (prevBottom <= p[1] + 5 && this.y + this.h >= p[1]) {
            this.y = p[1] - this.h;
            this.vy = 0;
            this.grounded = true;
          }
        }
      }
      for (const ap of this.projectiles) {
        if (ap.type === 'ARROW' && ap.stuck) {
          if (this.x + this.w > ap.x && this.x < ap.x + 22) {
            if (prevBottom <= ap.y + 5 && this.y + this.h >= ap.y) {
              this.y = ap.y - this.h;
              this.vy = 0;
              this.grounded = true;
            }
          }
        }
      }
    }
  }

  takeDamage(dmg, knockDir, audio) {
    if (this.invulnTimer > 0 || this.victory) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.hanging = null;
    this.invulnTimer = 1.3;
    this.hurtTimer = 0.28;
    this.vx = knockDir * 70;
    this.vy = -160;
    this.grounded = false;
    audio.playSfx('hurt');
    return true;
  }

  overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  draw(ctx, dwImg, camX) {
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 18) % 2 === 0 && this.hurtTimer <= 0) {
      // Classic NES invincibility flicker
    } else {
      let frame = SPRITES.dw.idle;
      if (this.victory) {
        frame = SPRITES.dw.victory;
      } else if (this.hurtTimer > 0) {
        frame = SPRITES.dw.hurt;
      } else if (this.hanging) {
        frame = this.shootTimer > 0 ? SPRITES.dw.hangShoot : SPRITES.dw.hang;
      } else if (!this.grounded) {
        frame = this.vy < 0 ? SPRITES.dw.jump : SPRITES.dw.fall;
      } else if (this.ducking) {
        frame = this.shootTimer > 0 ? SPRITES.dw.duckShoot : SPRITES.dw.duck;
      } else if (this.caping) {
        frame = SPRITES.dw.cape[this.capeTimer < 0.07 ? 0 : 1];
      } else if (this.shootTimer > 0 && this.vx === 0) {
        frame = SPRITES.dw.shoot;
      } else if (Math.abs(this.vx) > 0) {
        frame = SPRITES.dw.walk[Math.floor(this.animTimer * 11) % SPRITES.dw.walk.length];
      }

      const drawX = this.x - camX - Math.floor((frame.w - this.w) / 2);
      const drawY = this.hanging ? this.y - 6 : (this.y + this.h - frame.h);
      drawSpriteFrame(ctx, dwImg, frame, drawX, drawY, this.facing < 0);
    }

    // Draw projectiles
    for (const p of this.projectiles) {
      let pf = SPRITES.dw.pellet;
      if (p.type === 'THUNDER') pf = SPRITES.dw.thunder;
      else if (p.type === 'HEAVY') pf = p.landed ? SPRITES.dw.heavyCloud : SPRITES.dw.heavy;
      else if (p.type === 'ARROW') pf = SPRITES.dw.arrow;
      drawSpriteFrame(ctx, dwImg, pf, p.x - camX, p.y, p.vx < 0);
    }
  }
}
