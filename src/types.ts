import { Sprite } from 'pixi.js';

export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'orange' | 'white' | 'magenta' | 'silver';
export type Special = 'row' | 'col' | 'nova' | 'armored' | 'fixed' | 'inert' | 'multiplier';

export interface BasePiece {
  kind: 'normal' | 'special';
  sprite?: Sprite;
  baseScale?: number;
  falls?: boolean;
}

export interface NormalPiece extends BasePiece {
  kind: 'normal';
  color: Color;
}

export interface SpecialPiece extends BasePiece {
  kind: 'special';
  special: Special;
  color?: Color;
  hp?: number;
  value?: number;
  kill?: boolean;
}

export type Piece = NormalPiece | SpecialPiece;
