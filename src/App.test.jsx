import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('app test placeholder', () => {
    it('renders test text', () => {
        render(<div>Test</div>);
        expect(screen.getByText('Test')).toBeInTheDocument();
    });
});
