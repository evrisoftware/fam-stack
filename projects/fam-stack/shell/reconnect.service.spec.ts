import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FAM_TEXT_EN} from 'fam-stack/core';
import {LinkService, ReviveOutcome} from 'fam-stack/backend';
import {NotificationService} from 'fam-stack/ui';
import {ReconnectService} from 'fam-stack/shell';

const TEXT = FAM_TEXT_EN.link;

const setup = (outcome: ReviveOutcome = 'revived') => {
  const link = {isReviving: signal(false), revive: vi.fn(() => Promise.resolve(outcome))};
  const notification = {success: vi.fn(), error: vi.fn()};
  TestBed.configureTestingModule({
    providers: [
      {provide: LinkService, useValue: link},
      {provide: NotificationService, useValue: notification}
    ]
  });
  return {reconnect: TestBed.inject(ReconnectService), link, notification};
};

describe('ReconnectService', () => {
  it('labels the control by whether a revive is in flight', () => {
    const {reconnect, link} = setup();
    expect(reconnect.label()).toBe(TEXT.reconnect);
    expect(reconnect.busy()).toBe(false);
    link.isReviving.set(true);
    expect(reconnect.label()).toBe(TEXT.reconnecting);
    expect(reconnect.busy()).toBe(true);
  });

  it('says a restored connection as a success', async () => {
    const {reconnect, link, notification} = setup('revived');
    await reconnect.reconnect();
    expect(link.revive).toHaveBeenCalledTimes(1);
    expect(notification.success).toHaveBeenCalledWith(TEXT.reconnected);
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('says a failed reconnect as an error', async () => {
    const {reconnect, notification} = setup('failed');
    await reconnect.reconnect();
    expect(notification.error).toHaveBeenCalledWith(TEXT.reconnectFailed);
    expect(notification.success).not.toHaveBeenCalled();
  });

  it.each<ReviveOutcome>(['busy', 'abandoned'])('says nothing when the revive was %s', async outcome => {
    const {reconnect, notification} = setup(outcome);
    await reconnect.reconnect();
    expect(notification.success).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });
});
