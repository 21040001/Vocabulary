import React from 'react';
import { Pressable } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, Theme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../../features/vocabulary/screens/HomeScreen';
import FavoritesScreen from '../../features/vocabulary/screens/FavoritesScreen';
import LearnedScreen from '../../features/vocabulary/screens/LearnedScreen';
import StatisticsScreen from '../../features/vocabulary/screens/StatisticsScreen';
import QuizScreen from '../../features/vocabulary/screens/QuizScreen';
import WordDetailScreen from '../../features/vocabulary/screens/WordDetailScreen';
import FlashcardsScreen from '../../features/vocabulary/screens/FlashcardsScreen';
import PronunciationScreen from '../../features/vocabulary/screens/PronunciationScreen';
import SettingsScreen from '../../features/settings/screens/SettingsScreen';
import AboutScreen from '../../features/settings/screens/AboutScreen';
import PracticeHubScreen from '../../features/practice/screens/PracticeHubScreen';
import ChoiceQuizScreen from '../../features/practice/screens/ChoiceQuizScreen';
import FillBlankScreen from '../../features/practice/screens/FillBlankScreen';
import MatchGameScreen from '../../features/practice/screens/MatchGameScreen';
import LevelsScreen from '../../features/practice/screens/LevelsScreen';
import { Word } from '../../features/vocabulary/types/word';
import { useSettings } from '../settings/SettingsContext';

export type RootStackParamList = {
  MainTabs: undefined;
  WordDetail: { word: Word };
  Flashcards: undefined;
  Pronunciation: undefined;
  Settings: undefined;
  About: undefined;
  WriteQuiz: undefined;
  ChoiceQuiz: { mode: 'read' | 'listen' };
  FillBlank: undefined;
  Match: undefined;
  Levels: undefined;
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

const TAB_ICONS: Record<keyof RootTabParamList, [string, string]> = {
  Home: ['home', 'home-outline'],
  Favorites: ['heart', 'heart-outline'],
  Learned: ['checkmark-circle', 'checkmark-circle-outline'],
  Statistics: ['stats-chart', 'stats-chart-outline'],
  Quiz: ['barbell', 'barbell-outline'],
};

/** Sekme başlığının sağındaki ⚙️ düğmesi */
function SettingsButton() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, t } = useSettings();
  return (
    <Pressable
      onPress={() => nav.navigate('Settings')}
      hitSlop={10}
      style={{ marginRight: 16 }}
      accessibilityLabel={t('screen.settings')}>
      <Icon name="settings-outline" size={22} color={colors.text} />
    </Pressable>
  );
}

function MainTabs() {
  const { colors, t } = useSettings();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerRight: () => <SettingsButton />,
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name];
          return <Icon name={focused ? active : inactive} size={size} color={color} />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab.home') }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: t('tab.favorites') }} />
      <Tab.Screen name="Learned" component={LearnedScreen} options={{ title: t('tab.learned') }} />
      <Tab.Screen name="Statistics" component={StatisticsScreen} options={{ title: t('tab.statistics') }} />
      <Tab.Screen name="Quiz" component={PracticeHubScreen} options={{ title: t('tab.quiz') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark, t } = useSettings();
  const base = isDark ? DarkTheme : DefaultTheme;
  // Başlık çubuğu ve sekme çubuğu da temaya uysun
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="WordDetail" component={WordDetailScreen} options={{ title: t('screen.word') }} />
        <Stack.Screen name="Flashcards" component={FlashcardsScreen} options={{ title: t('screen.flashcards') }} />
        <Stack.Screen
          name="Pronunciation"
          component={PronunciationScreen}
          options={{ title: t('screen.pronunciation') }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('screen.settings') }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: t('about.title') }} />
        <Stack.Screen name="WriteQuiz" component={QuizScreen} options={{ title: t('practice.write') }} />
        <Stack.Screen
          name="ChoiceQuiz"
          component={ChoiceQuizScreen}
          options={({ route }) => ({ title: t(route.params.mode === 'listen' ? 'practice.listen' : 'practice.choice') })}
        />
        <Stack.Screen name="FillBlank" component={FillBlankScreen} options={{ title: t('practice.fill') }} />
        <Stack.Screen name="Match" component={MatchGameScreen} options={{ title: t('practice.match') }} />
        <Stack.Screen name="Levels" component={LevelsScreen} options={{ title: t('practice.levels') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
