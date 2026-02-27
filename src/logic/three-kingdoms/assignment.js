const FALLBACK_ALLOWED_TIERS = ['A', 'B', 'C'];

const seededRandom = (seedInput = Date.now()) => {
    let seed = Number(seedInput) || Date.now();
    seed %= 2147483647;
    if (seed <= 0) seed += 2147483646;
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

export function assignRandomFactionByTier({
    factions = [],
    allowedTiers = FALLBACK_ALLOWED_TIERS,
    seed,
} = {}) {
    const tierSet = new Set(Array.isArray(allowedTiers) && allowedTiers.length > 0
        ? allowedTiers
        : FALLBACK_ALLOWED_TIERS);

    const candidates = factions.filter((faction) => tierSet.has(faction.tier));
    if (candidates.length === 0) {
        throw new Error('No faction candidates matched allowed tiers');
    }

    const random = seededRandom(seed);
    const index = Math.floor(random * candidates.length) % candidates.length;
    return candidates[index];
}

export function rerollAssignedFaction({ factions = [], allowedTiers = FALLBACK_ALLOWED_TIERS } = {}) {
    return assignRandomFactionByTier({
        factions,
        allowedTiers,
        seed: Date.now(),
    });
}
