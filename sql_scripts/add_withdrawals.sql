-- Create cash_withdrawals table
CREATE TABLE IF NOT EXISTS cash_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  withdrawn_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  withdrawn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add basic policy
ALTER TABLE cash_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth cash_withdrawals" ON cash_withdrawals FOR ALL USING (true) WITH CHECK (true);

-- Update cash_closures to track withdrawals and expected revenue clearly
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS withdrawn_amount NUMERIC DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS expected_revenue NUMERIC DEFAULT 0;
