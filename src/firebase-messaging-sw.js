/*
 * Register the click handler before Firebase imports its own listeners.
 * The route comes from the backend and contains only an access-event id;
 * authorization still happens when the portal requests the event.
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
  const eventId = data.accessEventId || 'unknown';

  return self.registration.showNotification(
    data.title || 'Movimiento registrado',
    {
      body: data.body || 'La escuela registró un nuevo movimiento.',
      tag: `access-event-${eventId}`,
      data: {
        route: data.route || '/#/guardian'
      }
    }
  );
});
