import { describe, expect, it } from 'vitest';
import { getDaysDifference, calculateStreak } from './streaks';

describe('streaks core logic', () => {
  describe('getDaysDifference', () => {
    it('returns 0 for identical dates', () => {
      expect(getDaysDifference('2026-11-20', '2026-11-20')).toBe(0);
    });

    it('returns 1 for consecutive days', () => {
      expect(getDaysDifference('2026-11-19', '2026-11-20')).toBe(1);
    });

    it('returns negative when endDate is before startDate', () => {
      expect(getDaysDifference('2026-11-20', '2026-11-19')).toBe(-1);
    });

    it('calculates month boundaries correctly', () => {
      // Fin de febrero en año no bisiesto
      expect(getDaysDifference('2026-02-28', '2026-03-01')).toBe(1);
      // Fin de mes de 30 días
      expect(getDaysDifference('2026-04-30', '2026-05-01')).toBe(1);
    });

    it('calculates year boundaries correctly', () => {
      expect(getDaysDifference('2026-12-31', '2027-01-01')).toBe(1);
      expect(getDaysDifference('2026-12-30', '2027-01-01')).toBe(2);
    });
  });

  describe('calculateStreak', () => {
    it('initializes streak to 1 when there is no prior activity', () => {
      const result = calculateStreak(0, 0, null, '2026-11-20');
      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: '2026-11-20',
        isExtended: true,
      });
    });

    it('preserves existing longestStreak on fresh initialization', () => {
      const result = calculateStreak(0, 7, null, '2026-11-20');
      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 7,
        lastActivityDate: '2026-11-20',
        isExtended: true,
      });
    });

    it('does not increment streak on repeated activity on the same day', () => {
      const result = calculateStreak(3, 5, '2026-11-20', '2026-11-20');
      expect(result).toEqual({
        currentStreak: 3,
        longestStreak: 5,
        lastActivityDate: '2026-11-20',
        isExtended: false,
      });
    });

    it('extends streak by 1 on consecutive days', () => {
      const result = calculateStreak(3, 5, '2026-11-19', '2026-11-20');
      expect(result).toEqual({
        currentStreak: 4,
        longestStreak: 5,
        lastActivityDate: '2026-11-20',
        isExtended: true,
      });
    });

    it('updates longestStreak when currentStreak surpasses it', () => {
      const result = calculateStreak(5, 5, '2026-11-19', '2026-11-20');
      expect(result).toEqual({
        currentStreak: 6,
        longestStreak: 6,
        lastActivityDate: '2026-11-20',
        isExtended: true,
      });
    });

    it('resets currentStreak to 1 when streak is broken (diff > 1)', () => {
      const result = calculateStreak(10, 10, '2026-11-15', '2026-11-20');
      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 10,
        lastActivityDate: '2026-11-20',
        isExtended: true,
      });
    });

    it('handles consecutive streak across month boundary correctly', () => {
      const result = calculateStreak(4, 4, '2026-02-28', '2026-03-01');
      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 5,
        lastActivityDate: '2026-03-01',
        isExtended: true,
      });
    });

    it('handles consecutive streak across year boundary correctly', () => {
      const result = calculateStreak(14, 14, '2026-12-31', '2027-01-01');
      expect(result).toEqual({
        currentStreak: 15,
        longestStreak: 15,
        lastActivityDate: '2027-01-01',
        isExtended: true,
      });
    });
  });
});
