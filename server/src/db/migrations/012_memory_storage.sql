-- Private Supabase Storage bootstrap for Together Memory Book images.
-- The game server accesses this bucket with the service role. No public/client
-- storage policies are created: authenticated game clients must go through the
-- household-authorized server routes.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'together-memories',
  'together-memories',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
