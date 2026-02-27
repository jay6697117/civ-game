const EVENT_IDS = {
    COALITION_CALL: 'event_190_coalition_call',
    CAPTURE_EMPEROR: 'event_190_capture_emperor',
};

const buildCoalitionEvent = (factionId) => {
    if (factionId === 'dong_zhuo') {
        return {
            id: EVENT_IDS.CAPTURE_EMPEROR,
            year: 190,
            title: '挟天子以令诸侯',
            summary: '朝廷权柄震荡，关东诸侯结盟讨伐。',
            effects: [
                { type: 'LEGITIMACY', value: 6 },
                { type: 'RELATION', target: 'coalition', value: -10 },
            ],
        };
    }

    return {
        id: EVENT_IDS.COALITION_CALL,
        year: 190,
        title: '关东诸侯会盟',
        summary: '袁绍发檄文号召讨董，天下局势全面升温。',
        effects: [
            { type: 'LEGITIMACY', value: 4 },
            { type: 'RELATION', target: 'dong_zhuo', value: -12 },
        ],
    };
};

export function resolveHistoricalEvents190({
    currentYear = 190,
    eventFlags = {},
    factionId = null,
    currentTurn = 1,
} = {}) {
    const nextEventFlags = { ...(eventFlags || {}) };
    const events = [];

    if (Number(currentYear) !== 190) {
        return { events, nextEventFlags };
    }

    if (!nextEventFlags.event_190_coalition_resolved && Number(currentTurn || 1) <= 2) {
        events.push(buildCoalitionEvent(factionId));
        nextEventFlags.event_190_coalition_resolved = true;
    }

    return {
        events,
        nextEventFlags,
    };
}

export { EVENT_IDS as THREE_KINGDOMS_EVENT_IDS_190 };
