import {inject, Injectable} from '@angular/core';
import {readLocalJson, removeLocal, uuidv7, writeLocal} from 'fam-stack/core';
import {FamSession, LoginHistoryStore} from 'fam-stack/backend';
import {FAM_AUTH_CONFIG} from './auth-config';
import {describeDevice} from './device';
import {shapeLoginRecord, shapeLoginRecords} from './login-record';
import {CurrentSession, FamUser, LoginRecord} from './types';

const thisDevice = (): Pick<LoginRecord, 'device' | 'userAgent'> => {
  const userAgent = navigator.userAgent;
  return {device: describeDevice(userAgent), userAgent};
};

/**
 * Each sign-in is prepended to the user's history through `LoginHistoryStore` (newest
 * first, capped) and this device's record is stored in `localStorage`. Reads are one-shot
 * and shaped by `shapeLoginRecord`.
 */
@Injectable({providedIn: 'root'})
export class LoginHistoryService {
  private readonly store = inject(LoginHistoryStore);
  private readonly session = inject(FamSession);
  private readonly config = inject(FAM_AUTH_CONFIG);

  /** Records a sign-in. Best effort: do not await it on the sign-in path. */
  async recordLogin(user: FamUser): Promise<void> {
    const record: LoginRecord = {
      uuid: uuidv7(),
      time: Date.now(),
      user: {uid: user.uid, email: user.email},
      ...thisDevice()
    };
    writeLocal(this.config.deviceKey, JSON.stringify(record));
    const history = this.config.loginHistory;
    if (!history) return;
    await this.store.prepend(history, user.uid, record, this.config.loginHistoryLimit);
  }

  /** The user's sign-ins, newest first, shaped; an unreadable entry is left out. */
  async getLoginHistory(uid: string): Promise<readonly LoginRecord[]> {
    const history = this.config.loginHistory;
    return history ? shapeLoginRecords(await this.store.read(history, uid)) : [];
  }

  /** This device's session: its stored record if it is the current account's, else the last sign-in time. */
  getCurrentSession(): CurrentSession {
    const stored = shapeLoginRecord(readLocalJson<unknown>(this.config.deviceKey));
    const uid = this.session.currentUser()?.uid;
    const own = stored !== null && uid !== undefined && stored.user.uid === uid ? stored : null;
    return {
      ...thisDevice(),
      startTime: own?.time ?? this.session.lastSignInTime(),
      uuid: own?.uuid
    };
  }

  /** Removes this device's stored record. Never throws. */
  clearDeviceSession(): void {
    removeLocal(this.config.deviceKey);
  }
}
