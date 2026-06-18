import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import AlarmScreen from './src/screens/AlarmScreen';
import ScenarioScreen from './src/screens/ScenarioScreen';
import ChatScreen from './src/screens/ChatScreen';
import { setupNotificationHandler } from './src/services/notifications';

const Stack = createStackNavigator<RootStackParamList>();

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
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#94A3B8',
          headerTitleStyle: { fontWeight: '700' },
          cardStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Alarm" component={AlarmScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Scenario" component={ScenarioScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
