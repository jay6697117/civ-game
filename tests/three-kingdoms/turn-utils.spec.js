import { describe, expect, it } from 'vitest';
import { computeCampaignCountdown } from '../../src/logic/three-kingdoms/turnUtils';

describe('campaign turn countdown', () => {
    it('returns one day remaining when day is right before boundary', () => {
        const countdown = computeCampaignCountdown(9, 10);
        expect(countdown.daysUntilResolve).toBe(1);
        expect(countdown.nextResolveDay).toBe(10);
    });

    it('resets to full interval immediately on boundary day', () => {
        const countdown = computeCampaignCountdown(10, 10);
        expect(countdown.daysUntilResolve).toBe(10);
        expect(countdown.nextResolveDay).toBe(20);
    });
});
