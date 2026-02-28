import { describe, expect, it } from 'vitest';
import {
    THREE_KINGDOMS_FACTIONS,
    THREE_KINGDOMS_GENERALS,
    THREE_KINGDOMS_PROVINCES,
} from '../../src/config/three-kingdoms';
import { assignRandomFactionByTier } from '../../src/logic/three-kingdoms/assignment';
import { buildInitialCampaignState } from '../../src/logic/three-kingdoms/campaignState';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

describe('campaign flow', () => {
    it('can run random faction entry and 20 continuous turns', () => {
        const faction = assignRandomFactionByTier({
            factions: THREE_KINGDOMS_FACTIONS,
            allowedTiers: ['A', 'B', 'C'],
            seed: 20260227,
        });
        expect(faction?.id).toBeTruthy();

        let campaignState = buildInitialCampaignState({
            startYear: 190,
            factions: THREE_KINGDOMS_FACTIONS,
            provinces: THREE_KINGDOMS_PROVINCES,
            generals: THREE_KINGDOMS_GENERALS,
            assignedFactionId: faction.id,
        });

        for (let i = 0; i < 20; i += 1) {
            const turn = resolveTurn({ campaignState }, [], i + 1);
            campaignState = turn.nextCampaignState;
        }

        expect(campaignState.assignedFactionId).toBe(faction.id);
        expect(campaignState.currentTurn).toBe(21);
        expect(campaignState.currentDay).toBe(200);
        expect(Array.isArray(campaignState.reportHistory)).toBe(true);
        expect(campaignState.reportHistory.length).toBe(20);
    });
});
