const buildFactionState = (factions = [], assignedFactionId = null) => {
    const factionMap = {};
    factions.forEach((faction) => {
        if (!faction?.id) return;
        factionMap[faction.id] = {
            id: faction.id,
            name: faction.name,
            tier: faction.tier,
            title: faction.title || '',
            capitalProvinceId: faction.capitalProvinceId || null,
            legitimacy: faction.id === assignedFactionId ? 65 : 55,
            treasury: 1200,
            grain: 800,
            morale: 70,
            generals: [],
            legions: [],
            relations: {},
        };
    });
    return factionMap;
};

const buildGeneralState = (generals = [], factionMap = {}) => {
    const generalMap = {};
    generals.forEach((general) => {
        if (!general?.id) return;
        generalMap[general.id] = {
            ...general,
            status: 'active',
            traits: Array.isArray(general.traits) ? general.traits : [],
        };
        if (general.factionId && factionMap[general.factionId]) {
            factionMap[general.factionId].generals.push(general.id);
        }
    });
    return generalMap;
};

const buildProvinceState = (provinces = [], factions = []) => {
    const ownerRoundRobin = factions.map(f => f.id);
    let cursor = 0;
    const provinceMap = {};

    provinces.forEach((province) => {
        if (!province?.id) return;
        const ownerFactionId = ownerRoundRobin.length > 0
            ? ownerRoundRobin[cursor % ownerRoundRobin.length]
            : null;
        cursor += 1;

        provinceMap[province.id] = {
            ...province,
            ownerFactionId,
            development: 1,
            publicOrder: 70,
            grainOutput: province.grainOutput ?? 120,
            taxOutput: province.taxOutput ?? 90,
            garrison: [{
                id: `garrison_${province.id}_0`,
                factionId: ownerFactionId,
                troops: 140,
                supply: 70,
                morale: 65,
                stance: 'DEFEND',
            }],
        };
    });

    return provinceMap;
};

const findSpawnProvinceId = (faction, provinceState) => {
    const allProvinces = Object.values(provinceState || {});
    const owned = allProvinces.find((province) => province.ownerFactionId === faction.id);
    if (owned) return owned.id;
    if (faction.capitalProvinceId && provinceState[faction.capitalProvinceId]) {
        return faction.capitalProvinceId;
    }
    return allProvinces[0]?.id || null;
};

const buildInitialLegionState = (factions = [], factionState = {}, provinceState = {}) => {
    const legionMap = {};
    factions.forEach((faction, index) => {
        const targetFaction = factionState[faction.id];
        if (!targetFaction) return;
        const spawnProvinceId = findSpawnProvinceId(faction, provinceState);
        if (!spawnProvinceId) return;
        const legionId = `legion_${faction.id}_1`;
        const generalId = targetFaction.generals?.[0] || null;
        legionMap[legionId] = {
            id: legionId,
            factionId: faction.id,
            generalId,
            currentProvinceId: spawnProvinceId,
            troops: 220 + ((index % 4) * 15),
            supply: 82,
            mobility: 1,
            morale: 72,
            stance: 'BALANCED',
        };
        targetFaction.legions = [...(targetFaction.legions || []), legionId];
    });
    return legionMap;
};

const buildDefaultTurnReport = () => ({
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

export function buildInitialCampaignState({
    startYear = 190,
    factions = [],
    provinces = [],
    generals = [],
    assignedFactionId = null,
} = {}) {
    const factionState = buildFactionState(factions, assignedFactionId);
    const generalState = buildGeneralState(generals, factionState);
    const provinceState = buildProvinceState(provinces, factions);
    const legionState = buildInitialLegionState(factions, factionState, provinceState);

    return {
        startYear,
        currentDay: 0,
        currentTurn: 1,
        phase: 'PREPARATION',
        assignedFactionId,
        factions: factionState,
        provinces: provinceState,
        generals: generalState,
        legions: legionState,
        eventFlags: {},
        victoryProgress: {
            controlledProvinces: 0,
            requiredProvinceCount: 10,
            requiredKeyProvinces: ['sili', 'jingzhou'],
            targetYear: 220,
        },
        turnMeta: {
            intervalDays: 10,
            lastResolvedDay: 0,
            lastResolvedTurn: 0,
            playerCommandCount: 0,
            aiCommandCount: 0,
        },
        lastTurnReport: buildDefaultTurnReport(),
        aiState: {
            lastResolvedTurn: 0,
            lastIssuedCommands: [],
        },
    };
}

export function cloneCampaignState(state) {
    return JSON.parse(JSON.stringify(state || {}));
}
