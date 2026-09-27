// src/components/FavoritePlayerSection.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {api} from '../api';
import theme from '../theme';
import TeamLogo from './TeamLogo';
import {getCurrentSeasonYear, loadWithSeasonFallback} from '../utils/season';

// Define types for navigation
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  PlayerDetail: {playerId: string};
  PlayersPage: undefined;
  // Add other screens as needed
};

type FavoritePlayerNavigationProp = StackNavigationProp<RootStackParamList>;

// Define interfaces for component props and state
interface FavoritePlayersSectionProps {
  favoritePlayers: string[];
  isDark: boolean;
  onViewAll?: () => void; // Added this prop for View All button
}

interface PlayerData {
  person_id: string;
  tennis_id?: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface PlayerTeam {
  team_id: string;
  team_name: string;
  abbreviation?: string;
  conference?: string;
  gender?: string;
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

interface PlayerMatchResult {
  id: string;
  match_id: string;
  date: string;
  opponent_name: string;
  opponent_team_id?: string;
  is_home: boolean;
  match_type: string;
  position: number;
  score: string;
  won: boolean;
  partner_name?: string;
  opponent_name1: string;
  opponent_name2?: string;
}

const FavoritePlayerSection: React.FC<FavoritePlayersSectionProps> = ({
  favoritePlayers,
  isDark,
  onViewAll,
}) => {
  const navigation = useNavigation<FavoritePlayerNavigationProp>();
  const [loading, setLoading] = useState<boolean>(true);
  const [playersData, setPlayersData] = useState<PlayerData[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>(
    {},
  );
  const [playerTeams, setPlayerTeams] = useState<Record<string, PlayerTeam>>(
    {},
  );
  const [recentResults, setRecentResults] = useState<
    Record<string, PlayerMatchResult[]>
  >({});

  useEffect(() => {
    // console.log("FavoritePlayersSection received props:", props);
    console.log('Favorite players received:', favoritePlayers);

    const fetchPlayersData = async () => {
      if (!favoritePlayers || favoritePlayers.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch player details
        const players: PlayerData[] = await Promise.all(
          favoritePlayers.map(playerId => api.players.getById(playerId)),
        );
        setPlayersData(players);

        // Each player's current season, or the previous one if the new season
        // has no roster data yet. Players are fetched in parallel.
        const teams: Record<string, PlayerTeam> = {};
        const stats: Record<string, PlayerStats> = {};
        const results: Record<string, PlayerMatchResult[]> = {};
        const logUnexpected = (what: string, playerId: string, error: any) => {
          // 404 is expected for players without data for the season
          if (error?.response?.status !== 404) {
            console.log(
              `Failed to fetch ${what} for player ${playerId}:`,
              error,
            );
          }
        };

        await Promise.all(
          favoritePlayers.map(async playerId => {
            let season = getCurrentSeasonYear();
            try {
              const found = await loadWithSeasonFallback(s =>
                api.players.getTeam(playerId, s),
              );
              teams[playerId] = found.data;
              season = found.season;
            } catch (error: any) {
              logUnexpected('team', playerId, error);
            }

            const [statsResult, matchesResult] = await Promise.allSettled([
              api.players.getStats(playerId, season),
              api.players.getMatchResults(playerId, season),
            ]);
            if (statsResult.status === 'fulfilled') {
              stats[playerId] = statsResult.value;
            } else {
              logUnexpected('stats', playerId, statsResult.reason);
            }
            if (matchesResult.status === 'fulfilled') {
              // Sort by date (newest first) and take top 2
              results[playerId] = [...matchesResult.value]
                .sort(
                  (x, y) =>
                    new Date(y.date).getTime() - new Date(x.date).getTime(),
                )
                .slice(0, 2);
            } else {
              logUnexpected('match results', playerId, matchesResult.reason);
            }
          }),
        );
        setPlayerTeams(teams);
        setPlayerStats(stats);
        setRecentResults(results);
      } catch (error) {
        console.log('Failed to fetch players data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayersData();
  }, [favoritePlayers]);

  // Handle navigation to player details
  const navigateToPlayer = (playerId: string) => {
    navigation.navigate('PlayerDetail', {playerId});
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (!favoritePlayers || favoritePlayers.length === 0) {
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
            Your Players
          </Text>
          <TouchableOpacity
            style={[
              styles.addButton,
              {backgroundColor: theme.colors.primary[500]},
            ]}
            onPress={() =>
              onViewAll ? onViewAll() : navigation.navigate('PlayersPage')
            }>
            <Icon name="plus" size={16} color="white" />
            <Text style={styles.addButtonText}>Add Players</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon
            name="user"
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
            You haven't added any favorite players yet
          </Text>
          <TouchableOpacity
            style={[
              styles.emptyButton,
              {backgroundColor: theme.colors.primary[500]},
            ]}
            onPress={() =>
              onViewAll ? onViewAll() : navigation.navigate('PlayersPage')
            }>
            <Text style={styles.emptyButtonText}>Find Players</Text>
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
          Your Players
        </Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text
            style={[styles.viewAllText, {color: theme.colors.primary[500]}]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {playersData.map(player => {
          const team = playerTeams[player.person_id];
          const stats = playerStats[player.person_id];
          const results = recentResults[player.person_id] || [];

          return (
            <TouchableOpacity
              key={player.person_id}
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
              onPress={() => navigateToPlayer(player.person_id)}>
              <View style={styles.playerHeader}>
                <View style={styles.playerInfo}>
                  {player.avatar_url ? (
                    <Image
                      source={{uri: player.avatar_url}}
                      style={styles.playerAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        {
                          backgroundColor: isDark
                            ? theme.colors.gray[800]
                            : theme.colors.gray[300],
                        },
                      ]}>
                      <Icon
                        name="user"
                        size={20}
                        color={
                          isDark
                            ? theme.colors.gray[600]
                            : theme.colors.gray[400]
                        }
                      />
                    </View>
                  )}
                  <View style={styles.nameContainer}>
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
                    {team && (
                      <View style={styles.teamContainer}>
                        <TeamLogo teamId={team.team_id} size="small" />
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.teamName,
                            {
                              color: isDark
                                ? theme.colors.text.dimDark
                                : theme.colors.gray[600],
                            },
                          ]}>
                          {team.team_name &&
                            team.team_name.replace(/\s*\([MW]\)\s*$/, '')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {stats && (
                  <View style={styles.statsContainer}>
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
                        {stats.singles_wins}-{stats.singles_losses}
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
                        Singles
                      </Text>
                    </View>
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
                        {stats.doubles_wins}-{stats.doubles_losses}
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
                        Doubles
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Recent Results */}
              {results.length > 0 && (
                <View style={styles.resultsContainer}>
                  <Text
                    style={[
                      styles.resultsTitle,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    Recent Results
                  </Text>
                  {results.map((result, index) => (
                    <View
                      key={index}
                      style={[
                        styles.resultItem,
                        index < results.length - 1 && [
                          styles.resultItemBorder,
                          {
                            borderBottomColor: isDark
                              ? theme.colors.border.dark
                              : theme.colors.border.light,
                          },
                        ],
                      ]}>
                      <View style={styles.resultInfo}>
                        <Text
                          style={[
                            styles.resultOpponent,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.text.light,
                            },
                          ]}>
                          vs. {result.opponent_name1}
                          {result.opponent_name2
                            ? ` / ${result.opponent_name2.split(' ')[1]}`
                            : ''}
                        </Text>
                        <Text
                          style={[
                            styles.resultMeta,
                            {
                              color: isDark
                                ? theme.colors.text.dimDark
                                : theme.colors.gray[500],
                            },
                          ]}>
                          {result.match_type === 'SINGLES'
                            ? 'Singles'
                            : 'Doubles'}
                          {result.position > 0 ? ` #${result.position}` : ''}
                          {' • '}
                          {new Date(result.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.resultOutcome}>
                        <View
                          style={[
                            styles.resultBadge,
                            result.won ? styles.winBadge : styles.lossBadge,
                          ]}>
                          <Text style={styles.resultBadgeText}>
                            {result.won ? 'W' : 'L'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.resultScore,
                            {
                              color: isDark
                                ? theme.colors.text.dark
                                : theme.colors.text.light,
                            },
                          ]}>
                          {result.score}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  playerCard: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing[3],
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  playerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing[1],
    flex: 1,
  },
  teamName: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[1],
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: theme.spacing[3],
  },
  statValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
  },
  resultsContainer: {
    marginTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: theme.spacing[3],
  },
  resultsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing[2],
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[2],
  },
  resultItemBorder: {
    borderBottomWidth: 1,
  },
  resultInfo: {
    flex: 1,
  },
  resultOpponent: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  resultMeta: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[0.5],
  },
  resultOutcome: {
    alignItems: 'flex-end',
  },
  resultBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.5],
    marginBottom: theme.spacing[1],
  },
  winBadge: {
    backgroundColor: theme.colors.success,
  },
  lossBadge: {
    backgroundColor: theme.colors.error,
  },
  resultBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  resultScore: {
    fontSize: theme.typography.fontSize.xs,
  },
});

export default FavoritePlayerSection;
