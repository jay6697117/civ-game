import { describe, expect, it } from 'vitest';
import { assertCampaignSaveCompatibility } from '../../src/logic/three-kingdoms/saveSchema';

describe('campaign save schema', () => {
    it('rejects legacy save in campaign mode', () => {
        expect(() => assertCampaignSaveCompatibility({ saveFormatVersion: 1, gameMode: 'three_kingdoms' })).toThrow(
            /not compatible/i,
        );
    });

    it('allows v2 save in campaign mode', () => {
        expect(() => assertCampaignSaveCompatibility({ saveFormatVersion: 2, gameMode: 'three_kingdoms' })).not.toThrow();
    });
});
