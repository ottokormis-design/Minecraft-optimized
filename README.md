# Blockrealms

A small mobile-first, Minecraft-inspired block adventure. Explore procedurally generated
biomes, mine ores, craft better pickaxes, open a Nether portal, forge Eyes of Ender and
take on the Ender Dragon in the End.

Built with TypeScript and the Canvas 2D API. No image assets — every block texture,
character and mob is drawn in code.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

## Controls

- **Move** — on-screen joystick (or WASD / arrow keys on desktop)
- **Mine** — press and hold a block within reach
- **Attack** — tap a mob
- **Backpack & crafting** — the ☰ button (or Escape)
- **Portals** — a prompt button appears when you stand next to a portal

## Progression

1. Mine stone, then craft a **Stone Pickaxe** (3 stone).
2. Mine iron in the **Rocky Highlands**, craft an **Iron Pickaxe** (3 iron).
3. Mine diamond, craft a **Diamond Pickaxe** (3 diamond).
4. Mine 10 obsidian and build the **Nether Portal**.
5. In the Nether, collect **blaze rods** and **ender pearls**, then craft 12 **Eyes of Ender**.
6. Find the End Portal (the compass points to it), place the eyes and step through.
7. Defeat the **Ender Dragon**.

Six overworld biomes are tracked as discoveries: Green Plains, Deep Forest, Snowy Tundra,
Sunbaked Desert, Rocky Highlands and Stillwater Lakes.

## Project layout

| File | Purpose |
| --- | --- |
| `src/main.ts` | Game loop, input, mining, crafting, portals, combat |
| `src/world.ts` | Chunked world generation, biomes, landmarks |
| `src/blocks.ts` | Blocks, items, pickaxe tiers |
| `src/entities.ts` | Mob AI, projectiles, particles, collision |
| `src/render.ts` | Canvas renderer and procedural sprites |
| `src/progress.ts` | Recipes and objective tracking |
| `src/ui.ts` | HUD, joystick, backpack/crafting menu |
| `src/style.css` | Mobile-first layout and overlays |
