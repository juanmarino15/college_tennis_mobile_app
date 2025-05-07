// src/components/PlayerOnboarding.tsx
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {api} from '../api';
import theme from '../theme';
import TeamLogo from './TeamLogo';

// Define interfaces for the component props
interface PlayerOnboardingProps {
  onComplete: (selectedPlayers: string[]) => void;
  onSkip: () => void;
  isDark: boolean;
}

// Define the interface for player search results
interface PlayerSearchResult {
  person_id: string;
  first_name: string;
  last_name: string;
  team_id?: string;
  team_name?: string;
  school_name?: string;
  avatar_url?: string;
  wtn_singles?: number;
  wtn_doubles?: number;
}

const PlayerOnboarding: React.FC<PlayerOnboardingProps> = ({
  onComplete,
  onSkip,
  isDark,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [preferredGender, setPreferredGender] = useState<string>('MALE'); // Changed to MALE instead of M
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [noResultsFound, setNoResultsFound] = useState<boolean>(false);

  // Add debounce timer reference
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle search input change with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    console.log(text);

    // Clear results if search is emptied
    if (text.trim() === '') {
      setSearchResults([]);
      setNoResultsFound(false);
      // Clear any existing timer
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
      return;
    }

    // Clear any existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // Only trigger search after user stops typing for 500ms and if query is 2+ characters
    if (text.trim().length >= 3) {
      searchDebounceTimer.current = setTimeout(() => {
        handleSearch();
      }, 500); // 500ms delay
    }
  };

  // Handle search with the new unified search endpoint
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearchLoading(true);
    setNoResultsFound(false);

    try {
      // Use the new search endpoint
      console.log(searchQuery);
      const results = await api.players.search(
        searchQuery,
        preferredGender, // This will now be 'MALE' or 'FEMALE'
        '2024', // Current season
      );

      if (results && results.length > 0) {
        setSearchResults(results);
      } else {
        setNoResultsFound(true);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching players:', error);
      Alert.alert('Error', 'Failed to search for players');
      setNoResultsFound(true);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Toggle player selection
  const togglePlayerSelection = (playerId: string) => {
    console.log('Toggling player selection:', playerId);

    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(prevSelected =>
        prevSelected.filter(id => id !== playerId),
      );
    } else {
      // Limit to max 5 players
      if (selectedPlayers.length < 5) {
        setSelectedPlayers(prevSelected => [...prevSelected, playerId]);
      } else {
        Alert.alert('Selection Limit', 'You can select up to 5 players');
      }
    }
  };

  // Handle completion - making sure to pass the current player IDs
  const handleComplete = () => {
    console.log('PlayerOnboarding completing with players:', selectedPlayers);
    onComplete(selectedPlayers);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setNoResultsFound(false);

    // Clear any existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
  };

  // Parse team name (remove gender markers)
  const parseTeamName = (name?: string) => {
    return name ? name.replace(/\s*\([MW]\)\s*$/, '') : '';
  };

  // Render a player item
  const renderPlayerItem = ({item}: {item: PlayerSearchResult}) => (
    <TouchableOpacity
      style={[
        styles.playerItem,
        selectedPlayers.includes(item.person_id) && {
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
      onPress={() => togglePlayerSelection(item.person_id)}>
      <View style={styles.playerAvatar}>
        <Icon
          name="user"
          size={24}
          color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
        />
      </View>
      <View style={styles.playerInfo}>
        <Text
          style={[
            styles.playerName,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.first_name} {item.last_name}
        </Text>
        {item.team_id && (
          <View style={styles.playerTeamInfo}>
            <TeamLogo teamId={item.team_id} size="small" />
            <View style={styles.teamInfoText}>
              <Text
                style={[
                  styles.teamName,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[500],
                  },
                ]}>
                {parseTeamName(item.team_name)}
              </Text>
            </View>
          </View>
        )}
        {/* Display UTR ratings if available */}
        {(item.wtn_singles || item.wtn_doubles) && (
          <View style={styles.utrContainer}>
            {item.wtn_singles && (
              <View style={styles.utrBadge}>
                <Text style={styles.utrLabel}>UTR-S</Text>
                <Text style={styles.utrValue}>
                  {item.wtn_singles.toFixed(1)}
                </Text>
              </View>
            )}
            {item.wtn_doubles && (
              <View style={styles.utrBadge}>
                <Text style={styles.utrLabel}>UTR-D</Text>
                <Text style={styles.utrValue}>
                  {item.wtn_doubles.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      {selectedPlayers.includes(item.person_id) && (
        <Icon
          name="check-circle"
          size={24}
          color={theme.colors.primary[500]}
          style={styles.checkIcon}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
        ]}>
        Select Your Favorite Players
      </Text>
      <Text
        style={[
          styles.subtitle,
          {color: isDark ? theme.colors.text.dimDark : theme.colors.gray[600]},
        ]}>
        Choose up to 5 players to follow
      </Text>

      {/* Gender selector */}
      <View style={styles.genderSelector}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            preferredGender === 'MALE' && {
              backgroundColor: theme.colors.primary[500],
            },
          ]}
          onPress={() => {
            setPreferredGender('MALE'); // Changed from 'M' to 'MALE'
            // Clear previous search results when changing gender
            setSearchResults([]);
            setNoResultsFound(false);
            // Auto-search if there's a query
            if (searchQuery.trim().length >= 2) {
              handleSearch();
            }
          }}>
          <Text
            style={[
              styles.genderButtonText,
              preferredGender === 'MALE' && {color: 'white'},
            ]}>
            Men
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderButton,
            preferredGender === 'FEMALE' && {
              backgroundColor: theme.colors.primary[500],
            },
          ]}
          onPress={() => {
            setPreferredGender('FEMALE'); // Changed from 'F' to 'FEMALE'
            // Clear previous search results when changing gender
            setSearchResults([]);
            setNoResultsFound(false);
            // Auto-search if there's a query
            if (searchQuery.trim().length >= 2) {
              handleSearch();
            }
          }}>
          <Text
            style={[
              styles.genderButtonText,
              preferredGender === 'FEMALE' && {color: 'white'},
            ]}>
            Women
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected count */}
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
          {selectedPlayers.length}/5 players selected
        </Text>
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
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}
          placeholder="Search for players, teams, or schools..."
          placeholderTextColor={
            isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
          }
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
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

      {/* Search Results and Status Views */}
      {searchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text
            style={[
              styles.loadingText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Searching...
          </Text>
        </View>
      ) : (
        <>
          {/* Search Results */}
          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.person_id}
              renderItem={renderPlayerItem}
              style={styles.playersList}
            />
          )}

          {/* No results message */}
          {noResultsFound && (
            <View style={styles.emptyResults}>
              <Icon
                name="alert-circle"
                size={48}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
                }
              />
              <Text
                style={[
                  styles.emptyResultsText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}>
                No players found. Try a different search term.
              </Text>
            </View>
          )}

          {/* Search instructions when no search performed */}
          {!searchLoading &&
            searchResults.length === 0 &&
            !noResultsFound &&
            searchQuery.length < 2 && (
              <View style={styles.emptyStateContainer}>
                <Icon
                  name="search"
                  size={48}
                  color={
                    isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
                  }
                />
                <Text
                  style={[
                    styles.emptyStateText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  Search for players by name, team, or school
                </Text>
                <Text
                  style={[
                    styles.emptyStateSubtext,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  Examples: "John Smith", "Stanford", "Pac-12"
                </Text>
              </View>
            )}
        </>
      )}

      {/* Action buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.colors.primary[500]}]}
          onPress={handleComplete}
          disabled={searchLoading}>
          <Text style={styles.buttonText}>Finish</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={searchLoading}>
          <Text style={{color: theme.colors.primary[500]}}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  genderSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing[3],
  },
  genderButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.spacing[3],
    marginHorizontal: theme.spacing[2],
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  genderButtonText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  selectionIndicator: {
    marginBottom: theme.spacing[2],
  },
  selectionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  playersList: {
    flex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[2],
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfo: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  playerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  playerTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[1],
  },
  teamInfoText: {
    marginLeft: theme.spacing[1],
    flex: 1,
  },
  teamName: {
    fontSize: theme.typography.fontSize.sm,
  },
  schoolName: {
    fontSize: theme.typography.fontSize.xs,
  },
  checkIcon: {
    marginLeft: theme.spacing[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  emptyStateText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyStateSubtext: {
    marginTop: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
  emptyResults: {
    flex: 1,
    padding: theme.spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyResultsText: {
    marginTop: theme.spacing[2],
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
  },
  buttonsContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
  },
  button: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginBottom: theme.spacing[2],
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
  utrContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing[1],
    gap: theme.spacing[2],
  },
  utrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: theme.spacing[1],
    paddingVertical: 2,
    borderRadius: theme.spacing[1],
  },
  utrLabel: {
    fontSize: 10,
    color: theme.colors.primary[600],
    fontWeight: '500',
    marginRight: 2,
  },
  utrValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
  },
});

export default PlayerOnboarding;
