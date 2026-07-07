// Push Notifications Service
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Get push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.log('No project ID found');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Register token with backend
    await registerToken(token);

    return token;
  } catch (e) {
    console.error('Failed to get push token:', e);
    return null;
  }
}

async function registerToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Store token in user profile or separate table
  await supabase
    .from('user_profiles')
    .update({ push_token: token })
    .eq('id', user.id);
}

export function setupNotificationListeners() {
  // Handle notification received while app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  // Handle notification tapped
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);

    // Navigate based on notification type
    if (data?.type === 'incoming_call') {
      // Navigate to incoming call screen
    } else if (data?.type === 'new_message') {
      // Navigate to conversation
    } else if (data?.type === 'new_voicemail') {
      // Navigate to voicemail
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

// Send push notification via edge function
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (!profile?.push_token) return;

    // Send via Expo push service
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data,
        sound: 'default',
        channelId: 'default',
      }),
    });
  } catch (e) {
    console.error('Failed to send push notification:', e);
  }
}
