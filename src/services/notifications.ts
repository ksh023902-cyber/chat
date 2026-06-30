import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AlarmSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  days: 'daily' | 'weekdays' | 'weekends' | 'custom' | 'interval';
  customDays: boolean[]; // index 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  intervalHours: number; // 1~24, days === 'interval' 일 때 사용
}

export const DEFAULT_ALARM: AlarmSettings = {
  enabled: false,
  hour: 8,
  minute: 0,
  days: 'daily',
  customDays: [true, true, true, true, true, true, true],
  intervalHours: 3,
};

const ALARM_KEY = 'alarm_settings';

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function loadAlarmSettings(): Promise<AlarmSettings> {
  try {
    const stored = await AsyncStorage.getItem(ALARM_KEY);
    if (stored) return { ...DEFAULT_ALARM, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_ALARM };
}

export async function saveAlarmSettings(settings: AlarmSettings): Promise<void> {
  await AsyncStorage.setItem(ALARM_KEY, JSON.stringify(settings));
  await scheduleAlarm(settings);
}

export async function scheduleAlarm(settings: AlarmSettings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const content = {
    title: '🧠 오늘의 사고력 문제가 도착했어요!',
    body: '잠깐, 오늘 이 상황이라면 어떻게 할 것 같아요?',
    sound: true,
  };

  if (settings.days === 'interval') {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: settings.intervalHours * 3600,
        repeats: true,
      },
    });
    return;
  }

  const activeDays = getActiveDays(settings);

  if (activeDays.length === 7) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  } else {
    for (const weekday of activeDays) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: settings.hour,
          minute: settings.minute,
        },
      });
    }
  }
}

// expo-notifications WeeklyTrigger: 1=일, 2=월, ..., 7=토
function getActiveDays(settings: AlarmSettings): number[] {
  switch (settings.days) {
    case 'daily':
      return [1, 2, 3, 4, 5, 6, 7];
    case 'weekdays':
      return [2, 3, 4, 5, 6]; // 월~금
    case 'weekends':
      return [1, 7]; // 일, 토
    case 'custom':
      return settings.customDays
        .map((active, i) => (active ? i + 1 : 0))
        .filter(Boolean);
    default:
      return [1, 2, 3, 4, 5, 6, 7];
  }
}

export function formatTime(hour: number, minute: number): string {
  const ampm = hour < 12 ? '오전' : '오후';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const m = minute.toString().padStart(2, '0');
  return `${ampm} ${h}:${m}`;
}
