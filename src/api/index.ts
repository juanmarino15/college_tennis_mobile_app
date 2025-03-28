// src/api/index.ts
import axios from 'axios';
import type {AxiosResponse} from 'axios';
import {Alert} from 'react-native';

// Base URL should come from environment config
// const BASE_URL = 'https://shark-app-bei8p.ondigitalocean.app/api/v1';
const BASE_URL = 'http://localhost:8000/api/v1';

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
  },
};

export default api;
