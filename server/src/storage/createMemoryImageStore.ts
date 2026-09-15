import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LocalMemoryImageStore, type MemoryImageStore, type StoredMemoryImage } from './MemoryImageStore.js';

class SupabaseMemoryImageStore implements MemoryImageStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  async save(householdId: string, imageId: string, bytes: Uint8Array, mimeType: StoredMemoryImage['mimeType']): Promise<void> {
    const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const objectPath = `${householdId}/${imageId}.${extension}`;
    const { error } = await this.client.storage.from(this.bucket).upload(objectPath, bytes, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error(`Could not store memory image: ${error.message}`);
  }

  async get(householdId: string, imageId: string): Promise<StoredMemoryImage> {
    for (const [extension, mimeType] of [['jpg', 'image/jpeg'], ['png', 'image/png']] as const) {
      const { data, error } = await this.client.storage.from(this.bucket).download(`${householdId}/${imageId}.${extension}`);
      if (!error && data) return { bytes: new Uint8Array(await data.arrayBuffer()), mimeType };
    }
    throw new Error('Memory image not found');
  }
}

export function createMemoryImageStore(): MemoryImageStore {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRole) {
    return new SupabaseMemoryImageStore(
      createClient(url, serviceRole, { auth: { persistSession: false } }),
      process.env.SUPABASE_MEMORY_BUCKET ?? 'together-memories',
    );
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Production memory image storage requires Supabase credentials');
  return new LocalMemoryImageStore(path.resolve(process.cwd(), 'server/data/memories'));
}
