import { describe, expect, it } from 'vitest';
import { TURN_INTERVAL_DAYS, shouldResolveCampaignTurn } from '../../src/hooks/useGameLoop';

describe('campaign turn interval', () => {
    it('uses 10-day interval', () => {
        expect(TURN_INTERVAL_DAYS).toBe(10);
    });

    it('resolves turn every 10 days in campaign mode', () => {
        expect(shouldResolveCampaignTurn({ gameMode: 'three_kingdoms', daysElapsed: 10 })).toBe(true);
        expect(shouldResolveCampaignTurn({ gameMode: 'three_kingdoms', daysElapsed: 11 })).toBe(false);
        expect(shouldResolveCampaignTurn({ gameMode: 'classic', daysElapsed: 10 })).toBe(false);
    });
});
