// src/screens/PlayerScreen.tsx
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {format} from 'date-fns';
import Icon from 'react-native-vector-icons/Feather';
import {ThemeContext} from '../../App';
import theme from '../theme';
import {api} from '../api';
import TeamLogo from '../components/TeamLogo';
import PositionBarChart from '../components/PositionBarChart';
import {Alert} from 'react-native';

// Define navigation props
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  MatchDetail: {matchId: string};
  PlayerDetail: {playerId: string};
};

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'PlayerDetail'>;
type PlayerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PlayerDetail'
>;

interface PlayerScreenProps {
  route: PlayerScreenRouteProp;
  navigation: PlayerScreenNavigationProp;
}

// Types for player data
interface Player {
  person_id: string;
  tennis_id?: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface PlayerStats {
  singles_wins: number;
  singles_losses: number;
  singles_win_pct: number;
  doubles_wins: number;
  doubles_losses: number;
  doubles_win_pct: number;
  wtn_singles?: number;
  wtn_doubles?: number;
}

interface TeamInfo {
  id: string;
  name: string;
  abbreviation?: string;
}

interface MatchResult {
  id: string;
  match_id: string;
  date: string;
  opponent_name: string;
  opponent_team_id: string;
  is_home: boolean;
  match_type: string; // 'SINGLES' or 'DOUBLES'
  position: number;
  score: string;
  won: boolean;
  partner_name?: string;
  opponent_name1: string;
  opponent_name2?: string;
}

// Helper function to format date
const formatMatchDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (e) {
    return 'Unknown date';
  }
};

const PlayerScreen: React.FC<PlayerScreenProps> = ({route, navigation}) => {
  const {playerId} = route.params;
  const {isDark} = useContext(ThemeContext);

  // State variables
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerTeam, setPlayerTeam] = useState<TeamInfo | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('2024');
  const [seasons] = useState<string[]>(['2024', '2023', '2022', '2021']);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [positionsData, setPositionsData] = useState<{
    singles: Array<{
      position: number;
      matches_count: number;
      wins: number;
      losses: number;
    }>;
    doubles: Array<{
      position: number;
      matches_count: number;
      wins: number;
      losses: number;
    }>;
  }>({singles: [], doubles: []});
  const [matchTypeFilter, setMatchTypeFilter] = useState<
    'all' | 'dual' | 'non-dual'
  >('all');
  const [filteredMatches, setFilteredMatches] = useState<MatchResult[]>([]);
  const [calculatedStats, setCalculatedStats] = useState<PlayerStats | null>(
    null,
  );

  // Toggle dropdown for season selection
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  // Select season
  const selectSeason = (season: string) => {
    setSelectedSeason(season);
    setDropdownVisible(false);
  };

  // Fetch player data
  const fetchPlayerData = async () => {
    try {
      setLoading(true);

      // Fetch player details
      const playerData = await api.players.getById(playerId);
      setPlayer(playerData);

      // Find player's team
      const teamData: any = await fetchPlayerTeam(playerId);
      setPlayerTeam(teamData);

      // Fetch player match results
      const results: any = await fetchPlayerMatches(playerId, selectedSeason);
      setMatchResults(results);
      setFilteredMatches(results);

      // Initially calculate stats based on all matches
      setCalculatedStats(calculateStatsFromFilteredMatches(results));

      // Fetch position data directly
      await fetchPlayerPositions(playerId, selectedSeason);

      setError(null);
    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Failed to load player data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch player's team
  const fetchPlayerTeam = async (playerId: string) => {
    try {
      // Use the new endpoint directly
      return await api.players.getTeam(playerId, selectedSeason);
    } catch (err) {
      console.error('Error fetching player team:', err);
      return null;
    }
  };

  // Fetch player match results
  const fetchPlayerMatches = async (playerId: string, season: string) => {
    try {
      // Use the new match results endpoint
      return await api.players.getMatchResults(playerId, season);
    } catch (err) {
      console.error('Error fetching player matches:', err);
      return [];
    }
  };

  const calculateStatsFromFilteredMatches = (matches: MatchResult[]) => {
    const singles = matches.filter(match => match.match_type === 'SINGLES');
    const doubles = matches.filter(match => match.match_type === 'DOUBLES');

    const singlesWins = singles.filter(match => match.won).length;
    const singlesLosses = singles.length - singlesWins;
    const singlesWinPct =
      singles.length > 0 ? (singlesWins / singles.length) * 100 : 0;

    const doublesWins = doubles.filter(match => match.won).length;
    const doublesLosses = doubles.length - doublesWins;
    const doublesWinPct =
      doubles.length > 0 ? (doublesWins / doubles.length) * 100 : 0;

    return {
      singles_wins: singlesWins,
      singles_losses: singlesLosses,
      singles_win_pct: singlesWinPct,
      doubles_wins: doublesWins,
      doubles_losses: doublesLosses,
      doubles_win_pct: doublesWinPct,
      wtn_singles: playerStats?.wtn_singles, // Keep WTN ratings from API
      wtn_doubles: playerStats?.wtn_doubles, // Keep WTN ratings from API
    };
  };

  // Fetch player positions data
  const fetchPlayerPositions = async (playerId: string, season: string) => {
    try {
      const positionsData = await api.players.getPositions(playerId, season);
      console.log(positionsData);

      // Store the complete positions data
      setPositionsData(positionsData);
    } catch (err) {
      console.error('Error fetching player positions:', err);
    }
  };

  // Initial load of data
  useEffect(() => {
    fetchPlayerData();
  }, [playerId, selectedSeason]);

  // This function determines if a match is a dual match
  const isDualMatch = (match: MatchResult) => {
    return match.position > 0;
  };

  // This function classifies the match type
  const getMatchType = (match: MatchResult) => {
    return isDualMatch(match) ? 'dual' : 'non-dual';
  };

  // Filter matches based on match type
  useEffect(() => {
    if (matchResults.length > 0) {
      let filtered = [...matchResults];

      // Apply match type filter
      if (matchTypeFilter === 'dual') {
        filtered = filtered.filter(match => isDualMatch(match));
      } else if (matchTypeFilter === 'non-dual') {
        filtered = filtered.filter(match => !isDualMatch(match));
      }

      setFilteredMatches(filtered);

      // Calculate stats based on filtered matches
      setCalculatedStats(calculateStatsFromFilteredMatches(filtered));
    }
  }, [matchResults, matchTypeFilter]);

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlayerData();
  };

  // Navigate to match details
  const navigateToMatch = (matchId: string) => {
    navigation.navigate('MatchDetail', {matchId});
  };

  // Navigate to team details
  const navigateToTeam = (teamId: string) => {
    navigation.navigate('TeamDetail', {teamId});
  };

  if (loading && !refreshing) {
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
          Loading player info...
        </Text>
      </View>
    );
  }

  if (error) {
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
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchPlayerData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!player) return null;

  // Render player header with avatar and info
  const renderPlayerHeader = () => (
    <View
      style={[
        styles.headerCard,
        {
          backgroundColor: isDark
            ? theme.colors.card.dark
            : theme.colors.card.light,
        },
      ]}>
      <View style={styles.headerContent}>
        {/* Player Avatar */}
        {player.avatar_url ? (
          <View style={styles.avatarContainer}>
            {/* You would use an Image component here */}
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: isDark
                    ? theme.colors.gray[800]
                    : theme.colors.gray[300],
                },
              ]}>
              <Icon
                name="user"
                size={40}
                color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
              />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark
                  ? theme.colors.gray[800]
                  : theme.colors.gray[300],
              },
            ]}>
            <Icon
              name="user"
              size={40}
              color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
            />
          </View>
        )}

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <Text
            style={[
              styles.playerName,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            {player.first_name} {player.last_name}
          </Text>

          {playerTeam && (
            <TouchableOpacity
              onPress={() => playerTeam.id && navigateToTeam(playerTeam.id)}
              style={styles.teamButton}>
              {playerTeam.id && (
                <TeamLogo teamId={playerTeam.id} size="small" />
              )}
              <Text
                style={[
                  styles.teamName,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}>
                {playerTeam.name}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Season Selector */}
      <View style={styles.seasonSelector}>
        <TouchableOpacity
          style={[
            styles.dropdownButton,
            {
              backgroundColor: isDark
                ? theme.colors.background.dark
                : theme.colors.gray[50],
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}
          onPress={toggleDropdown}>
          <Icon name="calendar" size={16} color={theme.colors.primary[500]} />
          <Text
            style={[
              styles.dropdownLabel,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            {selectedSeason}-{parseInt(selectedSeason) + 1} Season
          </Text>
          <Icon
            name="chevron-down"
            size={16}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[500]}
          />
        </TouchableOpacity>

        {/* Dropdown Modal */}
        <Modal
          visible={dropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}>
            <View
              style={[
                styles.dropdownMenu,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                  top: 220, // Position below the dropdown button
                },
              ]}>
              {seasons.map(season => (
                <TouchableOpacity
                  key={season}
                  style={[
                    styles.dropdownItem,
                    selectedSeason === season && {
                      backgroundColor: isDark
                        ? theme.colors.primary[900]
                        : theme.colors.primary[50],
                    },
                  ]}
                  onPress={() => selectSeason(season)}>
                  <Text
                    style={[
                      styles.dropdownItemText,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      },
                      selectedSeason === season && {
                        color: isDark
                          ? theme.colors.primary[400]
                          : theme.colors.primary[600],
                        fontWeight: '600',
                      },
                    ]}>
                    {season}-{parseInt(season) + 1}
                  </Text>
                  {selectedSeason === season && (
                    <Icon
                      name="check"
                      size={16}
                      color={theme.colors.primary[500]}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Match Type Filter */}
      <View style={styles.matchTypeFilter}>
        <TouchableOpacity
          style={[
            styles.filterOption,
            matchTypeFilter === 'all' && styles.filterOptionActive,
            {
              backgroundColor:
                matchTypeFilter === 'all'
                  ? theme.colors.primary[500]
                  : isDark
                  ? theme.colors.background.dark
                  : theme.colors.gray[100],
            },
          ]}
          onPress={() => setMatchTypeFilter('all')}>
          <Text
            style={{
              color:
                matchTypeFilter === 'all'
                  ? theme.colors.white
                  : isDark
                  ? theme.colors.text.dark
                  : theme.colors.gray[700],
              fontSize: theme.typography.fontSize.xs,
              fontWeight: '600',
            }}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterOption,
            matchTypeFilter === 'dual' && styles.filterOptionActive,
            {
              backgroundColor:
                matchTypeFilter === 'dual'
                  ? theme.colors.primary[500]
                  : isDark
                  ? theme.colors.background.dark
                  : theme.colors.gray[100],
            },
          ]}
          onPress={() => setMatchTypeFilter('dual')}>
          <Text
            style={{
              color:
                matchTypeFilter === 'dual'
                  ? theme.colors.white
                  : isDark
                  ? theme.colors.text.dark
                  : theme.colors.gray[700],
              fontSize: theme.typography.fontSize.xs,
              fontWeight: '600',
            }}>
            Dual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterOption,
            matchTypeFilter === 'non-dual' && styles.filterOptionActive,
            {
              backgroundColor:
                matchTypeFilter === 'non-dual'
                  ? theme.colors.primary[500]
                  : isDark
                  ? theme.colors.background.dark
                  : theme.colors.gray[100],
            },
          ]}
          onPress={() => setMatchTypeFilter('non-dual')}>
          <Text
            style={{
              color:
                matchTypeFilter === 'non-dual'
                  ? theme.colors.white
                  : isDark
                  ? theme.colors.text.dark
                  : theme.colors.gray[700],
              fontSize: theme.typography.fontSize.xs,
              fontWeight: '600',
            }}>
            Non-Dual
          </Text>
        </TouchableOpacity>
      </View>

      {/* Player Stats Cards */}
      {calculatedStats && (
        <View style={styles.statsContainer}>
          {/* Singles Stats Card */}
          <View
            style={[
              styles.statsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.dark
                  : theme.colors.gray[50],
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}>
            <Text
              style={[
                styles.statsCardTitle,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              Singles
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {calculatedStats.singles_wins}-
                  {calculatedStats.singles_losses}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  Record
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {calculatedStats.singles_win_pct.toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  Win %
                </Text>
              </View>
              <View style={styles.statDivider} />
            </View>
          </View>

          {/* Doubles Stats Card */}
          <View
            style={[
              styles.statsCard,
              {
                backgroundColor: isDark
                  ? theme.colors.background.dark
                  : theme.colors.gray[50],
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}>
            <Text
              style={[
                styles.statsCardTitle,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              Doubles
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {calculatedStats.doubles_wins}-
                  {calculatedStats.doubles_losses}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  Record
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {calculatedStats.doubles_win_pct.toFixed(1)}%
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  Win %
                </Text>
              </View>
              <View style={styles.statDivider} />
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // Render positions played chart
  const renderPositionsChart = () => {
    // Check if we have any position data to display
    if (
      !positionsData ||
      ((!positionsData.singles || positionsData.singles.length === 0) &&
        (!positionsData.doubles || positionsData.doubles.length === 0))
    ) {
      return null;
    }

    return (
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
          },
        ]}>
        <View style={styles.sectionHeader}>
          <Icon
            name="bar-chart-2"
            size={18}
            color={isDark ? theme.colors.text.dark : theme.colors.gray[700]}
          />
          <Text
            style={[
              styles.sectionTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Position Stats
          </Text>
        </View>

        <PositionBarChart
          positionsData={positionsData}
          isDark={isDark}
          theme={theme}
        />
      </View>
    );
  };

  // Render match results
  const renderMatchResults = () => {
    // Change these lines in renderMatchResults
    const singles = filteredMatches.filter(
      match => match.match_type === 'SINGLES',
    );
    const doubles = filteredMatches.filter(
      match => match.match_type === 'DOUBLES',
    );

    return (
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
          },
        ]}>
        <View style={styles.sectionHeader}>
          <Icon
            name="list"
            size={18}
            color={isDark ? theme.colors.text.dark : theme.colors.gray[700]}
          />
          <Text
            style={[
              styles.sectionTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Match Results
          </Text>
        </View>

        {matchResults.length === 0 ? (
          <Text
            style={[
              styles.emptyStateText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            No match results for this season
          </Text>
        ) : (
          <View>
            {/* Singles Matches */}
            {singles.length > 0 && (
              <View style={styles.matchTypeSection}>
                <Text
                  style={[
                    styles.matchTypeTitle,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  Singles
                </Text>
                <FlatList
                  data={singles}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={[
                        styles.matchCard,
                        {
                          backgroundColor: isDark
                            ? theme.colors.background.dark
                            : theme.colors.white,
                          borderColor: isDark
                            ? theme.colors.border.dark
                            : theme.colors.border.light,
                        },
                      ]}
                      onPress={() => navigateToMatch(item.match_id)}
                      activeOpacity={0.7}>
                      <View style={styles.matchCardContent}>
                        {/* Match Meta Info */}
                        <View style={styles.matchMeta}>
                          <Text
                            style={[
                              styles.matchPosition,
                              {
                                color: isDark
                                  ? theme.colors.text.dimDark
                                  : theme.colors.gray[600],
                              },
                            ]}>
                            {isDualMatch(item)
                              ? `#${item.position}`
                              : 'Non-Dual'}
                          </Text>
                          <Text
                            style={[
                              styles.matchDate,
                              {
                                color: isDark
                                  ? theme.colors.text.dimDark
                                  : theme.colors.gray[600],
                              },
                            ]}>
                            {formatMatchDate(item.date)}
                          </Text>
                        </View>

                        {/* Opponent Info */}
                        <View style={styles.matchOpponent}>
                          <TeamLogo
                            teamId={item.opponent_team_id}
                            size="small"
                          />
                          <Text
                            style={[
                              styles.opponentName,
                              {
                                color: isDark
                                  ? theme.colors.text.dark
                                  : theme.colors.text.light,
                              },
                            ]}>
                            vs. {item.opponent_name1}
                          </Text>
                        </View>

                        {/* Result */}
                        <View
                          style={[
                            styles.resultContainer,
                            {
                              backgroundColor: item.won
                                ? theme.colors.success + '20'
                                : theme.colors.error + '20',
                              borderColor: item.won
                                ? theme.colors.success
                                : theme.colors.error,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.resultText,
                              {
                                color: item.won
                                  ? theme.colors.success
                                  : theme.colors.error,
                              },
                            ]}>
                            {item.won ? 'W' : 'L'} {item.score}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Doubles Matches */}
            {doubles.length > 0 && (
              <View style={styles.matchTypeSection}>
                <Text
                  style={[
                    styles.matchTypeTitle,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  Doubles
                </Text>
                <FlatList
                  data={doubles}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={[
                        styles.matchCard,
                        {
                          backgroundColor: isDark
                            ? theme.colors.background.dark
                            : theme.colors.white,
                          borderColor: isDark
                            ? theme.colors.border.dark
                            : theme.colors.border.light,
                        },
                      ]}
                      onPress={() => navigateToMatch(item.match_id)}
                      activeOpacity={0.7}>
                      <View style={styles.matchCardContent}>
                        {/* Match Meta Info */}
                        <View style={styles.matchMeta}>
                          <Text
                            style={[
                              styles.matchPosition,
                              {
                                color: isDark
                                  ? theme.colors.text.dimDark
                                  : theme.colors.gray[600],
                              },
                            ]}>
                            {isDualMatch(item)
                              ? `#${item.position}`
                              : 'Non-Dual'}
                          </Text>
                          <Text
                            style={[
                              styles.matchDate,
                              {
                                color: isDark
                                  ? theme.colors.text.dimDark
                                  : theme.colors.gray[600],
                              },
                            ]}>
                            {formatMatchDate(item.date)}
                          </Text>
                        </View>

                        {/* Doubles Info */}
                        <View style={styles.matchOpponent}>
                          <TeamLogo
                            teamId={item.opponent_team_id}
                            size="small"
                          />
                          <View>
                            <Text
                              style={[
                                styles.partnerName,
                                {
                                  color: isDark
                                    ? theme.colors.text.dimDark
                                    : theme.colors.gray[600],
                                },
                              ]}>
                              w/ {item.partner_name || 'Partner'}
                            </Text>
                            <Text
                              style={[
                                styles.opponentName,
                                {
                                  color: isDark
                                    ? theme.colors.text.dark
                                    : theme.colors.text.light,
                                },
                              ]}>
                              vs. {item.opponent_name1}
                              {item.opponent_name2
                                ? `/${item.opponent_name2}`
                                : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Result */}
                        <View
                          style={[
                            styles.resultContainer,
                            {
                              backgroundColor: item.won
                                ? theme.colors.success + '20'
                                : theme.colors.error + '20',
                              borderColor: item.won
                                ? theme.colors.success
                                : theme.colors.error,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.resultText,
                              {
                                color: item.won
                                  ? theme.colors.success
                                  : theme.colors.error,
                              },
                            ]}>
                            {item.won ? 'W' : 'L'} {item.score}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        )}
      </View>
    );
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Icon
          name="chevron-left"
          size={24}
          color={isDark ? theme.colors.text.dark : theme.colors.gray[700]}
        />
        <Text
          style={[
            styles.backButtonText,
            {color: isDark ? theme.colors.text.dark : theme.colors.gray[700]},
          ]}>
          Back
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }>
        {renderPlayerHeader()}
        {renderPositionsChart()}
        {renderMatchResults()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    marginLeft: theme.spacing[1],
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[40], // Extra space at bottom for bottom navigation
  },
  loadingText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  errorText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  headerCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInfo: {
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  playerName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.full,
  },
  teamName: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[2],
  },
  seasonSelector: {
    marginTop: theme.spacing[4],
    alignItems: 'center',
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    minWidth: 200,
  },
  dropdownLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing[2],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    width: 220,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownItemText: {
    fontSize: theme.typography.fontSize.base,
  },
  statsContainer: {
    marginTop: theme.spacing[4],
    gap: theme.spacing[3],
  },
  statsCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    padding: theme.spacing[3],
  },
  statsCardTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  statValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  sectionCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    marginLeft: theme.spacing[2],
  },
  chartContainer: {
    marginTop: theme.spacing[2],
    height: 150,
    justifyContent: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
    padding: theme.spacing[4],
  },
  matchTypeSection: {
    marginBottom: theme.spacing[4],
  },
  matchTypeTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    marginBottom: theme.spacing[2],
    paddingLeft: theme.spacing[1],
  },
  matchCard: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[3],
  },
  matchCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[3],
  },
  matchMeta: {
    width: 70,
  },
  matchPosition: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  matchDate: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  matchOpponent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
  },
  partnerName: {
    fontSize: theme.typography.fontSize.xs,
  },
  opponentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    marginLeft: theme.spacing[2],
  },
  resultContainer: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    minWidth: 70,
    alignItems: 'center',
  },
  resultText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  chartCaption: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing[4],
    flexWrap: 'wrap',
    rowGap: 10,
  },
  matchTypeFilter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterOption: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primary[500],
  },
});

export default PlayerScreen;
