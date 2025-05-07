// src/utils/preferencesManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

// Get unique device ID for potential future cloud syncing
const getDeviceId = async () => {
  return await DeviceInfo.getUniqueId();
};

// Default preferences structure
const defaultPreferences = {
  favoriteTeams: [],
  favoritePlayers: [],
  preferredDivision: 'DIV1',
  preferredGender: 'M',
  onboardingCompleted: false,
  deviceId: null,
};

export const PreferencesManager = {
  // Initialize preferences
  initialize: async () => {
    try {
      const storedPrefs = await AsyncStorage.getItem('userPreferences');
      if (!storedPrefs) {
        // First time - create with device ID
        const deviceId = await getDeviceId();
        const initialPrefs = {
          ...defaultPreferences,
          deviceId,
        };
        console.log('Initializing with:', initialPrefs);
        await AsyncStorage.setItem(
          'userPreferences',
          JSON.stringify(initialPrefs),
        );
        return initialPrefs;
      }
      const parsedPrefs = JSON.parse(storedPrefs);
      console.log('Loaded from storage:', parsedPrefs);
      return parsedPrefs;
    } catch (error) {
      console.error('Failed to initialize preferences:', error);
      return defaultPreferences;
    }
  },

  // Get all preferences
  getPreferences: async () => {
    try {
      const prefs = await AsyncStorage.getItem('userPreferences');
      console.log('Retrieved preferences:', prefs);
      return prefs ? JSON.parse(prefs) : null;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return null;
    }
  },

  // Save all preferences
  savePreferences: async preferences => {
    try {
      console.log('Saving preferences:', preferences);
      await AsyncStorage.setItem(
        'userPreferences',
        JSON.stringify(preferences),
      );
      return true;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    }
  },

  // Add/remove favorite team
  toggleFavoriteTeam: async teamId => {
    try {
      const prefs = await PreferencesManager.getPreferences();
      if (!prefs) return false;

      const favTeams = [...prefs.favoriteTeams];
      const teamIndex = favTeams.indexOf(teamId);

      if (teamIndex >= 0) {
        favTeams.splice(teamIndex, 1);
      } else {
        favTeams.push(teamId);
      }

      const updatedPrefs = {
        ...prefs,
        favoriteTeams: favTeams,
      };

      await PreferencesManager.savePreferences(updatedPrefs);
      return updatedPrefs;
    } catch (error) {
      console.error('Failed to toggle favorite team:', error);
      return null;
    }
  },

  // Add/remove favorite player
  toggleFavoritePlayer: async playerId => {
    try {
      const prefs = await PreferencesManager.getPreferences();
      if (!prefs) return false;

      const favPlayers = [...prefs.favoritePlayers];
      const playerIndex = favPlayers.indexOf(playerId);

      if (playerIndex >= 0) {
        favPlayers.splice(playerIndex, 1);
      } else {
        favPlayers.push(playerId);
      }

      const updatedPrefs = {
        ...prefs,
        favoritePlayers: favPlayers,
      };

      console.log('Updated player preferences:', updatedPrefs);
      await PreferencesManager.savePreferences(updatedPrefs);
      return updatedPrefs;
    } catch (error) {
      console.error('Failed to toggle favorite player:', error);
      return null;
    }
  },

  // Update preferences after onboarding
  completeOnboarding: async selections => {
    try {
      const currentPrefs = await PreferencesManager.getPreferences();
      const updatedPrefs = {
        ...currentPrefs,
        ...selections,
        onboardingCompleted: true,
      };

      console.log('Completing onboarding with preferences:', updatedPrefs);
      await PreferencesManager.savePreferences(updatedPrefs);
      return updatedPrefs;
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      return null;
    }
  },
};
