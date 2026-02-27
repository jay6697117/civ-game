import { describe, expect, it } from 'vitest';
import { THREE_KINGDOMS_FACTIONS, THREE_KINGDOMS_PROVINCES } from '../../src/config/three-kingdoms';

describe('three kingdoms config', () => {
    it('contains 18 factions and 13 provinces', () => {
        expect(THREE_KINGDOMS_FACTIONS.length).toBe(18);
        expect(THREE_KINGDOMS_PROVINCES.length).toBe(13);
    });
});
