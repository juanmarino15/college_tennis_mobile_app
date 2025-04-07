import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface SimplePositionChartProps {
  positionData: Array<{
    name: string;
    matches: number;
    wins: number;
    losses: number;
  }>;
  isDark: boolean;
  theme: any;
}

const SimplePositionChart: React.FC<SimplePositionChartProps> = ({
  positionData,
  isDark,
  theme,
}) => {
  const [selectedPosition, setSelectedPosition] = React.useState<string | null>(
    null,
  );

  // Skip rendering if there's no data
  if (!positionData || positionData.length === 0) {
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
    ...positionData.map(item => Math.max(item.wins, item.losses)),
  );

  // Calculate win percentage for each position
  const positionsWithPercentage = positionData.map(pos => {
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
              // Use width property with number value (not string)
              width: `${percentage}%` as any, // Type assertion to avoid TS error
              backgroundColor: color,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          {positionsWithPercentage.map(position => (
            <TouchableOpacity
              key={position.name}
              style={[
                styles.positionContainer,
                selectedPosition === position.name && {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.03)',
                  borderRadius: 8,
                },
              ]}
              onPress={() =>
                setSelectedPosition(
                  selectedPosition === position.name ? null : position.name,
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
                {position.name}
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

              {selectedPosition === position.name && (
                <View style={styles.detailsContainer}>
                  <Text
                    style={[
                      styles.detailsText,
                      {
                        color: isDark
                          ? theme.colors.text.dark
                          : theme.colors.gray[700],
                      },
                    ]}>
                    Matches: {position.matches}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    minWidth: '100%',
  },
  positionContainer: {
    marginHorizontal: 8,
    padding: 8,
    minWidth: 100,
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
    width: 20,
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
    borderTopColor: 'rgba(0,0,0,0.1)',
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
});

export default SimplePositionChart;
