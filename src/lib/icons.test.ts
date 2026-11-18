import { describe, expect, it } from 'vitest';
import { getIcon, ICON_REGISTRY } from '@/lib/icons';
import { Gamepad2, LayoutGrid } from 'lucide-react';

describe('icons registry', () => {
  it('contains curated icons', () => {
    expect(ICON_REGISTRY.Gamepad2).toBe(Gamepad2);
    expect(Object.keys(ICON_REGISTRY).length).toBe(24);
  });

  it('returns requested icon when present', () => {
    expect(getIcon('Gamepad2')).toBe(Gamepad2);
  });

  it('falls back to LayoutGrid when icon is unknown', () => {
    expect(getIcon('UnknownIcon')).toBe(LayoutGrid);
  });
});
