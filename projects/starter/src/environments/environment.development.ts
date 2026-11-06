import {FirebaseEmulators} from 'fam-stack/firebase';
import {FirebaseOptions} from 'firebase/app';

/* The development build (`npm start`): the local emulators under a `demo-` project id. */
export const environment: {firebase: FirebaseOptions; emulators?: FirebaseEmulators} = {
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-fam-stack.firebaseapp.com',
    projectId: 'demo-fam-stack',
    appId: 'demo-app-id'
  },
  emulators: {
    auth: 'http://127.0.0.1:9099',
    firestore: {host: '127.0.0.1', port: 8080}
  }
};
