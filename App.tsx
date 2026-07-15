import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList, TodayStackParamList, CalendarStackParamList, MainTabParamList } from './src/types';
import TodayScreen from './src/screens/TodayScreen';
import WriteScreen from './src/screens/WriteScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import AlarmScreen from './src/screens/AlarmScreen';
import { setupNotificationHandler } from './src/services/notifications';

const RootStack = createStackNavigator<RootStackParamList>();
const TodayStack = createStackNavigator<TodayStackParamList>();
const CalendarStack = createStackNavigator<CalendarStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TodayStackScreen() {
  return (
    <TodayStack.Navigator screenOptions={{ headerShown: false }}>
      <TodayStack.Screen name="Today" component={TodayScreen} />
      <TodayStack.Screen name="Write" component={WriteScreen} />
    </TodayStack.Navigator>
  );
}

function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="Calendar" component={CalendarScreen} />
      <CalendarStack.Screen name="EntryDetail" component={EntryDetailScreen} />
    </CalendarStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1E293B' },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name="TodayTab"
        component={TodayStackScreen}
        options={{ tabBarLabel: '오늘', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📝</Text> }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStackScreen}
        options={{ tabBarLabel: '캘린더', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    setupNotificationHandler();
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.innerHTML = `
        html, body { overflow-y: auto !important; height: auto !important; }
        #root { overflow-y: auto !important; height: auto !important; min-height: 100vh; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <RootStack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#94A3B8',
          headerTitleStyle: { fontWeight: '700' },
          cardStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        {/* Home은 더 이상 진입점이 아니지만(도달 불가) STEP 6 목록에 명시되지 않아 보존.
            Alarm은 살아있는 독립 기능이라 유지. */}
        <RootStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Alarm" component={AlarmScreen} options={{ headerShown: false }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
