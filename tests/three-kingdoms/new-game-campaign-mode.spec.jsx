import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DifficultySelectionModal } from '../../src/components/modals/DifficultySelectionModal';

describe('new game campaign mode entry', () => {
    it('shows campaign mode option', () => {
        render(
            <DifficultySelectionModal
                isOpen={true}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText('群雄战役')).toBeInTheDocument();
    });
});
