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
  Messaging
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