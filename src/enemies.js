// Bridge Level Enemies, Enemy Projectiles, & Collectible Items
class EnemyManager {
  constructor() {
    this.enemies = [];
    this.items = [];
    this.bullets = [];
    this.pops = [];
  }

  spawnForZone(zoneName) {
    this.enemies = [];
    this.items = [];
    this.bullets = [];
    this.pops = [];

    if (zoneName === 'zone0') {
      // Lower bridge + tower
      this.enemies.push(
        this.makeGunman(310, 165),
        this.makeHeli(470, 75),
        this.makeGunman(610, 180),
        this.makeCrow(780, 110),
        this.makeGunman(930, 180),
        this.makeHeli(1080, 65),
        this.makeGunman(1180, 180)
      );
      this.items.push(
        { type: 'gas_large', x: 255, y: 120, taken: false },
        { type: 'diamond', x: 110, y: 42, taken: false },
        { type: 'heart', x: 690, y: 80, taken: false },
        { type: 'thunder_ammo', x: 1000, y: 175, taken: false },
        { type: 'gas_small', x: 1475, y: 185, taken: false },
        { type: 'heart', x: 1480, y: 105, taken: false }
      );
    } else if (zoneName === 'zone1') {
      // Upper bridge cables, hooks, concrete chamber, spikes
      this.enemies.push(
        this.makeHeli(390, 70),
        this.makeEgg(560, 20),
        this.makeCrow(700, 95),
        this.makeGunman(900, 175),
        this.makeGunman(1020, 175),
        this.makeHeli(1250, 75),
        this.makeEgg(1420, 20),
        this.makeCrow(1620, 95)
      );
      this.items.push(
        { type: 'arrow_ammo', x: 300, y: 76, taken: false },
        { type: 'medkit', x: 925, y: 155, taken: false },
        { type: 'gas_large', x: 950, y: 155, taken: false },
        { type: 'one_up', x: 1000, y: 80, taken: false },
        { type: 'diamond', x: 1680, y: 130, taken: false }
      );
    } else if (zoneName === 'zone2') {
      // Lower-right concrete chamber + final bridge to Boss Gate
      this.enemies.push(
        this.makeGunman(140, 175),
        this.makeHeli(430, 65),
        this.makeGunman(520, 118),
        this.makeCrow(700, 95),
        this.makeGunman(860, 180),
        this.makeHeli(990, 70),
        this.makeGunman(1110, 180)
      );
      this.items.push(
        { type: 'heavy_ammo', x: 105, y: 85, taken: false },
        { type: 'heart', x: 140, y: 155, taken: false },
        { type: 'gas_large', x: 560, y: 112, taken: false },
        { type: 'medkit', x: 1070, y: 175, taken: false },
        { type: 'diamond', x: 1190, y: 175, taken: false }
      );
    }
  }

  makeGunman(x, y) {
    return { kind: 'gunman', x, y, w: 20, h: 24, hp: 2, vx: -36, vy: 0, dir: -1, timer: 0, shootCd: 1.5, anim: 0 };
  }
  makeHeli(x, y) {
    return { kind: 'heli', x, y, startY: y, w: 24, h: 22, hp: 2, vx: -48, vy: 0, dir: -1, timer: 0, shootCd: 1.8, anim: 0 };
  }
  makeEgg(x, y) {
    return { kind: 'egg', x, y, w: 20, h: 24, hp: 1, vx: 0, vy: 32, dir: -1, landed: false, timer: 0, anim: 0 };
  }
  makeCrow(x, y) {
    return { kind: 'crow', x, y, startY: y, w: 20, h: 20, hp: 1, vx: -62, vy: 0, dir: -1, timer: 0, anim: 0 };
  }

  update(dt, player, zone, camX, audio) {
    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      // Activate near camera
      if (e.x > camX + 300 || e.x + e.w < camX - 80) continue;
      e.anim += dt;
      e.timer += dt;

      if (e.kind === 'gunman') {
        e.vy = Math.min(e.vy + 650 * dt, 300);
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        for (const s of [...zone.solids, ...zone.platforms]) {
          if (e.x + e.w > s[0] && e.x < s[0] + s[2] && e.y + e.h >= s[1] && e.y + e.h <= s[1] + 14 && e.vy >= 0) {
            e.y = s[1] - e.h;
            e.vy = 0;
          }
        }
        // Turn at walls or after patrol interval
        if (e.timer > 1.8) {
          e.timer = 0;
          e.dir = player.x < e.x ? -1 : 1;
          e.vx = e.dir * 34;
        }
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = 2.1;
          const bdir = player.x < e.x ? -1 : 1;
          e.dir = bdir;
          this.bullets.push({ x: e.x + (bdir > 0 ? e.w : -4), y: e.y + 8, vx: bdir * 135, vy: 0, w: 6, h: 4, kind: 'bullet' });
        }
      } else if (e.kind === 'heli') {
        e.x += e.vx * dt;
        e.y = e.startY + Math.sin(e.timer * 3.5) * 14;
        if (e.timer > 2.4) {
          e.timer = 0;
          e.dir *= -1;
          e.vx = e.dir * 48;
        }
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = 1.9;
          this.bullets.push({ x: e.x + 8, y: e.y + 18, vx: 0, vy: 110, w: 8, h: 6, kind: 'bomb' });
        }
      } else if (e.kind === 'egg') {
        if (!e.landed) {
          e.y += e.vy * dt;
          e.x += Math.sin(e.timer * 4) * 20 * dt;
          for (const s of [...zone.solids, ...zone.platforms]) {
            if (e.x + e.w > s[0] && e.x < s[0] + s[2] && e.y + e.h >= s[1] && e.y + e.h <= s[1] + 12) {
              e.y = s[1] - e.h;
              e.landed = true;
              e.dir = player.x < e.x ? -1 : 1;
              e.vx = e.dir * 65;
              break;
            }
          }
        } else {
          e.x += e.vx * dt;
        }
      } else if (e.kind === 'crow') {
        e.x += e.vx * dt;
        e.y = e.startY + Math.sin(e.timer * 4.5) * 22;
      }

      // Check player projectile hits
      let killed = false;
      for (let j = player.projectiles.length - 1; j >= 0; j--) {
        const p = player.projectiles[j];
        if (p.type === 'ARROW' && p.stuck) continue;
        if (this.overlaps(p.x, p.y, 10, 10, e.x, e.y, e.w, e.h)) {
          e.hp -= p.dmg;
          if (p.type !== 'ARROW') player.projectiles.splice(j, 1);
          if (e.hp <= 0) {
            this.pops.push({ x: e.x, y: e.y, t: 0.25 });
            player.score += 200;
            audio.playSfx('pop');
            this.enemies.splice(i, 1);
            killed = true;
            break;
          } else {
            audio.playSfx('hurt', 0.25);
          }
        }
      }
      if (killed) continue;

      // Contact damage with player
      if (this.overlaps(player.x + 2, player.y + 2, player.w - 4, player.h - 4, e.x + 2, e.y + 2, e.w - 4, e.h - 4)) {
        player.takeDamage(1, player.x < e.x ? -1 : 1, audio);
      }
    }

    // Enemy bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < camX - 40 || b.x > camX + 300 || b.y > 260) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (this.overlaps(player.x + 2, player.y + 2, player.w - 4, player.h - 4, b.x, b.y, b.w, b.h)) {
        // Cape block!
        if (player.caping && b.kind === 'bullet') {
          b.vx *= -1.4;
          b.vy = -50;
          audio.playSfx('block');
        } else {
          player.takeDamage(1, b.vx > 0 ? 1 : -1, audio);
          this.bullets.splice(i, 1);
        }
      }
    }

    // Items
    for (const it of this.items) {
      if (it.taken) continue;
      if (this.overlaps(player.x, player.y, player.w, player.h, it.x, it.y, 16, 16)) {
        it.taken = true;
        if (it.type === 'heart') {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          audio.playSfx('pickup');
        } else if (it.type === 'medkit') {
          player.hp = player.maxHp;
          audio.playSfx('powerup');
        } else if (it.type === 'gas_small') {
          player.gas = Math.min(player.maxGas, player.gas + 5);
          audio.playSfx('pickup');
        } else if (it.type === 'gas_large') {
          player.gas = Math.min(player.maxGas, player.gas + 12);
          audio.playSfx('powerup');
        } else if (it.type === 'diamond') {
          player.score += 500;
          audio.playSfx('pickup');
        } else if (it.type === 'one_up') {
          player.lives++;
          audio.playSfx('powerup');
        } else if (it.type === 'thunder_ammo') {
          player.weaponIdx = 1;
          player.gas = Math.min(player.maxGas, player.gas + 10);
          audio.playSfx('powerup');
        } else if (it.type === 'heavy_ammo') {
          player.weaponIdx = 2;
          player.gas = Math.min(player.maxGas, player.gas + 10);
          audio.playSfx('powerup');
        } else if (it.type === 'arrow_ammo') {
          player.weaponIdx = 3;
          player.gas = Math.min(player.maxGas, player.gas + 10);
          audio.playSfx('powerup');
        }
      }
    }

    // Pops
    for (let i = this.pops.length - 1; i >= 0; i--) {
      this.pops[i].t -= dt;
      if (this.pops[i].t <= 0) this.pops.splice(i, 1);
    }
  }

  overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  draw(ctx, enemiesImg, itemsImg, dwImg, camX) {
    for (const it of this.items) {
      if (it.taken) continue;
      let f = SPRITES.items.diamond;
      if (it.type === 'heart') f = SPRITES.items.heartFull;
      else if (it.type === 'medkit') f = SPRITES.items.medkit;
      else if (it.type === 'gas_small') f = SPRITES.items.gasSmall;
      else if (it.type === 'gas_large') f = SPRITES.items.gasLarge;
      else if (it.type === 'one_up') f = SPRITES.items.oneUp;
      else if (it.type === 'thunder_ammo') f = SPRITES.items.thunderBox;
      else if (it.type === 'heavy_ammo' || it.type === 'arrow_ammo') f = SPRITES.items.heavyBox;
      drawSpriteFrame(ctx, itemsImg, f, it.x - camX, it.y, false);
    }

    for (const e of this.enemies) {
      if (e.x > camX + 280 || e.x + e.w < camX - 40) continue;
      let f;
      if (e.kind === 'gunman') f = SPRITES.enemies.gunman[Math.floor(e.anim * 8) % 4];
      else if (e.kind === 'heli') f = SPRITES.enemies.heli[Math.floor(e.anim * 12) % 3];
      else if (e.kind === 'egg') f = e.landed ? SPRITES.enemies.egg[2] : SPRITES.enemies.egg[Math.floor(e.anim * 4) % 2];
      else if (e.kind === 'crow') f = SPRITES.enemies.crow[Math.floor(e.anim * 8) % 3];
      drawSpriteFrame(ctx, enemiesImg, f, e.x - camX, e.y - (f.h - e.h), e.dir > 0);
    }

    for (const b of this.bullets) {
      if (b.kind === 'bomb') {
        drawSpriteFrame(ctx, enemiesImg, SPRITES.enemies.heliBomb, b.x - camX, b.y, false);
      } else {
        ctx.fillStyle = '#fff59d';
        ctx.fillRect(Math.round(b.x - camX), Math.round(b.y), b.w, b.h);
      }
    }

    for (const pop of this.pops) {
      const f = SPRITES.dw.pop[pop.t > 0.12 ? 0 : 1];
      drawSpriteFrame(ctx, dwImg, f, pop.x - camX, pop.y, false);
    }
  }
}
