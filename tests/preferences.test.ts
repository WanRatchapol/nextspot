import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  PreferencesSchema,
  BudgetBandSchema,
  TimeWindowSchema,
  MoodTagSchema,
  type UserPreferences
} from '@/types/preferences';
import { usePreferencesStore } from '@/lib/stores/preferences';

describe('Preferences Schema Validation', () => {
  describe('BudgetBandSchema', () => {
    it('should validate correct budget bands', () => {
      expect(BudgetBandSchema.parse('low')).toBe('low');
      expect(BudgetBandSchema.parse('mid')).toBe('mid');
      expect(BudgetBandSchema.parse('high')).toBe('high');
    });

    it('should reject invalid budget bands', () => {
      expect(() => BudgetBandSchema.parse('invalid')).toThrow();
      expect(() => BudgetBandSchema.parse('')).toThrow();
      expect(() => BudgetBandSchema.parse(null)).toThrow();
    });
  });

  describe('TimeWindowSchema', () => {
    it('should validate correct time windows', () => {
      expect(TimeWindowSchema.parse('evening')).toBe('evening');
      expect(TimeWindowSchema.parse('halfday')).toBe('halfday');
      expect(TimeWindowSchema.parse('fullday')).toBe('fullday');
    });

    it('should reject invalid time windows', () => {
      expect(() => TimeWindowSchema.parse('invalid')).toThrow();
      expect(() => TimeWindowSchema.parse('')).toThrow();
      expect(() => TimeWindowSchema.parse(null)).toThrow();
    });
  });

  describe('MoodTagSchema', () => {
    const validMoods = ['chill', 'adventure', 'foodie', 'cultural', 'social', 'romantic'];

    it('should validate correct mood tags', () => {
      validMoods.forEach(mood => {
        expect(MoodTagSchema.parse(mood)).toBe(mood);
      });
    });

    it('should reject invalid mood tags', () => {
      expect(() => MoodTagSchema.parse('invalid')).toThrow();
      expect(() => MoodTagSchema.parse('')).toThrow();
      expect(() => MoodTagSchema.parse(null)).toThrow();
    });
  });

  describe('PreferencesSchema', () => {
    it('should validate complete valid preferences', () => {
      const validPreferences: UserPreferences = {
        budgetBand: 'mid',
        moodTags: ['chill', 'foodie'],
        timeWindow: 'halfday'
      };

      const result = PreferencesSchema.parse(validPreferences);
      expect(result).toEqual(validPreferences);
    });

    it('should require at least one mood tag', () => {
      const invalidPreferences = {
        budgetBand: 'mid',
        moodTags: [],
        timeWindow: 'halfday'
      };

      expect(() => PreferencesSchema.parse(invalidPreferences)).toThrow();
    });

    it('should require all fields', () => {
      // Missing budgetBand
      expect(() => PreferencesSchema.parse({
        moodTags: ['chill'],
        timeWindow: 'halfday'
      })).toThrow();

      // Missing moodTags
      expect(() => PreferencesSchema.parse({
        budgetBand: 'mid',
        timeWindow: 'halfday'
      })).toThrow();

      // Missing timeWindow
      expect(() => PreferencesSchema.parse({
        budgetBand: 'mid',
        moodTags: ['chill']
      })).toThrow();
    });

    it('should provide Thai error message for empty mood tags', () => {
      const result = PreferencesSchema.safeParse({
        budgetBand: 'mid',
        moodTags: [],
        timeWindow: 'halfday'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const moodTagError = result.error.issues.find(issue => issue.path[0] === 'moodTags');
        expect(moodTagError?.message).toBe('เลือกอารมณ์อย่างน้อย 1 อย่าง');
      }
    });
  });
});

describe('Preferences Zustand Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { resetPreferences } = usePreferencesStore.getState();
    resetPreferences();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePreferencesStore());

    expect(result.current.budgetBand).toBe(null);
    expect(result.current.moodTags).toEqual([]);
    expect(result.current.timeWindow).toBe(null);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.validationErrors).toEqual({});
  });

  it('should set budget band', () => {
    const { result } = renderHook(() => usePreferencesStore());

    act(() => {
      result.current.setBudgetBand('mid');
    });

    expect(result.current.budgetBand).toBe('mid');
  });

  it('should toggle mood tags', () => {
    const { result } = renderHook(() => usePreferencesStore());

    // Add a mood tag
    act(() => {
      result.current.toggleMoodTag('chill');
    });
    expect(result.current.moodTags).toEqual(['chill']);

    // Add another mood tag
    act(() => {
      result.current.toggleMoodTag('foodie');
    });
    expect(result.current.moodTags).toEqual(['chill', 'foodie']);

    // Remove first mood tag
    act(() => {
      result.current.toggleMoodTag('chill');
    });
    expect(result.current.moodTags).toEqual(['foodie']);

    // Remove last mood tag
    act(() => {
      result.current.toggleMoodTag('foodie');
    });
    expect(result.current.moodTags).toEqual([]);
  });

  it('should set time window', () => {
    const { result } = renderHook(() => usePreferencesStore());

    act(() => {
      result.current.setTimeWindow('fullday');
    });

    expect(result.current.timeWindow).toBe('fullday');
  });

  it('should manage validation errors', () => {
    const { result } = renderHook(() => usePreferencesStore());

    const errors = { budgetBand: 'Required', moodTags: 'Required' };

    act(() => {
      result.current.setValidationErrors(errors);
    });
    expect(result.current.validationErrors).toEqual(errors);

    act(() => {
      result.current.clearValidationErrors();
    });
    expect(result.current.validationErrors).toEqual({});
  });

  it('should clear specific validation errors when values are set', () => {
    const { result } = renderHook(() => usePreferencesStore());

    const errors = {
      budgetBand: 'Required',
      moodTags: 'Required',
      timeWindow: 'Required'
    };

    act(() => {
      result.current.setValidationErrors(errors);
    });

    // Setting budget should clear budget error
    act(() => {
      result.current.setBudgetBand('mid');
    });
    expect(result.current.validationErrors).toEqual({
      moodTags: 'Required',
      timeWindow: 'Required'
    });

    // Adding mood tag should clear mood error
    act(() => {
      result.current.toggleMoodTag('chill');
    });
    expect(result.current.validationErrors).toEqual({
      timeWindow: 'Required'
    });

    // Setting time window should clear time error
    act(() => {
      result.current.setTimeWindow('halfday');
    });
    expect(result.current.validationErrors).toEqual({});
  });

  it('should validate completeness', () => {
    const { result } = renderHook(() => usePreferencesStore());

    // Initially invalid
    expect(result.current.isValid()).toBe(false);

    // Still invalid with only budget
    act(() => {
      result.current.setBudgetBand('mid');
    });
    expect(result.current.isValid()).toBe(false);

    // Still invalid with budget and mood
    act(() => {
      result.current.toggleMoodTag('chill');
    });
    expect(result.current.isValid()).toBe(false);

    // Valid when all fields are set
    act(() => {
      result.current.setTimeWindow('halfday');
    });
    expect(result.current.isValid()).toBe(true);
  });

  it('should get preferences object', () => {
    const { result } = renderHook(() => usePreferencesStore());

    // Initially empty
    expect(result.current.getPreferences()).toEqual({});

    // Set all preferences
    act(() => {
      result.current.setBudgetBand('high');
      result.current.toggleMoodTag('adventure');
      result.current.toggleMoodTag('cultural');
      result.current.setTimeWindow('fullday');
    });

    const preferences = result.current.getPreferences();
    expect(preferences).toEqual({
      budgetBand: 'high',
      moodTags: ['adventure', 'cultural'],
      timeWindow: 'fullday'
    });
  });

  it('should reset preferences', () => {
    const { result } = renderHook(() => usePreferencesStore());

    // Set some preferences
    act(() => {
      result.current.setBudgetBand('mid');
      result.current.toggleMoodTag('chill');
      result.current.setTimeWindow('evening');
      result.current.setValidationErrors({ test: 'error' });
      result.current.setSubmitting(true);
    });

    // Reset
    act(() => {
      result.current.resetPreferences();
    });

    // Should be back to initial state
    expect(result.current.budgetBand).toBe(null);
    expect(result.current.moodTags).toEqual([]);
    expect(result.current.timeWindow).toBe(null);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.validationErrors).toEqual({});
  });
});