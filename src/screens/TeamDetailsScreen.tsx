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
}; // src/screens/TeamDetailScreen.tsx
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
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>('2024');
  const [seasons] = useState<string[]>(['2024', '2023', '2022', '2021']);
  const [matchScores, setMatchScores] = useState<Record<string, any>>({});

  // Handle season selection
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const selectSeason = (season: string) => {
    setSelectedSeason(season);
    setDropdownVisible(false);
  };

  // Fetch team data
  const fetchTeamData = async () => {
    try {
      setLoading(true);

      // Fetch team data
      const teamData = await api.teams.getById(teamId);

      // Clean the team name from gender markers
      if (teamData && teamData.name) {
        teamData.name = cleanTeamName(teamData.name);
      }

      setTeam(teamData);

      // Fetch team players (roster)
      const rosterData = await api.players.getAll(teamId);
      setRoster(rosterData || []);

      // Fetch matches for this team
      // Since we don't have getAllByTeam, we'll get all matches and filter
      const allMatches = await api.matches.getAll();
      const teamMatches = allMatches.filter(
        match => match.home_team_id === teamId || match.away_team_id === teamId,
      );

      // Optionally filter by season if needed
      const filteredMatches = selectedSeason
        ? teamMatches.filter(match => match.season === selectedSeason)
        : teamMatches;

      setMatches(filteredMatches);

      // For stats, we'll calculate them from match data since we don't have a getTeamStats endpoint
      if (filteredMatches.length > 0) {
        const calculatedStats = {
          total_wins: 0,
          total_losses: 0,
          conference_wins: 0,
          conference_losses: 0,
          home_wins: 0,
          home_losses: 0,
          away_wins: 0,
          away_losses: 0,
        };

        // Get scores for completed matches
        const completedMatches = filteredMatches.filter(
          match => match.completed,
        );
        const scorePromises = completedMatches.map(match =>
          api.matches.getScore(match.id),
        );

        const scores = await Promise.all(scorePromises);

        // Create scores map and calculate stats
        const scoresMap: Record<string, any> = {};
        completedMatches.forEach((match, index) => {
          const score = scores[index];
          scoresMap[match.id] = score;

          const isHome = match.home_team_id === teamId;
          const teamWon = isHome
            ? score.home_team_score > score.away_team_score
            : score.away_team_score > score.home_team_score;

          if (teamWon) {
            calculatedStats.total_wins++;
            if (match.is_conference_match) calculatedStats.conference_wins++;
            if (isHome) calculatedStats.home_wins++;
            else calculatedStats.away_wins++;
          } else {
            calculatedStats.total_losses++;
            if (match.is_conference_match) calculatedStats.conference_losses++;
            if (isHome) calculatedStats.home_losses++;
            else calculatedStats.away_losses++;
          }
        });

        setMatchScores(scoresMap);
        setStats(calculatedStats);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError('Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load of data
  useEffect(() => {
    fetchTeamData();
  }, [teamId, selectedSeason]);

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
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
  const renderTeamHeader = () => (
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
        <TeamLogo teamId={team.id} size="large" />
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
            {team.name}
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
          <Text
            style={[
              styles.genderText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            {team.gender === 'MALE' ? "Men's" : "Women's"} Tennis
          </Text>
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

      {/* Team Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
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
                  styles.statValue,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {stats.total_wins}-{stats.total_losses}
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
                Overall
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
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
                  styles.statValue,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {stats.conference_wins}-{stats.conference_losses}
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
                Conference
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statCard,
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
                  styles.statValue,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {stats.home_wins}-{stats.home_losses}
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
                Home
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
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
                  styles.statValue,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {stats.away_wins}-{stats.away_losses}
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
                Away
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

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
      <View style={styles.sectionHeader}>
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
          numColumns={2}
          scrollEnabled={false}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[
                styles.playerCard,
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
              <View style={styles.playerInfo}>
                {item.avatar_url ? (
                  <View style={styles.avatarContainer}>
                    {/* You would use an Image component here for the avatar */}
                    <Icon
                      name="user"
                      size={16}
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
                      size={16}
                      color={
                        isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[400]
                      }
                    />
                  </View>
                )}
                <Text
                  style={[
                    styles.playerName,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {item.first_name} {item.last_name}
                </Text>
              </View>
              <Icon
                name="chevron-right"
                size={16}
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
    // Sort matches by date
    const sortedMatches = [...matches].sort((a, b) => {
      // Put completed matches first
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      // Then sort by date (newest first for completed, oldest first for upcoming)
      const dateA = new Date(a.start_date);
      const dateB = new Date(b.start_date);
      return a.completed
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
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
            const opponent_id =
              match.home_team_id === teamId
                ? match.away_team_id
                : match.home_team_id;
            const isHome = match.home_team_id === teamId;
            const score = matchScores[match.id];

            // Determine if team won
            let teamWon = false;
            let scoreDisplay = '';

            if (match.completed && score) {
              if (isHome) {
                teamWon = score.home_team_score > score.away_team_score;
                scoreDisplay = `${score.home_team_score}-${score.away_team_score}`;
              } else {
                teamWon = score.away_team_score > score.home_team_score;
                scoreDisplay = `${score.away_team_score}-${score.home_team_score}`;
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
                    <TeamLogo teamId={opponent_id || ''} size="small" />
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
                      {/* Clean the opponent name if available */}
                      {opponent_id ? cleanTeamName('Opponent') : 'Unknown'}
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
                          {teamWon ? 'W' : 'L'}, {scoreDisplay}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.matchTime,
                          {
                            color: isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[600],
                          },
                        ]}>
                        {match.scheduled_time
                          ? format(new Date(match.scheduled_time), 'h:mm a')
                          : 'TBA'}
                      </Text>
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
        {renderTeamHeader()}
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
  teamInfo: {
    alignItems: 'center',
    marginTop: theme.spacing[2],
  },
  teamName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.base,
    marginTop: theme.spacing[1],
  },
  genderText: {
    fontSize: theme.typography.fontSize.base,
    marginTop: theme.spacing[1],
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
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[3],
  },
  statCard: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    padding: theme.spacing[3],
    alignItems: 'center',
    marginHorizontal: theme.spacing[1],
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
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
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[2],
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[2],
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
    fontWeight: '600',
  },
  matchDate: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
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
  },
  opponentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    marginLeft: theme.spacing[2],
    flex: 1,
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
    fontWeight: '700',
  },
  matchTime: {
    fontSize: theme.typography.fontSize.sm,
  },
});

export default TeamDetailScreen;
