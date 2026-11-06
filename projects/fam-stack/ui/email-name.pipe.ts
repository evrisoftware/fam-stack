import {Pipe, PipeTransform} from '@angular/core';

/** The part of an email before "@" ("ana" from "ana@example.com"); other values pass unchanged. */
@Pipe({name: 'emailName'})
export class EmailNamePipe implements PipeTransform {
  transform(email: string | null | undefined): string {
    return emailName(email);
  }
}

/** The pipe's function, for use outside templates. */
export const emailName = (email: string | null | undefined): string => {
  const address = email ?? '';
  const at = address.indexOf('@');
  return at > 0 ? address.slice(0, at) : address;
};
