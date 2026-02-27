import { describe, expect, it } from 'vitest';
import {
    assertCampaignSaveCompatibility,
    CAMPAIGN_SAVE_FORMAT_VERSION,
    migrateCampaignSaveToV3,
} from '../../src/logic/three-kingdoms/saveSchema';

describe('campaign save schema', () => {
    it('rejects legacy save in campaign mode', () => {
        expect(() => assertCampaignSaveCompatibility({ saveFormatVersion: 1, gameMode: 'three_kingdoms' })).toThrow(
            /not compatible/i,
        );
    });

    it('allows v2 save in campaign mode', () => {
        expect(() => assertCampaignSaveCompatibility({ saveFormatVersion: 2, gameMode: 'three_kingdoms' })).not.toThrow();
    });

    it('migrates v2 campaign save shape to v3 fields', () => {
        const migrated = migrateCampaignSaveToV3({
            saveFormatVersion: 2,
            campaignState: {
                provinces: {
                    yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: [] },
                },
                legions: {
                    l1: { id: 'l1', factionId: 'cao_cao', currentProvinceId: 'yanzhou', troops: 100 },
                },
            },
        });
        expect(migrated.saveFormatVersion).toBe(CAMPAIGN_SAVE_FORMAT_VERSION);
        expect(migrated.campaignState.turnMeta).toBeTruthy();
        expect(migrated.campaignState.lastTurnReport).toBeTruthy();
        expect(migrated.campaignState.aiState).toBeTruthy();
        expect(Array.isArray(migrated.campaignState.provinces.yanzhou.garrison)).toBe(true);
        expect(migrated.campaignState.legions.l1.stance).toBeTruthy();
    });
});
