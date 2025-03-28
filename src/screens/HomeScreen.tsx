// src/screens/HomeScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {format} from 'date-fns';
import {api} from '../api';
import theme from '../theme';
import {Match, Team} from '../api';
import {StackNavigationProp} from '@react-navigation/stack';

// Define navigation types
type RootStackParamList = {
  MainTabs: undefined;
  MatchDetail: {matchId: string};
  TeamDetail: {teamId: string};
  PlayerDetail: {playerId: string};
};

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const [todayMatches, setTodayMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get today's date in YYYY-MM-DD format
        const today = format(new Date(), 'yyyy-MM-dd');

        // Fetch today's matches
        const matchesData = await api.matches.getAll(today);

        // Get unique team IDs from matches
        const teamIds = new Set<string>();
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
            } catch (error) {
              console.error(`Failed to fetch team ${teamId}:`, error);
            }
          }),
        );

        setTodayMatches(matchesData);
        setTeams(teamsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching home data:', err);
        setError('Failed to load matches. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>College Tennis</Text>
        <Text style={styles.date}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
            <Text style={styles.loadingText}>Loading matches...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : todayMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matches scheduled for today</Text>
          </View>
        ) : (
          <View style={styles.matchesContainer}>
            <Text style={styles.sectionTitle}>Today's Matches</Text>
            {todayMatches.map(match => (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchTeams}>
                  <Text style={styles.teamName}>
                    {teams[match.home_team_id || '']?.name || 'Team A'}
                  </Text>
                  <Text style={styles.vs}>vs</Text>
                  <Text style={styles.teamName}>
                    {teams[match.away_team_id || '']?.name || 'Team B'}
                  </Text>
                </View>

                {match.scheduled_time && (
                  <Text style={styles.matchTime}>
                    {format(new Date(match.scheduled_time), 'h:mm a')}
                  </Text>
                )}

                {match.is_conference_match && (
                  <View style={styles.conferenceTag}>
                    <Text style={styles.conferenceText}>Conference</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  container: {
    padding: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: theme.colors.text.light,
  },
  date: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.gray[500],
    marginTop: theme.spacing[1],
    marginBottom: theme.spacing[6],
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[10],
  },
  loadingText: {
    marginTop: theme.spacing[4],
    color: theme.colors.gray[600],
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[10],
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: theme.spacing[10],
  },
  emptyText: {
    color: theme.colors.gray[600],
    textAlign: 'center',
  },
  matchesContainer: {
    marginTop: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.light,
    marginBottom: theme.spacing[4],
  },
  matchCard: {
    backgroundColor: theme.colors.card.light,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    ...theme.shadows.md,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    color: theme.colors.text.light,
    flex: 1,
  },
  vs: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.gray[500],
    marginHorizontal: theme.spacing[2],
  },
  matchTime: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray[600],
    marginTop: theme.spacing[2],
  },
  conferenceTag: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: theme.borderRadius.full,
  },
  conferenceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary[700],
  },
});

export default HomeScreen;
