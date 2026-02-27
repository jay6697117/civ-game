import { describe, expect, it } from 'vitest';
import { THREE_KINGDOMS_FACTIONS } from '../../src/config/three-kingdoms';
import { assignRandomFactionByTier } from '../../src/logic/three-kingdoms/assignment';

describe('assignRandomFactionByTier', () => {
    it('returns faction in allowed tiers', () => {
        const faction = assignRandomFactionByTier({
            factions: THREE_KINGDOMS_FACTIONS,
            allowedTiers: ['A', 'B'],
            seed: 42,
        });
        expect(['A', 'B']).toContain(faction.tier);
    });

    it('does not escape tier constraints after 1000 samples', () => {
        for (let i = 0; i < 1000; i += 1) {
            const faction = assignRandomFactionByTier({
                factions: THREE_KINGDOMS_FACTIONS,
                allowedTiers: ['C'],
                seed: i + 1,
            });
            expect(faction.tier).toBe('C');
        }
    });
});
