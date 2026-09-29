-- Soporte para múltiples métodos de pago y configuración bancaria

-- 1. Tabla de Cuentas de Pago por Parqueadero
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parking_lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'nequi', 'daviplata', 'bancolombia', 'wompi', 'bold'
  account_identifier TEXT NOT NULL, -- Numero de celular o ID de cuenta
  qr_image_url TEXT, -- Para QR estático
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb, -- Para guardar API Keys si se usa pasarela
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Actualizar parking_sessions para rastrear el pago
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'; -- 'cash', 'qr_nequi', 'qr_daviplata', 'online'
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'; -- 'pending', 'paid', 'failed'
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS payment_reference TEXT; -- ID de transacción de la pasarela
ALTER TABLE parking_sessions ADD COLUMN IF NOT EXISTS payment_account_id UUID REFERENCES payment_accounts(id) ON DELETE SET NULL;

-- 3. Actualizar cash_closures para separar ingresos
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_cash NUMERIC DEFAULT 0;
ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS total_digital NUMERIC DEFAULT 0;

-- Habilitar RLS básico
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage their payment accounts" ON payment_accounts
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE parking_lot_id = payment_accounts.parking_lot_id AND role IN ('admin', 'superadmin')));
