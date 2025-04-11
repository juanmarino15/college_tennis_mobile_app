import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

// Define the position data structure to match API response
interface PositionData {
  position: number;
  matches_count: number;
  wins: number;
  losses: number;
}

interface PositionBarChartProps {
  // Use the actual API response structure
  positionsData: {
    singles: PositionData[];
    doubles: PositionData[];
  };
  isDark: boolean;
  theme: any;
}

const PositionBarChart: React.FC<PositionBarChartProps> = ({
  positionsData,
  isDark,
  theme,
}) => {
  // State for the current tab (singles or doubles)
  const [activeTab, setActiveTab] = useState<'singles' | 'doubles'>('singles');
  // State for the selected position detail
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  // Choose which data to display based on active tab
  const currentData =
    activeTab === 'singles' ? positionsData.singles : positionsData.doubles;

  // Sort positions in ascending order (positions are typically numbered from 1 to 6)
  const sortedData = [...currentData].sort((a, b) => a.position - b.position);

  // Find the most-played position for visual highlighting
  const findMostPlayedPosition = (data: PositionData[]) => {
    if (!data || data.length === 0) return null;

    let mostPlayed = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i].matches_count > mostPlayed.matches_count) {
        mostPlayed = data[i];
      }
    }
    return mostPlayed.position;
  };

  const mostPlayedPosition = findMostPlayedPosition(currentData);

  // Skip rendering if there's no data
  if (
    (!positionsData.singles || positionsData.singles.length === 0) &&
    (!positionsData.doubles || positionsData.doubles.length === 0)
  ) {
    return (
      <View style={styles.noDataContainer}>
        <Text
          style={{
            color: isDark ? theme.colors.text.dimDark : theme.colors.gray[500],
          }}>
          No position data available
        </Text>
      </View>
    );
  }

  // Find max for scaling
  const maxValue = Math.max(
    ...sortedData.map(item => Math.max(item.wins, item.losses, 1)), // Ensure min value of 1 to avoid scale issues
  );

  // Calculate win percentage for each position
  const positionsWithPercentage = sortedData.map(pos => {
    const total = pos.wins + pos.losses;
    const winPercentage = total > 0 ? (pos.wins / total) * 100 : 0;
    return {
      ...pos,
      winPercentage: Math.round(winPercentage),
    };
  });

  const renderBar = (value: number, maxValue: number, color: string) => {
    // Calculate percentage for width
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
      <View
        style={[
          styles.barBackground,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
          },
        ]}>
        <View
          style={[
            styles.bar,
            {
              width: `${percentage}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'singles' && [
              styles.activeTab,
              {backgroundColor: theme.colors.primary[500]},
            ],
          ]}
          onPress={() => setActiveTab('singles')}
          disabled={
            !positionsData.singles || positionsData.singles.length === 0
          }>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'singles'
                    ? 'white'
                    : isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                opacity:
                  !positionsData.singles || positionsData.singles.length === 0
                    ? 0.5
                    : 1,
              },
            ]}>
            Singles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'doubles' && [
              styles.activeTab,
              {backgroundColor: theme.colors.primary[500]},
            ],
          ]}
          onPress={() => setActiveTab('doubles')}
          disabled={
            !positionsData.doubles || positionsData.doubles.length === 0
          }>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'doubles'
                    ? 'white'
                    : isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                opacity:
                  !positionsData.doubles || positionsData.doubles.length === 0
                    ? 0.5
                    : 1,
              },
            ]}>
            Doubles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart */}
      {sortedData.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text
            style={{
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[500],
            }}>
            No {activeTab} position data available
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 10,
            minWidth: Dimensions.get('window').width - 40, // Full width minus some padding
          }}>
          <View style={styles.chartContainer}>
            {positionsWithPercentage.map(position => (
              <TouchableOpacity
                key={`pos-${position.position}`}
                style={[
                  styles.positionContainer,
                  selectedPosition === position.position && {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.03)',
                    borderRadius: 8,
                  },
                  // Add highlight for most-played position
                  position.position === mostPlayedPosition && {
                    borderWidth: 2,
                    borderColor: theme.colors.success,
                    borderRadius: 8,
                  },
                ]}
                onPress={() =>
                  setSelectedPosition(
                    selectedPosition === position.position
                      ? null
                      : position.position,
                  )
                }>
                <Text
                  style={[
                    styles.positionLabel,
                    {
                      color: isDark
                        ? theme.colors.text.dark
                        : theme.colors.gray[700],
                    },
                  ]}>
                  #{position.position}
                </Text>

                <View style={styles.barContainer}>
                  <View style={styles.barRow}>
                    <Text
                      style={[
                        styles.barLabel,
                        {
                          color: isDark
                            ? theme.colors.text.dimDark
                            : theme.colors.gray[500],
                        },
                      ]}>
                      W
                    </Text>
                    {renderBar(position.wins, maxValue, theme.colors.success)}
                    <Text
                      style={[
                        styles.barValue,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.gray[700],
                        },
                      ]}>
                      {position.wins}
                    </Text>
                  </View>

                  <View style={styles.barRow}>
                    <Text
                      style={[
                        styles.barLabel,
                        {
                          color: isDark
                            ? theme.colors.text.dimDark
                            : theme.colors.gray[500],
                        },
                      ]}>
                      L
                    </Text>
                    {renderBar(position.losses, maxValue, theme.colors.error)}
                    <Text
                      style={[
                        styles.barValue,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.gray[700],
                        },
                      ]}>
                      {position.losses}
                    </Text>
                  </View>
                </View>

                {selectedPosition === position.position && (
                  <View
                    style={[
                      styles.detailsContainer,
                      {
                        borderTopColor: isDark
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.1)',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.detailsText,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.gray[700],
                        },
                      ]}>
                      Matches: {position.matches_count}
                    </Text>
                    <Text
                      style={[
                        styles.detailsText,
                        {
                          color: isDark
                            ? theme.colors.text.dark
                            : theme.colors.gray[700],
                        },
                      ]}>
                      Win Rate: {position.winPercentage}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              {backgroundColor: theme.colors.success},
            ]}
          />
          <Text
            style={{
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[600],
            }}>
            Wins
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendColor, {backgroundColor: theme.colors.error}]}
          />
          <Text
            style={{
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[600],
            }}>
            Losses
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendBorder, {borderColor: theme.colors.success}]}
          />
          <Text
            style={{
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[600],
            }}>
            Most Played
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginHorizontal: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'blue', // This will be overridden by the theme color
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  noDataContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    flexWrap: 'nowrap',
    flex: 1,
  },
  positionContainer: {
    flex: 1,
    margin: 6,
    padding: 8,
    minWidth: 90,
    maxWidth: 130,
  },
  positionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  barContainer: {
    marginVertical: 5,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  barLabel: {
    width: 16,
    fontSize: 12,
    fontWeight: '500',
  },
  barBackground: {
    height: 12,
    borderRadius: 6,
    flex: 1,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
  barValue: {
    width: 25,
    textAlign: 'right',
    fontSize: 12,
    marginLeft: 5,
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  detailsText: {
    fontSize: 12,
    marginVertical: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendBorder: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 2,
  },
});

export default PositionBarChart;
