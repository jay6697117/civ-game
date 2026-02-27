const toMapById = (list = []) => {
    const map = {};
    list.forEach((item) => {
        if (!item?.id) return;
        map[item.id] = { ...item };
    });
    return map;
};

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
            garrison: [],
        };
    });

    return provinceMap;
};

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

    return {
        startYear,
        currentDay: 0,
        currentTurn: 1,
        phase: 'PREPARATION',
        assignedFactionId,
        factions: factionState,
        provinces: provinceState,
        generals: generalState,
        legions: {},
        eventFlags: {},
        victoryProgress: {
            controlledProvinces: 0,
            targetYear: 220,
        },
    };
}

export function cloneCampaignState(state) {
    return JSON.parse(JSON.stringify(state || {}));
}
