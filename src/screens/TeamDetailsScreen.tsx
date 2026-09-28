// src/screens/TeamDetailScreen.tsx
import React, {useState, useEffect, useContext, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {format} from 'date-fns';
import Icon from 'react-native-vector-icons/Feather';
import {ThemeContext} from '../../App';
import theme from '../theme';
import TeamLogo from '../components/TeamLogo';
import {api, Match, Team, Player} from '../api';
import RankingHistoryChart from '../components/RankingHistoryChart';
import cacheService from '../services/cacheService';
import {getCurrentSeasonYear, getRecentSeasons} from '../utils/season';

// Format date for display
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return {
      weekday: format(date, 'EEE').toUpperCase(),
      month: format(date, 'MMM').toUpperCase(),
      day: format(date, 'd'),
    };
  } catch (e) {
    return {
      weekday: 'TBD',
      month: 'TBD',
      day: 'TBD',
    };
  }
};

// Define navigation props
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  MatchDetail: {matchId: string};
  PlayerDetail: {playerId: string};
};

type TeamDetailScreenRouteProp = RouteProp<RootStackParamList, 'TeamDetail'>;
type TeamDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TeamDetail'
>;

interface TeamDetailScreenProps {
  route: TeamDetailScreenRouteProp;
  navigation: TeamDetailScreenNavigationProp;
}

interface TeamStats {
  total_wins: number;
  total_losses: number;
  conference_wins: number;
  conference_losses: number;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
}

const TeamDetailScreen: React.FC<TeamDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const {teamId} = route.params;
  const {isDark} = useContext(ThemeContext);

  // State variables
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [opponentTeams, setOpponentTeams] = useState<Record<string, Team>>({});
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>(
    getCurrentSeasonYear(),
  );
  const [seasons] = useState<string[]>(() => getRecentSeasons(5));
  const [matchScores, setMatchScores] = useState<Record<string, any>>({});
  const [matchSortOrder, setMatchSortOrder] = useState('newest');
  const [teamRanking, setTeamRanking] = useState<any>(null);
  const [teamRankingHistory, setTeamRankingHistory] = useState<any[]>([]);
  const [hasSeasonData, setHasSeasonData] = useState(true);

  // Handle season selection
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const selectSeason = (season: string) => {
    setSelectedSeason(season);
    setDropdownVisible(false);
  };

  // Ignore responses from requests that were superseded (e.g. quick season changes)
  const fetchIdRef = useRef(0);

  // Fetch team data
  const fetchTeamData = async () => {
    const fetchId = ++fetchIdRef.current;
    const isStale = () => fetchId !== fetchIdRef.current;
    try {
      setLoading(true);

      // Fetch team data
      const teamData = await api.teams.getById(teamId);

      try {
        const rankingHistory = await api.rankings.getTeamRankingHistory(teamId);
        if (isStale()) {
          return;
        }

        if (!rankingHistory || rankingHistory.length === 0) {
          setTeamRankingHistory([]);
          setTeamRanking(null);
        } else {
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

          setTeamRankingHistory(seasonRankings);

          // Current ranking is the most recent; clear it for seasons without one
          setTeamRanking(seasonRankings.length > 0 ? seasonRankings[0] : null);
        }
      } catch (rankingErr) {
        console.log('Error fetching team ranking:', rankingErr);
        if (!isStale()) {
          setTeamRankingHistory([]);
          setTeamRanking(null);
        }
      }
      if (isStale()) {
        return;
      }

      // Clean the team name from gender markers
      if (teamData && teamData.name) {
        teamData.name = cleanTeamName(teamData.name);
      }

      setTeam(teamData);

      // Fetch team roster for the selected season
      let rosterData = [];
      if (api.teams.getRoster) {
        // Use the getRoster method if available
        rosterData = await api.teams.getRoster(teamId, selectedSeason);
      } else {
        // Fallback to getAll players and filter by team
        const allPlayers = await api.players.getAll(teamId);
        rosterData = allPlayers || [];
      }
      if (isStale()) {
        return;
      }

      setRoster(rosterData);

      // Fetch matches for this team
      let teamMatches = [];
      if (api.matches.getAllByTeam) {
        // Use dedicated endpoint if available
        teamMatches = await api.matches.getAllByTeam(teamId, selectedSeason);
      } else {
        // Fallback: get all matches and filter
        const allMatches = await api.matches.getAll();
        teamMatches = allMatches.filter(
          match =>
            match.home_team_id === teamId || match.away_team_id === teamId,
        );

        // Optionally filter by season if needed
        if (selectedSeason) {
          teamMatches = teamMatches.filter(
            match => match.season === selectedSeason,
          );
        }
      }

      // Get all opponent team IDs
      const opponentIds = new Set<string>();
      teamMatches.forEach(match => {
        const opponentId =
          match.home_team_id === teamId
            ? match.away_team_id
            : match.home_team_id;
        if (opponentId) {
          opponentIds.add(opponentId);
        }
      });

      // Fetch all opponent team data in one batch request
      const teamsData: Record<string, Team> = {};
      if (opponentIds.size > 0) {
        try {
          const opponents = await api.teams.getBatch(Array.from(opponentIds));
          // Key by the IDs we asked for; the API may return them in another case
          const byUpperId = new Map(
            opponents.filter(Boolean).map(o => [o.id.toUpperCase(), o]),
          );
          opponentIds.forEach(id => {
            const opponent = byUpperId.get(id.toUpperCase());
            if (opponent) {
              teamsData[id] = opponent;
            }
          });
        } catch (err) {
          console.log('Error fetching opponent teams:', err);
        }
      }
      if (isStale()) {
        return;
      }

      setOpponentTeams(teamsData);
      setMatches(teamMatches);

      // For stats, use dedicated endpoint or calculate from matches
      let statsData: any = null;
      if (api.stats && api.stats.getTeamStats) {
        statsData = await api.stats.getTeamStats(teamId, selectedSeason);
        // Get scores for completed matches; a missing score doesn't fail the page
        const completedMatches = teamMatches.filter(match => match.completed);
        const scoresMap = await api.matches.getScores(
          completedMatches.map(match => match.id),
        );
        if (isStale()) {
          return;
        }
        setMatchScores(scoresMap);
      }

      setStats(statsData);
      setError(null);
    } catch (err) {
      if (isStale()) {
        return;
      }
      console.log('Error fetching team data:', err);
      setError('Failed to load team data. Please try again.');
    } finally {
      if (!isStale()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Initial load of data
  useEffect(() => {
    fetchTeamData();
  }, [teamId, selectedSeason]);

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    cacheService.forceRefresh();
    fetchTeamData();
  };

  // Navigate to player details
  const navigateToPlayer = (playerId: string) => {
    navigation.navigate('PlayerDetail', {playerId});
  };

  // Navigate to match details
  const navigateToMatch = (matchId: string) => {
    navigation.navigate('MatchDetail', {matchId});
  };

  // Utility function to clean team name (remove gender markers)
  const cleanTeamName = (name: string | undefined): string => {
    if (!name) return 'Unknown Team';

    // Remove gender markers like (M) or (W) from the name
    return name.replace(/\s*\([MW]\)\s*$/, '');
  };

  // Get opponent name
  const getOpponentName = (match: Match): string => {
    const opponentId =
      match.home_team_id === teamId ? match.away_team_id : match.home_team_id;

    if (!opponentId) return 'Unknown Team';

    const opponent = opponentTeams[opponentId];
    if (!opponent || !opponent.name) return 'Unknown Team';

    return cleanTeamName(opponent.name);
  };

  // Function to get timezone abbreviation
  const getTimezoneAbbr = (timezone: string) => {
    try {
      // This uses Intl.DateTimeFormat to get the timezone abbreviation
      const date = new Date();
      return (
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          timeZoneName: 'short',
        })
          .formatToParts(date)
          .find(part => part.type === 'timeZoneName')?.value || timezone
      );
    } catch (e) {
      console.log('Error getting timezone abbreviation:', e);
      return timezone; // Return the original timezone string if can't get abbreviation
    }
  };

  // Format time with timezone consideration
  const formatTimeWithTimezone = (timeString: string, timezone: string) => {
    try {
      // Parse the date as UTC/GMT
      // First ensure the string ends with 'Z' to indicate UTC time
      const utcTimeString = timeString.endsWith('Z')
        ? timeString
        : `${timeString}Z`;
      const date = new Date(utcTimeString);

      // Format options with the specified timezone
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      };

      // Format the time in the specified timezone
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (e) {
      console.log('Error formatting time with timezone:', e);
      // Fallback to basic formatting
      try {
        return format(new Date(timeString), 'h:mm a');
      } catch (fallbackError) {
        return 'TBA';
      }
    }
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
            justifyContent: 'center',
            alignItems: 'center',
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
          Loading team info...
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchTeamData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!team) return null;

  // Render team header
  // Last five completed results for the season, most recent first
  const recentForm = () =>
    matches
      .filter(match => match.completed && matchScores[match.id])
      .sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
      )
      .slice(0, 5)
      .map(match => {
        const score = matchScores[match.id];
        const isHome = match.home_team_id === teamId;
        return {
          id: match.id,
          won: isHome ? score.home_team_won : score.away_team_won,
          teamScore: isHome ? score.home_team_score : score.away_team_score,
          opponentScore: isHome ? score.away_team_score : score.home_team_score,
        };
      });

  const renderTeamHeader = () => {
    const dim = isDark ? theme.colors.text.dimDark : theme.colors.gray[500];
    const strong = isDark ? theme.colors.text.dark : theme.colors.text.light;
    const statItems = stats
      ? [
          {label: 'Overall', w: stats.total_wins, l: stats.total_losses},
          {
            label: 'Conference',
            w: stats.conference_wins,
            l: stats.conference_losses,
          },
          {label: 'Home', w: stats.home_wins, l: stats.home_losses},
          {label: 'Away', w: stats.away_wins, l: stats.away_losses},
        ]
      : [];
    const form = recentForm();
    const subtitle = [
      team.conference ? team.conference.replace(/_/g, ' ') : null,
      team.gender === 'MALE' ? "Men's Tennis" : "Women's Tennis",
    ]
      .filter(Boolean)
      .join(' · ');

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
        {/* Logo beside the name, FotMob style */}
        <View style={styles.heroRow}>
          <TeamLogo teamId={team.id} name={team.name} size="xlarge" />
          <View style={styles.heroText}>
            <Text style={[styles.teamName, {color: strong}]} numberOfLines={2}>
              {team.name.replace(/\s*\((M|W)\)$/, '')}
            </Text>
            <Text
              style={[styles.conferenceText, {color: dim}]}
              numberOfLines={1}>
              {subtitle}
            </Text>
            {teamRanking && (
              <View
                style={[
                  styles.rankChip,
                  {
                    backgroundColor: isDark
                      ? theme.colors.primary[900]
                      : theme.colors.primary[50],
                  },
                ]}>
                <Text
                  style={[
                    styles.rankChipText,
                    {
                      color: isDark
                        ? theme.colors.primary[200]
                        : theme.colors.primary[700],
                    },
                  ]}>
                  #{teamRanking.rank} ITA
                </Text>
              </View>
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
                          fontWeight: '500',
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

        {/* Season record: one strip instead of four boxed tiles */}
        {stats && (
          <View
            style={[
              styles.statsStrip,
              {
                borderTopColor: theme.colors.divider,
              },
            ]}>
            {statItems.map((item, index) => (
              <View
                key={item.label}
                style={[
                  styles.statCell,
                  index > 0 && {
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderLeftColor: theme.colors.divider,
                  },
                ]}>
                <Text style={[styles.statValue, {color: strong}]}>
                  {item.w}-{item.l}
                </Text>
                <Text style={[styles.statLabel, {color: dim}]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Last five results */}
        {form.length > 0 && (
          <View style={styles.formRow}>
            <Text style={[styles.formLabel, {color: dim}]}>Last 5</Text>
            <View style={styles.formChips}>
              {form.map(result => (
                <TouchableOpacity
                  key={result.id}
                  onPress={() => navigateToMatch(result.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${result.won ? 'Won' : 'Lost'} ${
                    result.teamScore
                  } to ${result.opponentScore}`}
                  style={[
                    styles.formChip,
                    {
                      backgroundColor: result.won
                        ? theme.colors.success
                        : theme.colors.error,
                    },
                  ]}>
                  <Text style={styles.formChipText}>
                    {result.teamScore}-{result.opponentScore}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render roster section
  const renderRoster = () => (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: isDark
            ? theme.colors.card.dark
            : theme.colors.card.light,
        },
      ]}>
      <View style={[styles.sectionHeader, {marginBottom: theme.spacing[3]}]}>
        <Icon
          name="users"
          size={18}
          color={isDark ? theme.colors.text.dark : theme.colors.gray[700]}
        />
        <Text
          style={[
            styles.sectionTitle,
            {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
          ]}>
          Roster
        </Text>
        <Text
          style={[
            styles.rosterCount,
            {
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[500],
            },
          ]}>
          ({roster.length})
        </Text>
      </View>

      {roster.length === 0 ? (
        <Text
          style={[
            styles.emptyStateText,
            {
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[500],
            },
          ]}>
          No roster information available
        </Text>
      ) : (
        <FlatList
          data={roster}
          keyExtractor={item => item.person_id}
          numColumns={1}
          scrollEnabled={false}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.playerCardSingle,
                {
                  backgroundColor: isDark
                    ? theme.colors.background.dark
                    : theme.colors.gray[50],
                  borderColor: isDark
                    ? theme.colors.border.dark
                    : theme.colors.border.light,
                },
              ]}
              onPress={() => navigateToPlayer(item.person_id)}
              activeOpacity={0.7}>
              <View style={styles.playerInfoSingle}>
                {item.avatar_url ? (
                  <View style={styles.avatarContainer}>
                    <Icon
                      name="user"
                      size={20}
                      color={
                        isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[400]
                      }
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      {
                        backgroundColor: isDark
                          ? theme.colors.gray[800]
                          : theme.colors.gray[200],
                      },
                    ]}>
                    <Icon
                      name="user"
                      size={20}
                      color={
                        isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[400]
                      }
                    />
                  </View>
                )}
                <View style={styles.playerNameContainer}>
                  <Text
                    style={[
                      styles.playerNameSingle,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      },
                    ]}>
                    {item.first_name} {item.last_name}
                  </Text>
                  <View style={styles.playerMetaRow}>
                    {item.class_year && (
                      <Text
                        style={[
                          styles.playerClass,
                          {
                            color: isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[500],
                          },
                        ]}>
                        {item.class_year}
                      </Text>
                    )}
                    {/* {item.wtn_singles && (
                    <>
                      <Text
                        style={[
                          styles.metaDivider,
                          {
                            color: isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[400],
                          },
                        ]}>
                        •
                      </Text>
                      <Text
                        style={[
                          styles.playerWTN,
                          {
                            color: isDark
                              ? theme.colors.primary[400]
                              : theme.colors.primary[600],
                          },
                        ]}>
                        WTN {item.wtn_singles.toFixed(2)}
                      </Text>
                    </>
                  )} */}
                  </View>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
                }
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  // Render matches section
  const renderMatches = () => {
    // Sort matches based on selected sort order
    const sortedMatches = [...matches].sort((a, b) => {
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);

      return matchSortOrder === 'newest'
        ? dateB.getTime() - dateA.getTime() // Newest first
        : dateA.getTime() - dateB.getTime(); // Oldest first
    });

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
        <View style={styles.sectionHeaderWithSort}>
          <View style={styles.sectionHeader}>
            <Icon
              name="calendar"
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
              Schedule & Results
            </Text>
          </View>

          {/* Sort Toggle */}
          <View
            style={[
              styles.sortToggleContainer,
              {
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                matchSortOrder === 'newest' && styles.sortButtonActive,
                {
                  backgroundColor:
                    matchSortOrder === 'newest'
                      ? isDark
                        ? theme.colors.primary[900]
                        : theme.colors.primary[100]
                      : 'transparent',
                },
              ]}
              onPress={() => setMatchSortOrder('newest')}>
              <Text
                style={[
                  styles.sortButtonText,
                  matchSortOrder === 'newest' && {
                    color: isDark
                      ? theme.colors.primary[400]
                      : theme.colors.primary[600],
                    fontWeight: '500',
                  },
                  {
                    color:
                      matchSortOrder !== 'newest'
                        ? isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[500]
                        : undefined,
                  },
                ]}>
                Latest
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                matchSortOrder === 'oldest' && styles.sortButtonActive,
                {
                  backgroundColor:
                    matchSortOrder === 'oldest'
                      ? isDark
                        ? theme.colors.primary[900]
                        : theme.colors.primary[100]
                      : 'transparent',
                },
              ]}
              onPress={() => setMatchSortOrder('oldest')}>
              <Text
                style={[
                  styles.sortButtonText,
                  matchSortOrder === 'oldest' && {
                    color: isDark
                      ? theme.colors.primary[400]
                      : theme.colors.primary[600],
                    fontWeight: '500',
                  },
                  {
                    color:
                      matchSortOrder !== 'oldest'
                        ? isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[500]
                        : undefined,
                  },
                ]}>
                Earliest
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {sortedMatches.length === 0 ? (
          <Text
            style={[
              styles.emptyStateText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            No matches scheduled
          </Text>
        ) : (
          sortedMatches.map(match => {
            const dateInfo = formatDate(match.start_date);
            const isHome = match.home_team_id === teamId;
            const opponentId = isHome ? match.away_team_id : match.home_team_id;

            // Console log the time data for debugging
            // Console log the time data for debugging
            // console.log(`Match ID: ${match.id}`);
            // console.log(`Raw start_date: ${match.start_date}`);
            // console.log(`Raw scheduled_time: ${match.scheduled_time}`);
            // console.log(`Timezone: ${match.timezone}`);
            // console.log(
            //   `Formatted time: ${
            //     match.scheduled_time && match.timezone
            //       ? formatTimeWithTimezone(match.scheduled_time, match.timezone)
            //       : 'TBA'
            //   }`,
            // );
            // console.log(
            //   `Timezone abbreviation: ${
            //     match.timezone ? getTimezoneAbbr(match.timezone) : 'N/A'
            //   }`,
            // );

            // Declare variables for result display
            let teamWon = false;
            let scoreDisplay = '';

            // Determine result display
            if (match.completed) {
              // Get score data from our scores map
              const score = matchScores[match.id];

              if (score) {
                const isHome = match.home_team_id === teamId;

                // Determine if team won and format score string
                if (isHome) {
                  teamWon = score.home_team_won;

                  // Format: W, 4-2 or L, 2-4
                  if (teamWon) {
                    scoreDisplay = `W, ${score.home_team_score}-${score.away_team_score}`;
                  } else {
                    scoreDisplay = `L, ${score.home_team_score}-${score.away_team_score}`;
                  }
                } else {
                  teamWon = score.away_team_won;

                  // Format: W, 4-2 or L, 2-4
                  if (teamWon) {
                    scoreDisplay = `W, ${score.away_team_score}-${score.home_team_score}`;
                  } else {
                    // This team's score first, like every other result
                    scoreDisplay = `L, ${score.away_team_score}-${score.home_team_score}`;
                  }
                }
              } else {
                // Fallback if no score available
                scoreDisplay = 'Result TBD';
              }
            }

            return (
              <TouchableOpacity
                key={match.id}
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
                  match.is_conference_match && {
                    borderLeftWidth: 4,
                    borderLeftColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => navigateToMatch(match.id)}
                activeOpacity={0.7}>
                <View style={styles.matchDetails}>
                  {/* Date Section */}
                  <View style={styles.matchDateSection}>
                    <Text
                      style={[
                        styles.matchDateWeekday,
                        {
                          color: isDark
                            ? theme.colors.text.dimDark
                            : theme.colors.gray[600],
                        },
                      ]}>
                      {dateInfo.weekday}
                    </Text>
                    <Text
                      style={[
                        styles.matchDate,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.text.light,
                        },
                      ]}>
                      {dateInfo.month} {dateInfo.day}
                    </Text>
                    <Text
                      style={[
                        styles.matchLocation,
                        {
                          color: isDark
                            ? theme.colors.text.dimDark
                            : theme.colors.gray[500],
                        },
                      ]}>
                      {isHome ? 'HOME' : 'AWAY'}
                    </Text>
                  </View>

                  {/* Opponent Section */}
                  <View style={styles.matchOpponentSection}>
                    <TeamLogo
                      teamId={opponentId || ''}
                      name={getOpponentName(match)}
                      size="medium"
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
                      numberOfLines={2}>
                      {getOpponentName(match)}
                    </Text>
                  </View>

                  {/* Score/Time Section */}
                  <View style={styles.matchResultSection}>
                    {match.completed ? (
                      <View
                        style={[
                          styles.scoreBox,
                          {
                            backgroundColor: teamWon
                              ? theme.colors.success + '20' // add transparency
                              : theme.colors.error + '20',
                            borderColor: teamWon
                              ? theme.colors.success
                              : theme.colors.error,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.scoreText,
                            {
                              color: teamWon
                                ? theme.colors.success
                                : theme.colors.error,
                            },
                          ]}>
                          {scoreDisplay}
                        </Text>
                      </View>
                    ) : (
                      <View>
                        <Text
                          style={[
                            styles.matchTime,
                            {
                              color: isDark
                                ? theme.colors.text.dimDark
                                : theme.colors.gray[600],
                            },
                          ]}>
                          {match.scheduled_time && match.timezone
                            ? formatTimeWithTimezone(
                                match.scheduled_time,
                                match.timezone,
                              )
                            : 'TBA'}
                        </Text>

                        {match.scheduled_time && match.timezone && (
                          <Text
                            style={[
                              styles.timezoneText,
                              {
                                color: isDark
                                  ? theme.colors.text.dimDark
                                  : theme.colors.gray[500],
                              },
                            ]}>
                            {getTimezoneAbbr(match.timezone)}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  const renderRankingHistory = () => {
    if (!teamRankingHistory || teamRankingHistory.length === 0) {
      return null;
    }

    return (
      <RankingHistoryChart
        rankingHistory={teamRankingHistory}
        isDark={isDark}
        theme={theme}
        selectedSeason={selectedSeason}
      />
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
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderBottomColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
          activeOpacity={0.7}>
          <Icon
            name="arrow-left"
            size={24}
            color={isDark ? theme.colors.text.dark : theme.colors.text.light}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          Team Details
        </Text>
      </View>

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
        {renderTeamHeader()}
        {renderRankingHistory()}
        {renderRoster()}
        {renderMatches()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the content
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerBackButton: {
    padding: 8,
    position: 'absolute',
    left: 16,
    zIndex: 1,
    top: 50,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[24], // Extra space at bottom for bottom navigation
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
    fontWeight: '500',
  },
  headerCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
    marginLeft: theme.spacing[3],
  },
  teamName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '600',
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: 2,
  },
  rankChip: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing[1.5],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  rankChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  seasonSelector: {
    marginTop: theme.spacing[3],
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
    width: 220,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  dropdownItemText: {
    fontSize: theme.typography.fontSize.base,
  },
  statsStrip: {
    flexDirection: 'row',
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  formLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  formChips: {
    flexDirection: 'row',
    gap: theme.spacing[1.5],
  },
  formChip: {
    minWidth: 38,
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: theme.spacing[1.5],
    borderRadius: theme.borderRadius.md,
  },
  formChipText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
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
  },
  sectionHeaderWithSort: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '500',
    marginLeft: theme.spacing[2],
  },
  sortToggleContainer: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortButton: {
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
  },
  sortButtonActive: {
    borderRadius: theme.borderRadius.sm,
  },
  sortButtonText: {
    fontSize: theme.typography.fontSize.xs,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
    padding: theme.spacing[4],
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[2],
    marginBottom: theme.spacing[2],
    marginRight: theme.spacing[2],
    flex: 1,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  matchCard: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[3],
    padding: theme.spacing[3],
  },
  matchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchDateSection: {
    width: 80,
  },
  matchDateWeekday: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  matchDate: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  matchLocation: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  matchOpponentSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    minHeight: 50, // Ensure minimum height for opponent section
  },
  opponentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    marginLeft: theme.spacing[2],
    flex: 1,
    height: 40, // More height for two lines of text
    lineHeight: 20, // Adjust line height for comfortable reading
    flexWrap: 'wrap', // Allow text to wrap
  },
  matchResultSection: {
    width: 80,
    alignItems: 'flex-end',
  },
  scoreBox: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  scoreText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  matchTime: {
    fontSize: theme.typography.fontSize.sm,
  },
  timezoneText: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: 2,
  },

  // Replace these styles:
  rosterCount: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[1],
  },
  playerCardSingle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  playerInfoSingle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  playerNameContainer: {
    flex: 1,
  },
  playerNameSingle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    marginBottom: theme.spacing[1],
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  playerClass: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  metaDivider: {
    fontSize: theme.typography.fontSize.xs,
  },
  playerWTN: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
});

export default TeamDetailScreen;
