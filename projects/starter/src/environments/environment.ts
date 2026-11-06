import {FirebaseEmulators} from 'fam-stack/firebase';
import {FirebaseOptions} from 'firebase/app';

/* The production build's Firebase web app config. */
export const environment: {firebase: FirebaseOptions; emulators?: FirebaseEmulators} = {
  firebase: {
    apiKey: 'REPLACE_WITH_YOUR_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    storageBucket: 'your-project.firebasestorage.app',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME'
  }
};
