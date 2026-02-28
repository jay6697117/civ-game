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
            stockpileGrain: 220,
            stockpileSupply: 180,
            garrisonRecoveryRate: 12,
            siegeDays: 0,
            garrison: [{ id: 'garrison_1', factionId: 'cao_cao', troops: 120, supply: 60, morale: 65, stance: 'DEFEND' }],
        },
    },
    legions: {
        l1: {
            id: 'l1',
            factionId: 'cao_cao',
            currentProvinceId: 'yanzhou',
            troops: 220,
            supply: 85,
            morale: 70,
            stance: 'BALANCED',
            experience: 95,
            level: 1,
            fatigue: 20,
            lastActionTurn: 0,
        },
    },
    generals: {},
    aiState: {
        lastResolvedTurn: 0,
        lastIssuedCommands: [],
        threatMap: {},
        objectiveByFaction: {},
        lastFailedCommands: [],
    },
    reportHistory: [],
});

describe('legion progression and stance resolution', () => {
    it('drill command grants experience, applies fatigue, and can level up', () => {
        const result = resolveTurn(
            { campaignState: buildCampaignState() },
            [{ type: 'DRILL_LEGION', payload: { factionId: 'cao_cao', legionId: 'l1', provinceId: 'yanzhou' } }],
            1,
        );

        const legion = result.nextCampaignState.legions.l1;
        expect(legion.level).toBeGreaterThanOrEqual(2);
        expect(legion.experience).toBeGreaterThanOrEqual(0);
        expect(legion.fatigue).toBeGreaterThan(20);
        expect(result.drillReports[0].status).toBe('SUCCESS');
    });

    it('set stance command updates legion stance and emits report', () => {
        const result = resolveTurn(
            { campaignState: buildCampaignState() },
            [{ type: 'SET_STANCE', payload: { factionId: 'cao_cao', legionId: 'l1', stance: 'AGGRESSIVE' } }],
            2,
        );

        expect(result.nextCampaignState.legions.l1.stance).toBe('AGGRESSIVE');
        expect(result.stanceReports).toHaveLength(1);
        expect(result.stanceReports[0].status).toBe('SUCCESS');
    });
});
