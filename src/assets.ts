import { Assets, Texture } from 'pixi.js';

export const assets = {
  normal: [
    { key: 'piece_red', url: 'assets/images/piece_red.png' },
    { key: 'piece_blue', url: 'assets/images/piece_blue.png' },
    { key: 'piece_green', url: 'assets/images/piece_green.png' },
    { key: 'piece_yellow', url: 'assets/images/piece_yellow.png' },
    { key: 'piece_purple', url: 'assets/images/piece_purple.png' },
    { key: 'piece_cyan', url: 'assets/images/piece_cyan.png' },
    { key: 'piece_orange', url: 'assets/images/piece_orange.png' },
    { key: 'piece_white', url: 'assets/images/piece_white.png' },
    { key: 'piece_magenta', url: 'assets/images/piece_magenta.png' },
    { key: 'piece_silver', url: 'assets/images/piece_silver.png' }
  ],
  special: [
    { key: 'special_row', url: 'assets/images/special_row.png' },
    { key: 'special_col', url: 'assets/images/special_col.png' },
    { key: 'special_nova', url: 'assets/images/special_nova.png' },
    { key: 'special_armored', url: 'assets/images/special_armored.png' },
    { key: 'special_fixed', url: 'assets/images/special_fixed.png' },
    { key: 'special_inert', url: 'assets/images/special_inert.png' },
    { key: 'special_multiplier', url: 'assets/images/special_multiplier.png' }
  ],
  background: { key: 'background', url: 'assets/images/background.png' }
} as const;

export const textures: Record<string, Texture> = {};

export async function loadAssets(): Promise<void> {
  const list = [...assets.normal, ...assets.special, assets.background];
  for (const a of list) Assets.add({ alias: a.key, src: a.url });
  const results = await Assets.load(list.map(a => a.key));
  Object.assign(textures, results);
}
