// src/components/TennisNewsFeed.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../theme';

const TennisNewsFeed = ({preferredDivision, preferredGender, isDark}) => {
  const [loading, setLoading] = useState(true);
  const [newsArticles, setNewsArticles] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        // This would typically be a server-side API call
        // For now, we'll use mock data to simulate news articles
        const mockNews = [
          {
            id: '1',
            title:
              'Top-Ranked Stanford Sweeps Final Four Matchup Against Ohio State',
            summary:
              "Stanford women's tennis team advances to the NCAA championship match with a decisive win over the Buckeyes.",
            date: new Date('2025-04-22T14:30:00'),
            source: 'College Tennis Today',
            url: 'https://example.com/article1',
            imageUrl: null,
          },
          {
            id: '2',
            title: 'Virginia Men Clinch ACC Regular Season Championship',
            summary:
              'The Cavaliers secure the top seed in the upcoming ACC tournament with victory over North Carolina.',
            date: new Date('2025-04-21T09:15:00'),
            source: 'Tennis World',
            url: 'https://example.com/article2',
            imageUrl: null,
          },
          {
            id: '3',
            title: 'Freshman Sensation Leads UCLA to Upset Win',
            summary:
              "UCLA's freshman standout delivers clutch performance in singles and doubles to propel Bruins past higher-ranked opponent.",
            date: new Date('2025-04-20T16:45:00'),
            source: 'College Sports Network',
            url: 'https://example.com/article3',
            imageUrl: null,
          },
          {
            id: '4',
            title: 'NCAA Announces Championship Selection Show Date',
            summary:
              'Teams will learn their tournament fate during the May 3rd selection show broadcast.',
            date: new Date('2025-04-18T11:00:00'),
            source: 'NCAA Tennis',
            url: 'https://example.com/article4',
            imageUrl: null,
          },
        ];

        // Filter based on preferences in a real implementation
        setNewsArticles(mockNews);
      } catch (error) {
        console.error('Failed to fetch news:', error);
        setError('Unable to load tennis news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [preferredDivision, preferredGender]);

  const handleNewsItemPress = url => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  // Format relative time (e.g., "2 days ago")
  const getRelativeTime = date => {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
      </View>
    );
  }

  if (error) {
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
            Tennis News
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={24} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (newsArticles.length === 0) {
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
            Tennis News
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              {
                color: isDark
                  ? theme.colors.text.dimDark
                  : theme.colors.gray[600],
              },
            ]}>
            No tennis news available
          </Text>
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
          Tennis News
        </Text>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text
            style={[styles.viewAllText, {color: theme.colors.primary[500]}]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.newsContainer}
        showsVerticalScrollIndicator={false}>
        {newsArticles.map(article => (
          <TouchableOpacity
            key={article.id}
            style={[
              styles.newsItem,
              {
                backgroundColor: isDark
                  ? theme.colors.card.dark
                  : theme.colors.card.light,
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}
            onPress={() => handleNewsItemPress(article.url)}>
            {article.imageUrl && (
              <Image
                source={{uri: article.imageUrl}}
                style={styles.newsImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.newsContent}>
              <Text
                style={[
                  styles.newsTitle,
                  {
                    color: isDark
                      ? theme.colors.text.dark
                      : theme.colors.text.light,
                  },
                ]}>
                {article.title}
              </Text>
              <Text
                style={[
                  styles.newsSummary,
                  {
                    color: isDark
                      ? theme.colors.text.dimDark
                      : theme.colors.gray[600],
                  },
                ]}
                numberOfLines={2}>
                {article.summary}
              </Text>
              <View style={styles.newsFooter}>
                <Text
                  style={[
                    styles.newsSource,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  {article.source}
                </Text>
                <Text
                  style={[
                    styles.newsTime,
                    {
                      color: isDark
                        ? theme.colors.text.dimDark
                        : theme.colors.gray[500],
                    },
                  ]}>
                  {getRelativeTime(article.date)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
  errorContainer: {
    padding: theme.spacing[6],
    alignItems: 'center',
  },
  errorText: {
    marginTop: theme.spacing[2],
    color: theme.colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: theme.spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  newsContainer: {
    paddingHorizontal: theme.spacing[4],
  },
  newsItem: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: theme.spacing[3],
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: 150,
  },
  newsContent: {
    padding: theme.spacing[3],
  },
  newsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
    marginBottom: theme.spacing[1],
  },
  newsSummary: {
    fontSize: theme.typography.fontSize.sm,
    marginBottom: theme.spacing[2],
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsSource: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '500',
  },
  newsTime: {
    fontSize: theme.typography.fontSize.xs,
  },
});

export default TennisNewsFeed;
