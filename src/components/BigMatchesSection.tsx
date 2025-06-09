// src/components/BigMatchesSection.tsx
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
import {api} from '../api';
import theme from '../theme';
import TeamLogo from './TeamLogo';

// Define proper types for component props
interface BigMatchesSectionProps {
  favoriteTeams?: string[];
  isDark: boolean;
}

// Define interface for matches with proper null/undefined handling
interface Match {
  id: string;
  home_team_id?: string | null;
  away_team_id?: string | null;
  start_date: string;
  timezone?: string;
  scheduled_time?: string;
  no_scheduled_time?: boolean;
  completed: boolean;
  is_conference_match?: boolean;
  gender?: string;
  score?: number;
  involvesFavorite?: boolean | string;
  // Add any other properties that might be in your API response
}

// Define proper types for navigation
type RootStackParamList = {
  MainTabs: undefined;
  TeamDetail: {teamId: string};
  MatchDetail: {matchId: string};
  TeamsPage: undefined;
};

type BigMatchesNavigationProp =
  import('@react-navigation/stack').StackNavigationProp<RootStackParamList>;

const BigMatchesSection: React.FC<BigMatchesSectionProps> = ({
  favoriteTeams = [],
  isDark,
}) => {
  const navigation = useNavigation<BigMatchesNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [teamRankings, setTeamRankings] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBigMatches = async () => {
      setLoading(true);
      try {
        // Fetch today's date
        const today = new Date();

        // Fetch upcoming matches for the next 7 days
        const matches = await api.matches.getAll();

        // Filter to only include upcoming matches in the next week
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const upcoming = matches.filter(match => {
          const matchDate = new Date(match.start_date);
          return (
            !match.completed && matchDate >= today && matchDate <= nextWeek
          );
        });

        // Fetch all team IDs from these matches
        const teamIds = new Set<string>();
        upcoming.forEach(match => {
          if (match.home_team_id) teamIds.add(match.home_team_id);
          if (match.away_team_id) teamIds.add(match.away_team_id);
        });

        // Fetch latest rankings
        const latestRankings = await api.rankings.getLatestTeamRankings(
          'DIV1',
          'M',
          100,
        );
        const menRankingsMap: Record<string, number> = {};
        latestRankings.forEach(rank => {
          menRankingsMap[rank.team_id] = rank.rank;
        });

        const latestWomenRankings = await api.rankings.getLatestTeamRankings(
          'DIV1',
          'F',
          100,
        );
        const womenRankingsMap: Record<string, number> = {};
        latestWomenRankings.forEach(rank => {
          womenRankingsMap[rank.team_id] = rank.rank;
        });

        // Combine rankings
        const rankingsMap = {...menRankingsMap, ...womenRankingsMap};
        setTeamRankings(rankingsMap);

        // Score matches by ranking significance
        const scoredMatches = upcoming.map(match => {
          const homeRank = match.home_team_id
            ? rankingsMap[match.home_team_id] || 9999
            : 9999;
          const awayRank = match.away_team_id
            ? rankingsMap[match.away_team_id] || 9999
            : 9999;

          // Determine if match involves favorite teams
          const involvesFavorite =
            (match.home_team_id &&
              favoriteTeams.includes(match.home_team_id)) ||
            (match.away_team_id && favoriteTeams.includes(match.away_team_id));

          // Score based on rankings and favorite status
          // Lower is better: Top 10 vs Top 10 is high priority
          let score = homeRank + awayRank;

          // Bonus for conference matches
          if (match.is_conference_match) {
            score -= 20;
          }

          // Huge bonus for matches involving favorite teams
          if (involvesFavorite) {
            score -= 1000;
          }

          // Bonus for higher ranked teams
          if (homeRank <= 10 || awayRank <= 10) {
            score -= 50;
          }

          return {...match, score, involvesFavorite} as Match;
        });

        // Sort by score (lowest first - most significant)
        scoredMatches.sort(
          (a, b) => ((a.score as number) || 0) - ((b.score as number) || 0),
        );

        // Take top 5 big matches
        setUpcomingMatches(scoredMatches.slice(0, 5) as Match[]);
      } catch (error) {
        console.error('Failed to fetch big matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBigMatches();
  }, [favoriteTeams]);

  // Navigate to match details
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

  if (upcomingMatches.length === 0) {
    return null; // Hide section if no matches
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {color: isDark ? theme.colors.text.dark : theme.colors.text.light},
          ]}>
          Big Upcoming Matches
        </Text>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text
            style={[styles.viewAllText, {color: theme.colors.primary[500]}]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.matchesScroll}>
        {upcomingMatches.map(match => {
          const homeRank =
            match.home_team_id && typeof match.home_team_id === 'string'
              ? teamRankings[match.home_team_id]
              : undefined;
          const awayRank =
            match.away_team_id && typeof match.away_team_id === 'string'
              ? teamRankings[match.away_team_id]
              : undefined;
          const isHomeFavorite =
            match.home_team_id && typeof match.home_team_id === 'string'
              ? favoriteTeams.includes(match.home_team_id)
              : false;
          const isAwayFavorite =
            match.away_team_id && typeof match.away_team_id === 'string'
              ? favoriteTeams.includes(match.away_team_id)
              : false;

          return (
            <TouchableOpacity
              key={match.id}
              style={[
                styles.matchCard,
                {
                  backgroundColor: isDark
                    ? theme.colors.card.dark
                    : theme.colors.card.light,
                  borderColor: isDark
                    ? theme.colors.border.dark
                    : theme.colors.border.light,
                },
                match.involvesFavorite && styles.favoriteMatchCard,
              ]}
              onPress={() => navigateToMatch(match.id)}>
              {/* Match Date & Time */}
              <View style={styles.matchDateContainer}>
                <Text
                  style={[
                    styles.matchDate,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  {new Date(match.start_date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {match.scheduled_time && (
                  <Text
                    style={[
                      styles.matchTime,
                      {
                        color: isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[500],
                      },
                    ]}>
                    {new Date(match.scheduled_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>

              {/* Teams */}
              <View style={styles.teamsContainer}>
                {/* Home Team */}
                <View
                  style={[
                    styles.teamContainer,
                    isHomeFavorite && styles.favoriteTeam,
                  ]}>
                  <TeamLogo teamId={match.home_team_id || ''} size="medium" />
                  {homeRank && homeRank <= 25 && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{homeRank}</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.vsText,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  VS
                </Text>

                {/* Away Team */}
                <View
                  style={[
                    styles.teamContainer,
                    isAwayFavorite && styles.favoriteTeam,
                  ]}>
                  <TeamLogo teamId={match.away_team_id || ''} size="medium" />
                  {awayRank && awayRank <= 25 && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{awayRank}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Labels */}
              <View style={styles.matchLabels}>
                {match.is_conference_match && (
                  <View style={styles.conferenceLabel}>
                    <Text style={styles.conferenceLabelText}>Conference</Text>
                  </View>
                )}
                {match.involvesFavorite && (
                  <View style={styles.favoriteLabel}>
                    <Icon name="star" size={10} color="white" />
                    <Text style={styles.favoriteLabelText}>Favorite</Text>
                  </View>
                )}
                {match.gender && (
                  <View
                    style={[
                      styles.genderLabel,
                      {
                        backgroundColor: isDark
                          ? theme.colors.gray[800]
                          : theme.colors.gray[100],
                      },
                    ]}>
                    <Text
                      style={[
                        styles.genderLabelText,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.text.light,
                        },
                      ]}>
                      {match.gender === 'MALE' ? 'Men' : 'Women'}
                    </Text>
                  </View>
                )}
              </View>
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
  viewAllButton: {
    paddingVertical: theme.spacing[1],
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: theme.spacing[8],
    alignItems: 'center',
  },
  matchesScroll: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  matchCard: {
    width: 200,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[3],
    marginRight: theme.spacing[3],
    borderWidth: 1,
  },
  favoriteMatchCard: {
    borderColor: theme.colors.primary[500],
    borderWidth: 2,
  },
  matchDateContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  matchDate: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
  },
  matchTime: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  teamContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  favoriteTeam: {
    // Highlight for favorite team
  },
  vsText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[1],
    paddingVertical: theme.spacing[0.5],
  },
  rankText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  matchLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  conferenceLabel: {
    backgroundColor: theme.colors.primary[100],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    marginHorizontal: theme.spacing[1],
    marginBottom: theme.spacing[1],
  },
  conferenceLabelText: {
    color: theme.colors.primary[700],
    fontSize: 10,
    fontWeight: '500',
  },
  favoriteLabel: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    marginHorizontal: theme.spacing[1],
    marginBottom: theme.spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  genderLabel: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    marginHorizontal: theme.spacing[1],
    marginBottom: theme.spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderLabelText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
});

export default BigMatchesSection;
