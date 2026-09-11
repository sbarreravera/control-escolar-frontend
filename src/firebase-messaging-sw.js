/*
 * The backend provides an application route for every guardian push.
 * Authorization still happens when the destination requests its data.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const route = event.notification.data?.route || '/#/guardian';
  const destination = new URL(route, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const exactClient = windowClients.find(
          client => client.url === destination
        );
        if (exactClient) {
          return exactClient.focus();
        }

        const applicationClient = windowClients.find(
          client => new URL(client.url).origin === self.location.origin
        );
        if (applicationClient && 'navigate' in applicationClient) {
          return applicationClient.navigate(destination)
            .then(client => client?.focus());
        }
        return clients.openWindow(destination);
      })
  );
});

importScripts(
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyCWo5PCB_VN0w6MGfpSeseNetMJ0jWrRao',
  authDomain: 'control-escolar-dev.firebaseapp.com',
  projectId: 'control-escolar-dev',
  storageBucket: 'control-escolar-dev.firebasestorage.app',
  messagingSenderId: '184725161372',
  appId: '1:184725161372:web:d370e11ea58ad2bd017459'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const communicationId = data.communicationId;
  const eventId = data.accessEventId;
  const isCommunication = Boolean(communicationId);

  return self.registration.showNotification(
    data.title || (isCommunication
      ? 'Nuevo aviso de la escuela'
      : 'Movimiento registrado'),
    {
      body: data.body || (isCommunication
        ? 'La escuela publicó un nuevo comunicado.'
        : 'La escuela registró un nuevo movimiento.'),
      tag: isCommunication
        ? `communication-${communicationId}`
        : `access-event-${eventId || 'unknown'}`,
      data: {
        route: data.route || (isCommunication
          ? `/#/guardian/communications?communicationId=${communicationId}`
          : '/#/guardian')
      }
    }
  );
});
