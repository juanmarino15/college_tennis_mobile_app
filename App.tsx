// App.tsx
import {StatusBar, LogBox} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import theme from './src/theme';
import React, {useState, useEffect} from 'react';
// Import vector icons
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import screens (these would be created in subsequent steps)
import HomeScreen from './src/screens/HomeScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import MatchDetailScreen from './src/screens/MatchDetailScreen';
import TeamsScreen from './src/screens/TeamsScreen';
import TeamDetailScreen from './src/screens/TeamDetailsScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import PlayerSearchScreen from './src/screens/PlayerSearchScreen'; // Add this import
import RankingsScreen from './src/screens/RankingsScreen';

// For now, use placeholders
const PlaceholderScreen = () => <></>;

// Ignore specific warnings
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested', // Ignore for ScrollView inside ScrollView
  'Non-serializable values were found in the navigation state', // For complex navigation objects
]);

// Define types for navigation
type RootStackParamList = {
  MainTabs: undefined;
  MatchDetail: {matchId: string};
  TeamDetail: {teamId: string};
  PlayerDetail: {playerId: string};
  RankingDetail: {teamId: string};
};

type TabParamList = {
  Home: undefined;
  Matches: undefined;
  Teams: undefined;
  Players: undefined; // Add Players tab
  Rankings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Main tab navigator
const TabNavigator = () => {
  const {isDark} = React.useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color, size}) => {
          // Choose the appropriate icon based on the route name
          if (route.name === 'Home') {
            return <FeatherIcon name="home" size={size} color={color} />;
          } else if (route.name === 'Matches') {
            // Using tennis ball icon from MaterialCommunityIcons for Matches
            return <MaterialIcon name="tennis" size={size} color={color} />;
          } else if (route.name === 'Teams') {
            return <FeatherIcon name="users" size={size} color={color} />;
          } else if (route.name === 'Players') {
            return <FeatherIcon name="user" size={size} color={color} />;
          } else if (route.name === 'Rankings') {
            return <FeatherIcon name="award" size={size} color={color} />;
          }
          return <FeatherIcon name="circle" size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: isDark
          ? theme.colors.text.dimDark
          : theme.colors.gray[500],
        tabBarStyle: {
          backgroundColor: isDark
            ? theme.colors.card.dark
            : theme.colors.card.light,
          borderTopColor: isDark
            ? theme.colors.border.dark
            : theme.colors.border.light,
          paddingBottom: 8,
          paddingTop: 8,
          height: 90,
        },
        headerStyle: {
          backgroundColor: isDark
            ? theme.colors.card.dark
            : theme.colors.card.light,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDark
            ? theme.colors.border.dark
            : theme.colors.border.light,
        },
        headerTitleStyle: {
          color: isDark ? theme.colors.text.dark : theme.colors.text.light,
          fontSize: theme.typography.fontSize.lg,
          fontWeight: '600',
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen name="Teams" component={TeamsScreen} />
      <Tab.Screen name="Players" component={PlayerSearchScreen} />
      <Tab.Screen name="Rankings" component={RankingsScreen} />
    </Tab.Navigator>
  );
};

// Create a simple theme context
export const ThemeContext = React.createContext({
  isDark: true,
  toggleTheme: () => {},
});

const App = () => {
  // Force dark theme as default
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Create custom navigation theme based on DefaultTheme and DarkTheme
  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary[500],
      background: theme.colors.background.light,
      card: theme.colors.card.light,
      text: theme.colors.text.light,
      border: theme.colors.border.light,
      notification: theme.colors.primary[500],
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.colors.primary[500],
      background: theme.colors.background.dark,
      card: theme.colors.card.dark,
      text: theme.colors.text.dark,
      border: theme.colors.border.dark,
      notification: theme.colors.primary[500],
    },
  };

  return (
    <ThemeContext.Provider value={{isDark, toggleTheme}}>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={
              isDark
                ? theme.colors.background.dark
                : theme.colors.background.light
            }
          />
          <NavigationContainer
            theme={isDark ? customDarkTheme : customLightTheme}>
            <Stack.Navigator screenOptions={{headerShown: false}}>
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
              <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
              <Stack.Screen name="PlayerDetail" component={PlayerScreen} />
              <Stack.Screen name="RankingDetail" component={RankingsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
};

export default App;
