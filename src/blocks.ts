/** Block, item and tool definitions. */

export type ItemId =
  | "dirt"
  | "stone"
  | "wood"
  | "coal"
  | "iron"
  | "gold"
  | "diamond"
  | "obsidian"
  | "glowstone"
  | "quartz"
  | "blaze_rod"
  | "blaze_powder"
  | "ender_pearl"
  | "eye";

export type BlockId =
  | "grass"
  | "dirt"
  | "stone"
  | "sand"
  | "snow"
  | "ice"
  | "water"
  | "lava"
  | "tree"
  | "cactus"
  | "flower"
  | "coal_ore"
  | "iron_ore"
  | "gold_ore"
  | "diamond_ore"
  | "obsidian"
  | "netherrack"
  | "glowstone"
  | "quartz_ore"
  | "soul_sand"
  | "end_stone"
  | "void"
  | "portal_n"
  | "portal_e";

export interface BlockDef {
  name: string;
  /** Texture family used by the renderer. */
  tex: string;
  solid: boolean;
  /** Seconds of mining at speed 1. Infinity means unbreakable. */
  hardness: number;
  /** Minimum pickaxe tier required. */
  tier: number;
  drop?: ItemId;
  dropCount?: number;
  /** Damage per second while standing in the block. */
  damage?: number;
  /** Movement multiplier while standing in the block. */
  slow?: number;
}

export const BLOCKS: Record<BlockId, BlockDef> = {
  grass: { name: "Grass", tex: "grass", solid: false, hardness: 1, tier: 1, drop: "dirt" },
  dirt: { name: "Dirt", tex: "dirt", solid: false, hardness: 1.2, tier: 1, drop: "dirt" },
  stone: { name: "Stone", tex: "stone", solid: false, hardness: 2, tier: 1, drop: "stone" },
  sand: { name: "Sand", tex: "sand", solid: false, hardness: 1, tier: 1, drop: "dirt" },
  snow: { name: "Snow", tex: "snow", solid: false, hardness: 1, tier: 1, drop: "dirt" },
  ice: { name: "Ice", tex: "ice", solid: false, hardness: 1.4, tier: 1, drop: "dirt", slow: 0.7 },
  water: { name: "Water", tex: "water", solid: false, hardness: Infinity, tier: 99, slow: 0.55 },
  lava: { name: "Lava", tex: "lava", solid: false, hardness: Infinity, tier: 99, damage: 3.5, slow: 0.6 },
  tree: { name: "Tree", tex: "tree", solid: true, hardness: 1.5, tier: 1, drop: "wood", dropCount: 2 },
  cactus: { name: "Cactus", tex: "cactus", solid: true, hardness: 1, tier: 1, drop: "wood" },
  flower: { name: "Flower", tex: "flower", solid: false, hardness: 0.4, tier: 1, drop: "dirt" },
  coal_ore: { name: "Coal Ore", tex: "coal", solid: false, hardness: 2.4, tier: 1, drop: "coal" },
  iron_ore: { name: "Iron Ore", tex: "iron", solid: false, hardness: 3, tier: 2, drop: "iron" },
  gold_ore: { name: "Gold Ore", tex: "gold", solid: false, hardness: 3.2, tier: 3, drop: "gold" },
  diamond_ore: { name: "Diamond Ore", tex: "diamond", solid: false, hardness: 4.4, tier: 3, drop: "diamond" },
  obsidian: { name: "Obsidian", tex: "obsidian", solid: false, hardness: 8, tier: 4, drop: "obsidian" },
  netherrack: { name: "Netherrack", tex: "netherrack", solid: false, hardness: 2, tier: 1, drop: "dirt" },
  glowstone: { name: "Glowstone", tex: "glowstone", solid: false, hardness: 2.2, tier: 1, drop: "glowstone" },
  quartz_ore: { name: "Nether Quartz", tex: "quartz", solid: false, hardness: 2.8, tier: 2, drop: "quartz" },
  soul_sand: { name: "Soul Sand", tex: "soulsand", solid: false, hardness: 1.4, tier: 1, drop: "dirt" },
  end_stone: { name: "End Stone", tex: "endstone", solid: false, hardness: 3, tier: 2, drop: "stone" },
  void: { name: "The Void", tex: "void", solid: false, hardness: Infinity, tier: 99, damage: 7 },
  portal_n: { name: "Nether Portal", tex: "portal_n", solid: false, hardness: Infinity, tier: 99 },
  portal_e: { name: "End Portal", tex: "portal_e", solid: false, hardness: Infinity, tier: 99 },
};

export const ITEMS: Record<ItemId, { name: string; color: string; accent: string }> = {
  dirt: { name: "Dirt", color: "#8a5a3b", accent: "#6d452c" },
  stone: { name: "Stone", color: "#9498a1", accent: "#7a7e87" },
  wood: { name: "Wood", color: "#9b6a3c", accent: "#7a4f2a" },
  coal: { name: "Coal", color: "#3a3a44", accent: "#23232a" },
  iron: { name: "Iron", color: "#d9b08c", accent: "#b98d67" },
  gold: { name: "Gold", color: "#f5cf4a", accent: "#c9a12b" },
  diamond: { name: "Diamond", color: "#5ee7e0", accent: "#2fb9b4" },
  obsidian: { name: "Obsidian", color: "#2a1f3d", accent: "#5b3f8f" },
  glowstone: { name: "Glowstone", color: "#f6d06d", accent: "#d39b2d" },
  quartz: { name: "Quartz", color: "#f1eee3", accent: "#cfc9b6" },
  blaze_rod: { name: "Blaze Rod", color: "#f2b23c", accent: "#c47a12" },
  blaze_powder: { name: "Blaze Powder", color: "#ff9500", accent: "#c76a00" },
  ender_pearl: { name: "Ender Pearl", color: "#3ecf9b", accent: "#1c8f6b" },
  eye: { name: "Eye of Ender", color: "#8fe36a", accent: "#3f8f2b" },
};

export const FLOOR_BY_DIM = {
  overworld: "dirt",
  nether: "netherrack",
  end: "end_stone",
} as const;

export const PICKAXES = [
  { tier: 1, name: "Wooden Pickaxe", speed: 1.6 },
  { tier: 2, name: "Stone Pickaxe", speed: 2.8 },
  { tier: 3, name: "Iron Pickaxe", speed: 4.2 },
  { tier: 4, name: "Diamond Pickaxe", speed: 6 },
];

export function pickaxe(tier: number) {
  return PICKAXES[Math.min(PICKAXES.length, Math.max(1, tier)) - 1];
}

/** Item used to pay for each pickaxe upgrade. */
export const UPGRADE_ITEM: Record<number, ItemId> = {
  2: "stone",
  3: "iron",
  4: "diamond",
};
