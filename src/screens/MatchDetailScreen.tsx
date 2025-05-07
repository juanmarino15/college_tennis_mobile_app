// src/screens/MatchDetailScreen.tsx
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {format} from 'date-fns';
import {api} from '../api';
import theme from '../theme';
import {ThemeContext} from '../../App';
import TeamLogo from '../components/TeamLogo';

// Define the root stack param list
type RootStackParamList = {
  MainTabs: undefined;
  MatchDetail: {matchId: string};
  TeamDetail: {teamId: string};
  PlayerDetail: {playerId: string};
};

// Define the route and navigation props
type MatchDetailScreenRouteProp = RouteProp<RootStackParamList, 'MatchDetail'>;
type MatchDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MatchDetail'
>;

interface MatchDetailScreenProps {
  route: MatchDetailScreenRouteProp;
  navigation: MatchDetailScreenNavigationProp;
}

const MatchDetailScreen: React.FC<MatchDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const {matchId} = route.params;
  const {isDark} = useContext(ThemeContext);

  // State
  const [match, setMatch] = useState<any>(null);
  const [lineup, setLineup] = useState<any[]>([]);
  const [teams, setTeams] = useState<{home: any; away: any}>({
    home: null,
    away: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<any>(null);
  const [players, setPlayers] = useState<Record<string, any>>({});

  // Fetch match details
  const fetchMatchDetails = async () => {
    try {
      setLoading(true);

      // Fetch match data
      const matchData = await api.matches.getById(matchId);
      console.log(matchData);

      // Log match data for debugging
      console.log('Match Data:', {
        id: matchData.id,
        completed: matchData.completed,
        home_team_id: matchData.home_team_id,
        away_team_id: matchData.away_team_id,
      });

      // Then fetch teams, lineup, and score in parallel
      const [homeTeam, awayTeam, lineupData, scoreData] = await Promise.all([
        matchData.home_team_id
          ? api.teams.getById(matchData.home_team_id)
          : Promise.resolve(null),
        matchData.away_team_id
          ? api.teams.getById(matchData.away_team_id)
          : Promise.resolve(null),
        matchData.completed
          ? api.matches.getLineup(matchId)
          : Promise.resolve([]),
        matchData.completed
          ? api.matches.getScore(matchId)
          : Promise.resolve(null),
      ]);

      console.log(homeTeam);
      console.log(awayTeam);
      console.log(lineupData);
      console.log(scoreData);

      // Get unique player IDs from lineup
      const playerIds = new Set<string>();
      lineupData.forEach((match: any) => {
        if (match.side1_player1_id) playerIds.add(match.side1_player1_id);
        if (match.side1_player2_id) playerIds.add(match.side1_player2_id);
        if (match.side2_player1_id) playerIds.add(match.side2_player1_id);
        if (match.side2_player2_id) playerIds.add(match.side2_player2_id);
      });

      // Fetch all player details in parallel
      const playerPromises = Array.from(playerIds).map(playerId =>
        api.players.getById(playerId),
      );
      const playerResults = await Promise.all(playerPromises);

      // Create players map
      const playersMap: Record<string, any> = {};
      playerResults.forEach(player => {
        playersMap[player.person_id] = player;
      });

      setMatch(matchData);
      setTeams({home: homeTeam, away: awayTeam});
      setLineup(lineupData);
      setMatchScore(scoreData);
      setPlayers(playersMap);
      setError(null);
    } catch (err) {
      console.error('Error fetching match details:', err);
      setError('Failed to load match details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMatchDetails();
  };

  // Format player name helper
  const formatPlayerName = (player: any): string => {
    if (!player) return '';
    return `${player.first_name.charAt(0)}. ${player.last_name}`;
  };

  // Parse match score and determine actual winner based on sets won
  const parseMatchScore = (scoreString: string | undefined) => {
    if (!scoreString || typeof scoreString !== 'string') {
      return {side1Sets: 0, side2Sets: 0};
    }

    // Split by spaces to get individual sets
    const sets = scoreString.split(' ').filter(Boolean);

    // Count sets won by each side
    let side1Sets = 0;
    let side2Sets = 0;

    for (const set of sets) {
      if (!set.includes('-')) continue;

      const [side1Score, side2ScoreWithParentheses] = set.split('-');
      const side2Score = (side2ScoreWithParentheses || '').split('(')[0];

      if (parseInt(side1Score) > parseInt(side2Score)) {
        side1Sets++;
      } else if (parseInt(side2Score) > parseInt(side1Score)) {
        side2Sets++;
      }
    }

    return {side1Sets, side2Sets};
  };

  // Separate doubles and singles matches
  const doublesMatches = lineup
    .filter(match => match.match_type === 'DOUBLES')
    .sort((a, b) => a.position - b.position);

  console.log(doublesMatches);

  const singlesMatches = lineup
    .filter(match => match.match_type === 'SINGLES')
    .sort((a, b) => a.position - b.position);

  const formatTeamName = (name?: string): string => {
    return name ? name.replace(/\s*\((M|W)\)$/, '') : 'Unknown Team';
  };
  const parseScoreSets = (scoreStr: any) => {
    console.log('Original score string:', scoreStr);
    if (!scoreStr || typeof scoreStr !== 'string') return [];

    // Clean and split the score string
    const cleanedScore = scoreStr.replace(/,\s*/g, ' ');
    const sets = cleanedScore.split(' ').filter(set => set.includes('-'));

    return sets.map(set => {
      // console.log('Processing set:', set);

      // Check if this set has a tiebreak
      const hasTiebreak = set.includes('(');

      // Extract the main scores and potential tiebreak
      let score1,
        score2,
        tiebreak = null;

      if (hasTiebreak) {
        // Extract tiebreak value
        const tiebreakMatch = set.match(/\(([^)]+)\)/);
        if (tiebreakMatch && tiebreakMatch[1]) {
          tiebreak = tiebreakMatch[1];
        }

        // Remove tiebreak part for score extraction
        const mainScore = set.split('(')[0];
        [score1, score2] = mainScore.split('-');
      } else {
        // Simple split for non-tiebreak scores
        [score1, score2] = set.split('-');
      }

      // Determine which score the tiebreak belongs to (typically the '6' in 7-6)
      let tiebreakBelongsToScore1 = false;
      let tiebreakBelongsToScore2 = false;

      if (hasTiebreak) {
        // In tennis, tiebreaks happen when scores are 6-6
        // For a 7-6 score, the tiebreak belongs to the '6'
        if (score1 === '7' && score2 === '6') {
          tiebreakBelongsToScore2 = true;
        } else if (score1 === '6' && score2 === '7') {
          tiebreakBelongsToScore1 = true;
        }
      }

      // console.log('Parsed set:', {
      //   score1,
      //   score2,
      //   tiebreak,
      //   tiebreakBelongsToScore1,
      //   tiebreakBelongsToScore2,
      // });

      return {
        score1: score1 || '0',
        score2: score2 || '0',
        tiebreak,
        tiebreakBelongsToScore1,
        tiebreakBelongsToScore2,
      };
    });
  };

  // Render loading state
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

  // Render error state
  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          {
            backgroundColor: isDark
              ? theme.colors.background.dark
              : theme.colors.background.light,
          },
        ]}>
        <Icon name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchMatchDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Return null if data is still loading or unavailable
  if (!match) {
    return null;
  }

  return (
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
      {/* Match Header Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            marginTop: 70,
          },
        ]}>
        <View style={styles.teamsHeader}>
          {/* Home Team */}
          <View style={styles.teamColumn}>
            <TeamLogo teamId={match.home_team_id} size="large" />
            <Text
              style={[
                styles.teamName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
                match.is_conference_match && styles.conferenceTeam,
              ]}>
              {formatTeamName(teams.home.name)}
            </Text>
            {teams.home.conference && (
              <Text
                style={[
                  styles.conferenceText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[500],
                  },
                ]}>
                {teams.home.conference.replace(/_/g, ' ')}
              </Text>
            )}
          </View>

          {/* Score/VS Section */}
          <View style={styles.scoreSection}>
            <Text
              style={[
                styles.scoreText,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}>
              {match.completed && matchScore
                ? `${matchScore.home_team_score} - ${matchScore.away_team_score}`
                : 'vs'}
            </Text>
            {match.completed ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Final</Text>
              </View>
            ) : match.scheduled_time ? (
              <Text
                style={[
                  styles.timeText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}>
                {format(new Date(match.scheduled_time), 'h:mm a')}
              </Text>
            ) : null}
          </View>

          {/* Away Team */}
          <View style={styles.teamColumn}>
            <TeamLogo teamId={match.away_team_id} size="large" />
            <Text
              style={[
                styles.teamName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
                match.is_conference_match && styles.conferenceTeam,
              ]}>
              {formatTeamName(teams.away.name)}
            </Text>
            {teams.away.conference && (
              <Text
                style={[
                  styles.conferenceText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[500],
                  },
                ]}>
                {teams.away.conference.replace(/_/g, ' ')}
              </Text>
            )}
          </View>
        </View>

        {/* Match Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon
              name="users"
              size={16}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
            <Text
              style={[
                styles.detailText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              {match.gender === 'MALE' ? 'Men' : 'Women'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Icon
              name="calendar"
              size={16}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
            <Text
              style={[
                styles.detailText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              {format(new Date(match.start_date), 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>

          {match.scheduled_time && (
            <View style={styles.detailItem}>
              <Icon
                name="clock"
                size={16}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
                }
              />
              <Text
                style={[
                  styles.detailText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}>
                {format(new Date(match.scheduled_time), 'h:mm a')}
              </Text>
            </View>
          )}
        </View>

        {match.is_conference_match && (
          <View style={styles.conferenceMatchTag}>
            <Text style={styles.conferenceMatchText}>Conference Match</Text>
          </View>
        )}
      </View>

      {/* Match Results */}
      {match.completed && lineup.length > 0 && (
        <View style={styles.resultsContainer}>
          {/* Doubles Section */}
          {doublesMatches.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                },
              ]}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                Doubles
              </Text>

              <View style={styles.matchesList}>
                {doublesMatches.map(match => (
                  <View
                    key={match.id}
                    style={[
                      styles.matchItem,
                      {
                        borderColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}>
                    <View style={styles.matchHeader}>
                      <View
                        style={[
                          styles.matchNumberBadge,
                          {
                            backgroundColor: isDark
                              ? theme.colors.gray[800]
                              : theme.colors.gray[100],
                          },
                        ]}>
                        <Text
                          style={[
                            styles.matchNumberText,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.gray[700],
                            },
                          ]}>
                          Match #{match.position}
                        </Text>
                      </View>

                      {/* UF Tag - if match is unfinished */}
                      {!match.side1_won && !match.side2_won && (
                        <View style={styles.unfinishedTag}>
                          <Text style={styles.unfinishedText}>DNF</Text>
                        </View>
                      )}
                    </View>

                    {/* Home Team Players */}
                    <View
                      style={[
                        styles.playerRow,
                        match.side1_won && styles.winnerRow,
                      ]}>
                      <View style={styles.playerInfo}>
                        <Icon
                          name="user"
                          size={14}
                          color={
                            match.side1_won
                              ? theme.colors.success
                              : theme.colors.white
                          }
                        />
                        <Text
                          style={[
                            styles.playerText,
                            {
                              color: match.side1_won
                                ? theme.colors.success
                                : theme.colors.white,
                            },
                          ]}>
                          {formatPlayerName(players[match.side1_player1_id])} [
                          {match.side1_name}]
                        </Text>
                        {match.side1_won && (
                          <Icon
                            name="check"
                            size={14}
                            color={theme.colors.success}
                            style={styles.checkIcon}
                          />
                        )}
                      </View>

                      {/* Enhanced score display */}
                      <View style={styles.setScores}>
                        {match.side1_score &&
                        typeof match.side1_score === 'string' ? (
                          parseScoreSets(match.side1_score).map(
                            (set, index) => (
                              <View
                                key={index}
                                style={styles.setScoreContainer}>
                                <View
                                  style={{
                                    height: 24, // Fixed height for consistency
                                    justifyContent: 'center', // Center the text vertically
                                  }}>
                                  <Text
                                    style={[
                                      styles.scoreValue,
                                      {
                                        color: match.side1_won
                                          ? theme.colors.success
                                          : theme.colors.white,
                                      },
                                    ]}>
                                    {set.score1}
                                  </Text>
                                  {set.tiebreak &&
                                    set.tiebreakBelongsToScore1 && (
                                      <Text
                                        style={[
                                          styles.tiebreakValue,
                                          {
                                            position: 'absolute', // Position absolutely
                                            top: 0, // Align to top
                                            right: -8, // Offset to the right
                                            color: match.side1_won
                                              ? theme.colors.success
                                              : theme.colors.white,
                                          },
                                        ]}>
                                        {set.tiebreak}
                                      </Text>
                                    )}
                                </View>
                              </View>
                            ),
                          )
                        ) : (
                          <Text style={styles.setScore}>N/A</Text>
                        )}
                      </View>
                    </View>

                    {/* Away Team Players */}
                    <View
                      style={[
                        styles.playerRow,
                        match.side2_won && styles.winnerRow,
                      ]}>
                      <View style={styles.playerInfo}>
                        <Icon
                          name="user"
                          size={14}
                          color={
                            match.side2_won
                              ? theme.colors.success
                              : theme.colors.white
                          }
                        />
                        <Text
                          style={[
                            styles.playerText,
                            {
                              color: match.side2_won
                                ? theme.colors.success
                                : theme.colors.white,
                            },
                          ]}>
                          {formatPlayerName(players[match.side2_player1_id])} [
                          {match.side2_name}]
                        </Text>
                        {match.side2_won && (
                          <Icon
                            name="check"
                            size={14}
                            color={theme.colors.success}
                            style={styles.checkIcon}
                          />
                        )}
                      </View>

                      {/* Enhanced score display */}
                      <View style={styles.setScores}>
                        {match.side1_score &&
                        typeof match.side1_score === 'string' ? (
                          parseScoreSets(match.side1_score).map(
                            (set, index) => (
                              <View
                                key={index}
                                style={styles.setScoreContainer}>
                                <Text
                                  style={[
                                    styles.scoreValue,
                                    {
                                      color: match.side2_won
                                        ? theme.colors.success
                                        : theme.colors.white,
                                    },
                                  ]}>
                                  {set.score2}
                                </Text>
                                {set.tiebreak &&
                                  set.tiebreakBelongsToScore2 && (
                                    <Text
                                      style={[
                                        styles.tiebreakValue,
                                        {
                                          color: match.side2_won
                                            ? theme.colors.success
                                            : theme.colors.white,
                                        },
                                      ]}>
                                      {set.tiebreak}
                                    </Text>
                                  )}
                              </View>
                            ),
                          )
                        ) : (
                          <Text style={styles.setScore}>N/A</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Singles Section */}
          {singlesMatches.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                },
              ]}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                Singles
              </Text>

              <View style={styles.matchesList}>
                {singlesMatches.map(match => (
                  <View
                    key={match.id}
                    style={[
                      styles.matchItem,
                      {
                        borderColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}>
                    <View style={styles.matchHeader}>
                      <View
                        style={[
                          styles.matchNumberBadge,
                          {
                            backgroundColor: isDark
                              ? theme.colors.gray[800]
                              : theme.colors.gray[100],
                          },
                        ]}>
                        <Text
                          style={[
                            styles.matchNumberText,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.gray[700],
                            },
                          ]}>
                          Match #{match.position}
                        </Text>
                      </View>

                      {/* UF Tag - if match is unfinished */}
                      {!match.side1_won && !match.side2_won && (
                        <View style={styles.unfinishedTag}>
                          <Text style={styles.unfinishedText}>DNF</Text>
                        </View>
                      )}
                    </View>

                    {/* Parse and display the scores with tiebreaks */}
                    <>
                      {/* Home Player */}
                      <View
                        style={[
                          styles.playerRow,
                          match.side1_won && styles.winnerRow,
                        ]}>
                        <View style={styles.playerInfo}>
                          <Icon
                            name="user"
                            size={14}
                            color={
                              match.side1_won
                                ? theme.colors.success
                                : theme.colors.white
                            }
                          />
                          <Text
                            style={[
                              styles.playerText,
                              {
                                color: match.side1_won
                                  ? theme.colors.success
                                  : theme.colors.white,
                              },
                            ]}>
                            {formatPlayerName(players[match.side1_player1_id])}{' '}
                            [{match.side1_name}]
                          </Text>
                          {match.side1_won && (
                            <Icon
                              name="check"
                              size={14}
                              color={theme.colors.success}
                              style={styles.checkIcon}
                            />
                          )}
                        </View>

                        {/* Enhanced score display with tiebreak support */}
                        <View style={styles.setScores}>
                          {match.side1_score &&
                          typeof match.side1_score === 'string' ? (
                            parseScoreSets(match.side1_score).map(
                              (set, index) => (
                                <View
                                  key={index}
                                  style={styles.setScoreContainer}>
                                  <Text
                                    style={[
                                      styles.scoreValue,
                                      {
                                        color: match.side1_won
                                          ? theme.colors.success
                                          : theme.colors.white,
                                      },
                                    ]}>
                                    {set.score1}
                                  </Text>
                                  {set.tiebreak &&
                                    set.tiebreakBelongsToScore1 && (
                                      <Text
                                        style={[
                                          styles.tiebreakValue,
                                          {
                                            color: match.side1_won
                                              ? theme.colors.success
                                              : theme.colors.white,
                                          },
                                        ]}>
                                        {set.tiebreak}
                                      </Text>
                                    )}
                                </View>
                              ),
                            )
                          ) : (
                            <Text style={styles.setScore}>N/A</Text>
                          )}
                        </View>
                      </View>

                      {/* Away Player */}
                      <View
                        style={[
                          styles.playerRow,
                          match.side2_won && styles.winnerRow,
                        ]}>
                        <View style={styles.playerInfo}>
                          <Icon
                            name="user"
                            size={14}
                            color={
                              match.side2_won
                                ? theme.colors.success
                                : theme.colors.white
                            }
                          />
                          <Text
                            style={[
                              styles.playerText,
                              {
                                color: match.side2_won
                                  ? theme.colors.success
                                  : theme.colors.white,
                              },
                            ]}>
                            {formatPlayerName(players[match.side2_player1_id])}{' '}
                            [{match.side2_name}]
                          </Text>
                          {match.side2_won && (
                            <Icon
                              name="check"
                              size={14}
                              color={theme.colors.success}
                              style={styles.checkIcon}
                            />
                          )}
                        </View>

                        {/* Enhanced score display with tiebreak support */}
                        <View style={styles.setScores}>
                          {match.side1_score &&
                          typeof match.side1_score === 'string' ? (
                            parseScoreSets(match.side1_score).map(
                              (set, index) => (
                                <View
                                  key={index}
                                  style={styles.setScoreContainer}>
                                  <Text
                                    style={[
                                      styles.scoreValue,
                                      {
                                        color: match.side2_won
                                          ? theme.colors.success
                                          : theme.colors.white,
                                      },
                                    ]}>
                                    {set.score2}
                                  </Text>
                                  {set.tiebreak &&
                                    set.tiebreakBelongsToScore2 && (
                                      <Text
                                        style={[
                                          styles.tiebreakValue,
                                          {
                                            color: match.side2_won
                                              ? theme.colors.success
                                              : theme.colors.white,
                                          },
                                        ]}>
                                        {set.tiebreak}
                                      </Text>
                                    )}
                                </View>
                              ),
                            )
                          ) : (
                            <Text style={styles.setScore}>N/A</Text>
                          )}
                        </View>
                      </View>
                    </>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* No lineup message for completed matches */}
      {match.completed && lineup.length === 0 && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark
                ? theme.colors.card.dark
                : theme.colors.card.light,
            },
          ]}>
          <Text
            style={[
              styles.centerText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Lineup details are not available for this match.
          </Text>
        </View>
      )}

      {/* Match not yet completed message */}
      {!match.completed && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark
                ? theme.colors.card.dark
                : theme.colors.card.light,
            },
          ]}>
          <Text
            style={[
              styles.centerText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
                padding: 24,
                lineHeight: 24,
                marginHorizontal: 16,
              },
            ]}>
            This match has not been completed yet. Check back later for results.
          </Text>
        </View>
      )}

      {/* Bottom padding for better scrolling */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  centerContainer: {
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
  card: {
    margin: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.md,
  },
  teamsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    marginTop: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  conferenceTeam: {
    fontWeight: '700',
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
    marginTop: theme.spacing[1],
  },
  scoreSection: {
    alignItems: 'center',
    marginHorizontal: theme.spacing[2],
  },
  scoreText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
  },
  timeText: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing[1],
  },
  statusBadge: {
    marginTop: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    backgroundColor: theme.colors.gray[200],
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.gray[700],
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing[2],
    gap: theme.spacing[4],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: theme.spacing[1],
    fontSize: theme.typography.fontSize.sm,
  },
  conferenceMatchTag: {
    alignSelf: 'center',
    marginTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.full,
  },
  conferenceMatchText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  resultsContainer: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: theme.spacing[4],
  },
  matchesList: {
    gap: theme.spacing[4],
  },
  matchItem: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  matchNumberBadge: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  matchNumberText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  unfinishedTag: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.full,
  },
  unfinishedText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
  },
  winnerRow: {
    // This would be used to style the winner row differently if needed
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerText: {
    marginLeft: theme.spacing[1],
    fontSize: theme.typography.fontSize.sm,
  },
  checkIcon: {
    marginLeft: theme.spacing[1],
  },
  scoreDigit: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  setScores: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    alignItems: 'center',
  },
  setScore: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  centerText: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
    lineHeight: theme.typography.lineHeight.relaxed,
    padding: theme.spacing[4],
  },
  bottomPadding: {
    height: theme.spacing[10],
  },
  genderBadgeContainer: {
    position: 'absolute',
    top: theme.spacing[2],
    left: theme.spacing[2],
    zIndex: 10,
  },
  genderBadge: {
    fontSize: theme.typography.fontSize.sm,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    fontWeight: '600',
  },
  setScoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 5,
    minHeight: 24, // Add a fixed minimum height to maintain alignment
    justifyContent: 'center', // Center content vertically
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  tiebreakValue: {
    fontSize: 10,
    lineHeight: 10,
    marginTop: 2,
    marginLeft: 1,
  },
});
export default MatchDetailScreen;
