import { describe, expect, it } from 'vitest';
import { resolveTurn } from '../../src/logic/three-kingdoms/resolveTurn';

describe('movement and occupation', () => {
    it('captures target province after successful attack', () => {
        const campaignState = {
            provinces: {
                yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: ['xuzhou'], garrison: [] },
                xuzhou: { id: 'xuzhou', ownerFactionId: 'tao_qian', neighbors: ['yanzhou'], garrison: [] },
            },
            legions: {
                legion_1: {
                    id: 'legion_1',
                    factionId: 'cao_cao',
                    currentProvinceId: 'yanzhou',
                    troops: 300,
                    supply: 80,
                    mobility: 1,
                },
            },
            factions: {
                cao_cao: { id: 'cao_cao' },
                tao_qian: { id: 'tao_qian' },
            },
        };

        const result = resolveTurn(
            { campaignState },
            [{ type: 'ATTACK_PROVINCE', payload: { legionId: 'legion_1', targetProvinceId: 'xuzhou' } }],
            7,
        );

        expect(result.nextCampaignState.provinces.xuzhou.ownerFactionId).toBe('cao_cao');
        expect(result.nextCampaignState.legions.legion_1.currentProvinceId).toBe('xuzhou');
    });

    it('rejects movement to non-neighbor province', () => {
        const campaignState = {
            provinces: {
                yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: ['xuzhou'], garrison: [] },
                jingzhou: { id: 'jingzhou', ownerFactionId: 'liu_biao', neighbors: ['yizhou'], garrison: [] },
            },
            legions: {
                legion_1: {
                    id: 'legion_1',
                    factionId: 'cao_cao',
                    currentProvinceId: 'yanzhou',
                    troops: 120,
                    supply: 80,
                    mobility: 1,
                },
            },
        };

        const result = resolveTurn(
            { campaignState },
            [{ type: 'MOVE_LEGION', payload: { legionId: 'legion_1', toProvinceId: 'jingzhou' } }],
            3,
        );

        expect(result.nextCampaignState.legions.legion_1.currentProvinceId).toBe('yanzhou');
        expect(result.logs.some(log => log.includes('invalid move'))).toBe(true);
    });
});
