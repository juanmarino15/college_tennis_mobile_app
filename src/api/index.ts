// src/api/index.ts
import axios from 'axios';
import type {AxiosResponse} from 'axios';
import {Alert} from 'react-native';

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
// Add these interfaces to your existing types section
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

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    const {response} = error;

    if (response && response.status >= 400) {
      // You can customize error handling based on status codes
      const errorMessage = response.data?.message || 'An error occurred';

      // For network errors, you might want to show a user-friendly message
      Alert.alert('Error', errorMessage);
    } else if (error.request) {
      // No response received
      Alert.alert(
        'Network Error',
        'Unable to connect to the server. Please check your internet connection.',
      );
    }

    return Promise.reject(error);
  },
);

// API endpoints
export const api = {
  // Matches endpoints
  matches: {
    getAll: async (date?: string): Promise<Match[]> => {
      const params = date ? {date} : {};
      try {
        const response: AxiosResponse<Match[]> = await apiClient.get(
          '/matches',
          {params},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch matches:', error);
        throw error;
      }
    },

    getById: async (id: string): Promise<Match> => {
      try {
        const response: AxiosResponse<Match> = await apiClient.get(
          `/matches/${id}`,
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch match ${id}:`, error);
        throw error;
      }
    },

    getLineup: async (id: string): Promise<MatchLineup[]> => {
      try {
        const response: AxiosResponse<MatchLineup[]> = await apiClient.get(
          `/matches/${id}/lineup`,
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch match lineup ${id}:`, error);
        throw error;
      }
    },

    getScore: async (id: string): Promise<MatchScore> => {
      try {
        const response: AxiosResponse<MatchScore> = await apiClient.get(
          `/matches/${id}/score`,
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch match score ${id}:`, error);
        throw error;
      }
    },

    // New method for getting team matches by season
    getAllByTeam: async (teamId: string, season?: string): Promise<Match[]> => {
      const params: any = {team_id: teamId};
      if (season) {
        params.season = season;
      }

      try {
        // First try using the dedicated endpoint if available on the server
        try {
          const response: AxiosResponse<Match[]> = await apiClient.get(
            `/matches/by-team/${teamId}`,
            {params: season ? {season} : {}},
          );
          return response.data;
        } catch (routeError) {
          // If the dedicated endpoint is not available, fall back to filtering all matches
          console.log(
            'Dedicated team matches endpoint not available, using fallback',
          );
          const allMatches: AxiosResponse<Match[]> = await apiClient.get(
            '/matches',
            {params},
          );
          return allMatches.data;
        }
      } catch (error) {
        console.error(`Failed to fetch matches for team ${teamId}:`, error);
        throw error;
      }
    },
  },

  // Teams endpoints
  teams: {
    getAll: async (params = {}): Promise<Team[]> => {
      try {
        const response: AxiosResponse<Team[]> = await apiClient.get('/teams', {
          params,
        });
        return response.data;
      } catch (error) {
        console.error('Failed to fetch teams:', error);
        throw error;
      }
    },

    getById: async (id: string): Promise<Team> => {
      try {
        const response: AxiosResponse<Team> = await apiClient.get(
          `/teams/${id}`,
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch team ${id}:`, error);
        throw error;
      }
    },

    getLogo: (id: string): string => {
      // In React Native, we'll return the URL rather than a blob
      return `${BASE_URL}/teams/${id}/logo`;
    },

    // New method to get team roster by season
    getRoster: async (id: string, year?: string): Promise<Player[]> => {
      const params = year ? {year} : {};
      try {
        const response: AxiosResponse<Player[]> = await apiClient.get(
          `/teams/${id}/roster`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch roster for team ${id}:`, error);
        throw error;
      }
    },
  },

  // Players endpoints
  players: {
    getAll: async (teamId?: string): Promise<Player[]> => {
      const params = teamId ? {team_id: teamId} : {};
      try {
        const response: AxiosResponse<Player[]> = await apiClient.get(
          '/players',
          {params},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch players:', error);
        throw error;
      }
    },

    getById: async (id: string): Promise<Player> => {
      try {
        const response: AxiosResponse<Player> = await apiClient.get(
          `/players/${id}`,
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch player ${id}:`, error);
        throw error;
      }
    },
    getTeam: async (id: string, season?: string): Promise<PlayerTeam> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<PlayerTeam> = await apiClient.get(
          `/players/${id}/team`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch team for player ${id}:`, error);
        throw error;
      }
    },
    getStats: async (id: string, season?: string): Promise<PlayerStats> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<PlayerStats> = await apiClient.get(
          `/players/${id}/stats`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch stats for player ${id}:`, error);
        throw error;
      }
    },
    getPositions: async (
      id: string,
      season?: string,
    ): Promise<PlayerPositions> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<PlayerPositions> = await apiClient.get(
          `/players/${id}/positions`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch positions for player ${id}:`, error);
        throw error;
      }
    },
    getMatchResults: async (
      id: string,
      season?: string,
    ): Promise<PlayerMatchResult[]> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<PlayerMatchResult[]> =
          await apiClient.get(`/players/${id}/match-results`, {params});
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch match results for player ${id}:`, error);
        throw error;
      }
    },

    getWTN: async (id: string, season?: string): Promise<any> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<any> = await apiClient.get(
          `/players/${id}/wtn`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch WTN for player ${id}:`, error);
        throw error;
      }
    },
  },

  // Stats endpoints
  stats: {
    getTeamStats: async (
      teamId: string,
      season?: string,
    ): Promise<TeamStats> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<TeamStats> = await apiClient.get(
          `/stats/teams/${teamId}`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch stats for team ${teamId}:`, error);
        throw error;
      }
    },

    getPlayerStats: async (playerId: string, season?: string): Promise<any> => {
      const params = season ? {season} : {};
      try {
        const response: AxiosResponse<any> = await apiClient.get(
          `/stats/players/${playerId}`,
          {params},
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch stats for player ${playerId}:`, error);
        throw error;
      }
    },
  },
  seasons: {
    getAll: async (): Promise<Season[]> => {
      try {
        const response: AxiosResponse<Season[]> = await apiClient.get(
          '/seasons',
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch seasons:', error);
        throw error;
      }
    },
    getByName: async (name: string): Promise<Season | null> => {
      try {
        const allSeasons = await api.seasons.getAll();
        const season = allSeasons.find(s => s.name === name);
        return season || null;
      } catch (error) {
        console.error(`Failed to fetch season by name: ${name}`, error);
        throw error;
      }
    },
  },
  // Rankings endpoints
  rankings: {
    // Team rankings
    getTeamRankingLists: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 100, // Increased default limit
    ): Promise<RankingList[]> => {
      try {
        const response: AxiosResponse<RankingList[]> = await apiClient.get(
          '/rankings/teams/lists',
          {params: {division_type: divisionType, gender: gender}},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch team ranking lists:', error);
        throw error;
      }
    },

    getTeamRankings: async (
      rankingId: string,
      limit: number = 100,
    ): Promise<TeamRanking[]> => {
      try {
        const response: AxiosResponse<TeamRanking[]> = await apiClient.get(
          `/rankings/teams/lists/${rankingId}`,
          {params: {limit}},
        );
        return response.data;
      } catch (error) {
        console.error(
          `Failed to fetch team rankings for list ${rankingId}:`,
          error,
        );
        throw error;
      }
    },

    getLatestTeamRankings: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 25,
    ): Promise<TeamRanking[]> => {
      try {
        const response: AxiosResponse<TeamRanking[]> = await apiClient.get(
          '/rankings/teams/latest',
          {params: {division_type: divisionType, gender: gender, limit}},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch latest team rankings:', error);
        throw error;
      }
    },

    getTeamRankingHistory: async (
      teamId: string,
      limit: number = 10,
    ): Promise<any> => {
      try {
        const response: AxiosResponse<any> = await apiClient.get(
          `/rankings/teams/${teamId}/history`,
          {params: {limit}},
        );
        return response.data;
      } catch (error) {
        console.error(
          `Failed to fetch ranking history for team ${teamId}:`,
          error,
        );
        throw error;
      }
    },

    // Singles rankings
    getSinglesRankingLists: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
    ): Promise<RankingList[]> => {
      try {
        const response: AxiosResponse<RankingList[]> = await apiClient.get(
          '/rankings/singles/lists',
          {params: {division_type: divisionType, gender: gender}},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch singles ranking lists:', error);
        throw error;
      }
    },

    getSinglesRankings: async (
      rankingId: string,
      limit: number = 100,
    ): Promise<PlayerRanking[]> => {
      try {
        const response: AxiosResponse<PlayerRanking[]> = await apiClient.get(
          `/rankings/singles/lists/${rankingId}`,
          {params: {limit}},
        );
        return response.data;
      } catch (error) {
        console.error(
          `Failed to fetch singles rankings for list ${rankingId}:`,
          error,
        );
        throw error;
      }
    },

    getLatestSinglesRankings: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 25,
    ): Promise<PlayerRanking[]> => {
      try {
        const response: AxiosResponse<PlayerRanking[]> = await apiClient.get(
          '/rankings/singles/latest',
          {params: {division_type: divisionType, gender: gender, limit}},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch latest singles rankings:', error);
        throw error;
      }
    },

    getPlayerSinglesHistory: async (
      playerId: string,
      limit: number = 10,
    ): Promise<any> => {
      try {
        const response: AxiosResponse<any> = await apiClient.get(
          `/rankings/singles/players/${playerId}/history`,
          {params: {limit}},
        );
        return response.data;
      } catch (error) {
        console.error(
          `Failed to fetch singles ranking history for player ${playerId}:`,
          error,
        );
        throw error;
      }
    },

    // Doubles rankings
    getDoublesRankingLists: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
    ): Promise<RankingList[]> => {
      try {
        const response: AxiosResponse<RankingList[]> = await apiClient.get(
          '/rankings/doubles/lists',
          {params: {division_type: divisionType, gender: gender}},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch doubles ranking lists:', error);
        throw error;
      }
    },

    getDoublesRankings: async (
      rankingId: string,
      limit: number = 100,
    ): Promise<PlayerRanking[]> => {
      try {
        const response: AxiosResponse<PlayerRanking[]> = await apiClient.get(
          `/rankings/doubles/lists/${rankingId}`,
          {params: {limit}},
        );
        return response.data;
      } catch (error) {
        console.error(
          `Failed to fetch doubles rankings for list ${rankingId}:`,
          error,
        );
        throw error;
      }
    },

    getLatestDoublesRankings: async (
      divisionType: string = 'DIV1',
      gender: string = 'M',
      limit: number = 25,
    ): Promise<PlayerRanking[]> => {
      try {
        const response: AxiosResponse<PlayerRanking[]> = await apiClient.get(
          '/rankings/doubles/latest',
          {params: {division_type: divisionType, gender: gender, limit}},
        );
        return response.data;
      } catch (error) {
        console.error('Failed to fetch latest doubles rankings:', error);
        throw error;
      }
    },

    getPlayerDoublesHistory: async (
      playerId: string,
      limit: number = 10,
    ): Promise<any> => {
      try {
        const response: AxiosResponse<any> = await apiClient.get(
          `/rankings/doubles/players/${playerId}/history`,
          {params: {limit}},
        );
        return response.data;
      } catch (error) {
        console.error(
          `Failed to fetch doubles ranking history for player ${playerId}:`,
          error,
        );
        throw error;
      }
    },
  },
};

export default api;
