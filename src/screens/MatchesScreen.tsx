// src/screens/MatchesScreen.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {format} from 'date-fns';
import {api} from '../api';
import theme from '../theme';
import {Match, Team} from '../api';
import {ThemeContext} from '../../App';
import Icon from 'react-native-vector-icons/Feather';
import {StackNavigationProp} from '@react-navigation/stack';
import TeamLogo from '../components/TeamLogo';

// Define navigation types
type RootStackParamList = {
  MainTabs: undefined;
  MatchDetail: {matchId: string};
  TeamDetail: {teamId: string};
  PlayerDetail: {playerId: string};
};

type MatchesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface MatchesScreenProps {
  navigation: MatchesScreenNavigationProp;
}

interface FilterState {
  gender: string;
  conference: string;
  sort: string;
}

const MatchesScreen: React.FC<MatchesScreenProps> = ({navigation}) => {
  // Use theme context
  const {isDark} = React.useContext(ThemeContext);

  // State for date and filters
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    gender: '',
    conference: '',
    sort: 'time-asc',
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    [],
  );
  const [matchScores, setMatchScores] = useState<Record<string, any>>({});

  // Fetch matches based on selected date
  const fetchMatches = async () => {
    try {
      setLoading(true);

      // Format date for API
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch matches from API
      const matchesData = await api.matches.getAll(dateStr);

      // Get unique team IDs from matches
      const teamIds = new Set<string>();
      const conferences = new Set<string>();

      matchesData.forEach(match => {
        if (match.home_team_id) teamIds.add(match.home_team_id);
        if (match.away_team_id) teamIds.add(match.away_team_id);
      });

      // Fetch team data for each team
      const teamsData: Record<string, Team> = {};
      await Promise.all(
        Array.from(teamIds).map(async teamId => {
          try {
            const team = await api.teams.getById(teamId);
            teamsData[teamId] = team;

            // Track available conferences
            if (team.conference) {
              conferences.add(team.conference);
            }
          } catch (error) {
            console.error(`Failed to fetch team ${teamId}:`, error);
          }
        }),
      );

      const completedMatches = matchesData.filter(match => match.completed);
      const scorePromises = completedMatches.map(match =>
        api.matches.getScore(match.id),
      );
      const scoreResults = await Promise.all(scorePromises);

      // Create scores map
      const scoresMap: any = {};
      completedMatches.forEach((match, index) => {
        scoresMap[match.id] = scoreResults[index];
      });

      setMatches(matchesData);
      setTeams(teamsData);
      setMatchScores(scoresMap);
      setAvailableConferences(Array.from(conferences).sort());
      setError(null);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load and when date changes
  useEffect(() => {
    fetchMatches();
  }, [selectedDate]);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  // Handle date change
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  // Toggle date picker
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  // Toggle filter panel
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Update filter
  const updateFilter = (name: keyof FilterState, value: string) => {
    setFilters(prev => ({...prev, [name]: value}));
  };

  // Format conference name for display
  const formatConferenceName = (conference: string) => {
    return conference.replace(/_/g, ' ');
  };

  // Apply filters to matches
  const filteredMatches = useMemo(() => {
    let result = [...matches];

    // Apply gender filter
    if (filters.gender) {
      result = result.filter(match => match.gender === filters.gender);
    }

    // Apply conference filter
    if (filters.conference) {
      result = result.filter(match => {
        const homeTeam = teams[match.home_team_id || ''];
        const awayTeam = teams[match.away_team_id || ''];
        return (
          homeTeam?.conference === filters.conference ||
          awayTeam?.conference === filters.conference
        );
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      // Push TBD matches to the end
      const aIsTBD = !a.scheduled_time;
      const bIsTBD = !b.scheduled_time;

      if (aIsTBD && !bIsTBD) return 1;
      if (!aIsTBD && bIsTBD) return -1;
      if (aIsTBD && bIsTBD) return 0;

      // Parse dates for comparison
      const timeA = new Date(a.scheduled_time || '');
      const timeB = new Date(b.scheduled_time || '');

      switch (filters.sort) {
        case 'time-desc':
          return timeB.getTime() - timeA.getTime();
        case 'conference':
          if (a.is_conference_match && !b.is_conference_match) return -1;
          if (!a.is_conference_match && b.is_conference_match) return 1;
          return timeA.getTime() - timeB.getTime();
        case 'completed':
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return timeA.getTime() - timeB.getTime();
        case 'time-asc':
        default:
          return timeA.getTime() - timeB.getTime();
      }
    });

    return result;
  }, [matches, teams, filters]);

  // Navigate to match details
  const handleMatchPress = (matchId: string) => {
    navigation.navigate('MatchDetail', {matchId});
  };

  const formatTeamName = (name?: string): string => {
    return name ? name.replace(/\s*\((M|W)\)$/, '') : 'Unknown Team';
  };

  // Extract gender from team name or from match data
  const getTeamGender = (
    teamName?: string,
    match?: Match,
  ): 'MALE' | 'FEMALE' => {
    if (teamName?.includes('(M)')) return 'MALE';
    if (teamName?.includes('(W)')) return 'FEMALE';

    // Fallback to match gender
    return match?.gender === 'MALE' ? 'MALE' : 'FEMALE';
  };

  // Render match item
  const renderMatchItem = ({item}: {item: Match}) => {
    const homeTeam = teams[item.home_team_id || ''];
    const awayTeam = teams[item.away_team_id || ''];
    const matchScore = matchScores[item.id];

    // Get gender of the match (should be the same for both teams)
    const gender = item.gender;

    return (
      <TouchableOpacity
        style={[
          styles.matchCard,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
          },
          item.is_conference_match && styles.conferenceMatch,
        ]}
        onPress={() => handleMatchPress(item.id)}
        activeOpacity={0.7}>
        <View style={styles.matchContent}>
          {/* Home Team */}
          <View style={styles.teamContainer}>
            <TeamLogo teamId={item.home_team_id} size="small" />
            <Text
              style={[
                styles.teamName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}
              numberOfLines={2}>
              {formatTeamName(homeTeam?.name)}
            </Text>
          </View>

          {/* Score/Time */}
          <View style={styles.scoreContainer}>
            {item.completed ? (
              <>
                <Text
                  style={[
                    styles.score,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {matchScore
                    ? `${matchScore.home_team_score} - ${matchScore.away_team_score}`
                    : '- -'}
                </Text>
                <View
                  style={[
                    styles.statusTag,
                    {
                      backgroundColor: isDark
                        ? theme.colors.card.dark
                        : theme.colors.gray[100],
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    Final
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.time,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.text.light,
                    },
                  ]}>
                  {(() => {
                    try {
                      if (!item.scheduled_time) return 'TBD';
                      return format(new Date(item.scheduled_time), 'h:mm a');
                    } catch (e) {
                      return 'TBD';
                    }
                  })()}
                </Text>
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
              </>
            )}
          </View>

          {/* Away Team */}
          <View style={styles.teamContainer}>
            <TeamLogo teamId={item.away_team_id} size="small" />
            <Text
              style={[
                styles.teamName,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}
              numberOfLines={2}>
              {formatTeamName(awayTeam?.name)}
            </Text>
          </View>
        </View>

        {/* Gender Badge */}
        <View style={styles.genderBadgeContainer}>
          <Text
            style={[
              styles.genderBadge,
              {
                backgroundColor: isDark
                  ? theme.colors.gray[800]
                  : theme.colors.gray[100],
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            {gender === 'MALE' ? 'M' : 'W'}
          </Text>
        </View>

        {/* Conference Match Indicator */}
        {item.is_conference_match && (
          <View style={styles.conferenceTag}>
            <Text style={styles.conferenceText}>Conference</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // First, let's separate matches into completed and upcoming
  const renderMatchList = () => {
    // Filter completed matches
    const completedMatches = filteredMatches.filter(match => match.completed);

    // Filter upcoming matches
    const upcomingMatches = filteredMatches.filter(match => !match.completed);

    // If no matches at all, show empty state
    if (completedMatches.length === 0 && upcomingMatches.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon
            name="calendar"
            size={48}
            color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.emptyText,
              {color: isDark ? theme.colors.text.dark : theme.colors.gray[600]},
            ]}>
            No matches found
          </Text>
          <Text
            style={[
              styles.emptySubtext,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}>
            Try changing the date or filters
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={[...completedMatches, ...upcomingMatches]}
        renderItem={({item, index}) => {
          // Add divider if this is the first upcoming match after completed matches
          const showDivider =
            completedMatches.length > 0 &&
            upcomingMatches.length > 0 &&
            index === completedMatches.length;

          return (
            <>
              {showDivider && (
                <View style={styles.dividerContainer}>
                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.dividerText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[500],
                      },
                    ]}>
                    Matches Without Reported Scores
                  </Text>
                  <View
                    style={[
                      styles.divider,
                      {
                        backgroundColor: isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light,
                      },
                    ]}
                  />
                </View>
              )}
              {renderMatchItem({item})}
            </>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.matchesList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
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
      {/* Header with Date and Filters */}
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderBottomColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}>
        {/* Date Selector */}
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={toggleDatePicker}>
          <Icon name="calendar" size={16} color={theme.colors.primary[500]} />
          <Text
            style={[
              styles.dateText,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </Text>
          <Icon
            name={showDatePicker ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[500]}
          />
        </TouchableOpacity>

        {/* Filters Toggle */}
        <TouchableOpacity
          style={[
            styles.filtersButton,
            {
              backgroundColor: isDark
                ? theme.colors.card.dark
                : theme.colors.gray[100],
            },
          ]}
          onPress={toggleFilters}>
          <Icon
            name="filter"
            size={16}
            color={isDark ? theme.colors.text.dark : theme.colors.gray[700]}
          />
          <Text
            style={[
              styles.filtersButtonText,
              {color: isDark ? theme.colors.text.dark : theme.colors.gray[700]},
            ]}>
            Filters
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker (iOS style modal, Android inline) */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          style={styles.datePicker}
        />
      )}

      {/* Filters Panel */}
      {showFilters && (
        <View
          style={[
            styles.filtersPanel,
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
          <View style={styles.filterItem}>
            <Text
              style={[
                styles.filterLabel,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.gray[700],
                },
              ]}>
              Gender:
            </Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.gender === '' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('gender', '')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.gender === '' && {color: theme.colors.white},
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.gender === 'MALE' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('gender', 'MALE')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.gender === 'MALE' && {color: theme.colors.white},
                  ]}>
                  Men
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.gender === 'FEMALE' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('gender', 'FEMALE')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.gender === 'FEMALE' && {color: theme.colors.white},
                  ]}>
                  Women
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Conference Filter */}
          <View style={styles.filterItem}>
            <Text
              style={[
                styles.filterLabel,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.gray[700],
                },
              ]}>
              Conference:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conferencesContainer}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.conference === '' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('conference', '')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.conference === '' && {color: theme.colors.white},
                  ]}>
                  All
                </Text>
              </TouchableOpacity>

              {availableConferences.map(conf => (
                <TouchableOpacity
                  key={conf}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: isDark
                        ? theme.colors.background.dark
                        : theme.colors.gray[100],
                    },
                    filters.conference === conf && {
                      backgroundColor: theme.colors.primary[500],
                    },
                  ]}
                  onPress={() => updateFilter('conference', conf)}>
                  <Text
                    style={[
                      styles.filterOptionText,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.gray[700],
                      },
                      filters.conference === conf && {
                        color: theme.colors.white,
                      },
                    ]}>
                    {formatConferenceName(conf)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View style={styles.filterItem}>
            <Text
              style={[
                styles.filterLabel,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.gray[700],
                },
              ]}>
              Sort By:
            </Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.sort === 'time-asc' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('sort', 'time-asc')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.sort === 'time-asc' && {color: theme.colors.white},
                  ]}>
                  Time ↑
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.sort === 'time-desc' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('sort', 'time-desc')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.sort === 'time-desc' && {color: theme.colors.white},
                  ]}>
                  Time ↓
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isDark
                      ? theme.colors.background.dark
                      : theme.colors.gray[100],
                  },
                  filters.sort === 'conference' && {
                    backgroundColor: theme.colors.primary[500],
                  },
                ]}
                onPress={() => updateFilter('sort', 'conference')}>
                <Text
                  style={[
                    styles.filterOptionText,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                    filters.sort === 'conference' && {
                      color: theme.colors.white,
                    },
                  ]}>
                  Conference
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Matches List */}
      {/* Matches List */}
      {loading && !refreshing ? (
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
            Loading matches...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMatches}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderMatchList()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    marginLeft: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    flex: 1,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    borderRadius: theme.borderRadius.full,
  },
  filtersButtonText: {
    marginLeft: theme.spacing[1],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  datePicker: {
    backgroundColor: 'white', // iOS DateTimePicker background
    marginTop: theme.spacing[2],
  },
  filtersPanel: {
    padding: theme.spacing[4],
    borderBottomWidth: 1,
  },
  filterItem: {
    marginBottom: theme.spacing[3],
  },
  filterLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing[2],
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  conferencesContainer: {
    paddingRight: theme.spacing[4],
  },
  filterOption: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  filterOptionText: {
    fontSize: theme.typography.fontSize.sm,
  },
  matchesList: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[24], // Extra padding at bottom
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  errorText: {
    marginTop: theme.spacing[4],
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: theme.spacing[2],
    fontSize: theme.typography.fontSize.base,
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
  matchCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    ...theme.shadows.md,
    position: 'relative',
  },
  conferenceMatch: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    marginTop: theme.spacing[2],
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
  },
  score: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
  },
  time: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
  },
  vsText: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing[1],
  },
  statusTag: {
    marginTop: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
  },
  conferenceTag: {
    position: 'absolute',
    top: theme.spacing[1],
    right: theme.spacing[1],
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: theme.spacing[0.25],
    borderRadius: theme.borderRadius.full,
  },
  conferenceText: {
    fontSize: 10,
    color: theme.colors.primary[700],
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: theme.spacing[2],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  genderBadgeContainer: {
    position: 'absolute',
    top: theme.spacing[1],
    left: theme.spacing[1],
  },
  genderBadge: {
    fontSize: 10,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    fontWeight: '500',
  },
});

export default MatchesScreen;
