import { describe, expect, it } from 'vitest';
import { checkVictory } from '../../src/logic/three-kingdoms/victory';
import { resolveHistoricalEvents190 } from '../../src/config/three-kingdoms/events190';

describe('victory and 190 events', () => {
    it('returns unification victory when threshold reached', () => {
        const result = checkVictory({
            controlledProvinces: 10,
            requiredProvinceCount: 10,
            controlledKeyProvinces: ['sili', 'jingzhou'],
            requiredKeyProvinces: ['sili', 'jingzhou'],
            currentYear: 205,
            survivalYear: 220,
        });
        expect(result.type).toBe('UNIFICATION');
    });

    it('returns survival victory when target year reached', () => {
        const result = checkVictory({
            controlledProvinces: 5,
            requiredProvinceCount: 10,
            controlledKeyProvinces: ['sili'],
            requiredKeyProvinces: ['sili', 'jingzhou'],
            currentYear: 220,
            survivalYear: 220,
        });
        expect(result.type).toBe('SURVIVAL');
    });

    it('triggers coalition event in 190 start', () => {
        const result = resolveHistoricalEvents190({
            currentYear: 190,
            eventFlags: {},
            factionId: 'cao_cao',
        });
        expect(result.events.length).toBeGreaterThan(0);
    });

    it('does not repeat first 190 coalition event after flag is set', () => {
        const result = resolveHistoricalEvents190({
            currentYear: 190,
            eventFlags: { event_190_coalition_resolved: true },
            factionId: 'cao_cao',
        });
        expect(result.events).toHaveLength(0);
    });
});
