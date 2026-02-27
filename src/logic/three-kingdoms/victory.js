export const DEFAULT_REQUIRED_PROVINCE_COUNT = 10;
export const DEFAULT_REQUIRED_KEY_PROVINCES = ['sili', 'jingzhou'];
export const DEFAULT_SURVIVAL_YEAR = 220;

const toIdSet = (ids = []) => new Set(Array.isArray(ids) ? ids : []);

export function checkVictory({
    controlledProvinces = 0,
    requiredProvinceCount = DEFAULT_REQUIRED_PROVINCE_COUNT,
    controlledKeyProvinces = [],
    requiredKeyProvinces = DEFAULT_REQUIRED_KEY_PROVINCES,
    currentYear = 190,
    survivalYear = DEFAULT_SURVIVAL_YEAR,
} = {}) {
    const keySet = toIdSet(controlledKeyProvinces);
    const unificationReached = Number(controlledProvinces || 0) >= Number(requiredProvinceCount || 0)
        && (requiredKeyProvinces || []).every((provinceId) => keySet.has(provinceId));

    if (unificationReached) {
        return {
            achieved: true,
            type: 'UNIFICATION',
            title: '一统天下',
        };
    }

    if (Number(currentYear || 0) >= Number(survivalYear || DEFAULT_SURVIVAL_YEAR)) {
        return {
            achieved: true,
            type: 'SURVIVAL',
            title: '存续胜利',
        };
    }

    return {
        achieved: false,
        type: null,
        title: '',
    };
}

export function buildVictoryCheckInput({
    campaignState = {},
    assignedFactionId = null,
} = {}) {
    const factionId = assignedFactionId || campaignState?.assignedFactionId || null;
    const provinces = Object.values(campaignState?.provinces || {});
    const controlledProvinceIds = provinces
        .filter((province) => province?.ownerFactionId === factionId)
        .map((province) => province.id);
    const requiredKeyProvinces = campaignState?.victoryProgress?.requiredKeyProvinces || DEFAULT_REQUIRED_KEY_PROVINCES;
    const controlledKeyProvinces = controlledProvinceIds.filter((provinceId) => requiredKeyProvinces.includes(provinceId));
    const startYear = Number(campaignState?.startYear || 190);
    const currentDay = Number(campaignState?.currentDay || 0);

    return {
        controlledProvinces: controlledProvinceIds.length,
        requiredProvinceCount: campaignState?.victoryProgress?.requiredProvinceCount || DEFAULT_REQUIRED_PROVINCE_COUNT,
        controlledKeyProvinces,
        requiredKeyProvinces,
        currentYear: startYear + Math.floor(currentDay / 365),
        survivalYear: campaignState?.victoryProgress?.targetYear || DEFAULT_SURVIVAL_YEAR,
    };
}
