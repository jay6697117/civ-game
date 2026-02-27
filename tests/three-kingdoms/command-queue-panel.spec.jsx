import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CampaignCommandQueuePanel } from '../../src/components/strategy-map/CampaignCommandQueuePanel';

describe('campaign command queue panel', () => {
    it('renders queue rows and supports removing one command', () => {
        const onRemove = vi.fn();
        render(
            <CampaignCommandQueuePanel
                daysElapsed={9}
                intervalDays={10}
                turnQueue={[
                    { _id: 'c1', type: 'MOVE_LEGION', payload: { legionId: 'l1', toProvinceId: 'xuzhou' } },
                    { _id: 'c2', type: 'FORTIFY', payload: { legionId: 'l2', provinceId: 'yanzhou' } },
                ]}
                onRemoveCommand={onRemove}
            />,
        );

        expect(screen.getByText('命令队列')).toBeInTheDocument();
        expect(screen.getByText('1 天后自动结算')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '删除 c1' }));
        expect(onRemove).toHaveBeenCalledWith('c1');
    });
});
