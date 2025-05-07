// src/pages/HomePage.tsx
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import {ThemeContext} from '../../App';
import theme from '../theme';
import {PreferencesManager} from '../utils/preferencesManager';
import Onboarding from '../components/Onboarding';
import FavoriteTeamsDashboard from '../components/FavoriteTeamDashboard';
import FavoritePlayersSection from '../components/FavoritePlayerSection';
import BigMatchesSection from '../components/BigMatchesSection';
import TennisNewsFeed from '../components/TennisNewsFeed';

const HomeScreen = () => {
  const {isDark} = useContext(ThemeContext);
  const [refreshing, setRefreshing] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    favoriteTeams: [],
    favoritePlayers: [],
    preferredDivision: 'DIV1',
    preferredGender: 'M',
  });

  // Load user preferences when component mounts
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Load preferences from storage
  const loadUserPreferences = async () => {
    try {
      const prefs = await PreferencesManager.initialize();
      console.log('HomeScreen loaded preferences:', prefs);

      if (prefs) {
        setUserPreferences({
          favoriteTeams: prefs.favoriteTeams || [],
          favoritePlayers: prefs.favoritePlayers || [],
          preferredDivision: prefs.preferredDivision || 'DIV1',
          preferredGender: prefs.preferredGender || 'M',
        });
        setOnboardingCompleted(prefs.onboardingCompleted || false);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      Alert.alert(
        'Error',
        'Failed to load your preferences. Please restart the app.',
      );
    }
  };

  // Handle completing onboarding
  const handleOnboardingComplete = async (preferences: any) => {
    try {
      console.log(
        'HomeScreen handling onboarding completion with:',
        preferences,
      );

      // Make sure to preserve any existing preferences
      const currentPrefs = (await PreferencesManager.getPreferences()) || {};

      const updatedPrefs = {
        ...currentPrefs,
        favoriteTeams: preferences.favoriteTeams || [],
        favoritePlayers: preferences.favoritePlayers || [],
        preferredDivision: preferences.preferredDivision || 'DIV1',
        preferredGender: preferences.preferredGender || 'M',
        onboardingCompleted: true,
      };

      console.log('Saving updated preferences:', updatedPrefs);
      await PreferencesManager.savePreferences(updatedPrefs);

      // Update local state
      setUserPreferences({
        favoriteTeams: updatedPrefs.favoriteTeams || [],
        favoritePlayers: updatedPrefs.favoritePlayers || [],
        preferredDivision: updatedPrefs.preferredDivision || 'DIV1',
        preferredGender: updatedPrefs.preferredGender || 'M',
      });
      setOnboardingCompleted(true);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      Alert.alert(
        'Error',
        'Failed to save your preferences. Please try again.',
      );
    }
  };

  // Handle refreshing the page
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserPreferences();
    setRefreshing(false);
  };

  // If onboarding not completed, show onboarding screen
  if (!onboardingCompleted) {
    return <Onboarding onComplete={handleOnboardingComplete} isDark={isDark} />;
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={
          isDark ? theme.colors.background.dark : theme.colors.background.light
        }
      />
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? theme.colors.background.dark
              : theme.colors.background.light,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }>
        {/* Welcome Header */}
        <View style={styles.welcomeContainer}>
          <Text
            style={[
              styles.welcomeText,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            College Tennis
          </Text>
          <Text
            style={[
              styles.dateText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Debug Info - remove in production */}
        <View style={styles.debugContainer}>
          <Text style={{color: isDark ? 'white' : 'black', fontSize: 12}}>
            Teams: {userPreferences.favoriteTeams.length}
          </Text>
          <Text style={{color: isDark ? 'white' : 'black', fontSize: 12}}>
            Players: {userPreferences.favoritePlayers.length}
          </Text>
        </View>

        {/* Favorite Teams Dashboard */}
        <FavoriteTeamsDashboard
          favoriteTeams={userPreferences.favoriteTeams}
          isDark={isDark}
        />

        {/* Big Upcoming Matches */}
        <BigMatchesSection
          favoriteTeams={userPreferences.favoriteTeams}
          isDark={isDark}
        />

        {/* Favorite Players */}
        <FavoritePlayersSection
          favoritePlayers={userPreferences.favoritePlayers}
          isDark={isDark}
        />

        {/* Tennis News */}
        <TennisNewsFeed
          preferredDivision={userPreferences.preferredDivision}
          preferredGender={userPreferences.preferredGender}
          isDark={isDark}
        />

        {/* Extra space at bottom */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  welcomeText: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: theme.typography.fontSize.base,
    marginTop: theme.spacing[1],
  },
  debugContainer: {
    padding: 8,
    margin: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  bottomPadding: {
    height: 80, // Extra padding for bottom navigation
  },
});

export default HomeScreen;
