ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS photo_reference   TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_uri   TEXT;
