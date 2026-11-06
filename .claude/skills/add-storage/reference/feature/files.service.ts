import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {collection, deleteDoc, doc, Firestore, limit, orderBy, query, setDoc} from 'firebase/firestore';
import {deleteObject, getDownloadURL, ref, uploadBytesResumable} from 'firebase/storage';
import {concatMap, defer, from, map, Observable, of, takeUntil} from 'rxjs';
import {asText, uuidv7} from 'fam-stack/core';
import {LinkService, retryLiveStream} from 'fam-stack/backend';
import {collectionData, FIREBASE_STORAGE, firebaseErrorCode, trackUpload, UploadProgress} from 'fam-stack/firebase';
import {AuthService, FamUser} from 'fam-stack/auth';
import {FILE_NAME_MAX, filePath, FILES_COLLECTION, shapeFiles, StoredFile, StoredFileDocument} from './stored-file';

const STREAM = 'files';

/**
 * The live list of file records, uploads and removals. Provided by the shell; the listener
 * and any upload end on `signingOut$` or when the shell is destroyed.
 */
@Injectable()
export class FilesService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(FIREBASE_STORAGE);
  private readonly auth = inject(AuthService);
  private readonly link = inject(LinkService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly collection = collection(this.firestore, FILES_COLLECTION);
  readonly query = query(this.collection, orderBy('createdAt', 'desc'), limit(500));

  private readonly snapshot = signal<readonly StoredFile[] | null>(null);
  readonly isLoading = computed(() => this.snapshot() === null);
  readonly files = computed<readonly StoredFile[]>(() => this.snapshot() ?? []);

  /** Opens the listener. Call once, after `AuthService.loadUser()` has resolved. */
  load(): void {
    collectionData<unknown>(this.query, {idField: 'id'}).pipe(
      retryLiveStream(error => this.link.reportBroken(STREAM, error)),
      takeUntil(this.auth.signingOut$),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({data, fromCache}) => {
      if (!fromCache) this.link.reportAlive(STREAM);
      if (fromCache && data.length === 0 && this.snapshot() === null) return;
      this.snapshot.set(shapeFiles(data));
    });
  }

  /**
   * Uploads the bytes, then writes the record; emits progress and completes once both are
   * stored. Nothing starts before subscription, and any failure arrives as the error.
   * Unsubscribing or signing out cancels the upload but not a record write already started;
   * a refused record deletes the bytes.
   */
  upload(file: File): Observable<UploadProgress> {
    return defer(() => {
      const user = this.requireUser();
      const id = uuidv7();
      const task = uploadBytesResumable(ref(this.storage, filePath(id)), file, {
        contentType: file.type,
        customMetadata: {uid: user.uid}
      });
      return trackUpload(task).pipe(
        concatMap(progress => progress.done ? from(this.record(id, file, user)).pipe(map(() => progress)) : of(progress))
      );
    }).pipe(
      takeUntil(this.auth.signingOut$),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  /** A download URL for the file's bytes; `storage.rules` are checked when it is issued. */
  url(id: string): Promise<string> {
    return getDownloadURL(ref(this.storage, filePath(id)));
  }

  /** Deletes the bytes, then the record. Bytes already gone count as deleted. */
  async remove(file: StoredFile): Promise<void> {
    try {
      await deleteObject(ref(this.storage, filePath(file.id)));
    } catch (error) {
      if (firebaseErrorCode(error) !== 'storage/object-not-found') throw error;
    }
    await deleteDoc(doc(this.collection, file.id));
  }

  /* Writes the record; on failure deletes the uploaded bytes and rethrows the record's error. */
  private async record(id: string, file: File, user: FamUser): Promise<void> {
    const stored: StoredFileDocument = {
      name: asText(file.name, FILE_NAME_MAX) || 'Untitled',
      contentType: file.type,
      size: file.size,
      createdAt: Date.now(),
      createdBy: user
    };
    try {
      await setDoc(doc(this.collection, id), stored);
    } catch (error) {
      /* A failed deletion leaves the bytes without a record. */
      await deleteObject(ref(this.storage, filePath(id))).catch(() => undefined);
      throw error;
    }
  }

  private requireUser(): FamUser {
    const user = this.auth.currentUser();
    if (!user) throw new Error('No signed-in user.');
    return user;
  }
}
