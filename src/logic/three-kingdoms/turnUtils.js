export function computeCampaignCountdown(daysElapsed, intervalDays = 10) {
    const safeInterval = Math.max(1, Number(intervalDays) || 10);
    const day = Math.max(0, Number(daysElapsed) || 0);
    const remainder = day % safeInterval;
    const daysUntilResolve = remainder === 0 ? safeInterval : safeInterval - remainder;

    return {
        intervalDays: safeInterval,
        daysElapsed: day,
        remainder,
        daysUntilResolve,
        nextResolveDay: day + daysUntilResolve,
        progress: remainder / safeInterval,
    };
}
