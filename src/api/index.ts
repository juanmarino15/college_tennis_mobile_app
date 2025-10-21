// src/api/index.ts
import axios from 'axios';
import type {AxiosResponse} from 'axios';
import {Alert} from 'react-native';
import cacheService from '../services/cacheService';

// Base URL should come from environment config
const BASE_URL = 'https://shark-app-bei8p.ondigitalocean.app/api/v1';
// const BASE_URL = 'http://localhost:8000/api/v1';

// API response interfaces
export interface Team {
  id: string;
  name: string;
  abbreviation?: string;
  division?: string;
  conference?: string;
  region?: string;
  typename?: string;
  gender?: string;
}

export interface Player {
  person_id: string;
  tennis_id?: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export interface Match {
  id: string;
  start_date: string;
  timezone?: string;
  no_scheduled_time: boolean;
  is_conference_match: boolean;
  gender: string;
  home_team_id?: string;
  away_team_id?: string;
  season: string;
  completed: boolean;
  scheduled_time?: string;
}

export interface MatchLineup {
  id: string;
  match_id: string;
  match_type: string;
  position: number;
  side1_player1_id: string;
  side1_player2_id?: string;
  side1_score: string;
  side1_won: boolean;
  side2_player1_id: string;
  side2_player2_id?: string;
  side2_score: string;
  side2_won: boolean;
}

export interface MatchScore {
  home_team_score: number;
  away_team_score: number;
  home_team_won?: boolean;
  away_team_won?: boolean;
}

export interface TeamStats {
  total_wins: number;
  total_losses: number;
  conference_wins: number;
  conference_losses: number;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
}

export interface PlayerStats {
  singles_wins: number;
  singles_losses: number;
  singles_win_pct: number;
  doubles_wins: number;
  doubles_losses: number;
  doubles_win_pct: number;
  wtn_singles?: number;
  wtn_doubles?: number;
}

export interface PlayerTeam {
  team_id: string;
  team_name: string;
  abbreviation?: string;
  conference?: string;
  gender?: string;
}

export interface PlayerPosition {
  position: number;
  matches_count: number;
  wins: number;
  losses: number;
}

export interface PlayerPositions {
  singles: PlayerPosition[];
  doubles: PlayerPosition[];
}

export interface PlayerMatchResult {
  id: string;
  match_id: string;
  date: string;
  opponent_name: string;
  opponent_team_id?: string;
  is_home: boolean;
  match_type: string;
  position: number;
  score: string;
  won: boolean;
  partner_name?: string;
  opponent_name1: string;
  opponent_name2?: string;
}

export interface PlayerSearchResult {
  person_id: string;
  tennis_id?: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  team_id?: string;
  team_name?: string;
  gender?: string;
  conference?: string;
  division?: string;
  season_name?: string;
  season_id?: string;
  school_name?: string;
  school_id?: string;
  wtn_singles?: number;
  wtn_doubles?: number;
}

export interface PlayerWTN {
  person_id: string;
  tennis_id: string;
  season_id: string;
  wtn_type: string; // "SINGLES" or "DOUBLES"
  confidence: number;
  tennis_number: number;
  is_ranked: boolean;
}

export interface Season {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface RankingList {
  id: string;
  division_type: string;
  gender: string;
  match_format: string;
  publish_date?: string;
  planned_publish_date?: string;
  date_range_start: string;
  date_range_end: string;
}

export interface TeamRanking {
  team_id: string;
  ranking_list_id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  team_name: string;
  conference?: string;
}

export interface PlayerRanking {
  player_id: string;
  team_id: string;
  ranking_list_id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  player_name: string;
  team_name: string;
  conference?: string;
}

export interface DoublesRanking {
  team_id: string;
  player1_id: string;
  player2_id: string;
  ranking_list_id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  player1_name: string;
  player2_name: string;
  team_name: string;
  conference?: string;
}

export interface Tournament {
  tournament_id: string;
  name: string;
  start_date_time: string;
  end_date_time: string;
  location_name: string;
  organization_name: string;
  organization_division?: string;
  tournament_type: string;
  draws_count: number;
  events: string[];
}

export interface TournamentsResponse {
  tournaments: Tournament[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface TournamentDraw {
  draw_id: string;
  tournament_id: string;
  event_id: string;
  draw_name: string;
  draw_type: string;
  draw_size: number;
  event_type: string;
  gender: string;
  draw_completed: boolean;
  draw_active: boolean;
  match_up_format: string;
  stage?: string;
}

export interface TournamentWithDraws {
  tournament_id: string;
  name: string;
  start_date_time: string;
  end_date_time: string;
  location_name: string;
  organization_name: string;
  tournament_type: string;
  draws: TournamentDraw[];
}

export interface TournamentMatchParticipant {
  participant_id?: string;
  participant_name?: string;
  draw_position?: number;
  seed_number?: number;
  school_name?: string;
  school_id?: string;
  player1_id?: string;
  player1_name?: string;
  player2_id?: string;
  player2_name?: string;
}

export interface TournamentMatch {
  id: number;
  match_up_id: string;
  draw_id: string;
  tournament_id: string;
  event_id: string;
  round_name: string;
  round_number: number;
  round_position: number;
  match_type: string;
  match_format: string;
  match_status: string;
  side1: TournamentMatchParticipant;
  side2: TournamentMatchParticipant;
  winning_side?: number;
  winner_participant_id?: string;
  winner_participant_name?: string;
  score_side1?: string;
  score_side2?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  venue_name?: string;
}

export interface TournamentDrawDetails {
  draw_id: string;
  tournament_id: string;
  event_id: string;
  draw_name: string;
  draw_type: string;
  draw_size: number;
  event_type: string;
  gender: string;
  draw_completed: boolean;
  draw_active: boolean;
  match_up_format: string;
  tournament?: any;
  matches: TournamentMatch[];
  total_matches: number;
  completed_matches: number;
  scheduled_matches: number;
  participants_count: number;
}

export interface TeamBatchRequest {
  team_ids: string[];
}

export interface TeamLogoBatchResponse {
  logos: {[teamId: string]: string}; // team_id -> base64 encoded logo
}

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 50000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    const {response} = error;

    if (response) {
      const url = error.config?.url || '';

      // Don't show alerts for 404 errors on player-specific season data
      // These are expected when a player has no data for a specific season
      if (response.status === 404) {
        console.log('No data found (404):', url);
        return Promise.reject(error);
      }

      // Don't show alerts for 500 errors on positions endpoint
      // This often happens when there's no position data for a season
      if (response.status === 500 && url.includes('/positions')) {
        console.log('No position data available (500):', url);
        return Promise.reject(error);
      }

      // Don't show alerts for empty responses (common when no season data)
      if (
        response.status === 200 &&
        (!response.data ||
          (Array.isArray(response.data) && response.data.length === 0))
      ) {
        console.log('Empty data received:', url);
        return Promise.reject(error);
      }

      // Only show alerts for actual unexpected errors
      if (response.status >= 500 && !url.includes('/positions')) {
        Alert.alert(
          'Server Error',
          'Something went wrong on our end. Please try again later.',
        );
      } else if (response.status === 401) {
        Alert.alert('Unauthorized', 'Please log in to continue.');
      } else if (response.status === 403) {
        Alert.alert(
          'Access Denied',
          "You don't have permission to access this resource.",
        );
      } else if (response.status === 400) {
        const errorMessage = response.data?.message || 'Invalid request';
        Alert.alert('Error', errorMessage);
      }
    } else if (error.request) {
      // Only show network errors
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection.',
      );
    }

    return Promise.reject(error);
  },
);

// API endpoints with caching
export const api = {
  // Matches endpoints
  matches: {
    getAll: async (date?: string): Promise<Match[]> => {
      const params = date ? {date} : {};
      return cacheService.cachedCall('matches', params, async () => {
        const response: AxiosResponse<Match[]> = await apiClient.get(
          '/matches',
          {params},
        );
        return response.data;
      });
    },

    getById: async (id: string): Promise<Match> => {
      return cacheService.cachedCall('matches', {id}, async () => {
        const response: AxiosResponse<Match> = await apiClient.get(
          `/matches/${id}`,
        );
        return response.data;
      });
    },

    getLineup: async (id: string): Promise<MatchLineup[]> => {
      return cacheService.cachedCall(
        'matches',
        {id, type: 'lineup'},
        async () => {
          const response: AxiosResponse<MatchLineup[]> = await apiClient.get(
            `/matches/${id}/lineup`,
          );
          return response.data;
        },
      );
    },

    getScore: async (id: string): Promise<MatchScore> => {
      return cacheService.cachedCall(
        'matches',
        {id, type: 'score'},
        async () => {
          const response: AxiosResponse<MatchScore> = await apiClient.get(
            `/matches/${id}/score`,
          );
          return response.data;
        },
      );
    },

    getAllByTeam: async (teamId: string, season?: string): Promise<Match[]> => {
      const params: any = {team_id: teamId};
      if (season) {
        params.season = season;
      }

      return cacheService.cachedCall('matches', {teamId, season}, async () => {
        try {
          const response: AxiosResponse<Match[]> = await apiClient.get(
            `/matches/by-team/${teamId}`,
            {params: season ? {season} : {}},
          );
          return response.data;
        } catch (routeError) {
          console.log(
            'Dedicated team matches endpoint not available, using fallback',
          );
          const allMatches: AxiosResponse<Match[]> = await apiClient.get(
            '/matches',
            {params},
          );
          return allMatches.data;
        }
      });
    },
  },

  // Teams endpoints
  teams: {
    getAll: async (params = {}): Promise<Team[]> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'teams', ...params},
        async () => {
          const response: AxiosResponse<Team[]> = await apiClient.get(
            '/teams',
            {params},
          );
          return response.data;
        },
      );
    },

    getById: async (id: string): Promise<Team> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'team', id},
        async () => {
          const response: AxiosResponse<Team> = await apiClient.get(
            `/teams/${id}`,
          );
          return response.data;
        },
      );
    },

    getBatch: async (teamIds: string[]): Promise<Team[]> => {
      return cacheService.cachedCall(
        'batch',
        {type: 'teams', teamIds},
        async () => {
          try {
            const response: AxiosResponse<Team[]> = await apiClient.post(
              '/teams/batch',
              {team_ids: teamIds},
            );
            return response.data;
          } catch (error) {
            console.error('Failed to fetch teams batch:', error);
            console.log(
              'Batch endpoint failed, falling back to individual requests',
            );
            const teams = await Promise.all(
              teamIds.map(id => api.teams.getById(id)),
            );
            return teams;
          }
        },
      );
    },

    getLogo: (id: string): string => {
      return `${BASE_URL}/teams/${id}/logo`;
    },

    getLogosBatch: async (
      teamIds: string[],
    ): Promise<TeamLogoBatchResponse> => {
      return cacheService.cachedCall(
        'batch',
        {type: 'logos', teamIds},
        async () => {
          try {
            const response: AxiosResponse<TeamLogoBatchResponse> =
              await apiClient.post('/teams/logos/batch', {team_ids: teamIds});
            return response.data;
          } catch (error) {
            console.error('Failed to fetch logos batch:', error);
            return {logos: {}};
          }
        },
      );
    },

    getRoster: async (id: string, year?: string): Promise<Player[]> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'roster', id, year},
        async () => {
          const params = year ? {year} : {};
          const response: AxiosResponse<Player[]> = await apiClient.get(
            `/teams/${id}/roster`,
            {params},
          );
          return response.data;
        },
      );
    },
  },

  // Players endpoints
  players: {
    getAll: async (teamId?: string): Promise<Player[]> => {
      const params = teamId ? {team_id: teamId} : {};
      return cacheService.cachedCall(
        'profiles',
        {type: 'players', ...params},
        async () => {
          const response: AxiosResponse<Player[]> = await apiClient.get(
            '/players',
            {params},
          );
          return response.data;
        },
      );
    },

    getById: async (id: string): Promise<Player> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'player', id},
        async () => {
          const response: AxiosResponse<Player> = await apiClient.get(
            `/players/${id}`,
          );
          return response.data;
        },
      );
    },

    getTeam: async (id: string, season?: string): Promise<PlayerTeam> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'playerTeam', id, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<PlayerTeam> = await apiClient.get(
            `/players/${id}/team`,
            {params},
          );
          return response.data;
        },
      );
    },

    getStats: async (id: string, season?: string): Promise<PlayerStats> => {
      return cacheService.cachedCall(
        'stats',
        {type: 'player', id, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<PlayerStats> = await apiClient.get(
            `/players/${id}/stats`,
            {params},
          );
          return response.data;
        },
      );
    },

    getPositions: async (
      id: string,
      season?: string,
    ): Promise<PlayerPositions> => {
      return cacheService.cachedCall(
        'stats',
        {type: 'positions', id, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<PlayerPositions> = await apiClient.get(
            `/players/${id}/positions`,
            {params},
          );
          return response.data;
        },
      );
    },

    getMatchResults: async (
      id: string,
      season?: string,
    ): Promise<PlayerMatchResult[]> => {
      return cacheService.cachedCall(
        'matches',
        {type: 'playerResults', id, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<PlayerMatchResult[]> =
            await apiClient.get(`/players/${id}/match-results`, {params});
          return response.data;
        },
      );
    },

    getWTN: async (id: string, season?: string): Promise<any> => {
      return cacheService.cachedCall(
        'stats',
        {type: 'wtn', id, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<any> = await apiClient.get(
            `/players/${id}/wtn`,
            {params},
          );
          return response.data;
        },
      );
    },

    search: async (
      query?: string,
      gender?: string,
      season?: string,
    ): Promise<PlayerSearchResult[]> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'search', query, gender, season},
        async () => {
          const params: any = {};
          if (query) params.query = query;
          if (gender) params.gender = gender;
          if (season) params.season_name = season;

          const response: AxiosResponse<PlayerSearchResult[]> =
            await apiClient.get('/players/search', {params});
          return response.data;
        },
      );
    },
  },

  // Stats endpoints
  stats: {
    getTeamStats: async (
      teamId: string,
      season?: string,
    ): Promise<TeamStats> => {
      return cacheService.cachedCall(
        'stats',
        {type: 'team', teamId, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<TeamStats> = await apiClient.get(
            `/stats/teams/${teamId}`,
            {params},
          );
          return response.data;
        },
      );
    },

    getPlayerStats: async (playerId: string, season?: string): Promise<any> => {
      return cacheService.cachedCall(
        'stats',
        {type: 'playerStats', playerId, season},
        async () => {
          const params = season ? {season} : {};
          const response: AxiosResponse<any> = await apiClient.get(
            `/stats/players/${playerId}`,
            {params},
          );
          return response.data;
        },
      );
    },
  },

  // Seasons endpoints
  seasons: {
    getAll: async (): Promise<Season[]> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'seasons'},
        async () => {
          const response: AxiosResponse<Season[]> = await apiClient.get(
            '/seasons',
          );
          return response.data;
        },
      );
    },

    getByName: async (name: string): Promise<Season | null> => {
      return cacheService.cachedCall(
        'profiles',
        {type: 'season', name},
        async () => {
          const allSeasons = await api.seasons.getAll();
          const season = allSeasons.find(s => s.name === name);
          return season || null;
        },
      );
    },
  },

  // Rankings endpoints
  rankings: {
    // Team rankings
    getTeamRankingLists: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 100,
    ): Promise<RankingList[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'teamLists', divisionType, gender, limit},
        async () => {
          const response: AxiosResponse<RankingList[]> = await apiClient.get(
            '/rankings/teams/lists',
            {params: {division_type: divisionType, gender: gender}},
          );
          return response.data;
        },
      );
    },

    getTeamRankings: async (
      rankingId: string,
      limit: number = 100,
    ): Promise<TeamRanking[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'team', rankingId, limit},
        async () => {
          const response: AxiosResponse<TeamRanking[]> = await apiClient.get(
            `/rankings/teams/lists/${rankingId}`,
            {params: {limit}},
          );
          return response.data;
        },
      );
    },

    getLatestTeamRankings: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 25,
    ): Promise<TeamRanking[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'latestTeam', divisionType, gender, limit},
        async () => {
          const response: AxiosResponse<TeamRanking[]> = await apiClient.get(
            '/rankings/teams/latest',
            {params: {division_type: divisionType, gender: gender, limit}},
          );
          return response.data;
        },
      );
    },

    getTeamRankingHistory: async (
      teamId: string,
      limit: number = 10,
    ): Promise<any> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'teamHistory', teamId, limit},
        async () => {
          const response: AxiosResponse<any> = await apiClient.get(
            `/rankings/teams/${teamId}/history`,
            {params: {limit}},
          );
          return response.data;
        },
      );
    },

    // Singles rankings
    getSinglesRankingLists: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
    ): Promise<RankingList[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'singlesLists', divisionType, gender},
        async () => {
          const response: AxiosResponse<RankingList[]> = await apiClient.get(
            '/rankings/singles/lists',
            {params: {division_type: divisionType, gender: gender}},
          );
          return response.data;
        },
      );
    },

    getSinglesRankings: async (
      rankingId: string,
      limit: number = 100,
    ): Promise<PlayerRanking[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'singles', rankingId, limit},
        async () => {
          const response: AxiosResponse<PlayerRanking[]> = await apiClient.get(
            `/rankings/singles/lists/${rankingId}`,
            {params: {limit}},
          );
          return response.data;
        },
      );
    },

    getLatestSinglesRankings: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 25,
    ): Promise<PlayerRanking[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'latestSingles', divisionType, gender, limit},
        async () => {
          const response: AxiosResponse<PlayerRanking[]> = await apiClient.get(
            '/rankings/singles/latest',
            {params: {division_type: divisionType, gender: gender, limit}},
          );
          return response.data;
        },
      );
    },

    getPlayerSinglesHistory: async (
      playerId: string,
      limit: number = 10,
    ): Promise<any> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'singlesHistory', playerId, limit},
        async () => {
          const response: AxiosResponse<any> = await apiClient.get(
            `/rankings/singles/players/${playerId}/history`,
            {params: {limit}},
          );
          return response.data;
        },
      );
    },

    // Doubles rankings
    getDoublesRankingLists: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
    ): Promise<RankingList[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'doublesLists', divisionType, gender},
        async () => {
          const response: AxiosResponse<RankingList[]> = await apiClient.get(
            '/rankings/doubles/lists',
            {params: {division_type: divisionType, gender: gender}},
          );
          return response.data;
        },
      );
    },

    getDoublesRankings: async (
      rankingId: string,
      limit: number = 100,
    ): Promise<DoublesRanking[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'doubles', rankingId, limit},
        async () => {
          const response: AxiosResponse<DoublesRanking[]> = await apiClient.get(
            `/rankings/doubles/lists/${rankingId}`,
            {params: {limit}},
          );
          return response.data;
        },
      );
    },

    getLatestDoublesRankings: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 25,
    ): Promise<DoublesRanking[]> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'latestDoubles', divisionType, gender, limit},
        async () => {
          const response: AxiosResponse<DoublesRanking[]> = await apiClient.get(
            '/rankings/doubles/latest',
            {params: {division_type: divisionType, gender: gender, limit}},
          );
          return response.data;
        },
      );
    },

    getPlayerDoublesHistory: async (
      playerId: string,
      limit: number = 10,
    ): Promise<any> => {
      return cacheService.cachedCall(
        'rankings',
        {type: 'doublesHistory', playerId, limit},
        async () => {
          const response: AxiosResponse<any> = await apiClient.get(
            `/rankings/doubles/players/${playerId}/history`,
            {params: {limit}},
          );
          return response.data;
        },
      );
    },
  },

  // Tournaments endpoints
  tournaments: {
    search: async (
      params: {
        page?: number;
        page_size?: number;
        sort_by?: string;
        sort_order?: string;
        date_from?: string;
        date_to?: string;
        tournament_type?: string;
        location?: string;
        organization?: string;
        status?: string;
        query?: string;
        division_type?: string;
      } = {},
    ): Promise<TournamentsResponse> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'search', ...params},
        async () => {
          const response: AxiosResponse<TournamentsResponse> =
            await apiClient.get('/tournament-draws/tournaments', {params});
          return response.data;
        },
      );
    },

    getById: async (id: string): Promise<TournamentWithDraws> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'detail', id},
        async () => {
          const response: AxiosResponse<TournamentWithDraws> =
            await apiClient.get(`/tournament-draws/tournaments/${id}`);
          return response.data;
        },
      );
    },

    getDraws: async (
      tournamentId: string,
      params: {
        gender?: string;
        event_type?: string;
      } = {},
    ): Promise<TournamentDraw[]> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'draws', tournamentId, ...params},
        async () => {
          const response: AxiosResponse<TournamentDraw[]> = await apiClient.get(
            `/tournament-draws/tournaments/${tournamentId}/draws`,
            {params},
          );
          return response.data;
        },
      );
    },

    getDrawDetails: async (
      drawId: string,
      stage?: string,
    ): Promise<TournamentDrawDetails> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'drawDetails', drawId, stage},
        async () => {
          const params = stage ? {stage} : {};
          const response: AxiosResponse<TournamentDrawDetails> =
            await apiClient.get(`/tournament-draws/draws/${drawId}`, {params});
          return response.data;
        },
      );
    },

    getUpcoming: async (
      params: {
        page?: number;
        page_size?: number;
      } = {},
    ): Promise<TournamentsResponse> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'upcoming', ...params},
        async () => {
          const response: AxiosResponse<TournamentsResponse> =
            await apiClient.get('/tournament-draws/tournaments/upcoming', {
              params,
            });
          return response.data;
        },
      );
    },

    getCurrent: async (
      params: {
        page?: number;
        page_size?: number;
      } = {},
    ): Promise<TournamentsResponse> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'current', ...params},
        async () => {
          const response: AxiosResponse<TournamentsResponse> =
            await apiClient.get('/tournament-draws/tournaments/current', {
              params,
            });
          return response.data;
        },
      );
    },

    getRecent: async (
      params: {
        days?: number;
        page?: number;
        page_size?: number;
      } = {},
    ): Promise<TournamentsResponse> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'recent', ...params},
        async () => {
          const response: AxiosResponse<TournamentsResponse> =
            await apiClient.get('/tournament-draws/tournaments/recent', {
              params,
            });
          return response.data;
        },
      );
    },

    getDrawStages: async (drawId: string): Promise<string[]> => {
      return cacheService.cachedCall(
        'tournaments',
        {type: 'stages', drawId},
        async () => {
          const response: AxiosResponse<string[]> = await apiClient.get(
            `/tournament-draws/draws/${drawId}/stages`,
          );
          return response.data;
        },
      );
    },
  },

  // Batch endpoints
  batch: {
    getTeams: async (teamIds: string[]): Promise<Record<string, Team>> => {
      if (teamIds.length === 0) return {};

      return cacheService.cachedCall(
        'batch',
        {type: 'teams', teamIds},
        async () => {
          const response = await apiClient.post('/batch/teams', teamIds);
          return response.data;
        },
      );
    },

    getMatchScores: async (
      matchIds: string[],
    ): Promise<Record<string, MatchScore>> => {
      if (matchIds.length === 0) return {};

      return cacheService.cachedCall(
        'batch',
        {type: 'scores', matchIds},
        async () => {
          const response = await apiClient.post(
            '/batch/match-scores',
            matchIds,
          );
          return response.data;
        },
      );
    },

    getMatchesWithData: async (date: string): Promise<any> => {
      return cacheService.cachedCall(
        'batch',
        {type: 'matchesWithData', date},
        async () => {
          const response = await apiClient.get('/batch/matches-with-data', {
            params: {date},
          });
          return response.data;
        },
      );
    },
  },
};

export default api;
