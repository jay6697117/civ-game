import { describe, expect, it } from 'vitest';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

const buildCampaignState = () => ({
    assignedFactionId: 'cao_cao',
    currentTurn: 1,
    currentDay: 0,
    factions: {
        cao_cao: { id: 'cao_cao', treasury: 1000, grain: 1000, legions: ['l1'] },
    },
    provinces: {
        yanzhou: {
            id: 'yanzhou',
            ownerFactionId: 'cao_cao',
            neighbors: [],
            garrison: [{ id: 'garrison_1', factionId: 'cao_cao', troops: 120, supply: 60, morale: 65, stance: 'DEFEND' }],
        },
    },
    legions: {
        l1: {
            id: 'l1',
            factionId: 'cao_cao',
            currentProvinceId: 'yanzhou',
            troops: 200,
            supply: 95,
            morale: 96,
            stance: 'BALANCED',
        },
    },
    generals: {},
});

describe('fortify resolution', () => {
    it('fortify should not exceed same-turn caps and next turn supply should follow consumption', () => {
        const first = resolveTurn(
            { campaignState: buildCampaignState() },
            [{ type: 'FORTIFY', payload: { legionId: 'l1', provinceId: 'yanzhou', factionId: 'cao_cao' } }],
            1,
        );
        expect(first.fortifyReports).toHaveLength(1);
        const legionAfterFortify = first.nextCampaignState.legions.l1;
        expect(legionAfterFortify.supply).toBeLessThanOrEqual(100);
        expect(legionAfterFortify.morale).toBeLessThanOrEqual(100);
        expect(first.nextCampaignState.provinces.yanzhou.garrison[0].troops).toBeGreaterThanOrEqual(120);

        const second = resolveTurn({ campaignState: first.nextCampaignState }, [], 2);
        expect(second.nextCampaignState.legions.l1.supply).toBeLessThan(legionAfterFortify.supply);
    });
});
