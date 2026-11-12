import { BLOCKS, FLOOR_BY_DIM, ITEMS, pickaxe, type ItemId } from "./blocks";
import {
  addParticles,
  moveEntity,
  spawnMob,
  updateMobs,
  updateParticles,
  updateProjectiles,
  type MobHooks,
} from "./entities";
import { clamp } from "./noise";
import { count, EYES_NEEDED, hasCost, objective, RECIPES, recipeVisible } from "./progress";
import { Renderer } from "./render";
import { emptyState, type GameState, type Mob, type Point } from "./types";
import { biomeAt, SITES, TILE, World, type Dim } from "./world";
import { Ui } from "./ui";

const canvas = document.querySelector<HTMLCanvasElement>("#c");
if (!canvas) throw new Error("Canvas missing");
const renderer = new Renderer(canvas);

const REACH = TILE * 3.6;
const PLAYER_SPEED = 172;
const PROMPT_RANGE = TILE * 2.6;
const END_RETURN = { x: SITES.endSpawn.x - 3, y: SITES.endSpawn.y - 3 };

let world = new World(Math.floor(Math.random() * 1_000_000_000));
let state: GameState = emptyState();

const input = { jx: 0, jy: 0 };
const keys = new Set<string>();
let hold: { id: number; x: number; y: number } | null = null;
let hover: Point | null = null;
let promptAction: PromptAction | null = null;
let lastWarn = -9999;
let regenTimer = 0;

type PromptAction = "enter-nether" | "leave-nether" | "enter-end" | "activate-end" | "return-nether";

const mobHooks: MobHooks = {
  damagePlayer: (amount, cause) => damagePlayer(amount, cause),
  dropItems: () => {},
  dragonDown: () => {},
};

const ui = new Ui({
  onStart: () => startGame(),
  onRespawn: () => respawn(),
  onRestart: () => restart(),
  onCraft: (id) => craft(id),
  onPrompt: () => runPrompt(),
  onMenu: (open) => {
    state.paused = open;
  },
  onMove: (x, y) => {
    input.jx = x;
    input.jy = y;
  },
});

function newWorld(): void {
  // Pick a seed whose spawn sits in a green, walkable biome.
  let seed = Math.floor(Math.random() * 1_000_000_000);
  for (let attempt = 0; attempt < 80; attempt++) {
    const biome = biomeAt(SITES.overworldSpawn.x, SITES.overworldSpawn.y, seed);
    if (biome.key === "plains" || biome.key === "forest") break;
    seed = Math.floor(Math.random() * 1_000_000_000);
  }
  world = new World(seed);
}

function tileCenter(tx: number, ty: number): Point {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

function spawnAt(dim: Dim, tx: number, ty: number): void {
  state.dim = dim;
  state.player.x = (tx + 0.5) * TILE;
  state.player.y = (ty + 0.5) * TILE;
  state.player.invuln = Math.max(state.player.invuln, 1.2);
  state.mobs = [];
  state.projectiles = [];
  state.particles = [];
  renderer.snapCamera(state.player.x, state.player.y);
}

function resetRun(): void {
  newWorld();
  state = emptyState();
  input.jx = 0;
  input.jy = 0;
  keys.clear();
  hold = null;
  hover = null;
  regenTimer = 0;
  spawnAt("overworld", SITES.overworldSpawn.x, SITES.overworldSpawn.y);
  ui.resetForNewRun();
}

function startGame(): void {
  if (!state.started) {
    state.started = true;
    state.startedAt = performance.now();
  }
  state.paused = false;
  ui.hideTitle();
  ui.showToast("Explore! Rocky highlands hide the ores", true);
}

function restart(): void {
  resetRun();
  state.started = true;
  state.startedAt = performance.now();
  ui.hideTitle();
  ui.showToast("A fresh realm awaits", true);
}

function respawn(): void {
  state.dead = false;
  const site =
    state.dim === "overworld" ? SITES.overworldSpawn : state.dim === "nether" ? SITES.netherSpawn : SITES.endSpawn;
  spawnAt(state.dim, site.x, site.y);
  const p = state.player;
  p.hp = p.maxHp;
  p.invuln = 3;
  p.hurt = 0;
  if (state.dim === "end" && !state.won) spawnDragon();
  ui.hideDeath();
}

function addItem(id: ItemId, n = 1): void {
  state.inv[id] = (state.inv[id] ?? 0) + n;
}

function walkableBlock(dim: Dim, tx: number, ty: number): boolean {
  const def = BLOCKS[world.getBlock(dim, tx, ty)];
  return !def.solid && !def.damage && def.tex !== "water";
}

function buildPortal(): void {
  const p = state.player;
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor(p.y / TILE);
  const horizontal = Math.abs(p.faceX) >= Math.abs(p.faceY);
  const fx = horizontal ? (p.faceX >= 0 ? 1 : -1) : 0;
  const fy = horizontal ? 0 : p.faceY >= 0 ? 1 : -1;

  const candidates: Point[] = [];
  for (let d = 2; d >= 1; d--) {
    for (let side = -1; side <= 1; side++) {
      candidates.push({ x: tx + fx * d + (fy !== 0 ? side : 0), y: ty + fy * d + (fx !== 0 ? side : 0) });
    }
  }

  let spot: Point | null = null;
  for (const c of candidates) {
    if (walkableBlock("overworld", c.x, c.y)) {
      spot = c;
      break;
    }
  }
  if (!spot) {
    outer: for (let r = 2; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (walkableBlock("overworld", tx + dx, ty + dy)) {
            spot = { x: tx + dx, y: ty + dy };
            break outer;
          }
        }
      }
    }
  }

  if (!spot) {
    addItem("obsidian", 10);
    ui.showToast("Not enough room for a portal");
    return;
  }

  world.setBlock("overworld", spot.x, spot.y, "portal_n");
  state.overworldPortal = spot;
  addParticles(state, tileCenter(spot.x, spot.y).x, tileCenter(spot.x, spot.y).y, "#b07bff", 24, 120);
  ui.showToast("Nether Portal built — step inside", true);
}

function craft(id: string): void {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe || !recipeVisible(recipe, state)) return;
  if (recipe.kind === "portal" && state.dim !== "overworld") {
    ui.showToast("Return to the overworld to build a portal");
    return;
  }
  if (!hasCost(state.inv, recipe.cost)) return;

  for (const key of Object.keys(recipe.cost) as ItemId[]) {
    state.inv[key] = count(state.inv, key) - (recipe.cost[key] ?? 0);
  }

  if (recipe.kind === "tool") {
    state.player.tier = recipe.tier ?? state.player.tier;
    ui.showToast(`Crafted the ${recipe.name}`, true);
    addParticles(state, state.player.x, state.player.y, "#fff1a8", 14, 110);
  } else if (recipe.id === "nether_portal") {
    buildPortal();
  } else if (recipe.id === "blaze_powder") {
    addItem("blaze_powder", 1);
    ui.showToast("Ground a blaze rod into powder");
  } else if (recipe.id === "eye") {
    addItem("eye", 1);
    ui.showToast(`Eye of Ender crafted · ${count(state.inv, "eye")}/${EYES_NEEDED}`);
  }

  ui.renderMenu(state);
}

function warnTool(tier: number): void {
  const now = performance.now();
  if (now - lastWarn < 2200) return;
  lastWarn = now;
  ui.showToast(`Need a ${pickaxe(tier).name} for that`);
}

function mineTile(tile: Point, dt: number): void {
  const center = tileCenter(tile.x, tile.y);
  const dx = center.x - state.player.x;
  const dy = center.y - state.player.y;
  if (Math.hypot(dx, dy) > REACH) return;

  const worldTile = world.getTile(state.dim, tile.x, tile.y);
  const def = BLOCKS[worldTile.block];
  if (!Number.isFinite(def.hardness)) return;
  if (def.tier > state.player.tier) {
    warnTool(def.tier);
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    state.player.faceX = Math.sign(dx);
    state.player.faceY = 0;
  } else {
    state.player.faceX = 0;
    state.player.faceY = Math.sign(dy) || 1;
  }

  state.player.swing = 0.35 + 0.35 * Math.sin(performance.now() / 90);
  worldTile.dmg += dt * pickaxe(state.player.tier).speed;

  if (Math.random() < dt * 9) {
    const drop = def.drop ? ITEMS[def.drop].color : "#c9b18a";
    addParticles(state, center.x, center.y, drop, 1, 45);
  }

  if (worldTile.dmg >= def.hardness) {
    const drop = def.drop;
    if (drop) {
      const amount = def.dropCount ?? 1;
      addItem(drop, amount);
      if (drop === "diamond" || drop === "obsidian" || drop === "gold") {
        ui.showToast(`+${amount} ${ITEMS[drop].name}`, true);
      }
    }
    addParticles(state, center.x, center.y, drop ? ITEMS[drop].color : "#b9a27f", 10, 120);
    world.setBlock(state.dim, tile.x, tile.y, FLOOR_BY_DIM[state.dim]);
    state.blocksMined++;
    state.player.swing = 0.95;
  }
}

function tryAttack(point: Point): boolean {
  let target: Mob | null = null;
  let best = Infinity;
  for (const mob of state.mobs) {
    const hitRadius = mob.type === "dragon" ? 64 : 28;
    if (Math.hypot(mob.x - point.x, mob.y - point.y) > hitRadius) continue;
    const reachBonus = mob.type === "dragon" ? 70 : 12;
    if (Math.hypot(mob.x - state.player.x, mob.y - state.player.y) > REACH + reachBonus) continue;
    const d = Math.hypot(mob.x - point.x, mob.y - point.y);
    if (d < best) {
      best = d;
      target = mob;
    }
  }
  if (!target) return false;
  if (state.player.attackCd > 0) return true;

  state.player.attackCd = 0.3;
  state.player.swing = 0.5;
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    state.player.faceX = Math.sign(dx);
    state.player.faceY = 0;
  } else {
    state.player.faceX = 0;
    state.player.faceY = Math.sign(dy) || 1;
  }

  target.hp -= 2 + state.player.tier;
  target.hurt = 0.25;
  addParticles(state, target.x, target.y, target.type === "dragon" ? "#c9a6ff" : "#ffd7a1", 9, 130);
  if (target.hp <= 0) defeatMob(target);
  return true;
}

function defeatMob(mob: Mob): void {
  state.mobs = state.mobs.filter((m) => m !== mob);
  if (mob.type === "dragon") {
    addParticles(state, mob.x, mob.y, "#c9a6ff", 60, 220);
    winGame();
    return;
  }
  addParticles(state, mob.x, mob.y, mob.type === "blaze" ? "#ffb347" : "#a78bfa", 22, 160);
  if (mob.type === "blaze") {
    addItem("blaze_rod", 2);
    ui.showToast("+2 Blaze Rods", true);
  } else {
    addItem("ender_pearl", 2);
    ui.showToast("+2 Ender Pearls", true);
  }
}

function winGame(): void {
  state.won = true;
  state.mobs = [];
  state.projectiles = [];
  ui.showWin({
    time: formatDuration(performance.now() - state.startedAt),
    blocks: state.blocksMined,
    biomes: state.discovered.size,
    travel: Math.round(state.travel / TILE),
  });
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function damagePlayer(amount: number, cause: string): void {
  if (state.dead || state.won || state.paused) return;
  if (state.player.invuln > 0) return;
  state.player.hp -= amount;
  state.player.hurt = 0.35;
  state.player.invuln = 0.55;
  addParticles(state, state.player.x, state.player.y, "#ff6b7d", 7, 90);
  if (state.player.hp <= 0) die(cause);
}

function die(cause: string): void {
  state.player.hp = 0;
  state.dead = true;
  state.deathCause = cause;
  hold = null;
  ui.showDeath(cause);
}

function environmentDamage(dt: number): void {
  const tx = Math.floor(state.player.x / TILE);
  const ty = Math.floor(state.player.y / TILE);
  const def = BLOCKS[world.getBlock(state.dim, tx, ty)];
  if (!def.damage) return;
  state.player.lavaTick -= dt;
  if (state.player.lavaTick > 0) return;
  state.player.lavaTick = 0.45;
  state.player.hp -= def.damage * 0.45;
  state.player.hurt = 0.3;
  addParticles(state, state.player.x, state.player.y, def.tex === "void" ? "#9b7bff" : "#ff8a2b", 6, 90);
  if (state.player.hp <= 0) die(def.tex === "void" ? "the void" : "lava");
}

function spawnDragon(): void {
  state.mobs = state.mobs.filter((m) => m.type !== "dragon");
  const start = tileCenter(SITES.endSpawn.x, SITES.endSpawn.y - 10);
  state.mobs.push(spawnMob("dragon", start.x, start.y));
  state.dragonSpawned = true;
}

function runPrompt(): void {
  if (!promptAction) return;
  switch (promptAction) {
    case "enter-nether":
      spawnAt("nether", SITES.netherSpawn.x, SITES.netherSpawn.y);
      ui.showToast("The Nether — mind the lava and blazes", true);
      break;
    case "leave-nether": {
      const portal = state.overworldPortal ?? { x: SITES.overworldSpawn.x, y: SITES.overworldSpawn.y };
      spawnAt("overworld", portal.x, portal.y);
      ui.showToast("Back in the overworld");
      break;
    }
    case "activate-end": {
      if (count(state.inv, "eye") < EYES_NEEDED) return;
      state.inv.eye = count(state.inv, "eye") - EYES_NEEDED;
      state.endActivated = true;
      const center = tileCenter(SITES.endPortal.x, SITES.endPortal.y);
      addParticles(state, center.x, center.y, "#7ff5e6", 40, 180);
      ui.showToast("The End Portal roars open", true);
      break;
    }
    case "enter-end":
      spawnAt("end", SITES.endSpawn.x, SITES.endSpawn.y);
      world.setBlock("end", END_RETURN.x, END_RETURN.y, "portal_e");
      spawnDragon();
      ui.showToast("The Ender Dragon awakens", true);
      break;
    case "return-nether":
      spawnAt("nether", SITES.netherSpawn.x, SITES.netherSpawn.y);
      ui.showToast("Back through the End Portal");
      break;
  }
}

function portalPrompt(): { label: string; enabled: boolean; action: PromptAction } | null {
  const p = state.player;
  const near = (tx: number, ty: number) => {
    const c = tileCenter(tx, ty);
    return Math.hypot(c.x - p.x, c.y - p.y) <= PROMPT_RANGE;
  };

  if (state.dim === "overworld") {
    if (state.overworldPortal && near(state.overworldPortal.x, state.overworldPortal.y)) {
      return { label: "Enter the Nether", enabled: true, action: "enter-nether" };
    }
    return null;
  }

  if (state.dim === "nether") {
    if (near(SITES.netherPortal.x, SITES.netherPortal.y)) {
      return { label: "Return to the Overworld", enabled: true, action: "leave-nether" };
    }
    if (near(SITES.endPortal.x, SITES.endPortal.y)) {
      if (!state.endActivated) {
        const eyes = count(state.inv, "eye");
        return {
          label: eyes >= EYES_NEEDED ? "Place 12 Eyes of Ender" : `Eyes of Ender ${eyes}/${EYES_NEEDED}`,
          enabled: eyes >= EYES_NEEDED,
          action: "activate-end",
        };
      }
      return { label: "Enter the End", enabled: true, action: "enter-end" };
    }
    return null;
  }

  if (near(END_RETURN.x, END_RETURN.y)) {
    return { label: "Return to the Nether", enabled: true, action: "return-nether" };
  }
  return null;
}

function update(dt: number, time: number): void {
  const p = state.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.swing = Math.max(0, p.swing - dt * 2.4);

  // Movement.
  let mx = input.jx;
  let my = input.jy;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  const underX = Math.floor(p.x / TILE);
  const underY = Math.floor(p.y / TILE);
  const underDef = BLOCKS[world.getBlock(state.dim, underX, underY)];
  const speed = PLAYER_SPEED * (underDef.slow ?? 1);

  if (Math.hypot(mx, my) > 0.1) {
    const beforeX = p.x;
    const beforeY = p.y;
    moveEntity(world, state.dim, p, mx * speed * dt, my * speed * dt, 10);
    const moved = Math.hypot(p.x - beforeX, p.y - beforeY);
    state.travel += moved;
    p.walk += moved * 0.09;
    if (Math.abs(mx) > Math.abs(my)) {
      p.faceX = Math.sign(mx);
      p.faceY = 0;
    } else {
      p.faceX = 0;
      p.faceY = Math.sign(my) || 1;
    }
  }

  // Mining (hold).
  if (hold) {
    const tile = { x: Math.floor(hold.x / TILE), y: Math.floor(hold.y / TILE) };
    mineTile(tile, dt);
  }

  environmentDamage(dt);

  if (p.hp < p.maxHp && p.hurt <= 0 && p.invuln <= 0) {
    regenTimer += dt;
    if (regenTimer > 2.6) {
      regenTimer = 0;
      p.hp = Math.min(p.maxHp, p.hp + 1);
    }
  } else {
    regenTimer = 0;
  }

  updateMobs(state, world, dt, time, mobHooks);
  updateProjectiles(state, dt, mobHooks);
  updateParticles(state, dt);

  // Biome discovery.
  if (state.dim === "overworld") {
    const biome = world.biomeAt(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    if (!state.discovered.has(biome.key)) {
      state.discovered.add(biome.key);
      ui.showToast(`Discovered ${biome.name}`, biome.key === "highlands");
    }
  }
}

function updateHud(): void {
  const p = state.player;
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor(p.y / TILE);
  const biomeName =
    state.dim === "overworld" ? world.biomeAt(tx, ty).name : state.dim === "nether" ? "The Nether" : "The End";

  const obj = objective(state);
  let target = obj.target;
  if (state.dim === "end" && !state.won) {
    const dragon = state.mobs.find((m) => m.type === "dragon");
    if (dragon) target = { x: dragon.x / TILE - 0.5, y: dragon.y / TILE - 0.5 };
  }

  let compass: { angle: number; distance: number } | null = null;
  if (target) {
    const c = tileCenter(target.x, target.y);
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    compass = {
      angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
      distance: Math.hypot(dx, dy) / TILE,
    };
  }

  const prompt = portalPrompt();
  promptAction = prompt ? prompt.action : null;

  ui.update({
    state,
    biomeName,
    objective: obj.text,
    compass,
    prompt: prompt ? { label: prompt.label, enabled: prompt.enabled } : null,
  });
}

// ---------- Input ----------

function pointerScreen(event: PointerEvent): Point {
  const rect = canvas!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

canvas.addEventListener("pointerdown", (event) => {
  if (!state.started || state.paused || state.dead || state.won) return;
  const screen = pointerScreen(event);
  const wp = renderer.screenToWorld(screen.x, screen.y);
  event.preventDefault();
  if (tryAttack(wp)) return;
  hold = { id: event.pointerId, x: wp.x, y: wp.y };
  try {
    canvas!.setPointerCapture(event.pointerId);
  } catch {
    /* ignore */
  }
  mineTile({ x: Math.floor(wp.x / TILE), y: Math.floor(wp.y / TILE) }, 0.12);
});

canvas.addEventListener("pointermove", (event) => {
  const screen = pointerScreen(event);
  const wp = renderer.screenToWorld(screen.x, screen.y);
  if (hold && hold.id === event.pointerId) {
    hold.x = wp.x;
    hold.y = wp.y;
  } else if (event.pointerType === "mouse") {
    hover = wp;
  }
});

function releasePointer(event: PointerEvent): void {
  if (hold && hold.id === event.pointerId) hold = null;
}
canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Escape") {
    if (!state.started || state.dead || state.won) return;
    if (ui.isMenuOpen()) ui.closeMenu();
    else ui.openMenu(state);
  }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});
window.addEventListener("blur", () => {
  keys.clear();
  input.jx = 0;
  input.jy = 0;
});

// ---------- Boot & loop ----------

resetRun();

let lastFrame = performance.now();

function frame(now: number): void {
  const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
  lastFrame = now;
  const time = now / 1000;

  if (state.started && !state.paused && !state.dead && !state.won) {
    update(dt, time);
  }

  let targetTile: Point | null = null;
  const source = hold ?? hover;
  if (source) targetTile = { x: Math.floor(source.x / TILE), y: Math.floor(source.y / TILE) };

  renderer.render(state, world, dt, time, targetTile, REACH);

  if (state.started) updateHud();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
