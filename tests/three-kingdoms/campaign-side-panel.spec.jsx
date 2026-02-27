import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampaignSidePanel } from '../../src/components/strategy-map/CampaignSidePanel';

const buildState = () => ({
    factions: {
        cao_cao: { id: 'cao_cao', name: '曹操' },
        tao_qian: { id: 'tao_qian', name: '陶谦' },
    },
    provinces: {
        yanzhou: {
            id: 'yanzhou',
            name: '兖州',
            ownerFactionId: 'cao_cao',
            neighbors: ['xuzhou'],
            garrison: [{ id: 'g1', factionId: 'cao_cao', troops: 120, supply: 70, morale: 60, stance: 'DEFEND' }],
        },
        xuzhou: {
            id: 'xuzhou',
            name: '徐州',
            ownerFactionId: 'tao_qian',
            neighbors: ['yanzhou'],
            garrison: [{ id: 'g2', factionId: 'tao_qian', troops: 100, supply: 65, morale: 58, stance: 'DEFEND' }],
        },
    },
    legions: {
        l1: { id: 'l1', factionId: 'cao_cao', currentProvinceId: 'yanzhou', troops: 260, supply: 80, morale: 75, stance: 'BALANCED' },
    },
});

describe('campaign side panel', () => {
    it('shows recruit and command actions for selected province', () => {
        const onQueueCommand = vi.fn(() => ({ _id: 'mocked' }));
        render(
            <CampaignSidePanel
                campaignState={buildState()}
                selectedProvinceId="yanzhou"
                assignedFactionId="cao_cao"
                selectedLegionId="l1"
                onSelectLegion={vi.fn()}
                onQueueCommand={onQueueCommand}
                onNotify={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '招募 120 兵' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'RECRUIT' }));
        fireEvent.click(screen.getByRole('button', { name: '攻打 徐州' }));
        expect(onQueueCommand).toHaveBeenCalledWith(expect.objectContaining({ type: 'ATTACK_PROVINCE' }));
    });
});
