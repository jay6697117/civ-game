const seededRandom = (seedInput = Date.now()) => {
    let seed = Number(seedInput) || Date.now();
    seed %= 2147483647;
    if (seed <= 0) seed += 2147483646;
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getStanceFactor = (stance = 'BALANCED', mode = 'attack') => {
    if (stance === 'AGGRESSIVE') {
        return mode === 'attack' ? 1.15 : 0.9;
    }
    if (stance === 'DEFENSIVE') {
        return mode === 'attack' ? 0.92 : 1.12;
    }
    return 1;
};

const getGeneralFactor = (legion = {}, generals = {}) => {
    const generalId = legion?.generalId;
    if (!generalId) return 1;
    const leadership = Number(generals?.[generalId]?.leadership || 70);
    return 1 + ((leadership - 70) * 0.003);
};

const legionPower = (legion = {}, { mode = 'attack', generals = {} } = {}) => {
    const troops = Number(legion.troops || 0);
    const supply = Number(legion.supply || 0);
    const morale = Number(legion.morale || 70);
    const level = Number(legion.level || 1);
    const supplyFactor = clamp(supply / 100, 0.4, 1.2);
    const moraleFactor = clamp(morale / 100, 0.5, 1.15);
    const stanceFactor = getStanceFactor(legion.stance || 'BALANCED', mode);
    const levelFactor = 1 + (Math.min(Math.max(level - 1, 0), 9) * 0.04);
    const generalFactor = getGeneralFactor(legion, generals);
    return troops * supplyFactor * moraleFactor * stanceFactor * levelFactor * generalFactor;
};

export function resolveProvinceBattle({
    attacker = null,
    defenders = [],
    seed = Date.now(),
    generals = {},
} = {}) {
    const attackerPower = legionPower(attacker, { mode: 'attack', generals });
    const defenderPower = defenders.reduce((sum, legion) => sum + legionPower(legion, { mode: 'defense', generals }), 0);

    if (defenderPower <= 0) {
        return {
            attackerWon: true,
            attackerLossRatio: 0.05,
            defenderLossRatio: 1,
            attackerPower,
            defenderPower,
        };
    }

    const randomFactor = 0.85 + seededRandom(seed) * 0.3;
    const adjustedAttackerPower = attackerPower * randomFactor;
    const attackerWon = adjustedAttackerPower >= defenderPower;

    return {
        attackerWon,
        attackerLossRatio: attackerWon ? 0.15 : 0.4,
        defenderLossRatio: attackerWon ? 0.45 : 0.2,
        attackerPower,
        defenderPower,
    };
}
