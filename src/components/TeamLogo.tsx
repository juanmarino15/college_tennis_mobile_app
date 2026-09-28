// src/components/TeamLogo.tsx
import React, {useState, useContext, useEffect} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import theme from '../theme';
import {api} from '../api';
import {ThemeContext} from '../../App';

// xsmall: ranking and player rows, small: match cards and inline rows,
// medium: team lists and cards, large: page headers
export type TeamLogoSize = 'xsmall' | 'small' | 'medium' | 'large';

interface TeamLogoProps {
  teamId?: string;
  // Team name, used for the initials shown when there is no logo
  name?: string;
  size?: TeamLogoSize;
  containerStyle?: object;
}

const SIZE_MAP: Record<TeamLogoSize, {size: number; fontSize: number}> = {
  xsmall: {size: 24, fontSize: 9},
  small: {size: 28, fontSize: 10},
  medium: {size: 36, fontSize: 12},
  large: {size: 56, fontSize: 18},
};

const NAME_STOP_WORDS = new Set(['of', 'the', 'at', 'and', '&', '-']);

// "University Of North Carolina (W)" -> "UNC", "Boston University" -> "BU"
export const teamInitials = (name?: string): string => {
  if (!name) {
    return '';
  }
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .split(/\s+/)
    .filter(word => word && !NAME_STOP_WORDS.has(word.toLowerCase()));
  return words
    .slice(0, 3)
    .map(word => word[0].toUpperCase())
    .join('');
};

const TeamLogo: React.FC<TeamLogoProps> = ({
  teamId,
  name,
  size = 'medium',
  containerStyle = {},
}) => {
  const [hasError, setHasError] = useState(false);
  const {isDark} = useContext(ThemeContext);

  // A reused row can switch teams; give the new team's logo a chance to load
  useEffect(() => {
    setHasError(false);
  }, [teamId]);

  const {size: dimension, fontSize} = SIZE_MAP[size] || SIZE_MAP.medium;
  const box = {width: dimension, height: dimension};

  if (!teamId || hasError) {
    const initials = teamInitials(name);
    return (
      <View
        style={[
          styles.placeholderContainer,
          box,
          {
            backgroundColor: isDark
              ? theme.colors.primary[900]
              : theme.colors.primary[50],
          },
          containerStyle,
        ]}>
        {initials ? (
          <Text
            style={[
              styles.placeholderText,
              {
                fontSize,
                color: isDark
                  ? theme.colors.primary[200]
                  : theme.colors.primary[700],
              },
            ]}
            numberOfLines={1}
            allowFontScaling={false}>
            {initials}
          </Text>
        ) : (
          <Icon
            name="shield"
            size={Math.round(dimension * 0.5)}
            color={
              isDark ? theme.colors.primary[200] : theme.colors.primary[400]
            }
          />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.logoContainer,
        box,
        // Most college logos are dark, so give them a light backing on dark cards
        isDark && styles.logoContainerDark,
        containerStyle,
      ]}>
      <Image
        source={{uri: api.teams.getLogo(teamId)}}
        style={styles.logo}
        onError={() => setHasError(true)}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logoContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: theme.borderRadius.lg,
    padding: 2,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
  },
  placeholderText: {
    fontWeight: '700',
  },
});

export default TeamLogo;
