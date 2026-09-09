import { Injectable } from '@angular/core';
import {
  FirebaseApp,
  getApp,
  getApps,
  initializeApp
} from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  Messaging,
  onMessage,
  Unsubscribe
} from 'firebase/messaging';

import {
  firebaseConfig,
  firebaseVapidKey
} from './firebase.config';

@Injectable({
  providedIn: 'root'
})
export class FirebaseMessagingService {

  private firebaseApp?: FirebaseApp;
  private messaging?: Messaging;

  /**
   * Requests notification permission and returns the FCM
   * registration token generated for this browser.
   */
  async requestPermissionAndGetToken(): Promise<string> {
    this.validateBrowserEnvironment();

    const messagingSupported = await isSupported();

    if (!messagingSupported) {
      throw new Error(
        'Este navegador no es compatible con notificaciones push.'
      );
    }

    const permission =
      await Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error(
        'Debes permitir las notificaciones para vincular este dispositivo.'
      );
    }

    const serviceWorkerRegistration =
      await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      );

    const currentToken = await getToken(
      this.getMessagingInstance(),
      {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration
      }
    );

    if (!currentToken) {
      throw new Error(
        'Firebase no pudo generar el identificador del dispositivo.'
      );
    }

    return currentToken;
  }

  /**
   * Keeps the open guardian portal synchronized when a data-only access
   * notification arrives. Background notifications are handled by the
   * Firebase service worker.
   */
  async listenForForegroundAccessEvents(
    onAccessEvent: (eventId: number) => void
  ): Promise<Unsubscribe> {
    if (typeof window === 'undefined' || !(await isSupported())) {
      return () => undefined;
    }

    return onMessage(this.getMessagingInstance(), payload => {
      const eventId = Number(payload.data?.['accessEventId']);

      if (!Number.isSafeInteger(eventId) || eventId <= 0) {
        return;
      }

      this.showForegroundNotification(
        payload.data?.['title'] ?? 'Movimiento registrado',
        payload.data?.['body'] ?? '',
        payload.data?.['route'] ?? `/#/guardian?eventId=${eventId}`,
        eventId
      );

      onAccessEvent(eventId);
    });
  }

  private getMessagingInstance(): Messaging {
    if (!this.firebaseApp) {
      this.firebaseApp = getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);
    }

    if (!this.messaging) {
      this.messaging = getMessaging(this.firebaseApp);
    }

    return this.messaging;
  }

  private showForegroundNotification(
    title: string,
    body: string,
    route: string,
    eventId: number
  ): void {
    if (!('Notification' in window)
        || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      tag: `access-event-${eventId}`,
      data: { route }
    });

    notification.onclick = () => {
      notification.close();
      window.focus();
      window.location.assign(
        new URL(route, window.location.origin).href
      );
    };
  }

  private validateBrowserEnvironment(): void {
    if (!window.isSecureContext) {
      throw new Error(
        'Las notificaciones requieren una conexión HTTPS segura.'
      );
    }

    if (!('Notification' in window)) {
      throw new Error(
        'Este navegador no permite mostrar notificaciones.'
      );
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error(
        'Este navegador no admite service workers.'
      );
    }
  }
}
