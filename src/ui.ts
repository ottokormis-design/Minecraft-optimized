import { ITEMS, pickaxe, type ItemId } from "./blocks";
import { count, formatTime, hasCost, RECIPES, recipeVisible } from "./progress";
import type { GameState } from "./types";
import { BIOME_ORDER } from "./world";

export interface UiHandlers {
  onStart(): void;
  onRespawn(): void;
  onRestart(): void;
  onCraft(id: string): void;
  onPrompt(): void;
  onMenu(open: boolean): void;
  onMove(x: number, y: number): void;
}

export interface HudModel {
  state: GameState;
  biomeName: string;
  objective: string;
  compass: { angle: number; distance: number } | null;
  prompt: { label: string; enabled: boolean } | null;
}

const HOTBAR: Record<string, ItemId[]> = {
  overworld: ["dirt", "stone", "iron", "diamond", "obsidian"],
  nether: ["blaze_rod", "blaze_powder", "ender_pearl", "eye", "quartz"],
  end: ["diamond", "obsidian", "eye"],
};

function el<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element ${selector}`);
  return node;
}

function iconHtml(item: ItemId): string {
  const it = ITEMS[item];
  return `<span class="slot-icon" style="background:linear-gradient(160deg, ${it.color}, ${it.accent})"></span>`;
}

export interface WinStats {
  time: string;
  blocks: number;
  biomes: number;
  travel: number;
}

export class Ui {
  private handlers: UiHandlers;

  private canvasGame = el<HTMLDivElement>("#game");
  private hearts = el<HTMLDivElement>("#hearts");
  private toolLabel = el<HTMLDivElement>("#toolLabel");
  private biomeLabel = el<HTMLDivElement>("#biomeLabel");
  private objText = el<HTMLSpanElement>("#objText");
  private hotbar = el<HTMLDivElement>("#hotbar");
  private promptWrap = el<HTMLDivElement>("#promptWrap");
  private promptBtn = el<HTMLButtonElement>("#promptBtn");
  private toasts = el<HTMLDivElement>("#toasts");
  private compass = el<HTMLDivElement>("#compass");
  private compassArrow = el<HTMLDivElement>("#compassArrow");
  private compassDist = el<HTMLDivElement>("#compassDist");
  private hint = el<HTMLDivElement>("#hint");

  private titleScreen = el<HTMLDivElement>("#titleScreen");
  private menu = el<HTMLDivElement>("#menu");
  private menuBody = el<HTMLDivElement>("#menuBody");
  private deathScreen = el<HTMLDivElement>("#deathScreen");
  private deathMsg = el<HTMLParagraphElement>("#deathMsg");
  private winScreen = el<HTMLDivElement>("#winScreen");
  private winStats = el<HTMLDivElement>("#winStats");

  private joystick = el<HTMLDivElement>("#joystick");
  private stick = el<HTMLDivElement>("#stick");

  private heartSig = "";
  private hotbarSig = "";
  private promptSig = "";
  private biomeSig = "";
  private objSig = "";
  private joyPointer: number | null = null;

  constructor(handlers: UiHandlers) {
    this.handlers = handlers;

    el<HTMLButtonElement>("#startBtn").addEventListener("click", () => handlers.onStart());
    el<HTMLButtonElement>("#respawnBtn").addEventListener("click", () => handlers.onRespawn());
    el<HTMLButtonElement>("#againBtn").addEventListener("click", () => handlers.onRestart());
    el<HTMLButtonElement>("#menuBtn").addEventListener("click", () => this.openMenu(this.lastState));
    el<HTMLButtonElement>("#closeMenu").addEventListener("click", () => this.closeMenu());
    this.promptBtn.addEventListener("click", () => handlers.onPrompt());

    this.menuBody.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest("[data-craft]");
      if (target instanceof HTMLElement && target.dataset.craft) {
        handlers.onCraft(target.dataset.craft);
      }
    });

    this.bindJoystick();
  }

  private lastState: GameState | null = null;

  private bindJoystick(): void {
    const move = (event: PointerEvent) => {
      const rect = this.joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width / 2 - 18;
      let dx = event.clientX - cx;
      let dy = event.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stick.style.transform = `translate(${dx}px, ${dy}px)`;
      this.handlers.onMove(dx / max, dy / max);
    };

    const reset = () => {
      this.joyPointer = null;
      this.stick.style.transform = "translate(0px, 0px)";
      this.handlers.onMove(0, 0);
    };

    this.joystick.addEventListener("pointerdown", (event) => {
      this.joyPointer = event.pointerId;
      try {
        this.joystick.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      move(event);
      event.preventDefault();
    });
    this.joystick.addEventListener("pointermove", (event) => {
      if (this.joyPointer === event.pointerId) move(event);
    });
    this.joystick.addEventListener("pointerup", reset);
    this.joystick.addEventListener("pointercancel", reset);
    this.joystick.addEventListener("pointerleave", (event) => {
      if (this.joyPointer === event.pointerId) reset();
    });
  }

  showToast(text: string, rare = false): void {
    const node = document.createElement("div");
    node.className = `toast${rare ? " rare" : ""}`;
    node.textContent = text;
    this.toasts.appendChild(node);
    while (this.toasts.children.length > 3) {
      this.toasts.removeChild(this.toasts.firstElementChild as Element);
    }
    window.setTimeout(() => node.remove(), 2600);
  }

  update(model: HudModel): void {
    const s = model.state;
    this.lastState = s;
    const p = s.player;

    const hpNow = Math.ceil(p.hp);
    const heartSig = `${hpNow}/${p.maxHp}`;
    if (heartSig !== this.heartSig) {
      this.heartSig = heartSig;
      let html = "";
      for (let i = 0; i < 10; i++) {
        const hp = hpNow - i * 2;
        const cls = hp >= 2 ? "on" : hp >= 1 ? "half" : "";
        html += `<span class="heart ${cls}"></span>`;
      }
      this.hearts.innerHTML = html;
    }

    this.toolLabel.textContent = `${pickaxe(p.tier).name} · Tier ${p.tier}`;

    if (model.biomeName !== this.biomeSig) {
      this.biomeSig = model.biomeName;
      this.biomeLabel.textContent = model.biomeName;
      this.biomeLabel.className = `chip biome ${s.dim}`;
    }

    if (model.objective !== this.objSig) {
      this.objSig = model.objective;
      this.objText.textContent = model.objective;
    }

    const items = HOTBAR[s.dim] ?? HOTBAR.overworld;
    const hotbarSig = `${s.dim}:${items.map((id) => `${id}${count(s.inv, id)}`).join(",")}`;
    if (hotbarSig !== this.hotbarSig) {
      this.hotbarSig = hotbarSig;
      this.hotbar.innerHTML = items
        .map(
          (id) => `<div class="slot">${iconHtml(id)}<span class="slot-count">${count(s.inv, id)}</span></div>`,
        )
        .join("");
    }

    const promptSig = model.prompt ? `${model.prompt.label}:${model.prompt.enabled}` : "";
    if (promptSig !== this.promptSig) {
      this.promptSig = promptSig;
      if (!model.prompt) {
        this.promptWrap.classList.add("hidden");
      } else {
        this.promptWrap.classList.remove("hidden");
        this.promptBtn.textContent = model.prompt.label;
        this.promptBtn.disabled = !model.prompt.enabled;
      }
    }

    if (!model.compass) {
      this.compass.classList.add("hidden");
    } else {
      this.compass.classList.remove("hidden");
      this.compassArrow.style.transform = `rotate(${model.compass.angle}deg)`;
      this.compassDist.textContent = `${Math.round(model.compass.distance)} blocks`;
    }
  }

  hideTitle(): void {
    this.titleScreen.classList.add("hidden");
    this.hint.style.display = "block";
    window.setTimeout(() => {
      this.hint.style.display = "none";
    }, 9000);
  }

  openMenu(s: GameState | null): void {
    if (!s) return;
    this.menu.classList.remove("hidden");
    this.renderMenu(s);
    this.handlers.onMenu(true);
  }

  closeMenu(): void {
    this.menu.classList.add("hidden");
    this.handlers.onMenu(false);
  }

  isMenuOpen(): boolean {
    return !this.menu.classList.contains("hidden");
  }

  showDeath(cause: string): void {
    this.deathMsg.textContent = `Slain by ${cause}. Your pickaxe and loot stay with you.`;
    this.deathScreen.classList.remove("hidden");
  }

  hideDeath(): void {
    this.deathScreen.classList.add("hidden");
  }

  showWin(stats: WinStats): void {
    this.winStats.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><b>${stats.time}</b><small>Time</small></div>
        <div class="stat"><b>${stats.blocks}</b><small>Blocks mined</small></div>
        <div class="stat"><b>${stats.biomes}</b><small>Biomes found</small></div>
      </div>
      <div class="stat-grid" style="margin-top:7px">
        <div class="stat"><b>${stats.travel}m</b><small>Distance</small></div>
        <div class="stat"><b>3</b><small>Realms</small></div>
        <div class="stat"><b>1</b><small>Dragon slain</small></div>
      </div>`;
    this.winScreen.classList.remove("hidden");
  }

  resetForNewRun(): void {
    this.deathScreen.classList.add("hidden");
    this.winScreen.classList.add("hidden");
    this.menu.classList.add("hidden");
    this.hearts.innerHTML = "";
    this.hotbar.innerHTML = "";
    this.toasts.innerHTML = "";
    this.heartSig = "";
    this.hotbarSig = "";
    this.promptSig = "";
    this.biomeSig = "";
    this.objSig = "";
    this.promptWrap.classList.add("hidden");
    this.compass.classList.add("hidden");
    this.hint.style.display = "none";
    this.stick.style.transform = "translate(0px, 0px)";
  }

  renderMenu(s: GameState): void {
    this.lastState = s;
    const p = s.player;
    const now = performance.now();

    const toolSection = `
      <section>
        <h3>Your Pickaxe</h3>
        <div class="tool-row">
          <span class="pick">⛏</span>
          <span>${pickaxe(p.tier).name}</span>
          <span class="tool-tier">Tier ${p.tier}/4</span>
        </div>
      </section>`;

    const ownedItems = (Object.keys(ITEMS) as ItemId[]).filter((id) => count(s.inv, id) > 0);
    const inventory = ownedItems.length
      ? `<div class="inv-grid">${ownedItems
          .map(
            (id) =>
              `<div class="inv-cell">${iconHtml(id)}<div><b>${count(s.inv, id)}</b><small>${ITEMS[id].name}</small></div></div>`,
          )
          .join("")}</div>`
      : `<div class="empty-note">Empty — go break some blocks.</div>`;

    const recipes = RECIPES.filter((r) => recipeVisible(r, s));
    const recipeHtml = recipes.length
      ? recipes
          .map((r) => {
            const blocked = r.kind === "portal" && s.dim !== "overworld";
            const afford = hasCost(s.inv, r.cost) && !blocked;
            const costHtml = (Object.keys(r.cost) as ItemId[])
              .map((id) => {
                const have = count(s.inv, id);
                const need = r.cost[id] ?? 0;
                return `<span class="${have < need ? "lacking" : ""}">${ITEMS[id].name} ${have}/${need}</span>`;
              })
              .join(" · ");
            return `<div class="recipe">
              <div class="recipe-info">
                <div class="recipe-name">${r.name}</div>
                <div class="recipe-cost">${r.desc}<br>${costHtml}</div>
              </div>
              <button class="craft-btn" data-craft="${r.id}" ${afford ? "" : "disabled"}>Craft</button>
            </div>`;
          })
          .join("")
      : `<div class="empty-note">All upgrades crafted.</div>`;

    const chips = BIOME_ORDER.map((b) => {
      const found = s.discovered.has(b.key);
      return `<span class="biome-chip ${found ? "" : "locked"}">${found ? "✓ " : ""}${b.name}</span>`;
    }).join("");

    const statsHtml = `<div class="stat-grid">
      <div class="stat"><b>${s.blocksMined}</b><small>Mined</small></div>
      <div class="stat"><b>${Math.round(s.travel / 32)}m</b><small>Walked</small></div>
      <div class="stat"><b>${formatTime(now - s.startedAt)}</b><small>Time</small></div>
    </div>`;

    this.menuBody.innerHTML = `
      ${toolSection}
      <section><h3>Backpack</h3>${inventory}</section>
      <section><h3>Crafting</h3>${recipeHtml}</section>
      <section><h3>Biomes discovered · ${s.discovered.size}/${BIOME_ORDER.length}</h3><div class="chips">${chips}</div></section>
      <section><h3>Journey</h3>${statsHtml}</section>`;
  }
}
