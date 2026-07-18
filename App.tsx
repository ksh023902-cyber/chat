import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NotoSerifKR_400Regular, NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';
import { Gaegu_400Regular, Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { RootStackParamList, TodayStackParamList, CalendarStackParamList, MainTabParamList } from './src/types';
import TodayScreen from './src/screens/TodayScreen';
import WriteScreen from './src/screens/WriteScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import FontSelectScreen from './src/screens/FontSelectScreen';
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
      <CalendarStack.Screen
        name="FontSelect"
        component={FontSelectScreen}
        options={{ presentation: 'modal' }}
      />
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
  const [fontsLoaded] = useFonts({
    NotoSerifKR_400Regular,
    NotoSerifKR_700Bold,
    Gaegu_400Regular,
    Gaegu_700Bold,
  });

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

  // 명조·손글씨 폰트가 로드되기 전에는 검은 화면만 보여준다(스플래시 모듈 추가 없이).
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0A0F1E' }} />;
  }

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
        <RootStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Alarm" component={AlarmScreen} options={{ headerShown: false }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
