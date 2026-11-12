import { ITEMS, type ItemId } from "./blocks";
import type { GameState } from "./types";
import { SITES } from "./world";

export interface Recipe {
  id: string;
  name: string;
  desc: string;
  cost: Partial<Record<ItemId, number>>;
  kind: "tool" | "portal" | "material";
  /** Pickaxe tier granted (tool recipes only). */
  tier?: number;
}

export const RECIPES: Recipe[] = [
  { id: "stone_pickaxe", name: "Stone Pickaxe", desc: "Crack iron ore open", cost: { stone: 3 }, kind: "tool", tier: 2 },
  { id: "iron_pickaxe", name: "Iron Pickaxe", desc: "Dig gold and diamond", cost: { iron: 3 }, kind: "tool", tier: 3 },
  {
    id: "diamond_pickaxe",
    name: "Diamond Pickaxe",
    desc: "The only pick that bites obsidian",
    cost: { diamond: 3 },
    kind: "tool",
    tier: 4,
  },
  {
    id: "nether_portal",
    name: "Nether Portal",
    desc: "Ten obsidian opens a gateway to the Nether",
    cost: { obsidian: 10 },
    kind: "portal",
  },
  { id: "blaze_powder", name: "Blaze Powder", desc: "Ground from a blaze rod", cost: { blaze_rod: 1 }, kind: "material" },
  {
    id: "eye",
    name: "Eye of Ender",
    desc: "Twelve activate the End Portal",
    cost: { ender_pearl: 1, blaze_powder: 1 },
    kind: "material",
  },
];

export const EYES_NEEDED = 12;

export function count(inv: GameState["inv"], item: ItemId): number {
  return inv[item] ?? 0;
}

export function hasCost(inv: GameState["inv"], cost: Partial<Record<ItemId, number>>): boolean {
  return (Object.keys(cost) as ItemId[]).every((item) => count(inv, item) >= (cost[item] ?? 0));
}

export function missingCost(inv: GameState["inv"], cost: Partial<Record<ItemId, number>>): string {
  return (Object.keys(cost) as ItemId[])
    .filter((item) => count(inv, item) < (cost[item] ?? 0))
    .map((item) => `${ITEMS[item].name} ${count(inv, item)}/${cost[item]}`)
    .join(" · ");
}

export function recipeVisible(recipe: Recipe, s: GameState): boolean {
  if (recipe.kind === "tool") {
    return s.player.tier < (recipe.tier ?? 99);
  }
  if (recipe.kind === "portal") {
    return s.overworldPortal === null;
  }
  return true;
}

export interface Objective {
  text: string;
  /** Compass target in tile coordinates for the current realm. */
  target: { x: number; y: number } | null;
}

export function objective(s: GameState): Objective {
  const inv = s.inv;
  const t = s.player.tier;

  if (!s.endActivated && s.dim !== "end" && s.dim !== "nether") {
    if (t === 1) {
      return count(inv, "stone") >= 3
        ? { text: "Open your backpack and craft a Stone Pickaxe", target: null }
        : { text: `Mine stone with your wooden pickaxe · ${count(inv, "stone")}/3`, target: null };
    }
    if (t === 2) {
      return count(inv, "iron") >= 3
        ? { text: "Craft an Iron Pickaxe in your backpack", target: null }
        : { text: `Hunt iron ore in the Rocky Highlands · ${count(inv, "iron")}/3`, target: null };
    }
    if (t === 3) {
      return count(inv, "diamond") >= 3
        ? { text: "Craft a Diamond Pickaxe in your backpack", target: null }
        : { text: `Mine diamonds deep in the highlands · ${count(inv, "diamond")}/3`, target: null };
    }
    if (!s.overworldPortal) {
      return count(inv, "obsidian") >= 10
        ? { text: "Build the Nether Portal from your backpack", target: null }
        : { text: `Mine obsidian veins in the highlands · ${count(inv, "obsidian")}/10`, target: null };
    }
    return {
      text: "Step into your Nether Portal",
      target: s.overworldPortal,
    };
  }

  if (s.dim === "overworld") {
    return s.overworldPortal
      ? { text: "Step into your Nether Portal", target: s.overworldPortal }
      : { text: "Gather obsidian in the highlands", target: null };
  }

  if (s.dim === "nether") {
    const eyes = count(inv, "eye");
    if (s.endActivated) {
      return { text: "Step into the End Portal", target: SITES.endPortal };
    }
    if (eyes >= EYES_NEEDED) {
      return { text: "Reach the End Portal and place your Eyes of Ender", target: SITES.endPortal };
    }
    return {
      text: `Forge Eyes of Ender · ${eyes}/${EYES_NEEDED} (blaze rods + ender pearls)`,
      target: SITES.endPortal,
    };
  }

  if (s.won) {
    return { text: "The End is free. Every realm is yours", target: null };
  }
  return { text: "Defeat the Ender Dragon", target: null };
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
