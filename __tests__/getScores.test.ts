jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('axios', () => ({
  create: () => ({
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
    interceptors: {response: {use: jest.fn()}},
  }),
}));

import {api} from '../src/api';

const notFound = () =>
  Object.assign(new Error('404'), {response: {status: 404}});

describe('api.matches.getScores', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
  });

  it('uses the batch endpoint in chunks of 50', async () => {
    const ids = Array.from({length: 120}, (_, i) => `m${i}`);
    mockPost.mockImplementation(async (_url: string, chunk: string[]) => ({
      data: Object.fromEntries(chunk.map(id => [id, {home_team_score: 1}])),
    }));
    const scores = await api.matches.getScores(ids);
    expect(Object.keys(scores)).toHaveLength(120);
    expect(
      mockPost.mock.calls.map(([url, chunk]) => [url, chunk.length]),
    ).toEqual([
      ['/batch/match-scores', 50],
      ['/batch/match-scores', 50],
      ['/batch/match-scores', 20],
    ]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('falls back to single requests and skips matches without a score', async () => {
    mockPost.mockRejectedValue(notFound()); // backend without batch router
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('fb2')) {
        throw notFound();
      }
      return {data: {home_team_score: 4, away_team_score: 3}};
    });
    const scores = await api.matches.getScores(['fb1', 'fb2', 'fb3']);
    expect(Object.keys(scores).sort()).toEqual(['fb1', 'fb3']);
  });
});
