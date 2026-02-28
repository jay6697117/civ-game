import { validateTurnCommand } from './commands';

const MAX_AI_COMMANDS_PER_TURN = 2;
const KEY_PROVINCES = new Set(['sili', 'jingzhou']);

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

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const computeProvinceThreat = (campaignState = {}, province = {}, factionId = null) => {
    const neighbors = ensureArray(province.neighbors)
        .map((id) => campaignState.provinces?.[id])
        .filter(Boolean);
    const enemyNeighbors = neighbors.filter((neighbor) => neighbor.ownerFactionId !== factionId);
    const enemyLegionsNearby = Object.values(campaignState.legions || {}).filter((legion) => (
        enemyNeighbors.some((neighbor) => neighbor.id === legion.currentProvinceId)
        && legion.factionId !== factionId
    ));
    return (enemyNeighbors.length * 30) + (enemyLegionsNearby.length * 20);
};

const pickKeyAttackTarget = (campaignState = {}, factionId, legion, rngSeed) => {
    const currentProvince = campaignState.provinces?.[legion.currentProvinceId];
    const neighbors = ensureArray(currentProvince?.neighbors)
        .map((id) => campaignState.provinces?.[id])
        .filter(Boolean)
        .filter((province) => province.ownerFactionId && province.ownerFactionId !== factionId);

    if (neighbors.length === 0) return null;

    const ranked = neighbors
        .map((province) => ({
            province,
            score: (province.taxOutput || 0)
                + (province.grainOutput || 0)
                + (KEY_PROVINCES.has(province.id) ? 120 : 0),
        }))
        .sort((left, right) => right.score - left.score);

    const topScore = ranked[0]?.score || 0;
    const candidates = ranked.filter((entry) => entry.score >= topScore - 30).map((entry) => entry.province);
    return pickBySeed(candidates, rngSeed);
};

const appendIfValid = (commands = [], command, context) => {
    if (!command) return commands;
    const validation = validateTurnCommand(command, context);
    if (!validation.ok) return commands;
    return [...commands, command];
};

export function buildAiTurnCommands(campaignState = {}, factionId, rngSeed = Date.now()) {
    if (!factionId || !campaignState?.factions?.[factionId]) return [];

    const faction = campaignState.factions[factionId];
    const provinces = Object.values(campaignState.provinces || {});
    const legions = Object.values(campaignState.legions || {})
        .filter((legion) => legion.factionId === factionId)
        .sort((left, right) => (right.troops || 0) - (left.troops || 0));
    const ownedProvinces = provinces.filter((province) => province.ownerFactionId === factionId);

    const context = { assignedFactionId: factionId, campaignState };
    let commands = [];

    // 1) Logistics fallback
    const lowReadiness = legions.find((legion) => (legion.supply || 0) < 35 || (legion.fatigue || 0) > 70 || (legion.troops || 0) < 120);
    if (lowReadiness) {
        commands = appendIfValid(commands, {
            type: 'FORTIFY',
            payload: {
                factionId,
                legionId: lowReadiness.id,
                provinceId: lowReadiness.currentProvinceId,
            },
            _source: 'ai',
        }, context);
    }

    // 2) Threat response + 3) key province attack
    const threatRanked = ownedProvinces
        .map((province) => ({ province, threat: computeProvinceThreat(campaignState, province, factionId) }))
        .sort((left, right) => right.threat - left.threat);

    const highThreat = threatRanked[0];
    const attacker = legions.find((legion) => (
        campaignState.provinces?.[legion.currentProvinceId]
        && ensureArray(campaignState.provinces?.[legion.currentProvinceId]?.neighbors).some((id) => {
            const neighbor = campaignState.provinces?.[id];
            return neighbor && neighbor.ownerFactionId !== factionId;
        })
    ));

    if (attacker && commands.length < MAX_AI_COMMANDS_PER_TURN) {
        const attackTarget = pickKeyAttackTarget(campaignState, factionId, attacker, rngSeed + commands.length + 1);
        if (attackTarget && (attacker.troops || 0) >= 140 && (attacker.supply || 0) >= 40) {
            commands = appendIfValid(commands, {
                type: 'ATTACK_PROVINCE',
                payload: {
                    factionId,
                    legionId: attacker.id,
                    targetProvinceId: attackTarget.id,
                },
                _source: 'ai',
            }, context);
        } else if (highThreat?.province && commands.length < MAX_AI_COMMANDS_PER_TURN) {
            const reserve = legions.find((legion) => legion.currentProvinceId === highThreat.province.id);
            if (reserve) {
                commands = appendIfValid(commands, {
                    type: 'FORTIFY',
                    payload: {
                        factionId,
                        legionId: reserve.id,
                        provinceId: reserve.currentProvinceId,
                    },
                    _source: 'ai',
                }, context);
            }
        }
    }

    // 4) idle drill or recruit fallback
    if (commands.length < MAX_AI_COMMANDS_PER_TURN && legions.length > 0) {
        const drillTarget = legions.find((legion) => (
            (legion.supply || 0) >= 45
            && (legion.fatigue || 0) <= 55
            && (campaignState.provinces?.[legion.currentProvinceId]?.ownerFactionId === factionId)
        ));

        if (drillTarget) {
            commands = appendIfValid(commands, {
                type: 'DRILL_LEGION',
                payload: {
                    factionId,
                    legionId: drillTarget.id,
                    provinceId: drillTarget.currentProvinceId,
                },
                _source: 'ai',
            }, context);
        }
    }

    if (commands.length < MAX_AI_COMMANDS_PER_TURN) {
        const canRecruit = ownedProvinces.length > 0
            && (faction.treasury || 0) >= 120
            && (faction.grain || 0) >= 60;

        if (canRecruit) {
            const recruitProvince = [...ownedProvinces]
                .sort((left, right) => ((right.taxOutput || 0) + (right.grainOutput || 0)) - ((left.taxOutput || 0) + (left.grainOutput || 0)))[0];
            commands = appendIfValid(commands, {
                type: 'RECRUIT',
                payload: {
                    factionId,
                    provinceId: recruitProvince.id,
                    troops: 120,
                },
                _source: 'ai',
            }, context);
        }
    }

    return commands.slice(0, MAX_AI_COMMANDS_PER_TURN);
}
