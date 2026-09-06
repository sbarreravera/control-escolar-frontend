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

firebase.messaging();