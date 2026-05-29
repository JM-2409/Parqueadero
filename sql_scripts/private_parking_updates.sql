ALTER TABLE private_parking_spaces ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'carros';
ALTER TABLE private_parking_history ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'carros';
