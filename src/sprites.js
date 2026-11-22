// Exact pixel-accurate sprite coordinates extracted from the NES sprite sheets
const SPRITES = {
  dw: {
    idle: { x: 7, y: 9, w: 26, h: 27 },
    cape: [
      { x: 66, y: 44, w: 28, h: 26 },
      { x: 96, y: 44, w: 27, h: 26 }
    ],
    victory: { x: 159, y: 4, w: 22, h: 32 },
    walk: [
      { x: 3, y: 77, w: 26, h: 27 },
      { x: 32, y: 79, w: 32, h: 25 },
      { x: 66, y: 81, w: 32, h: 23 },
      { x: 100, y: 79, w: 32, h: 25 },
      { x: 134, y: 79, w: 32, h: 23 }
    ],
    shoot: { x: 32, y: 123, w: 29, h: 27 },
    duck: { x: 117, y: 134, w: 24, h: 16 },
    duckShoot: { x: 144, y: 131, w: 28, h: 19 },
    jump: { x: 5, y: 164, w: 27, h: 33 },
    fall: { x: 35, y: 164, w: 26, h: 33 },
    hang: { x: 76, y: 203, w: 22, h: 39 },
    hangShoot: { x: 127, y: 203, w: 24, h: 39 },
    hurt: { x: 74, y: 255, w: 29, h: 26 },
    // Projectiles
    pellet: { x: 195, y: 5, w: 6, h: 4 },
    thunder: { x: 286, y: 42, w: 8, h: 8 },
    heavy: { x: 194, y: 90, w: 6, h: 8 },
    heavyCloud: { x: 203, y: 87, w: 14, h: 14 },
    arrow: { x: 274, y: 138, w: 24, h: 7 },
    pop: [
      { x: 219, y: 44, w: 14, h: 14 },
      { x: 235, y: 43, w: 16, h: 16 }
    ]
  },
  qj: {
    idle: { x: 7, y: 34, w: 27, h: 37 },
    walk: [
      { x: 2, y: 76, w: 27, h: 36 },
      { x: 32, y: 80, w: 34, h: 32 }
    ],
    jump: [
      { x: 72, y: 77, w: 27, h: 36 },
      { x: 105, y: 79, w: 35, h: 34 }
    ],
    banana: { x: 57, y: 13, w: 15, h: 8 },
    toy: [
      { x: 2, y: 3, w: 15, h: 24 },
      { x: 18, y: 3, w: 16, h: 24 },
      { x: 35, y: 3, w: 16, h: 24 }
    ]
  },
  enemies: {
    gunman: [
      { x: 27, y: 24, w: 32, h: 25 },
      { x: 76, y: 22, w: 32, h: 26 },
      { x: 127, y: 23, w: 30, h: 25 },
      { x: 174, y: 23, w: 32, h: 26 }
    ],
    heli: [
      { x: 25, y: 176, w: 29, h: 24 },
      { x: 120, y: 176, w: 27, h: 24 },
      { x: 167, y: 172, w: 27, h: 24 }
    ],
    heliBomb: { x: 249, y: 181, w: 11, h: 6 },
    egg: [
      { x: 20, y: 283, w: 24, h: 27 },
      { x: 64, y: 283, w: 24, h: 27 },
      { x: 110, y: 283, w: 31, h: 27 }
    ],
    crow: [
      { x: 25, y: 343, w: 24, h: 25 },
      { x: 60, y: 342, w: 24, h: 26 },
      { x: 101, y: 342, w: 24, h: 25 }
    ]
  },
  items: {
    heartFull: { x: 11, y: 28, w: 16, h: 15 },
    heartEmpty: { x: 79, y: 30, w: 16, h: 15 },
    diamond: { x: 149, y: 30, w: 16, h: 16 },
    medkit: { x: 218, y: 30, w: 16, h: 16 },
    gasLarge: { x: 271, y: 30, w: 14, h: 16 },
    gasSmall: { x: 301, y: 30, w: 8, h: 16 },
    oneUp: { x: 326, y: 31, w: 16, h: 16 },
    thunderBox: { x: 19, y: 74, w: 16, h: 20 },
    heavyBox: { x: 51, y: 73, w: 16, h: 20 }
  }
};

function drawSpriteFrame(ctx, img, f, dx, dy, flipX = false) {
  if (!img || !img.complete || !f) return;
  ctx.save();
  const rx = Math.round(dx);
  const ry = Math.round(dy);
  if (flipX) {
    ctx.translate(rx + f.w, ry);
    ctx.scale(-1, 1);
    ctx.drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  } else {
    ctx.drawImage(img, f.x, f.y, f.w, f.h, rx, ry, f.w, f.h);
  }
  ctx.restore();
}
