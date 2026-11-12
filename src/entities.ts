import { BLOCKS, type ItemId } from "./blocks";
import { hash } from "./noise";
import type { GameState, Mob, MobType, Particle } from "./types";
import { TILE, type Dim, type World } from "./world";

export const MOB_DEFS: Record<
  MobType,
  { hp: number; speed: number; damage: number; aggro: number; radius: number; touch: number; name: string }
> = {
  blaze: { hp: 9, speed: 58, damage: 2, aggro: 250, radius: 12, touch: 20, name: "Blaze" },
  enderman: { hp: 15, speed: 72, damage: 3, aggro: 300, radius: 12, touch: 20, name: "Enderman" },
  dragon: { hp: 60, speed: 1, damage: 4, aggro: 9999, radius: 46, touch: 46, name: "Ender Dragon" },
};

export interface MobHooks {
  damagePlayer(amount: number, cause: string): void;
  dropItems(item: ItemId, amount: number): void;
  dragonDown(): void;
}

let nextMobId = 1;

export function spawnMob(type: MobType, x: number, y: number): Mob {
  const def = MOB_DEFS[type];
  return {
    id: nextMobId++,
    type,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    hurt: 0,
    atkCd: 0,
    shootCd: 1.2,
    wander: 0,
    dirX: 0,
    dirY: 0,
    phase: Math.random() * 10,
    seed: Math.floor(Math.random() * 10000),
  };
}

export function collides(world: World, dim: Dim, x: number, y: number, r: number): boolean {
  const minX = Math.floor((x - r) / TILE);
  const maxX = Math.floor((x + r) / TILE);
  const minY = Math.floor((y - r) / TILE);
  const maxY = Math.floor((y + r) / TILE);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      const def = BLOCKS[world.getBlock(dim, tx, ty)];
      if (def.solid) return true;
    }
  }
  return false;
}

export function moveEntity(
  world: World,
  dim: Dim,
  ent: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
): void {
  if (dx !== 0 && !collides(world, dim, ent.x + dx, ent.y, radius)) ent.x += dx;
  if (dy !== 0 && !collides(world, dim, ent.x, ent.y + dy, radius)) ent.y += dy;
}

export function addParticles(
  s: GameState,
  x: number,
  y: number,
  color: string,
  amount: number,
  speed = 90,
): void {
  for (let i = 0; i < amount; i++) {
    if (s.particles.length > 260) break;
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.9);
    const life = 0.35 + Math.random() * 0.45;
    const p: Particle = {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life,
      maxLife: life,
      color,
      size: 2 + Math.random() * 3,
    };
    s.particles.push(p);
  }
}

export function updateParticles(s: GameState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      s.particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 320 * dt;
    p.vx *= 1 - 1.6 * dt;
  }
}

/** Finds a walkable, hazard-free spawn point in a ring around the player. */
export function findSpawnSpot(
  s: GameState,
  world: World,
  minTiles: number,
  maxTiles: number,
): { x: number; y: number } | null {
  const pt = { x: s.player.x, y: s.player.y };
  for (let attempt = 0; attempt < 26; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = (minTiles + Math.random() * (maxTiles - minTiles)) * TILE;
    const x = pt.x + Math.cos(angle) * dist;
    const y = pt.y + Math.sin(angle) * dist;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const def = BLOCKS[world.getBlock(s.dim, tx, ty)];
    if (def.solid || def.damage) continue;
    return { x, y };
  }
  return null;
}

function shootAt(s: GameState, mob: Mob, targetX: number, targetY: number, speed: number, damage: number, color: string, size: number): void {
  const dx = targetX - mob.x;
  const dy = targetY - mob.y;
  const d = Math.hypot(dx, dy) || 1;
  s.projectiles.push({
    x: mob.x,
    y: mob.y,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    life: 3.2,
    dmg: damage,
    color,
    size,
  });
}

function updateDragon(s: GameState, mob: Mob, dt: number, time: number, hooks: MobHooks): void {
  mob.phase += dt;
  const px = s.player.x;
  const py = s.player.y;

  const orbit = mob.phase * 0.55;
  let tx = px + Math.cos(orbit) * 190;
  let ty = py + Math.sin(orbit * 1.4) * 140 - 50;
  const diving = Math.sin(mob.phase * 0.7) > 0.72;
  if (diving) {
    tx = px;
    ty = py;
  }

  const dx = tx - mob.x;
  const dy = ty - mob.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = diving ? 210 : 135;
  mob.x += (dx / d) * speed * dt;
  mob.y += (dy / d) * speed * dt;

  const distToPlayer = Math.hypot(px - mob.x, py - mob.y);
  if (mob.shootCd <= 0 && distToPlayer < 430) {
    mob.shootCd = 2.1;
    for (let i = -1; i <= 1; i++) {
      const spread = i * 0.22;
      shootAt(
        s,
        mob,
        px + Math.cos(spread) * 90 - Math.sin(spread) * 60,
        py + Math.sin(spread) * 90 + Math.cos(spread) * 60,
        190,
        3,
        "#d08bff",
        6,
      );
    }
    addParticles(s, mob.x, mob.y + 10, "#b56bff", 8, 60);
  }

  if (distToPlayer < 58 && mob.atkCd <= 0) {
    hooks.damagePlayer(4, "the Ender Dragon");
    mob.atkCd = 1.25;
  }
}

export function updateMobs(s: GameState, world: World, dt: number, time: number, hooks: MobHooks): void {
  const px = s.player.x;
  const py = s.player.y;

  for (const mob of s.mobs) {
    mob.hurt = Math.max(0, mob.hurt - dt);
    mob.atkCd = Math.max(0, mob.atkCd - dt);
    mob.shootCd = Math.max(0, mob.shootCd - dt);
    const def = MOB_DEFS[mob.type];

    if (mob.type === "dragon") {
      updateDragon(s, mob, dt, time, hooks);
      continue;
    }

    const dx = px - mob.x;
    const dy = py - mob.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < def.aggro) {
      moveEntity(world, s.dim, mob, (dx / dist) * def.speed * dt, (dy / dist) * def.speed * dt, 10);
      if (mob.type === "blaze" && dist < 300 && mob.shootCd <= 0) {
        mob.shootCd = 2.3;
        shootAt(s, mob, px, py, 175, 2, "#ffb04a", 5);
      }
    } else {
      mob.wander -= dt;
      if (mob.wander <= 0) {
        mob.wander = 1.4 + Math.random() * 2.2;
        const a = Math.random() * Math.PI * 2;
        mob.dirX = Math.cos(a);
        mob.dirY = Math.sin(a);
      }
      moveEntity(world, s.dim, mob, mob.dirX * def.speed * 0.45 * dt, mob.dirY * def.speed * 0.45 * dt, 10);
    }

    if (dist < def.touch + 10 && mob.atkCd <= 0) {
      hooks.damagePlayer(def.damage, mob.type === "blaze" ? "a blaze" : "an enderman");
      mob.atkCd = 1.15;
    }
  }

  // Cull strays so distant mobs never pile up.
  s.mobs = s.mobs.filter((m) => m.type === "dragon" || Math.hypot(m.x - px, m.y - py) < 42 * TILE);

  // Ambient spawns in the Nether keep the realm hostile.
  s.spawnCd -= dt;
  if (s.dim === "nether" && s.mobs.length < 8 && s.spawnCd <= 0) {
    const spot = findSpawnSpot(s, world, 11, 19);
    if (spot) {
      const r = Math.random();
      const type: MobType = r < 0.55 ? "blaze" : "enderman";
      s.mobs.push(spawnMob(type, spot.x, spot.y));
      s.spawnCd = 1.5;
    } else {
      s.spawnCd = 0.5;
    }
  }
}

export function updateProjectiles(s: GameState, dt: number, hooks: MobHooks): void {
  const px = s.player.x;
  const py = s.player.y;
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const hit = Math.hypot(p.x - px, p.y - py) < 15;
    if (hit) {
      hooks.damagePlayer(p.dmg, p.color === "#ffb04a" || p.color === "#ffd76a" ? "a blaze" : "the Ender Dragon");
      addParticles(s, p.x, p.y, p.color, 7, 70);
      s.projectiles.splice(i, 1);
      continue;
    }
    if (p.life <= 0) {
      s.projectiles.splice(i, 1);
    }
  }
}

/** Mob wandering direction helper (deterministic per spawn seed). */
export function wanderAngle(mob: Mob): number {
  return hash(mob.seed, Math.floor(mob.phase), 7) * Math.PI * 2;
}
