import { getVapidPublicKeyApi, subscribePushApi } from '../services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(authToken: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Web Push is not supported in this browser environment.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission was not granted:', permission);
      return false;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { public_key } = await getVapidPublicKeyApi();
    if (!public_key) {
      console.warn('VAPID public key not retrieved');
      return false;
    }

    const applicationServerKey = urlBase64ToUint8Array(public_key);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as any,
    });

    await subscribePushApi(authToken, subscription.toJSON());
    console.log('Successfully subscribed to GrowthOS Web Push notifications');
    return true;
  } catch (error) {
    console.warn('Failed to subscribe to Web Push notifications:', error);
    return false;
  }
}
