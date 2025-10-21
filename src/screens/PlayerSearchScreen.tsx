// src/screens/PlayerSearchScreen.tsx
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {ThemeContext} from '../../App';
import theme from '../theme';
import {api} from '../api';
import TeamLogo from '../components/TeamLogo';

// Define navigation types
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  MatchDetail: {matchId: string};
  PlayerDetail: {playerId: string};
};

type PlayerSearchScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface PlayerSearchScreenProps {
  navigation: PlayerSearchScreenNavigationProp;
}

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

const PlayerSearchScreen: React.FC<PlayerSearchScreenProps> = ({
  navigation,
}) => {
  // Context for dark/light theme
  const {isDark} = useContext(ThemeContext);

  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string>('MALE');

  // Search players using the API
  const searchPlayers = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchPerformed(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await api.players.search(
        searchQuery.trim(),
        selectedGender,
        // '2024', // Current season
      );
      setSearchResults(results || []);
      setSearchPerformed(true);
    } catch (err) {
      console.error('Error searching players:', err);
      setError('Failed to search players. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced search - trigger search after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchPlayers();
      } else {
        setSearchResults([]);
        setSearchPerformed(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedGender]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    searchPlayers();
  };

  // Navigate to player details
  const handlePlayerPress = (playerId: string) => {
    navigation.navigate('PlayerDetail', {playerId});
  };

  // Toggle gender filter
  const handleGenderToggle = (gender: string) => {
    setSelectedGender(gender);
  };

  // Render player item
  const renderPlayerItem = ({item}: {item: PlayerSearchResult}) => {
    const playerName = `${item.first_name} ${item.last_name}`;
    const teamName = item.team_name || item.school_name || 'Unknown Team';

    return (
      <TouchableOpacity
        style={[
          styles.playerCard,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}
        onPress={() => handlePlayerPress(item.person_id)}>
        <View style={styles.playerContent}>
          {/* Player Avatar */}
          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Image
                source={{uri: item.avatar_url}}
                style={styles.playerAvatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  {
                    backgroundColor: isDark
                      ? theme.colors.gray[700]
                      : theme.colors.gray[300],
                  },
                ]}>
                <Icon
                  name="user"
                  size={20}
                  color={
                    isDark ? theme.colors.gray[400] : theme.colors.gray[600]
                  }
                />
              </View>
            )}
          </View>

          {/* Player Info */}
          <View style={styles.playerInfoContainer}>
            <Text
              style={[
                styles.playerName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}>
              {playerName}
            </Text>
            <View style={styles.playerMeta}>
              <View style={styles.teamInfo}>
                {item.team_id && (
                  <TeamLogo teamId={item.team_id} size="small" />
                )}
                <Text
                  style={[
                    styles.teamText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  {teamName}
                </Text>
              </View>
              {(item.wtn_singles || item.wtn_doubles) && (
                <View style={styles.wtnContainer}>
                  {item.wtn_singles && (
                    <View style={styles.wtnBadge}>
                      <Text style={styles.wtnText}>
                        S: {item.wtn_singles.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  {item.wtn_doubles && (
                    <View style={styles.wtnBadge}>
                      <Text style={styles.wtnText}>
                        D: {item.wtn_doubles.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Icon
            name="chevron-right"
            size={20}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[400]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text
            style={[
              styles.infoText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Searching players...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, {color: theme.colors.error}]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={searchPlayers}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchPerformed && searchResults.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon
            name="search"
            size={48}
            color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.infoText,
              {
                color: isDark ? theme.colors.text.dark : theme.colors.gray[600],
              },
            ]}>
            No players found matching "{searchQuery}"
          </Text>
          <Text
            style={[
              styles.subInfoText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            Try adjusting your search or gender filter
          </Text>
        </View>
      );
    }

    if (!searchQuery.trim()) {
      return (
        <View style={styles.centerContainer}>
          <Icon
            name="user-plus"
            size={48}
            color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.infoText,
              {
                color: isDark ? theme.colors.text.dark : theme.colors.gray[600],
              },
            ]}>
            Search for players by name or team
          </Text>
          <Text
            style={[
              styles.subInfoText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            Enter at least 2 characters to start searching
          </Text>
        </View>
      );
    }

    return null;
  };

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
      {/* Search Header */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderBottomColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}>
        {/* Gender Filter */}
        <View style={styles.genderFilter}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              selectedGender === 'MALE' && {
                backgroundColor: theme.colors.primary[500],
              },
              {
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}
            onPress={() => handleGenderToggle('MALE')}>
            <Text
              style={[
                styles.genderButtonText,
                {
                  color:
                    selectedGender === 'MALE'
                      ? theme.colors.white
                      : isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                },
              ]}>
              Men
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderButton,
              selectedGender === 'FEMALE' && {
                backgroundColor: theme.colors.primary[500],
              },
              {
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}
            onPress={() => handleGenderToggle('FEMALE')}>
            <Text
              style={[
                styles.genderButtonText,
                {
                  color:
                    selectedGender === 'FEMALE'
                      ? theme.colors.white
                      : isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                },
              ]}>
              Women
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
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
            style={styles.searchIcon}
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
            placeholder="Search for a player by name..."
            placeholderTextColor={
              isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoFocus={true}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon
                name="x"
                size={18}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
                }
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Players List */}
      <FlatList
        data={searchResults}
        renderItem={renderPlayerItem}
        keyExtractor={item => item.person_id}
        contentContainerStyle={[
          styles.listContent,
          // If no items and not loading, center the empty state
          searchResults.length === 0 && {flex: 1},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: theme.spacing[4],
    borderBottomWidth: 1,
  },
  genderFilter: {
    flexDirection: 'row',
    marginBottom: theme.spacing[3],
    gap: theme.spacing[2],
  },
  genderButton: {
    flex: 1,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  searchIcon: {
    marginRight: theme.spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    height: 40,
  },
  listContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[24], // Extra padding at bottom for tab bar
  },
  playerCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
    ...theme.shadows.md,
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: theme.spacing[3],
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfoContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    marginBottom: theme.spacing[1],
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamText: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[2],
  },
  wtnContainer: {
    flexDirection: 'row',
    gap: theme.spacing[1],
  },
  wtnBadge: {
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.sm,
  },
  wtnText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.primary[700],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  infoText: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginTop: theme.spacing[3],
    maxWidth: '80%',
  },
  subInfoText: {
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing[2],
    maxWidth: '80%',
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginTop: theme.spacing[3],
  },
  retryButton: {
    marginTop: theme.spacing[4],
    backgroundColor: theme.colors.primary[500],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
});

export default PlayerSearchScreen;
