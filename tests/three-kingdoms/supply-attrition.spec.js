import { describe, expect, it } from 'vitest';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

describe('supply attrition', () => {
    it('reduces troops when legion supply is below threshold', () => {
        const campaignState = {
            legions: {
                low_supply_legion: {
                    id: 'low_supply_legion',
                    factionId: 'cao_cao',
                    currentProvinceId: 'yanzhou',
                    troops: 100,
                    supply: 10,
                },
            },
            provinces: {
                yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: [] },
            },
        };

        const result = resolveTurn({ campaignState }, [], 1);
        expect(result.nextCampaignState.legions.low_supply_legion.troops).toBeLessThan(100);
        expect(result.logs.some((log) => log.includes('attrition:low_supply_legion'))).toBe(true);
    });
});
