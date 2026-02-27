const seededRandom = (seedInput = Date.now()) => {
    let seed = Number(seedInput) || Date.now();
    seed %= 2147483647;
    if (seed <= 0) seed += 2147483646;
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

const legionPower = (legion = {}) => {
    const troops = Number(legion.troops || 0);
    const supply = Number(legion.supply || 0);
    const supplyFactor = Math.max(0.4, Math.min(1.2, supply / 100));
    return troops * supplyFactor;
};

export function resolveProvinceBattle({
    attacker = null,
    defenders = [],
    seed = Date.now(),
} = {}) {
    const attackerPower = legionPower(attacker);
    const defenderPower = defenders.reduce((sum, legion) => sum + legionPower(legion), 0);

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
