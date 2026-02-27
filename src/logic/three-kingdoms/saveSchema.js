export const CAMPAIGN_SAVE_FORMAT_VERSION = 3;

const ensureProvinceGarrison = (province = {}) => {
    const garrison = Array.isArray(province.garrison) ? province.garrison : [];
    if (garrison.length > 0) return garrison;
    return [{
        id: `garrison_${province.id || 'unknown'}_migrated`,
        factionId: province.ownerFactionId || null,
        troops: 120,
        supply: 65,
        morale: 60,
        stance: 'DEFEND',
    }];
};

const ensureLegionShape = (legion = {}) => ({
    ...legion,
    stance: legion.stance || 'BALANCED',
    supply: Number.isFinite(legion.supply) ? legion.supply : 70,
    morale: Number.isFinite(legion.morale) ? legion.morale : 70,
});

const buildDefaultLastTurnReport = () => ({
    turn: 0,
    resolvedAtDay: 0,
    phaseOrder: [],
    battleReports: [],
    recruitReports: [],
    fortifyReports: [],
    supplyReports: [],
    diplomacyChanges: [],
    aiReports: [],
    logs: [],
});

export function migrateCampaignSaveToV3(data = {}) {
    const saveVersion = Number(data?.saveFormatVersion || 0);
    if (saveVersion >= CAMPAIGN_SAVE_FORMAT_VERSION) return data;

    const campaignState = data?.campaignState || {};
    const migratedProvinces = {};
    Object.entries(campaignState.provinces || {}).forEach(([provinceId, province]) => {
        migratedProvinces[provinceId] = {
            ...province,
            garrison: ensureProvinceGarrison(province),
        };
    });

    const migratedLegions = {};
    Object.entries(campaignState.legions || {}).forEach(([legionId, legion]) => {
        migratedLegions[legionId] = ensureLegionShape(legion);
    });

    return {
        ...data,
        saveFormatVersion: CAMPAIGN_SAVE_FORMAT_VERSION,
        campaignUi: {
            activePanel: 'commands',
            showNeighborHighlight: true,
            ...(data.campaignUi || {}),
        },
        campaignNotifications: Array.isArray(data.campaignNotifications) ? data.campaignNotifications : [],
        campaignState: {
            ...campaignState,
            provinces: migratedProvinces,
            legions: migratedLegions,
            turnMeta: {
                intervalDays: 10,
                lastResolvedDay: Number(campaignState?.currentDay || 0),
                lastResolvedTurn: Math.max(0, Number(campaignState?.currentTurn || 1) - 1),
                playerCommandCount: 0,
                aiCommandCount: 0,
                ...(campaignState.turnMeta || {}),
            },
            lastTurnReport: {
                ...buildDefaultLastTurnReport(),
                ...(campaignState.lastTurnReport || {}),
            },
            aiState: {
                lastResolvedTurn: Math.max(0, Number(campaignState?.currentTurn || 1) - 1),
                lastIssuedCommands: [],
                ...(campaignState.aiState || {}),
            },
        },
    };
}

export function assertCampaignSaveCompatibility(data = {}) {
    const saveVersion = Number(data?.saveFormatVersion || 0);

    if (saveVersion < 2) {
        throw new Error('Save file is not compatible with current schema version');
    }

    return true;
}
