import { fbm, hash } from "./noise";
import type { BlockId } from "./blocks";

export const TILE = 32;
export const CHUNK = 16;

export type Dim = "overworld" | "nether" | "end";

export interface Tile {
  block: BlockId;
  /** Mining progress accumulated on this tile. */
  dmg: number;
}

export interface Biome {
  key: string;
  name: string;
}

export const BIOMES = {
  lake: { key: "lake", name: "Stillwater Lake" },
  highlands: { key: "highlands", name: "Rocky Highlands" },
  snow: { key: "snow", name: "Snowy Tundra" },
  desert: { key: "desert", name: "Sunbaked Desert" },
  forest: { key: "forest", name: "Deep Forest" },
  plains: { key: "plains", name: "Green Plains" },
} as const satisfies Record<string, Biome>;

export const BIOME_ORDER: Biome[] = [
  BIOMES.plains,
  BIOMES.forest,
  BIOMES.snow,
  BIOMES.desert,
  BIOMES.highlands,
  BIOMES.lake,
];

/** Fixed, hand-placed landmarks shared by generation and progression. */
export const SITES = {
  overworldSpawn: { x: 0, y: 0 },
  netherPortal: { x: 2, y: 2 },
  netherSpawn: { x: 6, y: 6 },
  endPortal: { x: 40, y: -26 },
  endSpawn: { x: 0, y: 0 },
};

const SITE_CLEAR_RADIUS = {
  overworldSpawn: 3,
  nether: 7,
  endPortal: 5,
  endSpawn: 9,
};

export function biomeAt(x: number, y: number, seed: number): Biome {
  const e = fbm(x * 0.022, y * 0.022, seed, 4);
  if (e < 0.35) return BIOMES.lake;
  if (e > 0.63) return BIOMES.highlands;
  const t = fbm(x * 0.016 + 41.3, y * 0.016 - 19.7, seed + 911, 3);
  if (t < 0.36) return BIOMES.snow;
  const m = fbm(x * 0.026 - 88.2, y * 0.026 + 55.4, seed + 313, 3);
  if (t > 0.6 && m < 0.46) return BIOMES.desert;
  if (m > 0.55) return BIOMES.forest;
  return BIOMES.plains;
}

export class World {
  readonly seed: number;
  private overrides = new Map<string, BlockId>();
  private chunks = new Map<string, Tile[]>();

  constructor(seed: number) {
    this.seed = seed;
    this.prepareSites();
  }

  private tileKey(dim: Dim, x: number, y: number): string {
    return `${dim}:${x},${y}`;
  }

  private carve(dim: Dim, cx: number, cy: number, r: number, block: BlockId): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          this.overrides.set(this.tileKey(dim, x, y), block);
        }
      }
    }
  }

  private prepareSites(): void {
    // Overworld spawn clearing.
    this.carve("overworld", SITES.overworldSpawn.x, SITES.overworldSpawn.y, SITE_CLEAR_RADIUS.overworldSpawn, "grass");

    // A few starter boulders so the first pickaxe upgrade is always in reach.
    const starters: [number, number][] = [
      [3, 0],
      [4, 0],
      [3, 1],
      [4, -1],
      [0, 3],
      [-2, 2],
      [-1, 3],
    ];
    for (const [sx, sy] of starters) {
      this.overrides.set(this.tileKey("overworld", sx, sy), "stone");
    }

    // Permanent Nether-side portal and arrival plaza.
    this.carve("nether", SITES.netherPortal.x, SITES.netherPortal.y, SITE_CLEAR_RADIUS.nether, "netherrack");
    this.overrides.set(this.tileKey("nether", SITES.netherPortal.x, SITES.netherPortal.y), "portal_n");

    // End portal dais, framed by obsidian pillars.
    const ep = SITES.endPortal;
    this.carve("end", ep.x, ep.y, SITE_CLEAR_RADIUS.endPortal, "end_stone");
    this.overrides.set(this.tileKey("end", ep.x, ep.y), "portal_e");
    this.overrides.set(this.tileKey("end", ep.x - 2, ep.y), "obsidian");
    this.overrides.set(this.tileKey("end", ep.x + 2, ep.y), "obsidian");
    this.overrides.set(this.tileKey("end", ep.x, ep.y - 2), "obsidian");
    this.overrides.set(this.tileKey("end", ep.x, ep.y + 2), "obsidian");

    // Wide End arena island.
    this.carve("end", SITES.endSpawn.x, SITES.endSpawn.y, SITE_CLEAR_RADIUS.endSpawn, "end_stone");
  }

  biomeAt(x: number, y: number): Biome {
    return biomeAt(x, y, this.seed);
  }

  private generate(dim: Dim, x: number, y: number): BlockId {
    if (dim === "overworld") {
      const biome = this.biomeAt(x, y);
      switch (biome.key) {
        case "lake": {
          const t = fbm(x * 0.016 + 41.3, y * 0.016 - 19.7, this.seed + 911, 3);
          return t < 0.36 ? "ice" : "water";
        }
        case "highlands":
          return this.mountainOre(x, y);
        case "snow": {
          const r = hash(x, y, this.seed + 71);
          if (r < 0.055) return "tree";
          if (r < 0.075) return "ice";
          return "snow";
        }
        case "desert": {
          const r = hash(x, y, this.seed + 72);
          if (r < 0.022) return "cactus";
          if (r < 0.035) return "stone";
          return "sand";
        }
        case "forest": {
          const r = hash(x, y, this.seed + 73);
          if (r < 0.15) return "tree";
          if (r < 0.19) return "flower";
          if (r < 0.205) return "stone";
          return "grass";
        }
        default: {
          const r = hash(x, y, this.seed + 74);
          if (r < 0.03) return "tree";
          if (r < 0.11) return "flower";
          if (r < 0.12) return "stone";
          return "grass";
        }
      }
    }

    if (dim === "nether") {
      const lava = fbm(x * 0.05 + 13.1, y * 0.05 - 7.4, this.seed + 301, 3);
      if (lava < 0.31) return "lava";
      const r = hash(x, y, this.seed + 777);
      if (r < 0.035) return "glowstone";
      if (r < 0.1) return "quartz_ore";
      if (r < 0.15) return "soul_sand";
      return "netherrack";
    }

    const island = fbm(x * 0.045 + 7.2, y * 0.045 - 3.8, this.seed + 401, 3);
    if (island < 0.44) return "void";
    return "end_stone";
  }

  private mountainOre(x: number, y: number): BlockId {
    const r = hash(x, y, this.seed + 555);
    if (r < 0.022) return "diamond_ore";
    if (r < 0.05) return "obsidian";
    if (r < 0.078) return "gold_ore";
    if (r < 0.145) return "iron_ore";
    if (r < 0.25) return "coal_ore";
    return "stone";
  }

  private chunkKey(dim: Dim, cx: number, cy: number): string {
    return `${dim}:${cx},${cy}`;
  }

  private getChunk(dim: Dim, cx: number, cy: number): Tile[] {
    const key = this.chunkKey(dim, cx, cy);
    const cached = this.chunks.get(key);
    if (cached) return cached;

    const tiles: Tile[] = new Array(CHUNK * CHUNK);
    for (let ly = 0; ly < CHUNK; ly++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const x = cx * CHUNK + lx;
        const y = cy * CHUNK + ly;
        const override = this.overrides.get(this.tileKey(dim, x, y));
        const block = override ?? this.generate(dim, x, y);
        tiles[ly * CHUNK + lx] = { block, dmg: 0 };
      }
    }
    this.chunks.set(key, tiles);
    return tiles;
  }

  getTile(dim: Dim, x: number, y: number): Tile {
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    const chunk = this.getChunk(dim, cx, cy);
    const lx = x - cx * CHUNK;
    const ly = y - cy * CHUNK;
    return chunk[ly * CHUNK + lx];
  }

  getBlock(dim: Dim, x: number, y: number): BlockId {
    return this.getTile(dim, x, y).block;
  }

  setBlock(dim: Dim, x: number, y: number, block: BlockId): void {
    this.overrides.set(this.tileKey(dim, x, y), block);
    const cx = Math.floor(x / CHUNK);
    const cy = Math.floor(y / CHUNK);
    const chunk = this.chunks.get(this.chunkKey(dim, cx, cy));
    if (chunk) {
      const lx = x - cx * CHUNK;
      const ly = y - cy * CHUNK;
      chunk[ly * CHUNK + lx] = { block, dmg: 0 };
    }
  }
}
