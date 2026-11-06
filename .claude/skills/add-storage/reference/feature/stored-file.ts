import {asCount, asText, isUuidv7} from 'fam-stack/core';
import {FamUser} from 'fam-stack/auth';

/** The Firestore collection of file records, and the Storage folder of their bytes. */
export const FILES_COLLECTION = 'files';
export const FILES_FOLDER = 'files';

/* Bounds; `storage.rules` and `firestore.rules` mirror them more loosely. */
export const FILE_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];
export const FILE_NAME_MAX = 200;

/** A file's record. The bytes live at `filePath(id)`; the record never stores a URL. */
export interface StoredFileDocument {
  readonly name: string;
  readonly contentType: string;
  readonly size: number;
  readonly createdAt: number;
  readonly createdBy: FamUser;
}

export interface StoredFile extends StoredFileDocument {
  readonly id: string;
}

/** Where a record's bytes are stored, derived from its id alone. */
export const filePath = (id: string): string => `${FILES_FOLDER}/${id}`;

/** Why a picked file is refused before upload, or `null` when it may go. */
export const refuseFile = (file: File): string | null => {
  if (!FILE_TYPES.includes(file.type)) return 'Only PNG, JPEG or WebP images can be added.';
  if (file.size > FILE_MAX_BYTES) return 'That file is larger than 10 MB.';
  return null;
};

const asUser = (value: unknown): FamUser => {
  const user = (typeof value === 'object' && value !== null ? value : {}) as Partial<FamUser>;
  return {uid: asText(user.uid), email: asText(user.email)};
};

/** A stored record as the screens read it, or `null` when it cannot be shown. */
export const shapeFile = (raw: unknown): StoredFile | null => {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const id = asText(data['id']);
  if (!isUuidv7(id)) return null;
  return {
    id,
    name: asText(data['name'], FILE_NAME_MAX) || 'Untitled',
    contentType: asText(data['contentType']),
    size: asCount(data['size']),
    createdAt: asCount(data['createdAt']),
    createdBy: asUser(data['createdBy'])
  };
};

export const shapeFiles = (docs: readonly unknown[]): readonly StoredFile[] => {
  const seen = new Set<string>();
  return docs.map(shapeFile).filter((file): file is StoredFile => {
    if (!file || seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });
};
