import { describe, expect, it } from 'vitest';
import { THREE_KINGDOMS_FACTIONS, THREE_KINGDOMS_GENERALS, THREE_KINGDOMS_PROVINCES } from '../../src/config/three-kingdoms';
import { buildInitialCampaignState } from '../../src/logic/three-kingdoms/campaignState';

describe('buildInitialCampaignState', () => {
    it('builds campaign with 13 provinces and 190 start year', () => {
        const state = buildInitialCampaignState({
            startYear: 190,
            factions: THREE_KINGDOMS_FACTIONS,
            provinces: THREE_KINGDOMS_PROVINCES,
            generals: THREE_KINGDOMS_GENERALS,
            assignedFactionId: 'cao_cao',
        });

        expect(state.startYear).toBe(190);
        expect(Object.keys(state.provinces)).toHaveLength(13);
        expect(state.assignedFactionId).toBe('cao_cao');
    });
});
