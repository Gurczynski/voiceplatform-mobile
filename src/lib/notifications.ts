// Push Notifications Service
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

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
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    await registerToken(token);
    return token;
  } catch (e) {
    return null;
  }
}

async function registerToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_profiles').update({ push_token: token }).eq('id', user.id);
}

export function setupNotificationListeners() {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {});
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.type === 'incoming_call') {}
    else if (data?.type === 'new_message') {}
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null,
  });
}

export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    const { data: profile } = await supabase.from('user_profiles').select('push_token').eq('id', userId).single();
    if (!profile?.push_token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: profile.push_token, title, body, data, sound: 'default' }),
    });
  } catch (e) {}
}

export async function sendOrgNotification(orgId: string, title: string, body: string, data?: any) {
  try {
    const { data: members } = await supabase.from('organization_members').select('user_id').eq('organization_id', orgId).eq('is_active', true);
    if (!members?.length) return;

    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase.from('user_profiles').select('id, push_token').in('id', userIds);
    const tokens = (profiles || []).filter(p => p.push_token).map(p => p.push_token);
    if (tokens.length === 0) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: tokens, title, body, data, sound: 'default' }),
    });
  } catch (e) {}
}
