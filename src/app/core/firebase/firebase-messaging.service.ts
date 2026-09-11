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

  async requestPermissionAndGetToken(): Promise<string> {
    this.validateBrowserEnvironment();

    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      throw new Error(
        'Este navegador no es compatible con notificaciones push.'
      );
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        'Debes permitir las notificaciones para vincular este dispositivo.'
      );
    }

    const serviceWorkerRegistration =
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');

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
   * Shows all guardian pushes while the portal is open. Access-event pushes
   * additionally invoke the callback so the movement history can refresh.
   */
  async listenForForegroundAccessEvents(
    onAccessEvent: (eventId: number) => void
  ): Promise<Unsubscribe> {
    if (typeof window === 'undefined' || !(await isSupported())) {
      return () => undefined;
    }

    return onMessage(this.getMessagingInstance(), payload => {
      const communicationId = Number(payload.data?.['communicationId']);
      if (Number.isSafeInteger(communicationId) && communicationId > 0) {
        this.showForegroundNotification(
          payload.data?.['title'] ?? 'Nuevo aviso de la escuela',
          payload.data?.['body'] ?? '',
          payload.data?.['route']
            ?? `/#/guardian/communications?communicationId=${communicationId}`,
          `communication-${communicationId}`
        );
        return;
      }

      const eventId = Number(payload.data?.['accessEventId']);
      if (!Number.isSafeInteger(eventId) || eventId <= 0) {
        return;
      }

      this.showForegroundNotification(
        payload.data?.['title'] ?? 'Movimiento registrado',
        payload.data?.['body'] ?? '',
        payload.data?.['route'] ?? `/#/guardian?eventId=${eventId}`,
        `access-event-${eventId}`
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
    tag: string
  ): void {
    if (!('Notification' in window)
        || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      tag,
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
