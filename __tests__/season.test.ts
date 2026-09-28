jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockGetCurrent = jest.fn();
jest.mock('../src/api', () => ({
  api: {seasons: {getCurrent: () => mockGetCurrent()}},
}));

const notFound = () =>
  Object.assign(new Error('404'), {response: {status: 404}});

describe('season helper', () => {
  let season: typeof import('../src/utils/season');
  let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;

  beforeEach(async () => {
    jest.resetModules();
    // Same module instance the helper sees after the reset
    AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    mockGetCurrent.mockReset();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-27T12:00:00'));
    season = require('../src/utils/season');
  });

  afterEach(() => jest.useRealTimers());

  it('falls back to the date rule before the backend answers', () => {
    expect(season.getCurrentSeasonYear()).toBe('2026');
    jest.setSystemTime(new Date('2026-03-01T12:00:00'));
    expect(season.getCurrentSeasonYear()).toBe('2025');
  });

  it('uses and persists the backend season', async () => {
    mockGetCurrent.mockResolvedValue({year: '2025'});
    await season.initCurrentSeason();
    expect(season.getCurrentSeasonYear()).toBe('2025');
    expect(season.getRecentSeasons(3)).toEqual(['2025', '2024', '2023']);
    expect(await AsyncStorage.getItem('@current_season_year')).toBe('2025');
  });

  it('keeps the last known season when the backend fails', async () => {
    await AsyncStorage.setItem('@current_season_year', '2024');
    mockGetCurrent.mockRejectedValue(notFound());
    await season.initCurrentSeason();
    expect(season.getCurrentSeasonYear()).toBe('2024');
  });

  it('falls back to the previous season when the current one is empty or 404', async () => {
    const load = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['row']);
    await expect(season.loadWithSeasonFallback(load)).resolves.toEqual({
      data: ['row'],
      season: '2025',
    });
    expect(load.mock.calls).toEqual([['2026'], ['2025']]);

    const load404 = jest
      .fn()
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce({team: 1});
    await expect(season.loadWithSeasonFallback(load404)).resolves.toEqual({
      data: {team: 1},
      season: '2025',
    });
  });

  it('does not hide real errors', async () => {
    const boom = Object.assign(new Error('500'), {response: {status: 500}});
    await expect(
      season.loadWithSeasonFallback(jest.fn().mockRejectedValue(boom)),
    ).rejects.toBe(boom);
  });
});
