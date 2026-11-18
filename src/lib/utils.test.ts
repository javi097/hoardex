import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('combines class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('resolves conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional classes properly', () => {
    const isHidden = false;
    expect(cn('block', isHidden && 'hidden')).toBe('block');
  });
});
