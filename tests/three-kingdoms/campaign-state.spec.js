import { describe, expect, it } from 'vitest';
import { THREE_KINGDOMS_FACTIONS, THREE_KINGDOMS_GENERALS, THREE_KINGDOMS_PROVINCES } from '../../src/config/three-kingdoms';
import { buildInitialCampaignState } from '../../src/logic/three-kingdoms/campaignState';

describe('buildInitialCampaignState', () => {
    it('builds campaign with minimum legions and non-empty province garrisons', () => {
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
        expect(Object.keys(state.legions).length).toBeGreaterThanOrEqual(THREE_KINGDOMS_FACTIONS.length);
        Object.values(state.legions).forEach((legion) => {
            expect(Number.isFinite(legion.level)).toBe(true);
            expect(Number.isFinite(legion.experience)).toBe(true);
            expect(Number.isFinite(legion.fatigue)).toBe(true);
            expect(Number.isFinite(legion.lastActionTurn)).toBe(true);
        });
        Object.values(state.provinces).forEach((province) => {
            expect(Array.isArray(province.garrison)).toBe(true);
            expect(province.garrison.length).toBeGreaterThan(0);
            expect(Number.isFinite(province.stockpileGrain)).toBe(true);
            expect(Number.isFinite(province.stockpileSupply)).toBe(true);
        });
        expect(state.turnMeta).toBeTruthy();
        expect(state.lastTurnReport).toBeTruthy();
        expect(Array.isArray(state.reportHistory)).toBe(true);
        expect(state.aiState).toBeTruthy();
    });
});
