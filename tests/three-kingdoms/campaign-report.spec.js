import { describe, expect, it } from 'vitest';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

describe('campaign turn report', () => {
    it('stores structured report and bounded report history in next campaign state', () => {
        const campaignState = {
            assignedFactionId: 'cao_cao',
            currentTurn: 1,
            currentDay: 10,
            factions: {
                cao_cao: { id: 'cao_cao', treasury: 1000, grain: 1000, legions: ['l1'] },
                tao_qian: { id: 'tao_qian', treasury: 1000, grain: 1000, legions: [] },
            },
            provinces: {
                yanzhou: {
                    id: 'yanzhou',
                    ownerFactionId: 'cao_cao',
                    neighbors: ['xuzhou'],
                    stockpileGrain: 220,
                    stockpileSupply: 180,
                    garrisonRecoveryRate: 12,
                    siegeDays: 0,
                    garrison: [{ id: 'g1', factionId: 'cao_cao', troops: 110, supply: 60, morale: 60, stance: 'DEFEND' }],
                },
                xuzhou: {
                    id: 'xuzhou',
                    ownerFactionId: 'tao_qian',
                    neighbors: ['yanzhou'],
                    stockpileGrain: 220,
                    stockpileSupply: 180,
                    garrisonRecoveryRate: 12,
                    siegeDays: 0,
                    garrison: [{ id: 'g2', factionId: 'tao_qian', troops: 100, supply: 60, morale: 60, stance: 'DEFEND' }],
                },
            },
            legions: {
                l1: {
                    id: 'l1',
                    factionId: 'cao_cao',
                    currentProvinceId: 'yanzhou',
                    troops: 260,
                    supply: 85,
                    morale: 70,
                    stance: 'BALANCED',
                    level: 1,
                    experience: 0,
                    fatigue: 0,
                    lastActionTurn: 0,
                },
            },
            generals: {},
            reportHistory: Array.from({ length: 20 }, (_, index) => ({ turn: index + 1 })),
            aiState: {
                lastResolvedTurn: 0,
                lastIssuedCommands: [],
                threatMap: {},
                objectiveByFaction: {},
                lastFailedCommands: [],
            },
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
        expect(Array.isArray(result.nextCampaignState.lastTurnReport.ownershipChanges)).toBe(true);
        expect(Array.isArray(result.nextCampaignState.lastTurnReport.logisticsWarnings)).toBe(true);
        expect(Array.isArray(result.nextCampaignState.reportHistory)).toBe(true);
        expect(result.nextCampaignState.reportHistory.length).toBe(20);
    });
});
