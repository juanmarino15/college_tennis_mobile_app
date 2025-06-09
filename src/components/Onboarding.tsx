// src/components/Onboarding.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {api} from '../api';
import theme from '../theme';
import TeamLogo from './TeamLogo';
import PlayerOnboarding from './PlayerOnboarding';

// Define interfaces for the component props
interface OnboardingProps {
  onComplete: (preferences: OnboardingPreferences) => void;
  isDark: boolean;
}

// Define preference types
interface OnboardingPreferences {
  favoriteTeams?: string[];
  favoritePlayers?: string[];
  preferredGender?: string;
  preferredDivision?: string;
  onboardingCompleted?: boolean;
}

// Define team type
interface TeamData {
  id: string;
  name: string;
  gender?: string;
  conference?: string;
  abbreviation?: string;
}

const Onboarding: React.FC<OnboardingProps> = ({onComplete, isDark}) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [preferredGender, setPreferredGender] = useState<string>('M');
  const [preferredDivision, setPreferredDivision] = useState<string>('DIV1');

  // Fetch teams for selection
  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const teamsData = await api.teams.getAll();
        // Sort teams alphabetically by name
        const sortedTeams = [...teamsData].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        setTeams(sortedTeams);
      } catch (error) {
        console.error('Failed to fetch teams:', error);
      } finally {
        setLoading(false);
      }
    };

    if (step === 2) {
      fetchTeams();
    }
  }, [step]);

  // Filter teams based on gender and search query
  useEffect(() => {
    if (teams.length > 0) {
      let filtered = teams.filter(team => {
        // Filter by gender
        const genderMatch =
          team.gender === preferredGender ||
          team.name.includes(preferredGender === 'M' ? '(M)' : '(W)');

        // Filter by search query if any
        const searchMatch =
          searchQuery === '' ||
          team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (team.conference &&
            team.conference.toLowerCase().includes(searchQuery.toLowerCase()));

        return genderMatch && searchMatch;
      });

      setFilteredTeams(filtered);
    }
  }, [teams, preferredGender, searchQuery]);

  // Handle team selection
  const toggleTeamSelection = (teamId: string) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      // Limit to max 5 teams
      if (selectedTeams.length < 5) {
        setSelectedTeams([...selectedTeams, teamId]);
      }
    }
  };

  // Complete onboarding with all preferences
  const handleComplete = () => {
    console.log('Completing onboarding with:', {
      favoriteTeams: selectedTeams,
      favoritePlayers: selectedPlayers,
      preferredGender,
      preferredDivision,
    });

    const preferences: OnboardingPreferences = {
      favoriteTeams: selectedTeams,
      favoritePlayers: selectedPlayers,
      preferredGender,
      preferredDivision,
      onboardingCompleted: true,
    };
    onComplete(preferences);
  };

  // Handle team selection completion
  const handleTeamSelectionComplete = () => {
    // Move to player selection step
    setStep(3);
  };

  // Handle player selection completion
  const handlePlayerSelectionComplete = (players: string[]) => {
    console.log('Players selected:', players);

    // Do this instead - pass the players directly to handleComplete:
    const preferences: OnboardingPreferences = {
      favoriteTeams: selectedTeams,
      favoritePlayers: players, // Use players parameter directly instead of selectedPlayers state
      preferredGender,
      preferredDivision,
      onboardingCompleted: true,
    };
    onComplete(preferences);
  };

  // Skip entire onboarding
  const handleSkip = () => {
    onComplete({onboardingCompleted: true});
  };

  // Skip just the player selection
  const handleSkipPlayerSelection = () => {
    console.log('Skipping player selection, completing with teams only');
    handleComplete(); // Complete with teams but no players
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Render welcome screen
  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <Icon name="award" size={80} color={theme.colors.primary[500]} />
      <Text
        style={[
          styles.title,
          {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
        ]}>
        Welcome to College Tennis
      </Text>
      <Text
        style={[
          styles.subtitle,
          {color: isDark ? theme.colors.text.dimDark : theme.colors.gray[600]},
        ]}>
        Your personalized college tennis companion
      </Text>
      <Text
        style={[
          styles.description,
          {color: isDark ? theme.colors.text.dimDark : theme.colors.gray[600]},
        ]}>
        Let's set up your preferences to personalize your experience. You can
        follow your favorite teams, players, and stay updated with the latest
        matches and rankings.
      </Text>
      <TouchableOpacity
        style={[styles.button, {backgroundColor: theme.colors.primary[500]}]}
        onPress={() => setStep(2)}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={{color: theme.colors.primary[500]}}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  // Render team selection step
  const renderTeamSelectionStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text
          style={[
            styles.title,
            {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
          ]}>
          Select Your Favorite Teams
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[600],
            },
          ]}>
          Choose up to 5 teams to follow
        </Text>

        {/* Gender selector */}
        <View style={styles.genderSelector}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              preferredGender === 'M' && {
                backgroundColor: theme.colors.primary[500],
              },
            ]}
            onPress={() => setPreferredGender('M')}>
            <Text
              style={[
                styles.genderButtonText,
                preferredGender === 'M' && {color: 'white'},
              ]}>
              Men
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderButton,
              preferredGender === 'F' && {
                backgroundColor: theme.colors.primary[500],
              },
            ]}
            onPress={() => setPreferredGender('F')}>
            <Text
              style={[
                styles.genderButtonText,
                preferredGender === 'F' && {color: 'white'},
              ]}>
              Women
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDark
                ? theme.colors.background.dark
                : theme.colors.gray[100],
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}>
          <Icon
            name="search"
            size={20}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[500]}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}
            placeholder="Search for teams..."
            placeholderTextColor={
              isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={clearSearch}>
              <Icon
                name="x"
                size={20}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected count indicator */}
        <View style={styles.selectionIndicator}>
          <Text
            style={[
              styles.selectionText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            {selectedTeams.length}/5 teams selected
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary[500]}
            style={styles.loader}
          />
        ) : (
          <ScrollView style={styles.teamList}>
            {filteredTeams.length > 0 ? (
              filteredTeams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamItem,
                    selectedTeams.includes(team.id) && {
                      backgroundColor: isDark
                        ? theme.colors.primary[900]
                        : theme.colors.primary[50],
                    },
                    {
                      borderColor: isDark
                        ? theme.colors.border.dark
                        : theme.colors.border.light,
                    },
                  ]}
                  onPress={() => toggleTeamSelection(team.id)}>
                  <TeamLogo teamId={team.id} size="small" />
                  <View style={styles.teamInfo}>
                    <Text
                      style={[
                        styles.teamName,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.text.light,
                        },
                      ]}>
                      {team.name.replace(/\s*\([MW]\)\s*$/, '')}
                    </Text>
                    {team.conference && (
                      <Text
                        style={[
                          styles.conferenceText,
                          {
                            color: isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[500],
                          },
                        ]}>
                        {team.conference.replace(/_/g, ' ')}
                      </Text>
                    )}
                  </View>
                  {selectedTeams.includes(team.id) && (
                    <Icon
                      name="check-circle"
                      size={24}
                      color={theme.colors.primary[500]}
                    />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Icon
                  name="alert-circle"
                  size={48}
                  color={
                    isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
                  }
                />
                <Text
                  style={[
                    styles.noResultsText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  No teams found matching your search
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              {backgroundColor: theme.colors.primary[500]},
            ]}
            onPress={handleTeamSelectionComplete}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setStep(3)}>
            <Text style={{color: theme.colors.primary[500]}}>
              Skip this step
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render player selection step
  const renderPlayerSelectionStep = () => (
    <PlayerOnboarding
      onComplete={handlePlayerSelectionComplete}
      onSkip={handleSkipPlayerSelection}
      isDark={isDark}
    />
  );

  // Render current step
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? theme.colors.background.dark
            : theme.colors.background.light,
        },
      ]}>
      {step === 1 && renderWelcomeStep()}
      {step === 2 && renderTeamSelectionStep()}
      {step === 3 && renderPlayerSelectionStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing[4],
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: 'bold',
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    lineHeight: 24,
  },
  button: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: theme.spacing[2],
  },
  genderSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing[4],
  },
  genderButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.full,
    marginHorizontal: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  genderButtonText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
  },
  selectionIndicator: {
    marginBottom: theme.spacing[3],
  },
  selectionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  teamList: {
    width: '100%',
    maxHeight: 400,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[2],
  },
  teamInfo: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  teamName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.sm,
  },
  loader: {
    marginVertical: theme.spacing[6],
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[6],
  },
  noResultsText: {
    marginTop: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
});

export default Onboarding;
