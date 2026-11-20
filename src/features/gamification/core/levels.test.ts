import { describe, expect, it } from 'vitest';
import {
  XP_RULES,
  LEVEL_TITLES,
  getRequiredXpForLevel,
  calculateLevelProgress,
} from './levels';

describe('levels core logic', () => {
  it('defines the expected XP rules table', () => {
    expect(XP_RULES.ADD_ITEM).toBe(10);
    expect(XP_RULES.COMPLETE_ITEM).toBe(50);
    expect(XP_RULES.RATE_AND_REVIEW).toBe(25);
    expect(XP_RULES.COMPLETE_COLLECTION).toBe(100);
    expect(XP_RULES.DAILY_STREAK_BONUS).toBe(15);
  });

  describe('getRequiredXpForLevel', () => {
    it('calculates the step XP formula correctly for each level', () => {
      expect(getRequiredXpForLevel(1)).toBe(100);
      expect(getRequiredXpForLevel(2)).toBe(150);
      expect(getRequiredXpForLevel(3)).toBe(200);
      expect(getRequiredXpForLevel(4)).toBe(250);
      expect(getRequiredXpForLevel(5)).toBe(300);
    });

    it('safely handles non-positive or decimal inputs', () => {
      expect(getRequiredXpForLevel(0)).toBe(100);
      expect(getRequiredXpForLevel(-5)).toBe(100);
      expect(getRequiredXpForLevel(2.8)).toBe(150);
    });
  });

  describe('calculateLevelProgress', () => {
    it('returns Level 1 with 0% progress for 0 XP', () => {
      const progress = calculateLevelProgress(0);
      expect(progress.level).toBe(1);
      expect(progress.title).toBe('Iniciado');
      expect(progress.currentLevelXp).toBe(0);
      expect(progress.nextLevelXp).toBe(100);
      expect(progress.progressPercentage).toBe(0);
      expect(progress.totalXp).toBe(0);
    });

    it('handles boundaries inside Level 1', () => {
      const half = calculateLevelProgress(50);
      expect(half.level).toBe(1);
      expect(half.currentLevelXp).toBe(50);
      expect(half.progressPercentage).toBe(50);

      const almost = calculateLevelProgress(99);
      expect(almost.level).toBe(1);
      expect(almost.currentLevelXp).toBe(99);
      expect(almost.progressPercentage).toBe(99);
    });

    it('transitions to Level 2 at exactly 100 XP', () => {
      const level2 = calculateLevelProgress(100);
      expect(level2.level).toBe(2);
      expect(level2.title).toBe('Aprendiz de Coleccionista');
      expect(level2.currentLevelXp).toBe(0);
      expect(level2.nextLevelXp).toBe(150);
      expect(level2.progressPercentage).toBe(0);
      expect(level2.totalXp).toBe(100);
    });

    it('transitions to Level 3 at exactly 250 XP (100 + 150)', () => {
      const level3 = calculateLevelProgress(250);
      expect(level3.level).toBe(3);
      expect(level3.title).toBe('Catalogador Curioso');
      expect(level3.currentLevelXp).toBe(0);
      expect(level3.nextLevelXp).toBe(200);
      expect(level3.progressPercentage).toBe(0);
    });

    it('transitions to Level 5 at exactly 700 XP (100 + 150 + 200 + 250)', () => {
      const level5 = calculateLevelProgress(700);
      expect(level5.level).toBe(5);
      expect(level5.title).toBe('Archivista');
      expect(level5.currentLevelXp).toBe(0);
      expect(level5.nextLevelXp).toBe(300);
      expect(level5.progressPercentage).toBe(0);
    });

    it('handles multiple level jumps in a single step', () => {
      const jump = calculateLevelProgress(750);
      expect(jump.level).toBe(5);
      expect(jump.currentLevelXp).toBe(50);
      expect(jump.nextLevelXp).toBe(300);
      expect(jump.progressPercentage).toBe(16); // 50 / 300 = 16.66% -> 16%
    });

    it('assigns high level title "Leyenda de Hoardex" for level 10 and beyond', () => {
      // Level 10 starts at:
      // sum(100 + (i-1)*50 for i in 1..9) = 900 + 50 * 36 = 900 + 1800 = 2700 XP
      const level10 = calculateLevelProgress(2700);
      expect(level10.level).toBe(10);
      expect(level10.title).toBe(LEVEL_TITLES[10]);

      const level12 = calculateLevelProgress(4500);
      expect(level12.level).toBeGreaterThanOrEqual(10);
      expect(level12.title).toBe(LEVEL_TITLES[10]);
    });

    it('safely clamps negative XP to 0 XP', () => {
      const progress = calculateLevelProgress(-100);
      expect(progress.level).toBe(1);
      expect(progress.totalXp).toBe(0);
      expect(progress.progressPercentage).toBe(0);
    });
  });
});
