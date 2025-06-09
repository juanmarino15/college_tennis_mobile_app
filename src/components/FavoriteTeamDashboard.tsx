// src/components/FavoriteTeamDashboard.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {api, Match as ApiMatch, Team as ApiTeam} from '../api';
import theme from '../theme';
import TeamLogo from './TeamLogo';
import {format} from 'date-fns';

// Define the navigation types
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  MatchDetail: {matchId: string};
  TeamsPage: undefined;
};

type FavoriteTeamsDashboardNavigationProp =
  StackNavigationProp<RootStackParamList>;

// Define interfaces for the component props and data structures
interface FavoriteTeamsDashboardProps {
  favoriteTeams: string[];
  isDark: boolean;
  onViewAll?: () => void; // Added this prop for View All button
}

// Extend the API Match interface with our component's needs
interface MatchWithScore extends ApiMatch {
  score?: {
    home_team_score: number;
    away_team_score: number;
    home_team_won?: boolean;
    away_team_won?: boolean;
  };
}

// Extend the API TeamRanking to use in our component
interface TeamRanking {
  team_id: string;
  rank: number;
}

const FavoriteTeamDashboard: React.FC<FavoriteTeamsDashboardProps> = ({
  favoriteTeams,
  isDark,
  onViewAll,
}) => {
  const navigation = useNavigation<FavoriteTeamsDashboardNavigationProp>();
  const [loading, setLoading] = useState<boolean>(true);
  const [teamsData, setTeamsData] = useState<ApiTeam[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithScore[]>([]);
  const [recentResults, setRecentResults] = useState<MatchWithScore[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);

  useEffect(() => {
    const fetchTeamsData = async () => {
      if (!favoriteTeams || favoriteTeams.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch team details, upcoming matches, and rankings in parallel
        const [teamsDetails, latestRankings] = await Promise.all([
          Promise.all(favoriteTeams.map(teamId => api.teams.getById(teamId))),
          api.rankings.getLatestTeamRankings(),
        ]);

        setTeamsData(teamsDetails);

        // Get today's date
        const today = new Date();

        // Get current season (e.g., "2024" for 2024-2025 season)
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11
        // If we're in the second half of the academic year (Jan-Jul), use previous year as season
        const currentSeason =
          currentMonth < 7
            ? (currentYear - 1).toString()
            : currentYear.toString();

        // Fetch upcoming matches for each team (next 7 days)
        const allUpcomingMatches: MatchWithScore[] = [];
        for (const teamId of favoriteTeams) {
          try {
            // Pass the season parameter
            const teamMatches = await api.matches.getAllByTeam(
              teamId,
              currentSeason,
            );
            const upcoming = teamMatches
              .filter(match => {
                const matchDate = new Date(match.start_date);
                return !match.completed && matchDate >= today;
              })
              .slice(0, 3); // Limit to 3 upcoming matches per team

            // Explicitly cast the API's Match type to our MatchWithScore type
            allUpcomingMatches.push(...(upcoming as MatchWithScore[]));
          } catch (error) {
            console.error(`Failed to fetch matches for team ${teamId}:`, error);
          }
        }

        // Sort upcoming matches by date
        allUpcomingMatches.sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        );
        setUpcomingMatches(allUpcomingMatches.slice(0, 5)); // Show top 5 upcoming

        // Fetch recent results
        const allRecentResults: MatchWithScore[] = [];
        for (const teamId of favoriteTeams) {
          try {
            // Pass the season parameter
            const teamMatches = await api.matches.getAllByTeam(
              teamId,
              currentSeason,
            );
            const recent = teamMatches
              .filter(match => match.completed)
              .sort(
                (a, b) =>
                  new Date(b.start_date).getTime() -
                  new Date(a.start_date).getTime(),
              )
              .slice(0, 2); // Latest 2 completed matches per team

            // Now we need to cast these to our MatchWithScore type and add scores
            const recentWithScore = recent as MatchWithScore[];

            // Fetch scores for each match
            for (const match of recentWithScore) {
              try {
                const score = await api.matches.getScore(match.id);
                match.score = score;
              } catch (error) {
                console.error(
                  `Failed to fetch score for match ${match.id}:`,
                  error,
                );
              }
            }

            allRecentResults.push(...recentWithScore);
          } catch (error) {
            console.error(
              `Failed to fetch recent results for team ${teamId}:`,
              error,
            );
          }
        }

        // Sort recent results by date (newest first)
        allRecentResults.sort(
          (a, b) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime(),
        );
        setRecentResults(allRecentResults.slice(0, 5)); // Show top 5 recent results

        // Extract rankings for favorite teams
        const relevantRankings = latestRankings.filter(ranking =>
          favoriteTeams.includes(ranking.team_id),
        );
        setTeamRankings(relevantRankings);
      } catch (error) {
        console.error('Failed to fetch teams data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamsData();
  }, [favoriteTeams]);

  // Format team name (remove gender markers)
  const formatTeamName = (name: string | undefined): string => {
    if (!name) return '';
    return name.replace(/\s*\([MW]\)\s*$/, '');
  };

  // Format date for display
  const formatMatchDate = (dateString: string) => {
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

  // Handle navigation to team details
  const navigateToTeam = (teamId: string) => {
    navigation.navigate('TeamDetail', {teamId});
  };

  // Handle navigation to match details
  const navigateToMatch = (matchId: string) => {
    navigation.navigate('MatchDetail', {matchId});
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (!favoriteTeams || favoriteTeams.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Your Teams
          </Text>
          <TouchableOpacity
            style={[
              styles.addButton,
              {backgroundColor: theme.colors.primary[500]},
            ]}
            onPress={() =>
              onViewAll ? onViewAll() : navigation.navigate('TeamsPage')
            }>
            <Icon name="plus" size={16} color="white" />
            <Text style={styles.addButtonText}>Add Teams</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon
            name="users"
            size={40}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.emptyText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            You haven't added any favorite teams yet
          </Text>
          <TouchableOpacity
            style={[
              styles.emptyButton,
              {backgroundColor: theme.colors.primary[500]},
            ]}
            onPress={() =>
              onViewAll ? onViewAll() : navigation.navigate('TeamsPage')
            }>
            <Text style={styles.emptyButtonText}>Browse Teams</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
          ]}>
          Your Teams
        </Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text
            style={[styles.viewAllText, {color: theme.colors.primary[500]}]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Favorite Teams List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.teamsScroll}>
        {teamsData.map(team => {
          // Find ranking for this team
          const ranking = teamRankings.find(r => r.team_id === team.id);

          return (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamCard,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                  borderColor: isDark
                    ? theme.colors.border.dark
                    : theme.colors.border.light,
                },
              ]}
              onPress={() => navigateToTeam(team.id)}>
              <TeamLogo teamId={team.id} size="medium" />
              <Text
                style={[
                  styles.teamName,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}
                numberOfLines={1}>
                {formatTeamName(team.name)}
              </Text>
              {ranking && (
                <View style={styles.rankingBadge}>
                  <Text style={styles.rankingText}>#{ranking.rank}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Upcoming Matches
          </Text>
          <View style={styles.matchesList}>
            {upcomingMatches.map(match => {
              const isHomeTeamFavorite = favoriteTeams.includes(
                match.home_team_id || '',
              );
              const isAwayTeamFavorite = favoriteTeams.includes(
                match.away_team_id || '',
              );

              // Format date parts
              const dateInfo = formatMatchDate(match.start_date);

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
                  ]}
                  onPress={() => navigateToMatch(match.id)}>
                  <View style={styles.matchDetails}>
                    {/* Left Section: Date Info */}
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
                        {isHomeTeamFavorite ? 'HOME' : 'AWAY'}
                      </Text>
                    </View>

                    {/* Middle Section: Teams */}
                    <View style={styles.teamsSection}>
                      {/* Home Team */}
                      <View style={styles.teamLogoContainer}>
                        <TeamLogo
                          teamId={match.home_team_id || ''}
                          size="small"
                        />
                      </View>

                      {/* vs */}
                      <Text
                        style={[
                          styles.vsText,
                          {
                            color: isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[500],
                          },
                        ]}>
                        vs
                      </Text>

                      {/* Away Team */}
                      <View style={styles.teamLogoContainer}>
                        <TeamLogo
                          teamId={match.away_team_id || ''}
                          size="small"
                        />
                      </View>
                    </View>

                    {/* Right Section: Time */}
                    <View style={styles.matchTimeSection}>
                      {match.scheduled_time ? (
                        <Text
                          style={[
                            styles.matchTime,
                            {
                              color: isDark
                                ? theme.colors.text.dimDark
                                : theme.colors.gray[600],
                            },
                          ]}>
                          {format(new Date(match.scheduled_time), 'h:mm a')}
                        </Text>
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
                          TBA
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Recent Results
          </Text>
          <View style={styles.matchesList}>
            {recentResults.map(match => {
              const isHomeTeamFavorite = favoriteTeams.includes(
                match.home_team_id || '',
              );
              const isAwayTeamFavorite = favoriteTeams.includes(
                match.away_team_id || '',
              );

              // Format date parts
              const dateInfo = formatMatchDate(match.start_date);

              // Determine the favorite team's result
              let favoriteTeamWon = false;
              if (
                isHomeTeamFavorite &&
                match.score &&
                match.score.home_team_won
              ) {
                favoriteTeamWon = true;
              } else if (
                isAwayTeamFavorite &&
                match.score &&
                match.score.away_team_won
              ) {
                favoriteTeamWon = true;
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
                  ]}
                  onPress={() => navigateToMatch(match.id)}>
                  <View style={styles.matchDetails}>
                    {/* Left Section: Date Info */}
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
                        {isHomeTeamFavorite ? 'HOME' : 'AWAY'}
                      </Text>
                    </View>

                    {/* Middle Section: Teams */}
                    <View style={styles.teamsSection}>
                      {/* Home Team */}
                      <View style={styles.teamLogoContainer}>
                        <TeamLogo
                          teamId={match.home_team_id || ''}
                          size="small"
                        />
                      </View>

                      {/* vs */}
                      <Text
                        style={[
                          styles.vsText,
                          {
                            color: isDark
                              ? theme.colors.text.dimDark
                              : theme.colors.gray[500],
                          },
                        ]}>
                        vs
                      </Text>

                      {/* Away Team */}
                      <View style={styles.teamLogoContainer}>
                        <TeamLogo
                          teamId={match.away_team_id || ''}
                          size="small"
                        />
                      </View>
                    </View>

                    {/* Right Section: Score */}
                    <View style={styles.matchResultSection}>
                      {match.score ? (
                        <View
                          style={[
                            styles.scoreBox,
                            {
                              backgroundColor: favoriteTeamWon
                                ? theme.colors.success + '20' // add transparency
                                : theme.colors.error + '20',
                              borderColor: favoriteTeamWon
                                ? theme.colors.success
                                : theme.colors.error,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.scoreText,
                              {
                                color: favoriteTeamWon
                                  ? theme.colors.success
                                  : theme.colors.error,
                              },
                            ]}>
                            {favoriteTeamWon ? 'W' : 'L'},{' '}
                            {isHomeTeamFavorite
                              ? `${match.score.home_team_score}-${match.score.away_team_score}`
                              : `${match.score.away_team_score}-${match.score.home_team_score}`}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.dnfScoreText,
                            {
                              color: isDark
                                ? theme.colors.text.dimDark
                                : theme.colors.gray[500],
                            },
                          ]}>
                          Final
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: theme.spacing[8],
    alignItems: 'center',
  },
  emptyContainer: {
    padding: theme.spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[4],
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
  },
  emptyButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.full,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.full,
  },
  addButtonText: {
    color: 'white',
    marginLeft: theme.spacing[1],
    fontSize: theme.typography.fontSize.sm,
  },
  viewAllButton: {
    paddingVertical: theme.spacing[1],
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  teamsScroll: {
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  teamCard: {
    alignItems: 'center',
    marginRight: theme.spacing[3],
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    width: 100,
  },
  teamName: {
    marginTop: theme.spacing[2],
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
  },
  rankingBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
  },
  rankingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginTop: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
    marginBottom: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  matchesList: {
    paddingHorizontal: theme.spacing[4],
  },
  // Updated match card styles
  matchCard: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[3],
    padding: theme.spacing[3],
    position: 'relative',
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  teamsSection: {
    flex: 1,
    paddingRight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[2],
  },
  teamLogoContainer: {
    marginHorizontal: theme.spacing[2],
  },
  vsText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    marginHorizontal: theme.spacing[2],
  },
  matchTimeSection: {
    width: 80,
    alignItems: 'flex-end',
  },
  matchTime: {
    fontSize: theme.typography.fontSize.sm,
  },
  matchResultSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  dnfScoreText: {
    fontSize: theme.typography.fontSize.xs,
    fontStyle: 'italic',
  },
  matchOpponentSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
    minHeight: 50,
  },
  opponentName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    marginLeft: theme.spacing[2],
    flex: 1,
  },
});

export default FavoriteTeamDashboard;
