import * as THREE from "three";

// Item interfaces
export interface InventoryItem {
  name: string;
  type: string;
  value?: number;
  damage?: number;
  healing?: number;
  healAmount?: number;
  description?: string;
  [key: string]: any;
}

// Weapon interfaces
export interface Weapon {
  damage: number;
  range: number;
  cooldown: number;
  model: THREE.Object3D | null;
  acquired?: boolean;
  arrow?: THREE.Object3D | null;
  lastFired?: number;
  attackType?: string; // "stab" or "slash"
}

export interface Weapons {
  [key: string]: Weapon;
}

// Chest interfaces
export interface ChestItem extends InventoryItem {
  description: string;
}

export interface ItemTypes {
  food: ChestItem[];
  weapon: ChestItem[];
  potion: ChestItem[];
  [key: string]: ChestItem[];
}

export interface Chest {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  items: ChestItem[];
  isOpen: boolean;
}

// Building interfaces
export interface Building {
  group: THREE.Group;
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  entranceSide: number;
}

// Game state interfaces
export interface GameState {
  paused: boolean;
  gameOver: boolean;
  score: number;
  health: number;
  time: number;
}

// Input interfaces
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  interact: boolean;
  inventory: boolean;
  sprint: boolean;
}
