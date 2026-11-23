import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

const FRIENDLY_REMINDERS = [
  {
    title: 'Крыски дома ждут вас!',
    body: 'Хвостики проснулись в гамаке и с интересом выглядывают к вам.',
  },
  {
    title: 'Время свежей водички и игр',
    body: 'Пора заглянуть в клетку, угостить питомцев и проверить их любимые игрушки.',
  },
  {
    title: 'Уютная пауза с крысками',
    body: 'Ваши пушистые друзья устроили весёлую возню и будут рады почесушкам.',
  },
  {
    title: 'Новое занятие для умных носиков',
    body: 'Крыски выспались и готовы к поиску лакомств или прогулке в манеже.',
  },
];

export async function triggerHaptic(enabled: boolean, style: 'light' | 'medium' = 'light'): Promise<void> {
  if (!enabled) return;
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({
        style: style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
      });
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(style === 'medium' ? 22 : 12);
    }
  } catch {
    // Ignore unsupported platforms
  }
}

export function registerLifecycleListeners(onPause: () => void, onResume: () => void): () => void {
  const onVis = () => {
    if (document.hidden) onPause();
    else onResume();
  };
  document.addEventListener('visibilitychange', onVis);

  let removeNative: (() => void) | null = null;
  if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) onResume();
      else onPause();
    }).then((handle) => {
      removeNative = () => {
        handle.remove().catch(() => {});
      };
    }).catch(() => {});
  }

  return () => {
    document.removeEventListener('visibilitychange', onVis);
    if (removeNative) removeNative();
  };
}

export async function scheduleFriendlyAwayNotifications(ratNames: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }

    await LocalNotifications.cancel({ notifications: [{ id: 101 }, { id: 102 }] });

    const namesText = ratNames.slice(0, 2).join(' и ') || 'Ваши крыски';
    const msg1 = FRIENDLY_REMINDERS[Math.floor(Math.random() * FRIENDLY_REMINDERS.length)];
    const msg2 = FRIENDLY_REMINDERS[(Math.floor(Math.random() * 2) + 2) % FRIENDLY_REMINDERS.length];

    const now = Date.now();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 101,
          title: msg1.title,
          body: `${namesText}: ${msg1.body}`,
          schedule: { at: new Date(now + 1000 * 60 * 60 * 12) }, // 12 hours
        },
        {
          id: 102,
          title: msg2.title,
          body: `${namesText} скучают и ждут новых игр и лакомств!`,
          schedule: { at: new Date(now + 1000 * 60 * 60 * 36) }, // 36 hours
        },
      ],
    });
  } catch {
    // Notifications optional
  }
}
