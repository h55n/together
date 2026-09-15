import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StoredMemoryImage = { bytes: Uint8Array; mimeType: 'image/jpeg' | 'image/png' };

export interface MemoryImageStore {
  save(householdId: string, imageId: string, bytes: Uint8Array, mimeType: StoredMemoryImage['mimeType']): Promise<void>;
  get(householdId: string, imageId: string): Promise<StoredMemoryImage>;
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export class LocalMemoryImageStore implements MemoryImageStore {
  constructor(private readonly rootDirectory: string) {}

  async save(householdId: string, imageId: string, bytes: Uint8Array, mimeType: StoredMemoryImage['mimeType']): Promise<void> {
    validateId(householdId);
    validateId(imageId);
    validateMimeType(mimeType);
    const directory = path.join(this.rootDirectory, householdId);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${imageId}.${extensionFor(mimeType)}`), bytes);
    await writeFile(path.join(directory, `${imageId}.json`), JSON.stringify({ mimeType }));
  }

  async get(householdId: string, imageId: string): Promise<StoredMemoryImage> {
    validateId(householdId);
    validateId(imageId);
    const directory = path.join(this.rootDirectory, householdId);
    const metadata = JSON.parse(await readFile(path.join(directory, `${imageId}.json`), 'utf8')) as { mimeType?: unknown };
    const mimeType = metadata.mimeType;
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') throw new Error('Stored memory image metadata is invalid');
    const bytes = await readFile(path.join(directory, `${imageId}.${extensionFor(mimeType)}`));
    return { bytes: new Uint8Array(bytes), mimeType };
  }
}

function validateId(value: string): void {
  if (!SAFE_ID.test(value)) throw new Error('Unsafe memory image identifier');
}

function validateMimeType(value: string): asserts value is StoredMemoryImage['mimeType'] {
  if (value !== 'image/jpeg' && value !== 'image/png') throw new Error('Unsupported memory image type');
}

function extensionFor(mimeType: StoredMemoryImage['mimeType']): 'jpg' | 'png' {
  return mimeType === 'image/jpeg' ? 'jpg' : 'png';
}
