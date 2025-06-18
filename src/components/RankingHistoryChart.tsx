// src/components/RankingHistoryChart.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
  Text as SvgText,
  Line,
} from 'react-native-svg';
import {format} from 'date-fns';
import Icon from 'react-native-vector-icons/Feather';

const {width: screenWidth} = Dimensions.get('window');

interface RankingHistoryProps {
  rankingHistory: any[];
  isDark: boolean;
  theme: any;
  selectedSeason: string;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  rank: number;
  date: string;
  index: number;
}

const RankingHistoryChart: React.FC<RankingHistoryProps> = ({
  rankingHistory,
  isDark,
  theme,
  selectedSeason,
}) => {
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    rank: 0,
    date: '',
    index: -1,
  });

  if (!rankingHistory || rankingHistory.length === 0) {
    return null;
  }

  // Prepare data for the chart
  const chartData = rankingHistory
    .map(ranking => ({
      date: ranking.publish_date,
      rank: ranking.rank,
      formattedDate: format(new Date(ranking.publish_date), 'MMM d'),
      fullDate: format(new Date(ranking.publish_date), 'MMM d, yyyy'),
    }))
    .reverse(); // Reverse to show chronological order

  const currentRank = rankingHistory[0]?.rank;
  const highestRank = Math.min(...rankingHistory.map(r => r.rank));
  const bestRankingData = rankingHistory.find(r => r.rank === highestRank);
  const bestRankDate = bestRankingData
    ? format(new Date(bestRankingData.publish_date), 'MMM d')
    : '';

  // Chart dimensions
  const chartWidth = screenWidth - 50; // Account for padding
  const chartHeight = 160;
  const padding = 20;
  const leftPadding = 40; // Space for Y-axis labels

  // Calculate chart scales
  const xScale =
    (chartWidth - leftPadding - padding) / Math.max(chartData.length - 1, 1);
  const minRank = Math.min(...chartData.map(d => d.rank));
  const maxRank = Math.max(...chartData.map(d => d.rank));
  const rankRange = Math.max(maxRank - minRank + 4, 0); // Add some padding, minimum range of 8
  const yScale = (chartHeight - padding * 2) / rankRange;

  // Generate Y-axis tick marks
  const generateYTicks = () => {
    const tickCount = 4;
    const step = Math.ceil(rankRange / tickCount);
    const ticks = [];

    for (let i = 0; i <= tickCount; i++) {
      const rank = Math.max(1, minRank - 2 + i * step);
      ticks.push(rank);
    }
    return ticks
      .filter((tick, index, arr) => arr.indexOf(tick) === index)
      .sort((a, b) => a - b);
  };

  const yTicks = generateYTicks();

  // Generate path data for the line
  const generatePath = () => {
    let path = '';
    chartData.forEach((point, index) => {
      const x = leftPadding + index * xScale;
      const y = padding + (point.rank - minRank + 2) * yScale;

      if (index === 0) {
        path += `M${x},${y}`;
      } else {
        path += ` L${x},${y}`;
      }
    });
    return path;
  };

  // Generate gradient fill path (restore the original area fill)
  const generateFillPath = () => {
    if (chartData.length === 0) return '';

    let pathCommands = [];

    // Start from bottom-left
    pathCommands.push(`M${leftPadding},${chartHeight - padding}`);

    // Go to first point
    const firstX = leftPadding;
    const firstY = padding + (chartData[0].rank - minRank + 2) * yScale;
    pathCommands.push(`L${firstX},${firstY}`);

    // Draw the line through all points
    chartData.forEach((point, index) => {
      const x = leftPadding + index * xScale;
      const y = padding + (point.rank - minRank + 2) * yScale;
      pathCommands.push(`L${x},${y}`);
    });

    // Close to bottom-right and back to start
    const lastX = leftPadding + (chartData.length - 1) * xScale;
    pathCommands.push(`L${lastX},${chartHeight - padding}`);
    pathCommands.push('Z');

    return pathCommands.join(' ');
  };

  const linePath = generatePath();
  const fillPath = generateFillPath();

  // Handle touch on chart area
  const handleChartTouch = (event: any) => {
    const {locationX, locationY} = event.nativeEvent;

    // Find the closest data point
    let closestIndex = -1;
    let closestDistance = Infinity;

    chartData.forEach((point, index) => {
      const pointX = leftPadding + index * xScale;
      const pointY = padding + (point.rank - minRank + 2) * yScale;

      const distance = Math.sqrt(
        Math.pow(locationX - pointX, 2) + Math.pow(locationY - pointY, 2),
      );

      if (distance < closestDistance && distance < 30) {
        // 30px touch radius
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== -1) {
      const point = chartData[closestIndex];
      const x = leftPadding + closestIndex * xScale;
      const y = padding + (point.rank - minRank + 2) * yScale;

      setTooltip({
        visible: true,
        x: x,
        y: y,
        rank: point.rank,
        date: point.fullDate,
        index: closestIndex,
      });
    } else {
      setTooltip({...tooltip, visible: false});
    }
  };

  const hideTooltip = () => {
    setTooltip({...tooltip, visible: false});
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? theme.colors.card.dark
            : theme.colors.card.light,
        },
      ]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon
            name="trending-up"
            size={18}
            color={isDark ? theme.colors.text.dark : theme.colors.gray[700]}
          />
          <Text
            style={[
              styles.title,
              {
                color: isDark
                  ? theme.colors.text.dark
                  : theme.colors.text.light,
              },
            ]}>
            Ranking History
          </Text>
        </View>
        <View style={styles.rankingStats}>
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
              #{currentRank}
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
              Current
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                {
                  color: theme.colors.success,
                },
              ]}>
              #{highestRank}
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
              Best ({bestRankDate})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <TouchableWithoutFeedback onPress={handleChartTouch}>
          <View>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient
                  id="rankingGradient"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%">
                  <Stop
                    offset="0%"
                    stopColor={theme.colors.primary[500]}
                    stopOpacity="0.3"
                  />
                  <Stop
                    offset="100%"
                    stopColor={theme.colors.primary[500]}
                    stopOpacity="0.05"
                  />
                </LinearGradient>
              </Defs>

              {/* Y-axis grid lines and labels */}
              {yTicks.map((tick, index) => {
                const y = padding + (tick - minRank + 2) * yScale;
                return (
                  <React.Fragment key={index}>
                    {/* Grid line */}
                    <Line
                      x1={leftPadding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke={
                        isDark
                          ? theme.colors.border.dark
                          : theme.colors.border.light
                      }
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      strokeDasharray="2,2"
                    />
                    {/* Y-axis label */}
                    <SvgText
                      x={leftPadding - 8}
                      y={y + 4}
                      fontSize="11"
                      fill={
                        isDark
                          ? theme.colors.text.dimDark
                          : theme.colors.gray[500]
                      }
                      textAnchor="end">
                      {tick}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Fill area */}
              <Path d={fillPath} fill="url(#rankingGradient)" />

              {/* Main line */}
              <Path
                d={linePath}
                stroke={theme.colors.primary[500]}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {chartData.map((point, index) => {
                const x = leftPadding + index * xScale;
                const y = padding + (point.rank - minRank + 2) * yScale;
                const isActive = tooltip.visible && tooltip.index === index;

                return (
                  <Circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={isActive ? '5' : '4'}
                    fill={theme.colors.primary[500]}
                    stroke={
                      isDark ? theme.colors.card.dark : theme.colors.white
                    }
                    strokeWidth="2"
                  />
                );
              })}
            </Svg>
          </View>
        </TouchableWithoutFeedback>

        {/* Tooltip */}
        {tooltip.visible && (
          <View
            style={[
              styles.tooltip,
              {
                left: Math.min(Math.max(tooltip.x - 50, 10), chartWidth - 110),
                top:
                  tooltip.y > chartHeight / 2 ? tooltip.y - 70 : tooltip.y + 20,
                backgroundColor: isDark
                  ? theme.colors.background.dark
                  : theme.colors.white,
                borderColor: isDark
                  ? theme.colors.border.dark
                  : theme.colors.border.light,
              },
            ]}>
            <Text
              style={[
                styles.tooltipRank,
                {
                  color: isDark
                    ? theme.colors.text.dark
                    : theme.colors.text.light,
                },
              ]}>
              #{tooltip.rank}
            </Text>
            <Text
              style={[
                styles.tooltipDate,
                {
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[600],
                },
              ]}>
              {tooltip.date}
            </Text>
          </View>
        )}
      </View>

      {/* Date labels (vertical) */}
      <View style={styles.dateLabelsContainer}>
        {chartData.map((point, index) => {
          const x = leftPadding + index * xScale;
          return (
            <Text
              key={index}
              style={[
                styles.dateLabelText,
                {
                  position: 'absolute',
                  left: x - 25,
                  top: 5,
                  transform: [{rotate: '-45deg'}],
                  color: isDark
                    ? theme.colors.text.dimDark
                    : theme.colors.gray[500],
                },
              ]}>
              {point.formattedDate}
            </Text>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text
          style={[
            styles.footerText,
            {
              color: isDark
                ? theme.colors.text.dimDark
                : theme.colors.gray[500],
            },
          ]}>
          {selectedSeason}-{parseInt(selectedSeason) + 1} season rankings
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  rankingInfo: {
    alignItems: 'flex-end',
  },
  currentRank: {
    fontSize: 24,
    fontWeight: '700',
  },
  currentLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 0,
    paddingVertical: 0,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  rankingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 80,
  },
  tooltipRank: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tooltipDate: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  dateLabelsContainer: {
    height: 20,
    marginTop: 8,
    position: 'relative',
  },
  dateLabelText: {
    fontSize: 10,
    textAlign: 'center',
    width: 35,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
  },
});

export default RankingHistoryChart;
