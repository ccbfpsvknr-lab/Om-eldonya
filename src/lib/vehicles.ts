/**
 * Canonical vehicle catalogue. Each player chooses one of these in Player
 * Setup; the chosen emoji is then stored on the player object and carried
 * through reveal into the match. There is no seat-based assignment — a
 * player's vehicle is whatever they picked.
 */
export interface VehicleOption {
  id: string;
  emoji: string;
  name: string;
}

export const VEHICLES: VehicleOption[] = [
  { id: 'tuktuk', emoji: '🛺', name: 'توكتوك' },
  { id: 'trosikl', emoji: '🛻', name: 'تروسيكل' },
  { id: 'makana', emoji: '🏍️', name: 'مكنة' },
  { id: 'microbus', emoji: '🚐', name: 'ميكروباص' },
  { id: 'taxi', emoji: '🚕', name: 'تاكسي' },
  { id: 'rob3', emoji: '🚚', name: 'ربع نقل' },
];

/** Default selection for the Player Setup picker. */
export const DEFAULT_VEHICLE = VEHICLES[0].emoji;
