import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../../features/vocabulary/screens/HomeScreen';
import FavoritesScreen from '../../features/vocabulary/screens/FavoritesScreen';
import LearnedScreen from '../../features/vocabulary/screens/LearnedScreen';
import StatisticsScreen from '../../features/vocabulary/screens/StatisticsScreen';
import QuizScreen from '../../features/vocabulary/screens/QuizScreen';
import WordDetailScreen from '../../features/vocabulary/screens/WordDetailScreen';
import FlashcardsScreen from '../../features/vocabulary/screens/FlashcardsScreen';
import { Word } from '../../features/vocabulary/types/word';
import { colors } from '../../theme/colors';

export type RootStackParamList = {
  MainTabs: undefined;
  WordDetail: { word: Word };
  Flashcards: undefined;
};
export type RootTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Learned: undefined;
  Statistics: undefined;
  Quiz: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

/** Her sekme için [seçiliyken, seçili değilken] ikon adı */
const TAB_ICONS: Record<keyof RootTabParamList, [string, string]> = {
  Home: ['home', 'home-outline'],
  Favorites: ['heart', 'heart-outline'],
  Learned: ['checkmark-circle', 'checkmark-circle-outline'],
  Statistics: ['stats-chart', 'stats-chart-outline'],
  Quiz: ['school', 'school-outline'],
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarIcon: ({ focused, color, size }) => {
        const [active, inactive] = TAB_ICONS[route.name];
        return <Icon name={focused ? active : inactive} size={size} color={color} />;
      },
    })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Favorites" component={FavoritesScreen} />
    <Tab.Screen name="Learned" component={LearnedScreen} />
    <Tab.Screen name="Statistics" component={StatisticsScreen} />
    <Tab.Screen name="Quiz" component={QuizScreen} />
  </Tab.Navigator>
);

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="WordDetail" component={WordDetailScreen} options={{ title: 'Word' }} />
        <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}