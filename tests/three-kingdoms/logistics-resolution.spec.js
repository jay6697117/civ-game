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
            stockpileGrain: 30,
            stockpileSupply: 8,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            garrison: [{ id: 'garrison_1', factionId: 'cao_cao', troops: 120, supply: 50, morale: 60, stance: 'DEFEND' }],
        },
    },
    legions: {
        l1: {
            id: 'l1',
            factionId: 'cao_cao',
            currentProvinceId: 'yanzhou',
            troops: 160,
            supply: 40,
            morale: 70,
            stance: 'BALANCED',
            experience: 0,
            level: 1,
            fatigue: 0,
            lastActionTurn: 0,
        },
    },
    generals: {},
    aiState: { lastResolvedTurn: 0, lastIssuedCommands: [], threatMap: {}, objectiveByFaction: {}, lastFailedCommands: [] },
    reportHistory: [],
});

describe('logistics stockpile resolution', () => {
    it('consumes province stockpile and emits logistics warnings when shortage happens', () => {
        const result = resolveTurn({ campaignState: buildCampaignState() }, [], 9);

        const province = result.nextCampaignState.provinces.yanzhou;
        const legion = result.nextCampaignState.legions.l1;

        expect(province.stockpileSupply).toBeGreaterThanOrEqual(0);
        expect(legion.supply).toBeLessThanOrEqual(40);
        expect(Array.isArray(result.logisticsReports)).toBe(true);
        expect(result.logisticsReports.some((entry) => entry.status === 'WARNING')).toBe(true);
        expect(result.nextCampaignState.lastTurnReport.logisticsWarnings.length).toBeGreaterThan(0);
    });
});
