import { describe, expect, it } from 'vitest';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

describe('campaign turn report', () => {
    it('stores structured report in next campaign state', () => {
        const campaignState = {
            assignedFactionId: 'cao_cao',
            currentTurn: 1,
            currentDay: 10,
            factions: {
                cao_cao: { id: 'cao_cao', treasury: 1000, grain: 1000, legions: ['l1'] },
                tao_qian: { id: 'tao_qian', treasury: 1000, grain: 1000, legions: [] },
            },
            provinces: {
                yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: ['xuzhou'], garrison: [{ id: 'g1', factionId: 'cao_cao', troops: 110, supply: 60, morale: 60, stance: 'DEFEND' }] },
                xuzhou: { id: 'xuzhou', ownerFactionId: 'tao_qian', neighbors: ['yanzhou'], garrison: [{ id: 'g2', factionId: 'tao_qian', troops: 100, supply: 60, morale: 60, stance: 'DEFEND' }] },
            },
            legions: {
                l1: { id: 'l1', factionId: 'cao_cao', currentProvinceId: 'yanzhou', troops: 260, supply: 85, morale: 70, stance: 'BALANCED' },
            },
            generals: {},
        };

        const result = resolveTurn(
            { campaignState },
            [{ type: 'FORTIFY', payload: { legionId: 'l1', provinceId: 'yanzhou', factionId: 'cao_cao' }, _source: 'ai' }],
            100,
        );

        expect(Array.isArray(result.aiReports)).toBe(true);
        expect(Array.isArray(result.fortifyReports)).toBe(true);
        expect(Array.isArray(result.recruitReports)).toBe(true);
        expect(result.nextCampaignState.lastTurnReport).toBeTruthy();
        expect(result.nextCampaignState.lastTurnReport.turn).toBe(1);
    });
});
