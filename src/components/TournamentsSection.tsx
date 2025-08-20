// src/components/TournamentsSection.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {api} from '../api';
import theme from '../theme';
import {format} from 'date-fns';

// Navigation types
type RootStackParamList = {
  MainTabs: undefined;
  TournamentDetail: {tournamentId: string};
};

type TournamentsNavigationProp = StackNavigationProp<RootStackParamList>;

// Import the Tournament types from api
import {Tournament, TournamentsResponse} from '../api';

interface TournamentsSectionProps {
  dateFrom: Date;
  dateTo: Date;
  gender: string;
  sortBy: string;
  isDark: boolean;
}

const TournamentsSection: React.FC<TournamentsSectionProps> = ({
  dateFrom,
  dateTo,
  gender,
  sortBy,
  isDark,
}) => {
  const navigation = useNavigation<TournamentsNavigationProp>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch tournaments from API
  const fetchTournaments = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      // Build API query parameters - ADD DIVISION FILTER
      const params = {
        page: isRefresh ? 1 : page,
        page_size: 20,
        sort_by: sortBy === 'date-asc' ? 'start_date_time' : 'start_date_time',
        sort_order: sortBy === 'date-desc' ? 'desc' : 'asc',
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        division: 'DIV_I',
      };

      // Use the API service to fetch tournaments
      const data = await api.tournaments.search(params);

      // Filter by gender if specified (you might want to do this server-side)
      let filteredTournaments = data.tournaments;
      if (gender) {
        filteredTournaments = filteredTournaments.filter(t => {
          // Check if tournament has events matching the gender
          const genderStr = gender === 'MALE' ? "Men's" : "Women's";
          return t.events.some(event => event.includes(genderStr));
        });
      }

      if (isRefresh) {
        setTournaments(filteredTournaments);
      } else {
        setTournaments(prev => [...prev, ...filteredTournaments]);
      }

      setHasMore(data.has_next);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tournaments:', err);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTournaments(true);
  }, [dateFrom, dateTo, gender, sortBy]);

  // Handle refresh
  const onRefresh = () => {
    fetchTournaments(true);
  };

  // Handle load more
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchTournaments(false);
    }
  };

  // Navigate to tournament details
  const handleTournamentPress = (tournamentId: string) => {
    navigation.navigate('TournamentDetail', {tournamentId});
  };

  // Get tournament status
  const getTournamentStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      const daysUntil = Math.ceil(
        (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil === 0) return 'Starts Today';
      if (daysUntil === 1) return 'Starts Tomorrow';
      return `In ${daysUntil} days`;
    } else if (now >= start && now <= end) {
      return 'In Progress';
    } else {
      return 'Completed';
    }
  };

  // Format date range
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (format(start, 'MMM') === format(end, 'MMM')) {
      return `${format(start, 'MMM d')}-${format(end, 'd, yyyy')}`;
    } else if (format(start, 'yyyy') === format(end, 'yyyy')) {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else {
      return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
    }
  };

  // Render tournament card
  const renderTournamentCard = (tournament: Tournament) => {
    console.log(tournament);
    const status = getTournamentStatus(
      tournament.start_date_time,
      tournament.end_date_time,
    );
    const isActive = status === 'In Progress';
    const isCompleted = status === 'Completed';

    return (
      <TouchableOpacity
        key={tournament.tournament_id}
        style={[
          styles.tournamentCard,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
          isActive && {
            borderLeftWidth: 4,
            borderLeftColor: theme.colors.success,
          },
        ]}
        onPress={() => handleTournamentPress(tournament.tournament_id)}
        activeOpacity={0.7}>
        {/* Tournament Header */}
        <View style={styles.tournamentHeader}>
          <View style={styles.tournamentTitleSection}>
            <Text
              style={[
                styles.tournamentName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}
              numberOfLines={2}>
              {tournament.name}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              isActive && styles.activeBadge,
              isCompleted && styles.completedBadge,
              !isActive && !isCompleted && styles.upcomingBadge,
            ]}>
            <Text
              style={[
                styles.statusText,
                isActive && styles.activeStatusText,
                isCompleted && styles.completedStatusText,
              ]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Tournament Info */}
        <View style={styles.tournamentInfo}>
          <View style={styles.infoRow}>
            <Icon
              name="map-pin"
              size={14}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
            <Text
              style={[
                styles.locationText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}
              numberOfLines={1}>
              {tournament.location_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon
              name="calendar"
              size={14}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
            <Text
              style={[
                styles.infoText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[700],
                },
              ]}>
              {formatDateRange(
                tournament.start_date_time,
                tournament.end_date_time,
              )}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon
              name="users"
              size={14}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
            <Text
              style={[
                styles.infoText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[700],
                },
              ]}
              numberOfLines={1}>
              {tournament.organization_name}
            </Text>
          </View>
          {/* Division Row - Added as separate row */}
          {tournament.organization_division && (
            <View style={styles.infoRow}>
              <Icon
                name="award"
                size={14}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
                }
              />
              <Text
                style={[
                  styles.infoText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[700],
                  },
                ]}>
                {tournament.organization_division.replace('_', ' ')}
              </Text>
            </View>
          )}
        </View>

        {/* Events/Draws - IMPROVED TO SHOW MEN'S AND WOMEN'S */}
        {tournament.events && tournament.events.length > 0 && (
          <View style={styles.eventsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventsScroll}>
              {tournament.events.slice(0, 4).map((event, index) => (
                <View
                  key={index}
                  style={[
                    styles.eventBadge,
                    {
                      backgroundColor: isDark
                        ? theme.colors.primary[900]
                        : theme.colors.primary[50],
                    },
                  ]}>
                  <Text
                    style={[
                      styles.eventText,
                      {
                        color: isDark
                          ? theme.colors.primary[300]
                          : theme.colors.primary[700],
                      },
                    ]}>
                    {event}
                  </Text>
                </View>
              ))}
              {tournament.events.length > 4 && (
                <View
                  style={[
                    styles.eventBadge,
                    {
                      backgroundColor: isDark
                        ? theme.colors.gray[800]
                        : theme.colors.gray[100],
                    },
                  ]}>
                  <Text
                    style={[
                      styles.eventText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    +{tournament.events.length - 4} more
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Draws Count - THIS WILL BE FIXED BY BACKEND */}
        <View style={styles.tournamentFooter}>
          <View style={styles.drawsInfo}>
            <Icon
              name="grid"
              size={14}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
              }
            />
            <Text
              style={[
                styles.drawsText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              {tournament.draws_count || 0}{' '}
              {tournament.draws_count === 1 ? 'Draw' : 'Draws'}
            </Text>
          </View>
          <Icon
            name="chevron-right"
            size={18}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[400]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && tournaments.length === 0) {
    return (
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
          Loading tournaments...
        </Text>
      </View>
    );
  }

  if (error && tournaments.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, {color: theme.colors.error}]}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchTournaments(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon
          name="calendar"
          size={48}
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
          No tournaments found for the selected date range
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary[500]]}
          tintColor={theme.colors.primary[500]}
        />
      }
      onScroll={({nativeEvent}) => {
        const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
        const paddingToBottom = 20;
        if (
          layoutMeasurement.height + contentOffset.y >=
          contentSize.height - paddingToBottom
        ) {
          loadMore();
        }
      }}
      scrollEventThrottle={400}>
      {tournaments.map(renderTournamentCard)}

      {loading && tournaments.length > 0 && (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  loadingText: {
    marginTop: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[6],
  },
  errorText: {
    marginTop: theme.spacing[3],
    fontSize: theme.typography.fontSize.base,
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
    color: 'white',
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[8],
  },
  emptyText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
  tournamentCard: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing[3],
    ...theme.shadows.md,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[2],
  },
  tournamentTitleSection: {
    flex: 1,
    marginRight: theme.spacing[2],
  },
  tournamentName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    marginBottom: theme.spacing[1],
  },
  tournamentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[1],
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  upcomingBadge: {
    backgroundColor: theme.colors.primary[100],
  },
  activeBadge: {
    backgroundColor: theme.colors.success + '20',
  },
  completedBadge: {
    backgroundColor: theme.colors.gray[100],
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.primary[700],
  },
  activeStatusText: {
    color: theme.colors.success,
  },
  completedStatusText: {
    color: theme.colors.gray[600],
  },
  tournamentInfo: {
    marginBottom: theme.spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[2],
    flex: 1,
  },
  eventsContainer: {
    marginBottom: theme.spacing[2],
  },
  eventsScroll: {
    paddingVertical: theme.spacing[1],
  },
  eventBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing[2],
  },
  eventText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  tournamentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: theme.spacing[2],
  },
  drawsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawsText: {
    fontSize: theme.typography.fontSize.sm,
    marginLeft: theme.spacing[1],
  },
  loadMoreContainer: {
    padding: theme.spacing[4],
    alignItems: 'center',
  },

  divisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primary[100],
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  divisionText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[700],
  },
});

export default TournamentsSection;
