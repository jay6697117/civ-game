const PHASE_ORDER = ['SUPPLY', 'MOVEMENT', 'BATTLE', 'OCCUPATION', 'DIPLOMACY', 'EVENTS'];

export function resolveTurn(state, commandQueue = [], rngSeed = Date.now()) {
    return {
        phaseOrder: PHASE_ORDER,
        rngSeed,
        consumedCommands: Array.isArray(commandQueue) ? commandQueue.length : 0,
        statePatch: {},
        battleReports: [],
        diplomacyChanges: [],
        eventTriggers: [],
        logs: [],
        nextCampaignState: state?.campaignState || null,
    };
}

export { PHASE_ORDER as TURN_PHASE_ORDER };
