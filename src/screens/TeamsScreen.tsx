// src/screens/TeamsScreen.tsx
import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Feather';
import {ThemeContext} from '../../App';
import theme from '../theme';
import {api} from '../api';
import TeamLogo from '../components/TeamLogo';

// Define navigation types
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  MatchDetail: {matchId: string};
  PlayerDetail: {playerId: string};
};

type TeamsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface TeamsScreenProps {
  navigation: TeamsScreenNavigationProp;
}

interface Team {
  id: string;
  name: string;
  abbreviation?: string;
  division?: string;
  conference?: string;
  region?: string;
  gender?: string;
}

const TeamsScreen: React.FC<TeamsScreenProps> = ({navigation}) => {
  // Context for dark/light theme
  const {isDark} = useContext(ThemeContext);

  // State management
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch teams from API
  const fetchTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await api.teams.getAll();
      setTeams(teamsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchTeams();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchTeams();
  };

  // Navigate to team details
  const handleTeamPress = (teamId: string) => {
    navigation.navigate('TeamDetail', {teamId});
  };

  // Filter teams based on search query and Division 1 only
  const filteredTeams = teams.filter(team => {
    // Only include Division I teams
    if (team.division !== 'DIV_I') return false;

    // If no search query, include all Division I teams
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    const teamName = team.name?.toLowerCase() || '';
    const teamAbbreviation = team.abbreviation?.toLowerCase() || '';

    // Format conference name for search (replacing underscores with spaces)
    const conferenceFormatted = team.conference
      ? team.conference.replace(/_/g, ' ').toLowerCase()
      : '';
    const conferenceOriginal = team.conference?.toLowerCase() || '';

    // Check if search term matches any of the fields
    return (
      teamName.includes(searchLower) ||
      teamAbbreviation.includes(searchLower) ||
      conferenceFormatted.includes(searchLower) ||
      conferenceOriginal.includes(searchLower)
    );
  });

  // Format conference name for display
  const formatConferenceName = (conference?: string) => {
    return conference ? conference.replace(/_/g, ' ') : '';
  };

  const formatTeamName = (name?: string): string => {
    return name ? name.replace(/\s*\((M|W)\)$/, '') : 'Unknown Team';
  };

  // Extract gender from team name
  const getTeamGender = (teamName?: string): 'MALE' | 'FEMALE' => {
    if (teamName?.includes('(M)')) return 'MALE';
    if (teamName?.includes('(W)')) return 'FEMALE';

    // Default fallback if no indicator found
    return 'MALE'; // Default to male if no gender indicator
  };

  // Render team item
  const renderTeamItem = ({item}: {item: Team}) => {
    // Get gender from the team name
    const gender = getTeamGender(item.name);

    return (
      <TouchableOpacity
        style={[
          styles.teamCard,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
          },
        ]}
        onPress={() => handleTeamPress(item.id)}
        activeOpacity={0.7}>
        <View style={styles.teamContent}>
          <TeamLogo teamId={item.id} size="medium" />
          <View style={styles.teamInfoContainer}>
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
              {formatTeamName(item.name)}
            </Text>
            {item.conference && (
              <Text
                style={[
                  styles.conferenceText,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.text.dimLight,
                  },
                ]}
                numberOfLines={1}>
                {formatConferenceName(item.conference)}
              </Text>
            )}
            <View style={styles.teamMeta}>
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
                {gender === 'MALE' ? 'Men' : 'Women'}
              </Text>
            </View>
          </View>
          <Icon
            name="chevron-right"
            size={20}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[400]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty search results
  const renderEmptyState = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text
            style={[
              styles.infoText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            Loading teams...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, {color: theme.colors.error}]}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTeams}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery && filteredTeams.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon
            name="search"
            size={48}
            color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.infoText,
              {
                color: isDark ? theme.colors.text.dark : theme.colors.gray[600],
              },
            ]}>
            No teams found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    if (!searchQuery) {
      return (
        <View style={styles.centerContainer}>
          <Icon
            name="users"
            size={48}
            color={isDark ? theme.colors.gray[600] : theme.colors.gray[400]}
          />
          <Text
            style={[
              styles.infoText,
              {
                color: isDark ? theme.colors.text.dark : theme.colors.gray[600],
              },
            ]}>
            Search for a team by name, conference, or abbreviation
          </Text>
        </View>
      );
    }

    return null;
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
      {/* Search Header */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: isDark
              ? theme.colors.card.dark
              : theme.colors.card.light,
            borderBottomColor: isDark
              ? theme.colors.border.dark
              : theme.colors.border.light,
          },
        ]}>
        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? theme.colors.background.dark
                : theme.colors.gray[100],
              borderColor: isDark
                ? theme.colors.border.dark
                : theme.colors.border.light,
            },
          ]}>
          <Icon
            name="search"
            size={20}
            color={isDark ? theme.colors.text.dimDark : theme.colors.gray[500]}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}
            placeholder="Search for a team or conference..."
            placeholderTextColor={
              isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoFocus={true}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon
                name="x"
                size={18}
                color={
                  isDark ? theme.colors.text.dimDark : theme.colors.gray[500]
                }
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Teams List */}
      <FlatList
        data={searchQuery ? filteredTeams : []}
        renderItem={renderTeamItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          // If no items and not loading, center the empty state
          (!searchQuery || filteredTeams.length === 0) && {flex: 1},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: theme.spacing[4],
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  searchIcon: {
    marginRight: theme.spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    height: 40,
  },
  listContent: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[24], // Extra padding at bottom for tab bar
  },
  teamCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.md,
  },
  teamContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamInfoContainer: {
    flex: 1,
    marginLeft: theme.spacing[3],
  },
  teamName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing[0.5],
  },
  teamMeta: {
    flexDirection: 'row',
    marginTop: theme.spacing[1],
    alignItems: 'center',
  },
  genderBadge: {
    fontSize: theme.typography.fontSize.xs,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[4],
  },
  infoText: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginTop: theme.spacing[3],
    maxWidth: '80%',
  },
  subInfoText: {
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing[2],
    maxWidth: '80%',
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    textAlign: 'center',
    marginTop: theme.spacing[3],
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
});

export default TeamsScreen;
