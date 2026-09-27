// src/utils/season.ts
// A season is named by the year it starts in: "2025" is the 2025-26 season.
// The backend decides which season is current (GET /seasons/current); the
// date rule below is only a fallback until that answer arrives.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from '../api';

// Seasons roll over in August (0-based month index)
export const SEASON_START_MONTH = 7;
const STORAGE_KEY = '@current_season_year';

let serverSeasonYear: string | null = null;

const seasonYearFromDate = (date: Date): string => {
  const year = date.getFullYear();
  return String(date.getMonth() >= SEASON_START_MONTH ? year : year - 1);
};

export const getCurrentSeasonYear = (): string =>
  serverSeasonYear ?? seasonYearFromDate(new Date());

/**
 * Load the current season: the last known answer first, then the backend's.
 * Call once at app start. Failures keep the fallback.
 */
export const initCurrentSeason = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && !serverSeasonYear) {
      serverSeasonYear = stored;
    }
  } catch {}
  try {
    const current = await api.seasons.getCurrent();
    if (current?.year) {
      serverSeasonYear = current.year;
      await AsyncStorage.setItem(STORAGE_KEY, current.year);
    }
  } catch (error) {
    console.log('Could not load current season, using date fallback:', error);
  }
};

export const getPreviousSeasonYear = (season: string): string =>
  String(Number(season.split('-')[0]) - 1);

export const getRecentSeasons = (count: number = 5): string[] => {
  const current = Number(getCurrentSeasonYear());
  return Array.from({length: count}, (_, i) => String(current - i));
};

const isEmptyResult = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0);

/**
 * Load data for the current season, falling back to the previous one when the
 * current season has no data yet (early in a new season, before rosters and
 * matches are collected). Resolves with the data and the season it came from.
 */
export const loadWithSeasonFallback = async <T>(
  load: (season: string) => Promise<T>,
): Promise<{data: T; season: string}> => {
  const current = getCurrentSeasonYear();
  try {
    const data = await load(current);
    if (!isEmptyResult(data)) {
      return {data, season: current};
    }
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      throw error;
    }
  }
  const previous = getPreviousSeasonYear(current);
  return {data: await load(previous), season: previous};
};
