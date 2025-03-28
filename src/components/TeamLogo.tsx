// src/components/TeamLogo.tsx - Update this component
import React, {useState, useContext} from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';
import theme from '../theme';
import {api} from '../api';
import {ThemeContext} from '../../App';

interface TeamLogoProps {
  teamId?: string;
  size?: 'small' | 'medium' | 'large';
  containerStyle?: object;
}

const TeamLogo: React.FC<TeamLogoProps> = ({
  teamId,
  size = 'medium',
  containerStyle = {},
}) => {
  const [hasError, setHasError] = useState(false);
  const {isDark} = useContext(ThemeContext);

  // Define logo sizes
  const sizeMap = {
    small: {width: 32, height: 32, fontSize: 10},
    medium: {width: 48, height: 48, fontSize: 12},
    large: {width: 64, height: 64, fontSize: 14},
  };

  const dimensions = sizeMap[size] || sizeMap.medium;

  // If no team ID or error loading image, show placeholder
  if (!teamId || hasError) {
    return (
      <View
        style={[
          styles.placeholderContainer,
          {width: dimensions.width, height: dimensions.height},
          containerStyle,
          {
            backgroundColor: isDark
              ? theme.colors.gray[800]
              : theme.colors.gray[100],
          },
        ]}>
        <Text
          style={[
            styles.placeholderText,
            {fontSize: dimensions.fontSize},
            {color: isDark ? theme.colors.gray[400] : theme.colors.gray[500]},
          ]}>
          Logo
        </Text>
      </View>
    );
  }

  // Otherwise, load the image with transparent background
  return (
    <View
      style={[
        styles.logoContainer,
        {width: dimensions.width, height: dimensions.height},
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
    backgroundColor: 'transparent', // Changed from white to transparent
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
    fontWeight: '500',
  },
});

export default TeamLogo;
