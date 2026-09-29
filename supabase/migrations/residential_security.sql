-- SEGURIDAD Y PRIVACIDAD DEL RESIDENTE (RLS)

-- Habilitar RLS en nuevas tablas
ALTER TABLE resident_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para resident_requests
-- El residente solo ve sus propias solicitudes
CREATE POLICY "Residents can view own requests" ON resident_requests
  FOR SELECT USING (auth.uid() = resident_id);

-- El residente puede crear sus propias solicitudes
CREATE POLICY "Residents can create own requests" ON resident_requests
  FOR INSERT WITH CHECK (auth.uid() = resident_id);

-- El administrador ve todas las solicitudes de su parqueadero/conjunto
CREATE POLICY "Admins can view lot requests" ON resident_requests
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE parking_lot_id = resident_requests.parking_lot_id AND role = 'admin')
  );

-- 2. Políticas para resident_documents
CREATE POLICY "Residents can manage own documents" ON resident_documents
  FOR ALL USING (auth.uid() = resident_id);

CREATE POLICY "Admins can view lot documents" ON resident_documents
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE parking_lot_id = (SELECT parking_lot_id FROM resident_requests WHERE id = request_id) AND role = 'admin')
  );

-- 3. Políticas para packages
-- El residente ve sus paquetes
CREATE POLICY "Residents can view own packages" ON packages
  FOR SELECT USING (auth.uid() = resident_id);

-- El vigilante/empleado gestiona los paquetes de su sede
CREATE POLICY "Employees can manage lot packages" ON packages
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE parking_lot_id = packages.parking_lot_id AND role IN ('employee', 'admin'))
  );
