CREATE TABLE IF NOT EXISTS private_parking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  plate TEXT,
  owner_name TEXT,
  custom_fields_data JSONB DEFAULT '{}'::jsonb,
  released_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE private_parking_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Private Parking History" ON private_parking_history FOR ALL USING (true) WITH CHECK (true);
