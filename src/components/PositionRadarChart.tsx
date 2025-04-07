import React from 'react';
import {View, Text, Dimensions, Alert, TouchableOpacity} from 'react-native';
import Svg, {Polygon, Line, Circle, Text as SvgText} from 'react-native-svg';

// Define types for your component props
type PositionData = {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  position?: number;
};

// Use a more flexible theme typing that matches your actual theme structure
interface PositionRadarChartProps {
  positionData: PositionData[];
  isDark: boolean;
  theme: any; // Using 'any' temporarily to resolve the TypeScript error
}

const PositionRadarChart: React.FC<PositionRadarChartProps> = ({
  positionData,
  isDark,
  theme,
}) => {
  // Set up dimensions and center point
  const width = Dimensions.get('window').width - 40;
  const height = 250;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 30;

  // Maximum value for scaling (ensure at least 5 to avoid tiny charts with small data)
  const maxMatches = Math.max(...positionData.map(d => d.matches), 5);

  // Function to handle circle press - moved outside SVG
  const handlePress = (item: PositionData): void => {
    const winRate = Math.round((item.wins / (item.matches || 1)) * 100);
    Alert.alert(
      `Position ${item.name}`,
      `Matches: ${item.matches}\nWins: ${item.wins} (${winRate}%)\nLosses: ${item.losses}`,
    );
  };

  // Render manually using Views instead of SVG for better interaction
  return (
    <View style={{width: '100%', height: height, alignItems: 'center'}}>
      <View style={{width, height, position: 'relative'}}>
        {/* Legend */}
        <View style={{position: 'absolute', top: 10, left: 10, zIndex: 10}}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 5,
            }}>
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: isDark
                  ? theme.colors.primary[400]
                  : theme.colors.primary[700],
                borderRadius: 5,
                marginRight: 5,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                color: isDark
                  ? theme.colors.primary[400]
                  : theme.colors.primary[700],
              }}>
              Total Matches
            </Text>
          </View>

          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: theme.colors.success,
                borderRadius: 5,
                marginRight: 5,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                color: theme.colors.success,
              }}>
              Wins
            </Text>
          </View>
        </View>

        <Svg width={width} height={height}>
          {/* Background grid lines */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
            <Polygon
              key={`grid-${i}`}
              points={positionData
                .map((_, i) => {
                  const angle =
                    (i / positionData.length) * 2 * Math.PI - Math.PI / 2;
                  const value = scale * radius;
                  const x = centerX + value * Math.cos(angle);
                  const y = centerY + value * Math.sin(angle);
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke={isDark ? theme.colors.gray[700] : theme.colors.gray[300]}
              strokeWidth="1"
            />
          ))}

          {/* Axis lines */}
          {positionData.map((_, i) => {
            const angle = (i / positionData.length) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            return (
              <Line
                key={`axis-${i}`}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke={
                  isDark ? theme.colors.gray[700] : theme.colors.gray[300]
                }
                strokeWidth="1"
              />
            );
          })}

          {/* Total matches area */}
          <Polygon
            points={positionData
              .map((item, i) => {
                const angle =
                  (i / positionData.length) * 2 * Math.PI - Math.PI / 2;
                const value = (item.matches / maxMatches) * radius;
                const x = centerX + value * Math.cos(angle);
                const y = centerY + value * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(' ')}
            fill={
              isDark
                ? theme.colors.primary[900] + '40'
                : theme.colors.primary[100] + '80'
            }
            stroke={
              isDark ? theme.colors.primary[700] : theme.colors.primary[500]
            }
            strokeWidth="1"
          />

          {/* Wins area */}
          <Polygon
            points={positionData
              .map((item, i) => {
                const angle =
                  (i / positionData.length) * 2 * Math.PI - Math.PI / 2;
                const value = (item.wins / maxMatches) * radius;
                const x = centerX + value * Math.cos(angle);
                const y = centerY + value * Math.sin(angle);
                return `${x},${y}`;
              })
              .join(' ')}
            fill={
              isDark ? theme.colors.success + '40' : theme.colors.success + '30'
            }
            stroke={theme.colors.success}
            strokeWidth="1.5"
          />

          {/* Labels */}
          {positionData.map((item, i) => {
            const angle = (i / positionData.length) * 2 * Math.PI - Math.PI / 2;
            const labelRadius = radius + 15;
            const x = centerX + labelRadius * Math.cos(angle);
            const y = centerY + labelRadius * Math.sin(angle);

            return (
              <SvgText
                key={`label-${i}`}
                x={x}
                y={y}
                fill={isDark ? theme.colors.text.dark : theme.colors.text.light}
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle">
                {item.name}
              </SvgText>
            );
          })}
        </Svg>

        {/* Interactive touch points */}
        {positionData.map((item, i) => {
          const angle = (i / positionData.length) * 2 * Math.PI - Math.PI / 2;
          const value = (item.matches / maxMatches) * radius;
          const x = centerX + value * Math.cos(angle);
          const y = centerY + value * Math.sin(angle);

          return (
            <TouchableOpacity
              key={`touch-${i}`}
              style={{
                position: 'absolute',
                left: x - 15,
                top: y - 15,
                width: 30,
                height: 30,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => handlePress(item)}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor:
                    item.matches === 0
                      ? 'transparent'
                      : item.wins / (item.matches || 1) > 0.6
                      ? theme.colors.success
                      : theme.colors.primary[500],
                  borderWidth: 1.5,
                  borderColor: isDark
                    ? theme.colors.text.dark
                    : theme.colors.white,
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default PositionRadarChart;
