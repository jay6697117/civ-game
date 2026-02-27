import { describe, expect, it } from 'vitest';
import { issueTurnCommand, validateTurnCommand } from '../../src/logic/three-kingdoms/commands';

describe('turn commands', () => {
    it('rejects move command without legionId', () => {
        const result = validateTurnCommand({ type: 'MOVE_LEGION', payload: { toProvinceId: 'xuzhou' } });
        expect(result.ok).toBe(false);
    });

    it('appends valid command to queue', () => {
        const queue = [];
        const result = issueTurnCommand(queue, {
            type: 'FORTIFY',
            payload: { legionId: 'l_1', provinceId: 'yanzhou' },
        });

        expect(result.ok).toBe(true);
        expect(result.queue).toHaveLength(1);
    });
});
