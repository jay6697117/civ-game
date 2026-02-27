import { describe, expect, it } from 'vitest';
import { resolveRecruitCommand, resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

const buildCampaignState = () => ({
    assignedFactionId: 'cao_cao',
    currentTurn: 1,
    currentDay: 0,
    factions: {
        cao_cao: { id: 'cao_cao', treasury: 500, grain: 500, legions: [] },
    },
    provinces: {
        yanzhou: {
            id: 'yanzhou',
            ownerFactionId: 'cao_cao',
            neighbors: [],
            garrison: [{ id: 'garrison_yz', factionId: 'cao_cao', troops: 120, supply: 70, morale: 60, stance: 'DEFEND' }],
        },
    },
    legions: {},
    generals: {},
});

describe('recruit resolution', () => {
    it('creates legion and consumes faction resources', () => {
        const state = buildCampaignState();
        const recruit = resolveRecruitCommand(state, {
            type: 'RECRUIT',
            payload: { provinceId: 'yanzhou', troops: 100, factionId: 'cao_cao' },
        });

        expect(recruit.ok).toBe(true);
        expect(recruit.report.status).toBe('SUCCESS');
        expect(recruit.nextCampaignState.factions.cao_cao.treasury).toBeLessThan(500);
        expect(recruit.nextCampaignState.factions.cao_cao.grain).toBeLessThan(500);
        expect(Object.keys(recruit.nextCampaignState.legions).length).toBe(1);
    });

    it('reports explicit failure when resources are insufficient', () => {
        const state = buildCampaignState();
        state.factions.cao_cao.treasury = 10;
        state.factions.cao_cao.grain = 10;

        const result = resolveTurn(
            { campaignState: state },
            [{ type: 'RECRUIT', payload: { provinceId: 'yanzhou', troops: 200, factionId: 'cao_cao' } }],
            1,
        );

        expect(result.recruitReports).toHaveLength(1);
        expect(result.recruitReports[0].status).toBe('FAILED');
        expect(result.recruitReports[0].code).toBe('RECRUIT_INSUFFICIENT_RESOURCES');
    });
});
