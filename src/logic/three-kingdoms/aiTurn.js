import { validateTurnCommand } from './commands';

const seededRandom = (seedInput = Date.now()) => {
    let seed = Number(seedInput) || Date.now();
    seed %= 2147483647;
    if (seed <= 0) seed += 2147483646;
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

const pickBySeed = (items = [], seed = Date.now()) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    const index = Math.floor(seededRandom(seed) * items.length) % items.length;
    return items[index];
};

export function buildAiTurnCommands(campaignState = {}, factionId, rngSeed = Date.now()) {
    if (!factionId || !campaignState?.factions?.[factionId]) return [];

    const faction = campaignState.factions[factionId];
    const provinces = Object.values(campaignState.provinces || {});
    const legions = Object.values(campaignState.legions || {}).filter((legion) => legion.factionId === factionId);
    const ownedProvinces = provinces.filter((province) => province.ownerFactionId === factionId);
    const commands = [];

    const recruitTroops = 120;
    const canRecruit = ownedProvinces.length > 0
        && (faction.treasury || 0) >= recruitTroops
        && (faction.grain || 0) >= recruitTroops * 0.5;
    const recruitLimit = Math.max(1, Math.min(3, ownedProvinces.length || 1));
    if (canRecruit && legions.length < recruitLimit) {
        const recruitProvince = [...ownedProvinces]
            .sort((left, right) => ((right.taxOutput || 0) + (right.grainOutput || 0)) - ((left.taxOutput || 0) + (left.grainOutput || 0)))[0];
        commands.push({
            type: 'RECRUIT',
            payload: {
                factionId,
                provinceId: recruitProvince.id,
                troops: recruitTroops,
            },
            _source: 'ai',
        });
    }

    if (legions.length > 0) {
        const sortedLegions = [...legions].sort((left, right) => (right.troops || 0) - (left.troops || 0));
        for (let i = 0; i < sortedLegions.length && commands.length < 2; i += 1) {
            const legion = sortedLegions[i];
            const currentProvince = campaignState.provinces?.[legion.currentProvinceId];
            if (!currentProvince) continue;

            if ((legion.supply || 0) < 35 || (legion.troops || 0) < 120) {
                commands.push({
                    type: 'FORTIFY',
                    payload: { factionId, legionId: legion.id, provinceId: legion.currentProvinceId },
                    _source: 'ai',
                });
                continue;
            }

            const neighborIds = Array.isArray(currentProvince.neighbors) ? currentProvince.neighbors : [];
            const enemyNeighbors = neighborIds
                .map((provinceId) => campaignState.provinces?.[provinceId])
                .filter((province) => province && province.ownerFactionId && province.ownerFactionId !== factionId);
            if (enemyNeighbors.length > 0) {
                const target = pickBySeed(enemyNeighbors, rngSeed + i + commands.length + 1);
                commands.push({
                    type: 'ATTACK_PROVINCE',
                    payload: { factionId, legionId: legion.id, targetProvinceId: target.id },
                    _source: 'ai',
                });
            } else {
                commands.push({
                    type: 'FORTIFY',
                    payload: { factionId, legionId: legion.id, provinceId: legion.currentProvinceId },
                    _source: 'ai',
                });
            }
        }
    }

    const context = { assignedFactionId: factionId, campaignState };
    return commands.filter((command) => validateTurnCommand(command, context).ok);
}
