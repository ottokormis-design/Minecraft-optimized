import { BLOCKS, type BlockId } from "./blocks";
import { clamp, hash } from "./noise";
import type { GameState, Mob, Point } from "./types";
import { TILE, type World } from "./world";

const ORE_PALETTE: Record<string, [string, string]> = {
  coal: ["#34343d", "#1d1d24"],
  iron: ["#dcb894", "#a98668"],
  gold: ["#f6cf4a", "#c49b24"],
  diamond: ["#6ce9e2", "#1fa9a5"],
  quartz: ["#f4f1e6", "#c9c3ae"],
};

function pick(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Draws one 32px-style block tile at screen position (sx, sy). */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: BlockId,
  sx: number,
  sy: number,
  S: number,
  tx: number,
  ty: number,
  seed: number,
  time: number,
): void {
  const def = BLOCKS[block];
  const u = S / 32;
  const rnd = (i: number) => hash(tx * 19 + i * 7, ty * 23 - i * 13, seed + i * 97);
  const bottomShade = () => {
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(sx, sy + S - u, S, u);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillRect(sx, sy, S, u);
  };

  switch (def.tex) {
    case "grass": {
      pick(ctx, "#6faf4a", sx, sy, S, S);
      for (let i = 0; i < 5; i++) {
        const a = rnd(i);
        const b = rnd(i + 11);
        pick(ctx, a < 0.5 ? "#639f41" : "#7fbc58", sx + a * S * 0.78, sy + b * S * 0.78, S * 0.2, S * 0.15);
      }
      ctx.fillStyle = "#4e8a34";
      for (let i = 0; i < 3; i++) {
        const a = rnd(i + 30);
        const b = rnd(i + 40);
        ctx.fillRect(sx + a * S * 0.88, sy + b * S * 0.8, Math.max(1, u), 4 * u);
      }
      break;
    }
    case "dirt": {
      pick(ctx, "#8a5a3b", sx, sy, S, S);
      for (let i = 0; i < 6; i++) {
        const a = rnd(i);
        const b = rnd(i + 9);
        pick(ctx, a < 0.55 ? "#7a4c30" : "#9c6a47", sx + a * S * 0.8, sy + b * S * 0.8, S * 0.16, S * 0.13);
      }
      break;
    }
    case "stone": {
      pick(ctx, "#8d919a", sx, sy, S, S);
      for (let i = 0; i < 5; i++) {
        const a = rnd(i + 2);
        const b = rnd(i + 21);
        pick(ctx, a < 0.5 ? "#82868f" : "#989ca5", sx + a * S * 0.78, sy + b * S * 0.78, S * 0.22, S * 0.16);
      }
      ctx.fillStyle = "#6f737c";
      ctx.fillRect(sx + rnd(7) * S * 0.7, sy + rnd(8) * S * 0.7, S * 0.12, u);
      break;
    }
    case "sand": {
      pick(ctx, "#e5d39a", sx, sy, S, S);
      for (let i = 0; i < 5; i++) {
        const a = rnd(i + 3);
        const b = rnd(i + 17);
        pick(ctx, a < 0.5 ? "#dbca8f" : "#efdfae", sx + a * S * 0.8, sy + b * S * 0.8, S * 0.15, S * 0.12);
      }
      break;
    }
    case "snow": {
      pick(ctx, "#eef4fa", sx, sy, S, S);
      for (let i = 0; i < 4; i++) {
        const a = rnd(i + 4);
        const b = rnd(i + 23);
        pick(ctx, a < 0.5 ? "#e0ebf5" : "#ffffff", sx + a * S * 0.8, sy + b * S * 0.8, S * 0.2, S * 0.15);
      }
      break;
    }
    case "ice": {
      pick(ctx, "#a9d3ea", sx, sy, S, S);
      ctx.globalAlpha = 0.55;
      pick(ctx, "#d4ecf8", sx + S * 0.12, sy + S * 0.1, S * 0.55, S * 0.1);
      pick(ctx, "#8ec3e2", sx + S * 0.3, sy + S * 0.6, S * 0.55, S * 0.12);
      ctx.globalAlpha = 1;
      break;
    }
    case "water": {
      pick(ctx, "#2f6cd4", sx, sy, S, S);
      const wave = Math.sin(time * 1.8 + tx * 0.7 + ty * 0.4) * S * 0.1;
      ctx.globalAlpha = 0.45;
      pick(ctx, "#5a92e8", sx + S * 0.1, sy + S * 0.32 + wave, S * 0.7, S * 0.12);
      pick(ctx, "#7fb0f2", sx + S * 0.26, sy + S * 0.66 - wave, S * 0.5, S * 0.08);
      ctx.globalAlpha = 1;
      break;
    }
    case "lava": {
      pick(ctx, "#d95a17", sx, sy, S, S);
      const glow = (Math.sin(time * 2 + tx * 0.9 + ty * 0.5) + 1) / 2;
      ctx.globalAlpha = 0.55 + glow * 0.3;
      pick(ctx, "#ff8a2b", sx + S * 0.16, sy + S * 0.24, S * 0.4, S * 0.3);
      pick(ctx, "#ffd05a", sx + S * 0.5, sy + S * 0.55 + glow * S * 0.06, S * 0.22, S * 0.18);
      ctx.globalAlpha = 1;
      break;
    }
    case "tree": {
      pick(ctx, "#6faf4a", sx, sy, S, S);
      pick(ctx, "#639f41", sx + S * 0.1, sy + S * 0.68, S * 0.3, S * 0.16);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(sx + S * 0.55, sy + S * 0.66, S * 0.36, S * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#245a28";
      ctx.beginPath();
      ctx.arc(sx + S * 0.5, sy + S * 0.5, S * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#357f36";
      ctx.beginPath();
      ctx.arc(sx + S * 0.47, sy + S * 0.46, S * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4c9f47";
      for (let i = 0; i < 3; i++) {
        const a = rnd(i + 5);
        const b = rnd(i + 15);
        ctx.beginPath();
        ctx.arc(sx + S * (0.35 + a * 0.3), sy + S * (0.32 + b * 0.3), S * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "cactus": {
      pick(ctx, "#e5d39a", sx, sy, S, S);
      pick(ctx, "#dbca8f", sx + S * 0.62, sy + S * 0.14, S * 0.2, S * 0.16);
      pick(ctx, "#e5d39a", sx + S * 0.18, sy + S * 0.18, S * 0.64, S * 0.64);
      pick(ctx, "#3f8b3d", sx + S * 0.18, sy + S * 0.18, S * 0.64, S * 0.64);
      pick(ctx, "#4fa34b", sx + S * 0.24, sy + S * 0.22, S * 0.18, S * 0.56);
      ctx.fillStyle = "#2d6b2c";
      ctx.fillRect(sx + S * 0.34, sy + S * 0.26, u, S * 0.48);
      ctx.fillRect(sx + S * 0.58, sy + S * 0.26, u, S * 0.48);
      ctx.fillStyle = "#e8e3b0";
      ctx.fillRect(sx + S * 0.3, sy + S * 0.3, u, u);
      ctx.fillRect(sx + S * 0.66, sy + S * 0.52, u, u);
      break;
    }
    case "flower": {
      pick(ctx, "#6faf4a", sx, sy, S, S);
      for (let i = 0; i < 3; i++) {
        const a = rnd(i + 12);
        const b = rnd(i + 22);
        pick(ctx, "#639f41", sx + a * S * 0.75, sy + b * S * 0.75, S * 0.18, S * 0.14);
      }
      const kind = rnd(31);
      const petal = kind < 0.4 ? "#f5d74a" : kind < 0.7 ? "#f28fb1" : "#f2f5ff";
      ctx.fillStyle = "#3f7a2b";
      ctx.fillRect(sx + S * 0.48, sy + S * 0.52, u, S * 0.22);
      ctx.fillStyle = petal;
      ctx.fillRect(sx + S * 0.38, sy + S * 0.38, S * 0.22, S * 0.22);
      ctx.fillStyle = "#c98a1a";
      ctx.fillRect(sx + S * 0.46, sy + S * 0.46, S * 0.08, S * 0.08);
      break;
    }
    case "coal":
    case "iron":
    case "gold":
    case "diamond":
    case "quartz": {
      const [light, dark] = ORE_PALETTE[def.tex];
      if (def.tex === "quartz") {
        pick(ctx, "#6e2b2b", sx, sy, S, S);
        pick(ctx, "#5a2222", sx + S * 0.1, sy + S * 0.62, S * 0.3, S * 0.18);
      } else {
        pick(ctx, "#8d919a", sx, sy, S, S);
        pick(ctx, "#82868f", sx + S * 0.15, sy + S * 0.6, S * 0.25, S * 0.2);
      }
      for (let i = 0; i < 4; i++) {
        const a = rnd(i + 6);
        const b = rnd(i + 26);
        const px = sx + S * (0.14 + a * 0.58);
        const py = sy + S * (0.14 + b * 0.58);
        pick(ctx, dark, px, py + u, S * 0.2, S * 0.14);
        pick(ctx, light, px, py, S * 0.2, S * 0.13);
      }
      break;
    }
    case "obsidian": {
      pick(ctx, "#241a33", sx, sy, S, S);
      for (let i = 0; i < 5; i++) {
        const a = rnd(i + 8);
        const b = rnd(i + 28);
        pick(ctx, a < 0.5 ? "#2f2244" : "#1b1329", sx + a * S * 0.8, sy + b * S * 0.8, S * 0.16, S * 0.13);
      }
      ctx.fillStyle = "#7a53c4";
      ctx.fillRect(sx + rnd(41) * S * 0.8, sy + rnd(42) * S * 0.8, S * 0.07, S * 0.07);
      ctx.fillStyle = "#4b2f86";
      ctx.fillRect(sx + rnd(43) * S * 0.8, sy + rnd(44) * S * 0.8, S * 0.05, S * 0.05);
      break;
    }
    case "netherrack": {
      pick(ctx, "#6e2b2b", sx, sy, S, S);
      for (let i = 0; i < 6; i++) {
        const a = rnd(i + 10);
        const b = rnd(i + 30);
        pick(ctx, a < 0.5 ? "#5a2222" : "#833434", sx + a * S * 0.8, sy + b * S * 0.8, S * 0.18, S * 0.13);
      }
      break;
    }
    case "glowstone": {
      pick(ctx, "#e8b447", sx, sy, S, S);
      ctx.globalAlpha = 0.5;
      pick(ctx, "#ffe08a", sx + S * 0.1, sy + S * 0.12, S * 0.42, S * 0.34);
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {
        const a = rnd(i + 13);
        const b = rnd(i + 33);
        pick(ctx, a < 0.5 ? "#fff0b0" : "#c9922c", sx + a * S * 0.78, sy + b * S * 0.78, S * 0.14, S * 0.14);
      }
      break;
    }
    case "soulsand": {
      pick(ctx, "#57443b", sx, sy, S, S);
      for (let i = 0; i < 4; i++) {
        const a = rnd(i + 14);
        const b = rnd(i + 34);
        pick(ctx, "#463630", sx + a * S * 0.8, sy + b * S * 0.8, S * 0.2, S * 0.14);
      }
      ctx.fillStyle = "#2f231f";
      ctx.fillRect(sx + S * 0.3, sy + S * 0.36, S * 0.1, S * 0.1);
      ctx.fillRect(sx + S * 0.6, sy + S * 0.36, S * 0.1, S * 0.1);
      ctx.fillRect(sx + S * 0.38, sy + S * 0.6, S * 0.24, S * 0.08);
      break;
    }
    case "endstone": {
      pick(ctx, "#ded9ab", sx, sy, S, S);
      for (let i = 0; i < 5; i++) {
        const a = rnd(i + 16);
        const b = rnd(i + 36);
        pick(ctx, a < 0.5 ? "#cec89b" : "#eee9c2", sx + a * S * 0.78, sy + b * S * 0.78, S * 0.18, S * 0.14);
      }
      break;
    }
    case "void": {
      pick(ctx, "#07050f", sx, sy, S, S);
      ctx.fillStyle = "rgba(120, 90, 200, 0.5)";
      for (let i = 0; i < 2; i++) {
        const a = rnd(i + 18);
        const b = rnd(i + 38);
        ctx.fillRect(sx + a * S * 0.9, sy + b * S * 0.9, Math.max(1, u * 0.8), Math.max(1, u * 0.8));
      }
      break;
    }
    case "portal_n": {
      pick(ctx, "#3a0d63", sx, sy, S, S);
      const pulse = (Math.sin(time * 2.4 + tx * 0.4) + 1) / 2;
      ctx.globalAlpha = 0.5 + pulse * 0.35;
      pick(ctx, "#8b3ff0", sx + S * 0.1, sy + S * 0.08, S * 0.8, S * 0.28);
      ctx.globalAlpha = 0.45;
      pick(ctx, "#c79bff", sx + S * 0.22, sy + S * 0.46, S * 0.56, S * 0.18);
      ctx.globalAlpha = 1;
      break;
    }
    case "portal_e": {
      pick(ctx, "#0d0a1f", sx, sy, S, S);
      const pulse = (Math.sin(time * 1.6 + tx * 0.3 + ty * 0.3) + 1) / 2;
      ctx.globalAlpha = 0.35 + pulse * 0.4;
      pick(ctx, "#2fd6c3", sx + S * 0.14, sy + S * 0.16, S * 0.72, S * 0.68);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#eafffb";
      for (let i = 0; i < 3; i++) {
        const a = rnd(i + 20);
        const b = rnd(i + 40);
        ctx.fillRect(sx + a * S * 0.9, sy + b * S * 0.9, Math.max(1, u), Math.max(1, u));
      }
      break;
    }
    default: {
      pick(ctx, "#6faf4a", sx, sy, S, S);
      break;
    }
  }

  bottomShade();
}

function drawCracks(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  S: number,
  progress: number,
  tx: number,
  ty: number,
): void {
  if (progress <= 0.02) return;
  const p = clamp(progress, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.2 + p * 0.6;
  ctx.strokeStyle = "#0b0b0c";
  ctx.lineWidth = 2;
  const lines = Math.ceil(p * 5);
  for (let i = 0; i < lines; i++) {
    const a = hash(tx * 7 + i, ty * 11 - i, 55);
    const b = hash(tx * 5 - i, ty * 3 + i, 91);
    ctx.beginPath();
    ctx.moveTo(sx + a * S, sy + b * S);
    ctx.lineTo(sx + a * S + (b - 0.5) * S * 0.45, sy + b * S + (a - 0.5) * S * 0.45);
    ctx.lineTo(sx + a * S + (b - 0.5) * S * 0.7, sy + b * S + (a - 0.5) * S * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  dpr = 1;
  width = 0;
  height = 0;
  camX = 0;
  camY = 0;
  private camReady = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  }

  screenToWorld(x: number, y: number): Point {
    return { x: x + this.camX, y: y + this.camY };
  }

  snapCamera(x: number, y: number): void {
    this.camX = x - this.width / 2;
    this.camY = y - this.height / 2;
    this.camReady = true;
  }

  render(
    s: GameState,
    world: World,
    dt: number,
    time: number,
    targetTile: Point | null,
    reach: number,
  ): void {
    const ctx = this.ctx;
    const S = TILE;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#0a1220";
    ctx.fillRect(0, 0, this.width, this.height);

    const targetCamX = s.player.x - this.width / 2;
    const targetCamY = s.player.y - this.height / 2;
    if (!this.camReady) {
      this.snapCamera(s.player.x, s.player.y);
    } else {
      const k = 1 - Math.exp(-dt * 10);
      this.camX += (targetCamX - this.camX) * k;
      this.camY += (targetCamY - this.camY) * k;
    }

    const camX = this.camX;
    const camY = this.camY;
    const startX = Math.floor(camX / S) - 1;
    const endX = Math.floor((camX + this.width) / S) + 1;
    const startY = Math.floor(camY / S) - 1;
    const endY = Math.floor((camY + this.height) / S) + 1;

    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const sx = Math.round(tx * S - camX);
        const sy = Math.round(ty * S - camY);
        const tile = world.getTile(s.dim, tx, ty);
        drawBlock(ctx, tile.block, sx, sy, S, tx, ty, world.seed, time);
        if (tile.dmg > 0) {
          const def = BLOCKS[tile.block];
          drawCracks(ctx, sx, sy, S, tile.dmg / def.hardness, tx, ty);
        }
      }
    }

    // Realm ambience.
    if (s.dim === "nether") {
      ctx.fillStyle = "rgba(255, 70, 20, 0.07)";
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (s.dim === "end") {
      ctx.fillStyle = "rgba(120, 80, 220, 0.08)";
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Target tile highlight.
    if (targetTile) {
      const tcx = (targetTile.x + 0.5) * S;
      const tcy = (targetTile.y + 0.5) * S;
      const inReach = Math.hypot(tcx - s.player.x, tcy - s.player.y) <= reach + S * 0.5;
      const sx = Math.round(targetTile.x * S - camX);
      const sy = Math.round(targetTile.y * S - camY);
      ctx.strokeStyle = inReach ? "rgba(255,255,255,0.8)" : "rgba(255,120,120,0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, S - 2, S - 2);
    }

    // Particles behind actors.
    for (const p of s.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Projectiles.
    for (const p of s.projectiles) {
      const px = p.x - camX;
      const py = p.y - camY;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff4d0";
      ctx.beginPath();
      ctx.arc(px, py, p.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const mob of s.mobs) {
      this.drawMob(ctx, mob, mob.x - camX, mob.y - camY, time);
    }

    this.drawPlayer(ctx, s.player.x - camX, s.player.y - camY, s, time);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: GameState, time: number): void {
    const p = s.player;
    const bob = Math.sin(p.walk) * 1.6;
    const legSwing = Math.sin(p.walk) * 3.4;
    const facingRight = p.faceX >= 0;

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx, sy + 14, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    pick(ctx, "#2b3f7d", sx - 7, sy + 2 + legSwing, 6, 11);
    pick(ctx, "#233468", sx + 1, sy + 2 - legSwing, 6, 11);

    // Body
    pick(ctx, "#2fa8c9", sx - 8, sy - 8 + bob * 0.25, 16, 13);
    pick(ctx, "#39bcdd", sx - 8, sy - 8 + bob * 0.25, 16, 4);

    // Arms
    pick(ctx, "#e0b083", sx - 12, sy - 6 + bob * 0.25, 5, 10);
    pick(ctx, "#e0b083", sx + 8, sy - 6 + bob * 0.25, 5, 10);

    // Head
    pick(ctx, "#e9b989", sx - 7, sy - 21 + bob * 0.15, 14, 14);
    pick(ctx, "#3a2417", sx - 7, sy - 21 + bob * 0.15, 14, 5);
    ctx.fillStyle = "#2a2118";
    const eyeShift = facingRight ? 1.4 : -1.4;
    ctx.fillRect(sx - 4 + eyeShift, sy - 13, 2, 2);
    ctx.fillRect(sx + 2 + eyeShift, sy - 13, 2, 2);

    // Pickaxe
    const swingT = p.swing > 0 ? Math.sin((1 - p.swing) * Math.PI) : 0;
    ctx.save();
    ctx.translate(sx + (facingRight ? 11 : -11), sy - 2 + bob * 0.2);
    ctx.rotate((facingRight ? -0.55 : Math.PI + 0.55) - swingT * 1.5);
    pick(ctx, "#8a5a32", 0, -2, 15, 4);
    pick(ctx, "#5c6572", 12, -8, 7, 16);
    pick(ctx, "#c9d2dd", 13, -6, 5, 12);
    pick(ctx, "#eef3fa", 13, -6, 5, 4);
    ctx.restore();

    // Damage flash.
    if (p.hurt > 0) {
      ctx.globalAlpha = clamp(p.hurt * 2.4, 0, 0.7);
      ctx.fillStyle = "#ff3b52";
      ctx.fillRect(sx - 10, sy - 22, 20, 34);
      ctx.globalAlpha = 1;
    }
  }

  private drawMob(ctx: CanvasRenderingContext2D, mob: Mob, x: number, y: number, time: number): void {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    const shadowR = mob.type === "dragon" ? 44 : 11;
    ctx.ellipse(x, y + (mob.type === "dragon" ? 22 : 13), shadowR, shadowR * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (mob.type === "blaze") {
      const bob = Math.sin(time * 2.8 + mob.seed) * 3;
      const cy = y + bob;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffb347";
      ctx.beginPath();
      ctx.arc(x, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {
        const a = time * 2 + mob.seed + (i * Math.PI) / 2;
        const rx = x + Math.cos(a) * 13;
        const ry = cy + Math.sin(a) * 13;
        pick(ctx, "#f0a52c", rx - 2, ry - 4, 4, 8);
      }
      pick(ctx, "#f7b733", x - 9, cy - 9, 18, 18);
      pick(ctx, "#ffd867", x - 6, cy - 6, 12, 12);
      pick(ctx, "#fff3c0", x - 3, cy - 3, 6, 6);
      ctx.fillStyle = "#5b2c00";
      ctx.fillRect(x - 5, cy - 4, 3, 3);
      ctx.fillRect(x + 2, cy - 4, 3, 3);
    } else if (mob.type === "enderman") {
      const step = Math.sin(time * 6 + mob.seed) * 2;
      pick(ctx, "#0d0d15", x - 7, y - 26, 14, 15);
      pick(ctx, "#07070c", x - 6, y - 26, 5, 14);
      pick(ctx, "#12121d", x - 7, y - 12, 5, 22 + step);
      pick(ctx, "#12121d", x + 2, y - 12, 5, 22 - step);
      pick(ctx, "#0b0b12", x - 14, y - 20, 6, 24);
      pick(ctx, "#0b0b12", x + 8, y - 20, 6, 24);
      ctx.fillStyle = "#c39bff";
      ctx.fillRect(x - 5, y - 21, 4, 3);
      ctx.fillRect(x + 1, y - 21, 4, 3);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#8b5cf6";
      ctx.fillRect(x - 8, y - 28, 16, 30);
      ctx.globalAlpha = 1;
    } else {
      const flap = Math.sin(time * 4) * 8;
      ctx.fillStyle = "#1b1226";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 52, y - 26 - flap);
      ctx.lineTo(x - 30, y + 12 - flap * 0.4);
      ctx.lineTo(x - 14, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 52, y - 26 - flap);
      ctx.lineTo(x + 30, y + 12 - flap * 0.4);
      ctx.lineTo(x + 14, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2a1c3d";
      ctx.beginPath();
      ctx.ellipse(x, y, 27, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#38264f";
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      pick(ctx, "#3d2b57", x - 8, y - 24, 16, 14);
      ctx.fillStyle = "#d9a6ff";
      ctx.fillRect(x - 6, y - 21, 4, 3);
      ctx.fillRect(x + 2, y - 21, 4, 3);
      ctx.fillStyle = "#b56bff";
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x - 3, y - 30, 6, 5);
      ctx.globalAlpha = 1;
    }

    if (mob.hurt > 0) {
      ctx.globalAlpha = clamp(mob.hurt * 3, 0, 0.65);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y - (mob.type === "dragon" ? 6 : 8), mob.type === "dragon" ? 34 : 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (mob.type === "dragon") {
      const w = 130;
      const hx = x - w / 2;
      const hy = y - 62;
      ctx.fillStyle = "rgba(8, 6, 16, 0.75)";
      ctx.fillRect(hx - 2, hy - 2, w + 4, 14);
      ctx.fillStyle = "#3b1f5e";
      ctx.fillRect(hx, hy, w, 10);
      ctx.fillStyle = "#c9a6ff";
      ctx.fillRect(hx, hy, w * clamp(mob.hp / mob.maxHp, 0, 1), 10);
      ctx.fillStyle = "#f6f0ff";
      ctx.font = "bold 10px 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ENDER DRAGON", x, hy - 6);
      ctx.textAlign = "left";
    }

    ctx.restore();
  }
}
