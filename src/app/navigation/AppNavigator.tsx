import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../../features/vocabulary/screens/HomeScreen';
import FavoritesScreen from '../../features/vocabulary/screens/FavoritesScreen';
import LearnedScreen from '../../features/vocabulary/screens/LearnedScreen';
import StatisticsScreen from '../../features/vocabulary/screens/StatisticsScreen';
import QuizScreen from '../../features/vocabulary/screens/QuizScreen';
import WordDetailScreen from '../../features/vocabulary/screens/WordDetailScreen';
import {Word} from '../../features/vocabulary/types/word';
export type RootStackParamList={MainTabs:undefined;WordDetail:{word:Word}};
export type RootTabParamList={Home:undefined;Favorites:undefined;Learned:undefined;Statistics:undefined;Quiz:undefined};
const Stack=createNativeStackNavigator<RootStackParamList>();const Tab=createBottomTabNavigator<RootTabParamList>();
const icon=(name:string)=>({tabBarIcon:({color,size}:{color:string;size:number})=><Ionicons name={name} size={size} color={color}/>});
const MainTabs=()=><Tab.Navigator><Tab.Screen name="Home" component={HomeScreen} options={icon('home-outline')}/><Tab.Screen name="Favorites" component={FavoritesScreen} options={icon('star-outline')}/><Tab.Screen name="Learned" component={LearnedScreen} options={icon('checkmark-circle-outline')}/><Tab.Screen name="Statistics" component={StatisticsScreen} options={icon('bar-chart-outline')}/><Tab.Screen name="Quiz" component={QuizScreen} options={icon('school-outline')}/></Tab.Navigator>;
export default function AppNavigator(){return <NavigationContainer><Stack.Navigator><Stack.Screen name="MainTabs" component={MainTabs} options={{headerShown:false}}/><Stack.Screen name="WordDetail" component={WordDetailScreen}/></Stack.Navigator></NavigationContainer>}
