import { describe, expect, it } from 'vitest';
import { THREE_KINGDOMS_FACTIONS, THREE_KINGDOMS_GENERALS, THREE_KINGDOMS_PROVINCES } from '../../src/config/three-kingdoms';
import { buildInitialCampaignState } from '../../src/logic/three-kingdoms/campaignState';
import { buildAiTurnCommands } from '../../src/logic/three-kingdoms/aiTurn';
import { validateTurnCommand } from '../../src/logic/three-kingdoms/commands';

describe('minimum ai turn command generator', () => {
    it('generates at least one valid command within three strategic turns', () => {
        const campaignState = buildInitialCampaignState({
            startYear: 190,
            factions: THREE_KINGDOMS_FACTIONS,
            provinces: THREE_KINGDOMS_PROVINCES,
            generals: THREE_KINGDOMS_GENERALS,
            assignedFactionId: 'cao_cao',
        });

        let totalCommands = 0;
        for (let i = 0; i < 3; i += 1) {
            const commands = buildAiTurnCommands(campaignState, 'yuan_shao', i + 1);
            totalCommands += commands.length;
            commands.forEach((command) => {
                const validation = validateTurnCommand(command, {
                    assignedFactionId: 'yuan_shao',
                    campaignState,
                });
                expect(validation.ok).toBe(true);
            });
        }

        expect(totalCommands).toBeGreaterThan(0);
    });
});
