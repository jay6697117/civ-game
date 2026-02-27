export const CAMPAIGN_DIPLOMACY_ACTIONS = [
    { id: 'FORM_ALLIANCE', label: '提议结盟' },
    { id: 'OFFER_TRUCE', label: '提出停战' },
    { id: 'DEMAND_TRIBUTE', label: '索要朝贡' },
    { id: 'THREATEN', label: '军事威慑' },
];

const getRelationValue = (factions, fromFactionId, targetFactionId) => {
    const fromFaction = factions?.[fromFactionId];
    const relation = fromFaction?.relations?.[targetFactionId];
    return Number.isFinite(relation) ? relation : 50;
};

export function getCampaignDiplomacyTargets({
    campaignState = {},
    assignedFactionId = null,
} = {}) {
    const factions = campaignState?.factions || {};
    const myFactionId = assignedFactionId || campaignState?.assignedFactionId || null;
    if (!myFactionId || !factions[myFactionId]) return [];

    return Object.values(factions)
        .filter((faction) => faction?.id && faction.id !== myFactionId)
        .map((faction) => ({
            id: faction.id,
            name: faction.name || faction.id,
            relation: getRelationValue(factions, myFactionId, faction.id),
            tier: faction.tier || 'C',
        }))
        .sort((left, right) => right.relation - left.relation);
}

export function buildCampaignDiplomacyCommand({
    assignedFactionId,
    targetFactionId,
    action,
} = {}) {
    if (!assignedFactionId || !targetFactionId || !action) return null;
    return {
        type: 'NEGOTIATE',
        payload: {
            factionId: assignedFactionId,
            targetFactionId,
            action,
        },
    };
}

export function queueCampaignDiplomacyAction({
    queueTurnCommand,
    assignedFactionId,
    targetFactionId,
    action,
} = {}) {
    if (typeof queueTurnCommand !== 'function') return null;
    const command = buildCampaignDiplomacyCommand({
        assignedFactionId,
        targetFactionId,
        action,
    });
    if (!command) return null;
    return queueTurnCommand(command);
}
