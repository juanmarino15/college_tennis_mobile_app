jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import cacheService from '../src/services/cacheService';

describe('cacheService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useFakeTimers().setSystemTime(new Date('2026-09-27T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('serves cached data until forceRefresh, then refetches and re-caches', async () => {
    const call = jest.fn().mockResolvedValueOnce('v1').mockResolvedValue('v2');
    expect(await cacheService.cachedCall('rankings', {a: 1}, call)).toBe('v1');
    expect(await cacheService.cachedCall('rankings', {a: 1}, call)).toBe('v1');
    expect(call).toHaveBeenCalledTimes(1);

    cacheService.forceRefresh();
    expect(await cacheService.cachedCall('rankings', {a: 1}, call)).toBe('v2');
    expect(call).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(16 * 1000); // refresh window over
    expect(await cacheService.cachedCall('rankings', {a: 1}, call)).toBe('v2');
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('expires match data after 5 minutes', async () => {
    const call = jest
      .fn()
      .mockResolvedValueOnce('old')
      .mockResolvedValue('new');
    await cacheService.cachedCall('matches', {id: 'm'}, call);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(await cacheService.cachedCall('matches', {id: 'm'}, call)).toBe(
      'new',
    );
  });

  it('prunes expired and corrupt entries only', async () => {
    await cacheService.set('matches', {id: 'old'}, 1);
    await cacheService.set('rankings', {id: 'keep'}, 2);
    await AsyncStorage.setItem('@tennis_cache:bad', '{not json');
    await AsyncStorage.setItem('unrelated', 'x');
    jest.advanceTimersByTime(10 * 60 * 1000);
    await cacheService.pruneExpired();
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual([
      '@tennis_cache:rankings:{"id":"keep"}',
      'unrelated',
    ]);
  });
});
