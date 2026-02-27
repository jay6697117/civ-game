export const TURN_COMMAND_TYPES = [
    'MOVE_LEGION',
    'FORTIFY',
    'ATTACK_PROVINCE',
    'RECRUIT',
    'APPOINT_GENERAL',
    'NEGOTIATE',
    'END_TURN',
];

const commandRequirements = {
    MOVE_LEGION: ['legionId', 'toProvinceId'],
    FORTIFY: ['legionId', 'provinceId'],
    ATTACK_PROVINCE: ['legionId', 'targetProvinceId'],
    RECRUIT: ['provinceId', 'troops'],
    APPOINT_GENERAL: ['generalId', 'legionId'],
    NEGOTIATE: ['targetFactionId', 'action'],
    END_TURN: [],
};

export function validateTurnCommand(command) {
    if (!command || typeof command !== 'object') {
        return { ok: false, error: 'Command must be an object' };
    }

    const { type, payload = {} } = command;
    if (!TURN_COMMAND_TYPES.includes(type)) {
        return { ok: false, error: `Unknown command type: ${type || 'undefined'}` };
    }

    const requiredFields = commandRequirements[type] || [];
    for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
            return { ok: false, error: `Missing required payload field: ${field}` };
        }
    }

    return { ok: true };
}

export function issueTurnCommand(queue = [], command) {
    const validation = validateTurnCommand(command);
    if (!validation.ok) {
        return { ok: false, error: validation.error, queue };
    }

    const entry = {
        ...command,
        payload: { ...(command.payload || {}) },
        _id: command._id || `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    return {
        ok: true,
        queue: [...queue, entry],
        command: entry,
    };
}

export function removeTurnCommand(queue = [], commandRef) {
    if (typeof commandRef === 'number') {
        return queue.filter((_, index) => index !== commandRef);
    }
    const targetId = typeof commandRef === 'string' ? commandRef : commandRef?._id;
    if (!targetId) return queue;
    return queue.filter(entry => entry?._id !== targetId);
}
