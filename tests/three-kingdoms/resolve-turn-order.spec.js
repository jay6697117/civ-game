import { describe, expect, it } from 'vitest';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

describe('resolveTurn phase order', () => {
    it('returns fixed phase order metadata', () => {
        const result = resolveTurn({ campaignState: {} }, [], 1);
        expect(result.phaseOrder).toEqual(['SUPPLY', 'MOVEMENT', 'BATTLE', 'OCCUPATION', 'DIPLOMACY', 'EVENTS']);
    });
});
