import { Assets, Texture } from 'pixi.js';

export const assets = {
  normal: [
    { key: 'piece_red', url: new URL('../assets/images/piece_red.png', import.meta.url).href },
    { key: 'piece_blue', url: new URL('../assets/images/piece_blue.png', import.meta.url).href },
    { key: 'piece_green', url: new URL('../assets/images/piece_green.png', import.meta.url).href },
    { key: 'piece_yellow', url: new URL('../assets/images/piece_yellow.png', import.meta.url).href },
    { key: 'piece_purple', url: new URL('../assets/images/piece_purple.png', import.meta.url).href },
    { key: 'piece_cyan', url: new URL('../assets/images/piece_cyan.png', import.meta.url).href },
    { key: 'piece_orange', url: new URL('../assets/images/piece_orange.png', import.meta.url).href },
    { key: 'piece_white', url: new URL('../assets/images/piece_white.png', import.meta.url).href },
    { key: 'piece_magenta', url: new URL('../assets/images/piece_magenta.png', import.meta.url).href },
    { key: 'piece_silver', url: new URL('../assets/images/piece_silver.png', import.meta.url).href }
  ],
  special: [
    { key: 'special_row', url: new URL('../assets/images/special_row.png', import.meta.url).href },
    { key: 'special_col', url: new URL('../assets/images/special_col.png', import.meta.url).href },
    { key: 'special_nova', url: new URL('../assets/images/special_nova.png', import.meta.url).href },
    { key: 'special_armored', url: new URL('../assets/images/special_armored.png', import.meta.url).href },
    { key: 'special_fixed', url: new URL('../assets/images/special_fixed.png', import.meta.url).href },
    { key: 'special_inert', url: new URL('../assets/images/special_inert.png', import.meta.url).href },
    { key: 'special_multiplier', url: new URL('../assets/images/special_multiplier.png', import.meta.url).href }
  ],
  background: { key: 'background', url: new URL('../assets/images/background.png', import.meta.url).href }
} as const;

export const textures: Record<string, Texture> = {};

export async function loadAssets(): Promise<void> {
  const list = [...assets.normal, ...assets.special, assets.background];
  for (const a of list) Assets.add({ alias: a.key, src: a.url });
  const results = await Assets.load(list.map(a => a.key));
  Object.assign(textures, results);
}
