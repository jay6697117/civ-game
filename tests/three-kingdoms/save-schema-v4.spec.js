import { describe, expect, it } from 'vitest';
import {
    assertCampaignSaveCompatibility,
    CAMPAIGN_SAVE_FORMAT_VERSION,
    migrateCampaignSaveToV4,
} from '../../src/logic/three-kingdoms/saveSchema';

describe('campaign save schema v4', () => {
    it('migrates v3 campaign save shape to v4 fields', () => {
        const migrated = migrateCampaignSaveToV4({
            saveFormatVersion: 3,
            campaignState: {
                currentTurn: 3,
                currentDay: 20,
                provinces: {
                    yanzhou: { id: 'yanzhou', ownerFactionId: 'cao_cao', neighbors: [], garrison: [] },
                },
                legions: {
                    l1: { id: 'l1', factionId: 'cao_cao', currentProvinceId: 'yanzhou', troops: 100, supply: 70, morale: 70, stance: 'BALANCED' },
                },
                aiState: { lastResolvedTurn: 2, lastIssuedCommands: [] },
                lastTurnReport: {
                    turn: 2,
                    resolvedAtDay: 20,
                    phaseOrder: [],
                    battleReports: [],
                    recruitReports: [],
                    fortifyReports: [],
                    supplyReports: [],
                    diplomacyChanges: [],
                    aiReports: [],
                    logs: [],
                },
            },
        });

        expect(migrated.saveFormatVersion).toBe(CAMPAIGN_SAVE_FORMAT_VERSION);
        expect(migrated.campaignState.legions.l1.level).toBeDefined();
        expect(migrated.campaignState.legions.l1.experience).toBeDefined();
        expect(migrated.campaignState.provinces.yanzhou.stockpileGrain).toBeDefined();
        expect(Array.isArray(migrated.campaignState.reportHistory)).toBe(true);
        expect(migrated.campaignState.aiState.threatMap).toBeTruthy();
        expect(Array.isArray(migrated.campaignState.lastTurnReport.ownershipChanges)).toBe(true);
    });

    it('keeps rejecting legacy saves below v2', () => {
        expect(() => assertCampaignSaveCompatibility({ saveFormatVersion: 1 })).toThrow(/not compatible/i);
    });
});
