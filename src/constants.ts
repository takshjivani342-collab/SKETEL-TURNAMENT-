import { Game, Tournament } from './types';

export interface GameMode {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
}

const DEFAULT_BR_IMG = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop';
const DEFAULT_CS_IMG = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop';
const DEFAULT_LW_IMG = 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=1200&auto=format&fit=crop';

export const GAME_MODES_DATA: Record<string, GameMode[]> = {
  freefire: [
    { id: 'br_solo', title: 'BR SOLO', subtitle: 'Battle Royale', category: 'Battle Royale', image: DEFAULT_BR_IMG },
    { id: 'br_duo', title: 'BR DUO', subtitle: 'Battle Royale', category: 'Battle Royale', image: DEFAULT_BR_IMG },
    { id: 'br_squad', title: 'BR SQUAD', subtitle: 'Battle Royale', category: 'Battle Royale', image: DEFAULT_BR_IMG },
    { id: 'cs_solo', title: 'CS SOLO', subtitle: 'Clash Squad', category: 'Clash Squad', image: DEFAULT_CS_IMG },
    { id: 'cs_duo', title: 'CS DUO', subtitle: 'Clash Squad', category: 'Clash Squad', image: DEFAULT_CS_IMG },
    { id: 'cs_squad', title: 'CS SQUAD', subtitle: 'Clash Squad', category: 'Clash Squad', image: DEFAULT_CS_IMG },
    { id: 'lone_wolf_solo', title: 'LONE WOLF SOLO', subtitle: 'Lone Wolf', category: 'Lone Wolf', image: DEFAULT_LW_IMG },
    { id: 'lone_wolf_duo', title: 'LONE WOLF DUO', subtitle: 'Lone Wolf', category: 'Lone Wolf', image: DEFAULT_LW_IMG },
  ]
};

export const GAMES: Game[] = [
  {
    id: 'freefire',
    title: 'Free Fire',
    image: DEFAULT_BR_IMG,
    players: 850,
  }
];

