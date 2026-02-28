export const CAMPAIGN_SAVE_FORMAT_VERSION = 4;

const DEFAULT_PROVINCE_LOGISTICS = {
    stockpileGrain: 220,
    stockpileSupply: 180,
    garrisonRecoveryRate: 12,
    siegeDays: 0,
};

const DEFAULT_LEGION_PROGRESS = {
    stance: 'BALANCED',
    supply: 70,
    morale: 70,
    experience: 0,
    level: 1,
    fatigue: 0,
    lastActionTurn: 0,
};

const buildDefaultLastTurnReport = () => ({
    turn: 0,
    resolvedAtDay: 0,
    phaseOrder: [],
    battleReports: [],
    recruitReports: [],
    fortifyReports: [],
    drillReports: [],
    stanceReports: [],
    logisticsReports: [],
    supplyReports: [],
    diplomacyChanges: [],
    aiReports: [],
    ownershipChanges: [],
    topLosses: [],
    logisticsWarnings: [],
    logs: [],
});

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

const ensureProvinceShape = (province = {}) => ({
    ...province,
    ...DEFAULT_PROVINCE_LOGISTICS,
    ...province,
    stockpileGrain: Number.isFinite(province.stockpileGrain)
        ? province.stockpileGrain
        : DEFAULT_PROVINCE_LOGISTICS.stockpileGrain,
    stockpileSupply: Number.isFinite(province.stockpileSupply)
        ? province.stockpileSupply
        : DEFAULT_PROVINCE_LOGISTICS.stockpileSupply,
    garrisonRecoveryRate: Number.isFinite(province.garrisonRecoveryRate)
        ? province.garrisonRecoveryRate
        : DEFAULT_PROVINCE_LOGISTICS.garrisonRecoveryRate,
    siegeDays: Number.isFinite(province.siegeDays)
        ? province.siegeDays
        : DEFAULT_PROVINCE_LOGISTICS.siegeDays,
    garrison: ensureProvinceGarrison(province),
});

const ensureLegionShape = (legion = {}) => ({
    ...legion,
    ...DEFAULT_LEGION_PROGRESS,
    stance: legion.stance || DEFAULT_LEGION_PROGRESS.stance,
    supply: Number.isFinite(legion.supply) ? legion.supply : DEFAULT_LEGION_PROGRESS.supply,
    morale: Number.isFinite(legion.morale) ? legion.morale : DEFAULT_LEGION_PROGRESS.morale,
    experience: Number.isFinite(legion.experience) ? legion.experience : DEFAULT_LEGION_PROGRESS.experience,
    level: Number.isFinite(legion.level) && legion.level > 0 ? legion.level : DEFAULT_LEGION_PROGRESS.level,
    fatigue: Number.isFinite(legion.fatigue) ? legion.fatigue : DEFAULT_LEGION_PROGRESS.fatigue,
    lastActionTurn: Number.isFinite(legion.lastActionTurn)
        ? legion.lastActionTurn
        : DEFAULT_LEGION_PROGRESS.lastActionTurn,
});

const ensureAiStateShape = (aiState = {}, campaignState = {}) => ({
    lastResolvedTurn: Math.max(0, Number(aiState?.lastResolvedTurn ?? Number(campaignState?.currentTurn || 1) - 1)),
    lastIssuedCommands: Array.isArray(aiState?.lastIssuedCommands) ? aiState.lastIssuedCommands : [],
    threatMap: aiState?.threatMap && typeof aiState.threatMap === 'object' ? aiState.threatMap : {},
    objectiveByFaction: aiState?.objectiveByFaction && typeof aiState.objectiveByFaction === 'object'
        ? aiState.objectiveByFaction
        : {},
    lastFailedCommands: Array.isArray(aiState?.lastFailedCommands) ? aiState.lastFailedCommands : [],
});

const ensureReportShape = (report = {}) => ({
    ...buildDefaultLastTurnReport(),
    ...(report || {}),
    ownershipChanges: Array.isArray(report?.ownershipChanges) ? report.ownershipChanges : [],
    topLosses: Array.isArray(report?.topLosses) ? report.topLosses : [],
    logisticsWarnings: Array.isArray(report?.logisticsWarnings) ? report.logisticsWarnings : [],
    drillReports: Array.isArray(report?.drillReports) ? report.drillReports : [],
    stanceReports: Array.isArray(report?.stanceReports) ? report.stanceReports : [],
    logisticsReports: Array.isArray(report?.logisticsReports) ? report.logisticsReports : [],
});

const migrateCampaignStateShape = (campaignState = {}) => {
    const migratedProvinces = {};
    Object.entries(campaignState.provinces || {}).forEach(([provinceId, province]) => {
        migratedProvinces[provinceId] = ensureProvinceShape(province);
    });

    const migratedLegions = {};
    Object.entries(campaignState.legions || {}).forEach(([legionId, legion]) => {
        migratedLegions[legionId] = ensureLegionShape(legion);
    });

    return {
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
        lastTurnReport: ensureReportShape(campaignState.lastTurnReport),
        reportHistory: Array.isArray(campaignState.reportHistory)
            ? campaignState.reportHistory.map((report) => ensureReportShape(report)).slice(-20)
            : [],
        aiState: ensureAiStateShape(campaignState.aiState, campaignState),
    };
};

export function migrateCampaignSaveToV3(data = {}) {
    const saveVersion = Number(data?.saveFormatVersion || 0);
    if (saveVersion >= 3) return data;

    const campaignState = data?.campaignState || {};
    const migratedCampaignState = migrateCampaignStateShape(campaignState);

    return {
        ...data,
        saveFormatVersion: 3,
        campaignUi: {
            activePanel: 'commands',
            showNeighborHighlight: true,
            ...(data.campaignUi || {}),
        },
        campaignNotifications: Array.isArray(data.campaignNotifications) ? data.campaignNotifications : [],
        campaignState: migratedCampaignState,
    };
}

export function migrateCampaignSaveToV4(data = {}) {
    const saveVersion = Number(data?.saveFormatVersion || 0);
    if (saveVersion >= CAMPAIGN_SAVE_FORMAT_VERSION) return data;

    let migrated = { ...data };
    if (saveVersion < 3) {
        migrated = migrateCampaignSaveToV3(migrated);
    }

    const campaignState = migrated?.campaignState || {};
    const migratedCampaignState = migrateCampaignStateShape(campaignState);

    return {
        ...migrated,
        saveFormatVersion: CAMPAIGN_SAVE_FORMAT_VERSION,
        campaignUi: {
            activePanel: 'commands',
            showNeighborHighlight: true,
            ...(migrated.campaignUi || {}),
        },
        campaignNotifications: Array.isArray(migrated.campaignNotifications) ? migrated.campaignNotifications : [],
        campaignState: migratedCampaignState,
    };
}

export function assertCampaignSaveCompatibility(data = {}) {
    const saveVersion = Number(data?.saveFormatVersion || 0);

    if (saveVersion < 2) {
        throw new Error('Save file is not compatible with current schema version');
    }

    return true;
}
