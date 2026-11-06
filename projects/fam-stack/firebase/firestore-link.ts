import {disableNetwork, enableNetwork, Firestore} from 'firebase/firestore';
import {LinkTransport} from 'fam-stack/backend';

/**
 * `LinkTransport` over Firestore: disables and re-enables the network, so every listener
 * re-delivers from the server. A transaction in flight fails. `provideFirebase` provides it.
 */
export const firestoreLinkTransport = (firestore: Firestore): LinkTransport => ({
  rebuild: async () => {
    await disableNetwork(firestore);
    await enableNetwork(firestore);
  }
});
