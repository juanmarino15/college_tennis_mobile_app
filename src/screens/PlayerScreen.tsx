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
import RankingHistoryChart from '../components/RankingHistoryChart';

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
  team_name: string;
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [wtnData, setWtnData] = useState<Array<any>>([]);
  const [seasonsData, setSeasonsData] = useState<{[name: string]: string}>({});
  const [loadingSeasons, setLoadingSeasons] = useState<boolean>(false);
  const [playerRankingHistory, setPlayerRankingHistory] = useState<any[]>([]);
  const [playerRanking, setPlayerRanking] = useState<any>(null);

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
      console.log(teamData);

      // Fetch WTN data - pass the season if we have seasons data loaded
      try {
        // Get the season ID for the selected season
        const seasonId = seasonsData[selectedSeason];
        // If we have the season ID, fetch WTN with season filter
        // Otherwise fetch all WTN data and filter client-side
        const wtnResult = await api.players.getWTN(
          playerId,
          seasonId ? selectedSeason : undefined,
        );
        setWtnData(wtnResult || []);
      } catch (err) {
        console.error('Error fetching WTN data:', err);
        setWtnData([]);
      }

      // Fetch player match results
      const results: any = await fetchPlayerMatches(playerId, selectedSeason);
      setMatchResults(results);
      setFilteredMatches(results);

      // Initially calculate stats based on all matches
      setCalculatedStats(calculateStatsFromFilteredMatches(results));

      // Fetch position data directly
      await fetchPlayerPositions(playerId, selectedSeason);

      // Fetch player ranking history - ADD THIS HERE
      try {
        const rankingHistory = await api.rankings.getPlayerSinglesHistory(
          playerId,
        );
        console.log('Full player ranking history:', rankingHistory);

        if (rankingHistory && rankingHistory.length > 0) {
          const seasonRankings = rankingHistory.filter((ranking: any) => {
            const rankingDate = new Date(ranking.publish_date);
            const rankingYear = rankingDate.getFullYear();
            const rankingMonth = rankingDate.getMonth();

            // Determine which season this ranking belongs to
            // Tennis season typically runs from fall to spring
            const seasonYear =
              rankingMonth >= 8 ? rankingYear : rankingYear - 1;

            return seasonYear.toString() === selectedSeason;
          });

          setPlayerRankingHistory(seasonRankings);

          // Set current ranking (most recent)
          if (seasonRankings.length > 0) {
            setPlayerRanking(seasonRankings[0]);
          }
        }
      } catch (rankingErr) {
        console.error('Error fetching player ranking:', rankingErr);
        setPlayerRankingHistory([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Failed to load player data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to get WTN values for the current season
  const getWtnValues = () => {
    if (!wtnData || wtnData.length === 0) return {singles: null, doubles: null};

    // Filter to current season if possible
    let seasonWTNs = wtnData;

    // Get the season ID for the selected season name
    const seasonId = seasonsData[selectedSeason];

    if (seasonId) {
      // Filter WTN data by the current season ID
      const seasonData = wtnData.filter(wtn => wtn.season_id === seasonId);
      if (seasonData.length > 0) {
        seasonWTNs = seasonData;
      }
    }

    // Get singles and doubles WTN values
    const singlesWTN = seasonWTNs.find(wtn => wtn.wtn_type === 'SINGLE');
    const doublesWTN = seasonWTNs.find(wtn => wtn.wtn_type === 'DOUBLE');

    return {
      singles: singlesWTN?.tennis_number || null,
      doubles: doublesWTN?.tennis_number || null,
    };
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
      wtn_singles: playerStats?.wtn_singles,
      wtn_doubles: playerStats?.wtn_doubles,
    };
  };

  // Fetch player positions data
  const fetchPlayerPositions = async (playerId: string, season: string) => {
    try {
      const positionsData = await api.players.getPositions(playerId, season);

      // Store the complete positions data
      setPositionsData(positionsData);
    } catch (err) {
      console.error('Error fetching player positions:', err);
    }
  };

  const fetchSeasons = async () => {
    try {
      setLoadingSeasons(true);
      const seasons = await api.seasons.getAll();

      // Create a mapping of season name to season ID
      const seasonsMap: {[name: string]: string} = {};
      seasons.forEach(season => {
        seasonsMap[season.name] = season.id;
      });

      setSeasonsData(seasonsMap);
      console.log('Seasons data loaded:', seasonsMap);
    } catch (err) {
      console.error('Error fetching seasons:', err);
    } finally {
      setLoadingSeasons(false);
    }
  };

  // Initial load of data
  useEffect(() => {
    fetchPlayerData();
  }, [playerId, selectedSeason, seasonsData]);

  useEffect(() => {
    fetchSeasons();
  }, []);

  // This function determines if a match is a dual match
  const isDualMatch = (match: MatchResult) => {
    return match.position > 0;
  };

  // Parse team name (removed duplicate function)
  const parseTeamName = (teamName: string) => {
    // Remove gender designation like "(M)" or "(W)" from the end
    const nameParts = teamName.split(/\s*\([MW]\)\s*$/);
    return nameParts[0]; // Return the name without the gender designation
  };

  // Filter and sort matches based on filters and sort order
  useEffect(() => {
    if (matchResults.length > 0) {
      // First apply match type filter
      let filtered = [...matchResults];

      if (matchTypeFilter === 'dual') {
        filtered = filtered.filter(match => isDualMatch(match));
      } else if (matchTypeFilter === 'non-dual') {
        filtered = filtered.filter(match => !isDualMatch(match));
      }

      // Then sort matches by date according to sort order
      filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();

        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });

      setFilteredMatches(filtered);

      // Calculate stats based on filtered matches
      setCalculatedStats(calculateStatsFromFilteredMatches(filtered));
    }
  }, [matchResults, matchTypeFilter, sortOrder]);

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlayerData();
  };

  // Navigate to team details
  const navigateToTeam = (teamId: string) => {
    navigation.navigate('TeamDetail', {teamId});
  };

  if (loading && !refreshing) {
    return (
      <View
        style={[
          styles.loadingContainer,
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
          Loading match details...
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
  const renderPlayerHeader = () => {
    const wtnValues = getWtnValues();
    console.log(playerTeam);
    const universityName = playerTeam?.team_name
      ? parseTeamName(playerTeam.team_name)
      : '';

    return (
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
                  color={
                    isDark ? theme.colors.gray[600] : theme.colors.gray[400]
                  }
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
              {playerRanking ? `#${playerRanking.rank} ` : ''}
              {player.first_name} {player.last_name}
            </Text>

            {/* Display University Name */}
            {universityName && (
              <Text
                style={[
                  styles.universityName,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}>
                {universityName}
              </Text>
            )}

            {/* WTN Data Display */}
            {(wtnValues.singles !== null || wtnValues.doubles !== null) && (
              <View style={styles.wtnContainer}>
                {wtnValues.singles !== null && (
                  <View style={styles.wtnBadge}>
                    <Text style={styles.wtnLabel}>UTR-S</Text>
                    <Text style={styles.wtnValue}>
                      {wtnValues.singles.toFixed(1)}
                    </Text>
                  </View>
                )}

                {wtnValues.doubles !== null && (
                  <View style={styles.wtnBadge}>
                    <Text style={styles.wtnLabel}>UTR-D</Text>
                    <Text style={styles.wtnValue}>
                      {wtnValues.doubles.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            )}

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
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
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

        {/* Match Type Filters Row */}
        <View style={styles.filtersRow}>
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
  };

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

  // The renderMatchResults function with unused code removed and simplified
  const renderMatchResults = () => {
    // Filter matches by type
    const singles = filteredMatches.filter(
      match => match.match_type === 'SINGLES',
    );
    const doubles = filteredMatches.filter(
      match => match.match_type === 'DOUBLES',
    );

    // Helper function to check if score indicates DNF
    const isDnfScore = (scoreStr: string): boolean => {
      // Common DNF indicators in tennis scores
      return (
        !scoreStr ||
        scoreStr.toLowerCase().includes('dnf') ||
        scoreStr.toLowerCase().includes('ret') ||
        scoreStr.toLowerCase().includes('def') ||
        scoreStr.toLowerCase().includes('w/o') ||
        scoreStr.toLowerCase().includes('walkover')
      );
    };

    // Helper function to parse score string into sets
    const parseScoreSets = (scoreStr: string) => {
      if (!scoreStr || isDnfScore(scoreStr)) return [];

      // Common formats: "6-4 7-5" or "6-4, 7-5" or "6-4,7-5"
      const cleanedScore = scoreStr.replace(/,\s*/g, ' ');
      const sets = cleanedScore.split(' ').filter(set => set.includes('-'));

      return sets.map(set => {
        // Handle tiebreak scores like "7-6(7-2)" or "7-6(10-8)"
        const tiebreakMatch = set.match(/(\d+)-(\d+)(?:\((\d+)(?:-(\d+))?\))?/);

        if (!tiebreakMatch) return {winnerScore: '0', loserScore: '0'};

        const winnerScore = tiebreakMatch[1];
        const loserScore = tiebreakMatch[2];

        // Extract tiebreak value if present
        let tiebreakWinner = null;
        let tiebreakLoser = null;

        if (tiebreakMatch[3]) {
          tiebreakWinner = tiebreakMatch[3];
          tiebreakLoser = tiebreakMatch[4] || null;
        }

        return {
          winnerScore,
          loserScore,
          tiebreakWinner,
          tiebreakLoser,
        };
      });
    };

    // Render a match card with consistent layout
    const renderMatchCard = (
      item: MatchResult,
      matchType: 'singles' | 'doubles',
    ) => {
      // Check if the match was completed or DNF
      const isDnf = isDnfScore(item.score);
      // Parse score sets
      const sets = parseScoreSets(item.score);

      return (
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
          activeOpacity={0.7}
          disabled={true}>
          <View style={styles.matchCardContent}>
            {/* Left Section: Match Info */}
            <View style={styles.matchLeftSection}>
              {/* Position & Date */}
              <View style={styles.matchInfoRow}>
                <Text
                  style={[
                    styles.matchPosition,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  {isDualMatch(item) ? `#${item.position}` : 'Non-Dual'}
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
              <View style={styles.opponentContainer}>
                {/* First row: Logo + Opponent for both singles and doubles */}
                <View style={styles.opponentRowSingles}>
                  <TeamLogo
                    teamId={item.opponent_team_id}
                    size="small"
                    containerStyle={styles.teamLogoContainer}
                  />
                  <Text
                    style={[
                      styles.opponentName,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      },
                    ]}
                    numberOfLines={1}>
                    vs. {item.opponent_name1}
                    {matchType === 'doubles' && item.opponent_name2
                      ? `/${item.opponent_name2.split(' ')[1] || ''}`
                      : ''}
                  </Text>
                </View>

                {/* Second row: Partner name for doubles only */}
                {matchType === 'doubles' && item.partner_name && (
                  <Text
                    style={[
                      styles.partnerName,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                        marginLeft: 32, // Align with text above (after logo)
                      },
                    ]}
                    numberOfLines={1}>
                    w/ {item.partner_name}
                  </Text>
                )}
              </View>
            </View>

            {/* Right Section: Result & Score */}
            <View style={styles.matchRightSection}>
              {/* Result Chip - Show 'DNF' or 'W'/'L' */}
              {isDnf ? (
                <View
                  style={[
                    styles.resultChip,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray[700]
                        : theme.colors.gray[500],
                    },
                  ]}>
                  <Text style={styles.resultChipText}>DNF</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.resultChip,
                    {
                      backgroundColor: item.won
                        ? theme.colors.success
                        : theme.colors.error,
                    },
                  ]}>
                  <Text style={styles.resultChipText}>
                    {item.won ? 'W' : 'L'}
                  </Text>
                </View>
              )}

              {/* Score Sets in grid */}
              {isDnf ? (
                // Show score string for DNF matches
                <Text
                  style={[
                    styles.dnfScoreText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  {item.score || 'DNF'}
                </Text>
              ) : (
                <View style={styles.scoresGrid}>
                  {sets.map((set, index) => (
                    <View key={index} style={styles.scoreSetColumn}>
                      {/* Player's score */}
                      <View style={styles.scoreWithSuperscript}>
                        <Text
                          style={[
                            styles.scoreValue,
                            item.won ? styles.winnerScore : styles.loserScore,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.text.light,
                            },
                          ]}>
                          {item.won ? set.winnerScore : set.loserScore}
                        </Text>
                        {/* Show tiebreak value as superscript if present and this player won the tiebreak */}
                        {item.won && set.tiebreakWinner && (
                          <Text style={styles.tiebreakSuper}>
                            {set.tiebreakWinner}
                          </Text>
                        )}
                        {!item.won && set.tiebreakLoser && (
                          <Text style={styles.tiebreakSuper}>
                            {set.tiebreakLoser}
                          </Text>
                        )}
                      </View>

                      {/* Opponent's score */}
                      <View style={styles.scoreWithSuperscript}>
                        <Text
                          style={[
                            styles.scoreValue,
                            item.won ? styles.loserScore : styles.winnerScore,
                            {
                              color: isDark
                                ? theme.colors.text.dimDark
                                : theme.colors.gray[500],
                            },
                          ]}>
                          {item.won ? set.loserScore : set.winnerScore}
                        </Text>
                        {/* Show tiebreak value as superscript if present and opponent won the tiebreak */}
                        {!item.won && set.tiebreakWinner && (
                          <Text style={styles.tiebreakSuper}>
                            {set.tiebreakWinner}
                          </Text>
                        )}
                        {item.won && set.tiebreakLoser && (
                          <Text style={styles.tiebreakSuper}>
                            {set.tiebreakLoser}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    };

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
        {filteredMatches.length === 0 ? (
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
                  renderItem={({item}) => renderMatchCard(item, 'singles')}
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
                  renderItem={({item}) => renderMatchCard(item, 'doubles')}
                />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRankingHistory = () => {
    if (!playerRankingHistory || playerRankingHistory.length === 0) {
      return null;
    }

    return (
      <RankingHistoryChart
        rankingHistory={playerRankingHistory}
        isDark={isDark}
        theme={theme}
        selectedSeason={selectedSeason}
      />
    );
  };

  // Main render function
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
        {renderRankingHistory()}
        {renderPositionsChart()}
        {renderMatchResults()}
      </ScrollView>
    </View>
  );
};

// Cleaned up StyleSheet - removed unused styles and consolidated duplicate styles
const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    marginTop: 70,
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[40],
  },

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Card styles
  headerCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
  },
  sectionCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
  },

  // Header content
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
  universityName: {
    fontSize: theme.typography.fontSize.base,
    marginVertical: theme.spacing[1],
    fontWeight: '500',
    textAlign: 'center',
  },

  // Team button
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

  // Season selector
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

  // Stats display
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

  // Section headers
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

  // Filter styles
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing[4],
    flexWrap: 'wrap',
    rowGap: 10,
  },
  matchTypeFilter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 2,
    marginRight: theme.spacing[2],
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

  // Match card styles
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
    marginBottom: theme.spacing[2],
    overflow: 'hidden',
  },
  matchCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing[3],
  },
  matchLeftSection: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: theme.spacing[2],
    maxWidth: '70%',
  },
  matchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  matchPosition: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    marginRight: theme.spacing[2],
  },
  matchDate: {
    fontSize: theme.typography.fontSize.xs,
  },

  // Opponent display
  opponentContainer: {
    flexDirection: 'column',
  },
  opponentRowSingles: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  teamLogoContainer: {
    marginRight: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  opponentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    flexShrink: 1,
  },
  partnerName: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: 2,
  },

  // Match result display
  matchRightSection: {
    alignItems: 'flex-end',
    minWidth: 100,
    justifyContent: 'center',
  },
  resultChip: {
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing[1],
    alignSelf: 'flex-end',
  },
  resultChipText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dnfScoreText: {
    fontSize: theme.typography.fontSize.xs,
    fontStyle: 'italic',
  },

  // Score display
  scoresGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scoreSetColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: theme.spacing[1],
    minWidth: 16,
  },
  scoreValue: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    height: 20, // Fixed height to ensure alignment
    lineHeight: 20,
  },
  winnerScore: {
    fontWeight: '700',
  },
  loserScore: {
    fontWeight: '400',
  },
  scoreWithSuperscript: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: 20,
  },
  tiebreakSuper: {
    fontSize: 9,
    lineHeight: 10,
    fontWeight: '500',
    color: '#666',
    marginLeft: 1,
    marginTop: 1,
  },

  // WTN styles
  wtnContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: -25,
  },
  wtnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  wtnLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 4,
  },
  wtnValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Empty state
  emptyStateText: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
    padding: theme.spacing[4],
  },
});

export default PlayerScreen;
