// src/screens/RankingsScreen.tsx
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
import {format} from 'date-fns';
import Icon from 'react-native-vector-icons/Feather';
import {ThemeContext} from '../../App';
import theme from '../theme';
import {api} from '../api';
import TeamLogo from '../components/TeamLogo';

// Define the types
interface RankingList {
  id: string;
  division_type: string;
  gender: string;
  match_format: string;
  publish_date: string;
  planned_publish_date: string;
  date_range_start: string;
  date_range_end: string;
}

interface TeamRanking {
  team_id: string;
  ranking_list_id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  team_name: string;
  conference?: string;
}

interface PlayerRanking {
  player_id: string;
  team_id: string;
  ranking_list_id: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  player_name: string;
  team_name: string;
  conference?: string;
}

type MatchFormatType = 'TEAM' | 'SINGLES' | 'DOUBLES';
type GenderType = 'M' | 'F';

const RankingsScreen: React.FC = () => {
  const {isDark} = useContext(ThemeContext);

  // State variables
  const [matchFormat, setMatchFormat] = useState<MatchFormatType>('TEAM');
  const [gender, setGender] = useState<GenderType>('M');
  const [divisionType, setDivisionType] = useState<string>('DIV1');
  const [rankingLists, setRankingLists] = useState<RankingList[]>([]);
  const [selectedRankingList, setSelectedRankingList] =
    useState<RankingList | null>(null);
  const [rankings, setRankings] = useState<TeamRanking[] | PlayerRanking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState<boolean>(false);
  const [teamRankings, setTeamRankings] = useState<TeamRanking[]>([]);
  const [playerRankings, setPlayerRankings] = useState<PlayerRanking[]>([]);

  // Format a ranking list date for display in the selector
  const formatRankingListDate = (rankingList: RankingList | null): string => {
    console.log(rankingList);
    if (!rankingList) return 'Latest';
    if (rankingList.planned_publish_date) {
      try {
        const date = new Date(rankingList.planned_publish_date);
        if (date.getFullYear() > 1970) {
          return format(date, 'MMM d, yyyy');
        }
      } catch (e) {}
    }
    if (rankingList.publish_date) {
      try {
        const date = new Date(rankingList.publish_date);
        if (date.getFullYear() > 1970) {
          return format(date, 'MMM d, yyyy');
        }
      } catch (e) {}
    }
    return 'Unknown date';
  };

  // Fetch ranking lists based on current selections
  const fetchRankingLists = async () => {
    try {
      setLoading(true);
      let lists: any = [];

      if (matchFormat === 'TEAM') {
        lists = await api.rankings.getTeamRankingLists(divisionType, gender);
      } else if (matchFormat === 'SINGLES') {
        lists = await api.rankings.getSinglesRankingLists(divisionType, gender);
      } else if (matchFormat === 'DOUBLES') {
        lists = await api.rankings.getDoublesRankingLists(divisionType, gender);
      }

      setRankingLists(lists);

      // Select the most recent list by default
      if (lists.length > 0) {
        setSelectedRankingList(lists[0]);
        await fetchRankings(lists[0].id);
      } else {
        setSelectedRankingList(null);
        setRankings([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching ranking lists:', err);
      setError('Failed to load ranking lists');
      setRankingLists([]);
      setSelectedRankingList(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch rankings for the selected list
  const fetchRankings = async (rankingListId: string) => {
    try {
      setLoading(true);

      if (matchFormat === 'TEAM') {
        const data = await api.rankings.getTeamRankings(rankingListId);
        setTeamRankings(data);
        setPlayerRankings([]); // Clear the other type
      } else if (matchFormat === 'SINGLES' || matchFormat === 'DOUBLES') {
        const data = await api.rankings.getSinglesRankings(rankingListId);
        setPlayerRankings(data);
        setTeamRankings([]); // Clear the other type
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching rankings:', err);
      setError('Failed to load rankings');
      setTeamRankings([]);
      setPlayerRankings([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchRankingLists();
  }, [matchFormat, gender, divisionType]);

  // Handle refreshing
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRankingLists();
  };

  // Handle match format selection
  const handleMatchFormatChange = (format: MatchFormatType) => {
    setMatchFormat(format);
  };

  // Handle gender selection
  const handleGenderChange = (newGender: GenderType) => {
    setGender(newGender);
  };

  // Handle ranking list selection
  const handleRankingListSelect = async (rankingList: RankingList) => {
    setSelectedRankingList(rankingList);
    setDatePickerVisible(false);
    await fetchRankings(rankingList.id);
  };

  // Render a team ranking item
  const renderTeamRankingItem = ({item}: {item: TeamRanking}) => (
    <View
      style={[
        styles.rankingRow,
        {
          backgroundColor: isDark
            ? theme.colors.background.dark
            : theme.colors.white,
          borderColor: isDark
            ? theme.colors.border.dark
            : theme.colors.border.light,
        },
      ]}>
      {/* Rank */}
      <View style={styles.rankCell}>
        <Text
          style={[
            styles.rankText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.rank}
        </Text>
      </View>

      {/* Team Info */}
      <View style={styles.teamCell}>
        <TeamLogo teamId={item.team_id} size="small" />
        <View style={styles.teamInfo}>
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
            {item.team_name}
          </Text>
          {item.conference && (
            <Text
              style={[
                styles.conferenceText,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[500],
                },
              ]}
              numberOfLines={1}>
              {item.conference.replace(/_/g, ' ')}
            </Text>
          )}
        </View>
      </View>

      {/* Record */}
      <View style={styles.recordCell}>
        <Text
          style={[
            styles.recordText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.wins}-{item.losses}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsCell}>
        <Text
          style={[
            styles.pointsText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.points.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  // Render a player ranking item
  const renderPlayerRankingItem = ({item}: {item: PlayerRanking}) => (
    <View
      style={[
        styles.rankingRow,
        {
          backgroundColor: isDark
            ? theme.colors.background.dark
            : theme.colors.white,
          borderColor: isDark
            ? theme.colors.border.dark
            : theme.colors.border.light,
        },
      ]}>
      {/* Rank */}
      <View style={styles.rankCell}>
        <Text
          style={[
            styles.rankText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.rank}
        </Text>
      </View>

      {/* Player Info */}
      <View style={styles.teamCell}>
        <TeamLogo teamId={item.team_id} size="small" />
        <View style={styles.teamInfo}>
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
            {item.player_name}
          </Text>
          <Text
            style={[
              styles.conferenceText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[500],
              },
            ]}
            numberOfLines={1}>
            {item.team_name}
          </Text>
        </View>
      </View>

      {/* Record */}
      <View style={styles.recordCell}>
        <Text
          style={[
            styles.recordText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.wins}-{item.losses}
        </Text>
      </View>

      {/* Points */}
      <View style={styles.pointsCell}>
        <Text
          style={[
            styles.pointsText,
            {
              color: isDark ? theme.colors.text.dark : theme.colors.text.light,
            },
          ]}>
          {item.points.toFixed(2)}
        </Text>
      </View>
    </View>
  );

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
          Loading rankings...
        </Text>
      </View>
    );
  }

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
      {/* Header with filters */}
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
        {/* Match Type selector */}
        <View style={styles.filterRow}>
          <Text
            style={[
              styles.filterLabel,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Rankings:
          </Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                matchFormat === 'TEAM' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => handleMatchFormatChange('TEAM')}>
              <Text
                style={[
                  styles.segmentButtonText,
                  {
                    color:
                      matchFormat === 'TEAM'
                        ? theme.colors.white
                        : isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                  },
                ]}>
                Teams
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                matchFormat === 'SINGLES' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => handleMatchFormatChange('SINGLES')}>
              <Text
                style={[
                  styles.segmentButtonText,
                  {
                    color:
                      matchFormat === 'SINGLES'
                        ? theme.colors.white
                        : isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                  },
                ]}>
                Singles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                matchFormat === 'DOUBLES' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => handleMatchFormatChange('DOUBLES')}>
              <Text
                style={[
                  styles.segmentButtonText,
                  {
                    color:
                      matchFormat === 'DOUBLES'
                        ? theme.colors.white
                        : isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                  },
                ]}>
                Doubles
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Gender selector */}
        <View style={styles.filterRow}>
          <Text
            style={[
              styles.filterLabel,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Gender:
          </Text>
          <View style={styles.genderControl}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'M' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => handleGenderChange('M')}>
              <Text
                style={[
                  styles.genderButtonText,
                  {
                    color:
                      gender === 'M'
                        ? theme.colors.white
                        : isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                  },
                ]}>
                Men
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'F' && {
                  backgroundColor: theme.colors.primary[500],
                },
              ]}
              onPress={() => handleGenderChange('F')}>
              <Text
                style={[
                  styles.genderButtonText,
                  {
                    color:
                      gender === 'F'
                        ? theme.colors.white
                        : isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                  },
                ]}>
                Women
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date selector */}
        <View style={styles.filterRow}>
          <Text
            style={[
              styles.filterLabel,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Date:
          </Text>
          <TouchableOpacity
            style={[
              styles.dateSelector,
              {
                backgroundColor: isDark
                  ? theme.colors.background.dark
                  : theme.colors.gray[100],
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}
            onPress={() => setDatePickerVisible(true)}>
            <Text
              style={[
                styles.dateText,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}>
              {formatRankingListDate(selectedRankingList)}
            </Text>
            <Icon
              name="chevron-down"
              size={16}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[600]
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Rankings list */}
      {error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : matchFormat === 'TEAM' ? (
        teamRankings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="award"
              size={48}
              color={
                isDark ? theme.colors.text.dimDark : theme.colors.gray[400]
              }
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
              No team rankings available
            </Text>
          </View>
        ) : (
          <FlatList
            data={teamRankings}
            keyExtractor={(item, index) => `${item.ranking_list_id}-${index}`}
            renderItem={renderTeamRankingItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary[500]]}
                tintColor={theme.colors.primary[500]}
              />
            }
            ListHeaderComponent={
              <View
                style={[
                  styles.listHeader,
                  {
                    backgroundColor: isDark
                      ? theme.colors.card.dark
                      : theme.colors.card.light,
                  },
                ]}>
                <View style={styles.rankHeaderCell}>
                  <Text
                    style={[
                      styles.columnHeaderText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    Rank
                  </Text>
                </View>
                <View style={styles.teamHeaderCell}>
                  <Text
                    style={[
                      styles.columnHeaderText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    Team
                  </Text>
                </View>
                <View style={styles.recordHeaderCell}>
                  <Text
                    style={[
                      styles.columnHeaderText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    W-L
                  </Text>
                </View>
                <View style={styles.pointsHeaderCell}>
                  <Text
                    style={[
                      styles.columnHeaderText,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[600],
                      },
                    ]}>
                    Pts
                  </Text>
                </View>
              </View>
            }
            contentContainerStyle={{
              paddingBottom: 120, // Extra padding at bottom
            }}
          />
        )
      ) : playerRankings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="award"
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
            No player rankings available
          </Text>
        </View>
      ) : (
        <FlatList
          data={playerRankings}
          keyExtractor={(item, index) => `${item.ranking_list_id}-${index}`}
          renderItem={renderPlayerRankingItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary[500]]}
              tintColor={theme.colors.primary[500]}
            />
          }
          ListHeaderComponent={
            <View
              style={[
                styles.listHeader,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                },
              ]}>
              <View style={styles.rankHeaderCell}>
                <Text
                  style={[
                    styles.columnHeaderText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  Rank
                </Text>
              </View>
              <View style={styles.teamHeaderCell}>
                <Text
                  style={[
                    styles.columnHeaderText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  Player/Team
                </Text>
              </View>
              <View style={styles.recordHeaderCell}>
                <Text
                  style={[
                    styles.columnHeaderText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  W-L
                </Text>
              </View>
              <View style={styles.pointsHeaderCell}>
                <Text
                  style={[
                    styles.columnHeaderText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[600],
                    },
                  ]}>
                  Pts
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={{
            paddingBottom: 120, // Extra padding at bottom
          }}
        />
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}>
          <View
            style={[
              styles.datePickerContainer,
              {
                backgroundColor: isDark
                  ? theme.colors.card.dark
                  : theme.colors.card.light,
              },
            ]}>
            <Text
              style={[
                styles.datePickerTitle,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}>
              Select Ranking Date
            </Text>
            <ScrollView style={styles.datePickerScrollView}>
              {rankingLists.map((list, index) => (
                <TouchableOpacity
                  key={list.id}
                  style={[
                    styles.datePickerItem,
                    selectedRankingList?.id === list.id && {
                      backgroundColor: isDark
                        ? theme.colors.primary[900]
                        : theme.colors.primary[50],
                    },
                  ]}
                  onPress={() => handleRankingListSelect(list)}>
                  <Text
                    style={[
                      styles.datePickerItemText,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.text.light,
                      },
                      selectedRankingList?.id === list.id && {
                        color: isDark
                          ? theme.colors.primary[400]
                          : theme.colors.primary[600],
                        fontWeight: '600',
                      },
                    ]}>
                    {formatRankingListDate(list)}
                  </Text>
                  {selectedRankingList?.id === list.id && (
                    <Icon
                      name="check"
                      size={16}
                      color={theme.colors.primary[500]}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  filterLabel: {
    width: 80,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  segmentedControl: {
    flexDirection: 'row',
    flex: 1,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[2],
  },
  segmentButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  genderControl: {
    flexDirection: 'row',
    flex: 1,
  },
  genderButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing[2],
    marginHorizontal: theme.spacing[1],
    borderRadius: theme.borderRadius.md,
  },
  genderButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  dateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  dateText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  listHeader: {
    flexDirection: 'row',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  columnHeaderText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '700',
  },
  rankHeaderCell: {
    width: 50,
    alignItems: 'center',
  },
  teamHeaderCell: {
    flex: 1,
    paddingLeft: theme.spacing[2],
  },
  recordHeaderCell: {
    width: 60,
    alignItems: 'center',
  },
  pointsHeaderCell: {
    width: 60,
    alignItems: 'center',
  },
  rankingRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  rankCell: {
    width: 50,
    alignItems: 'center',
  },
  rankText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
  },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamInfo: {
    marginLeft: theme.spacing[2],
    flex: 1,
  },
  teamName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.xs,
  },
  recordCell: {
    width: 60,
    alignItems: 'center',
  },
  recordText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  pointsCell: {
    width: 60,
    alignItems: 'center',
  },
  pointsText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  emptyText: {
    marginTop: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.lg,
  },
  datePickerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: theme.spacing[3],
    textAlign: 'center',
  },
  datePickerScrollView: {
    maxHeight: 300,
  },
  datePickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  datePickerItemText: {
    fontSize: theme.typography.fontSize.base,
  },
});

export default RankingsScreen;
