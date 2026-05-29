-- Asegurar que las referencias a parking_lots tengan ON DELETE CASCADE
-- profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_parking_lot_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- admin_parking_lots
ALTER TABLE admin_parking_lots DROP CONSTRAINT IF EXISTS admin_parking_lots_parking_lot_id_fkey;
ALTER TABLE admin_parking_lots ADD CONSTRAINT admin_parking_lots_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- tariffs
ALTER TABLE tariffs DROP CONSTRAINT IF EXISTS tariffs_parking_lot_id_fkey;
ALTER TABLE tariffs ADD CONSTRAINT tariffs_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- custom_roles
ALTER TABLE custom_roles DROP CONSTRAINT IF EXISTS custom_roles_parking_lot_id_fkey;
ALTER TABLE custom_roles ADD CONSTRAINT custom_roles_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- cash_closures
ALTER TABLE cash_closures DROP CONSTRAINT IF EXISTS cash_closures_parking_lot_id_fkey;
ALTER TABLE cash_closures ADD CONSTRAINT cash_closures_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- blacklisted_vehicles
ALTER TABLE blacklisted_vehicles DROP CONSTRAINT IF EXISTS blacklisted_vehicles_parking_lot_id_fkey;
ALTER TABLE blacklisted_vehicles ADD CONSTRAINT blacklisted_vehicles_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- monthly_subscribers
ALTER TABLE monthly_subscribers DROP CONSTRAINT IF EXISTS monthly_subscribers_parking_lot_id_fkey;
ALTER TABLE monthly_subscribers ADD CONSTRAINT monthly_subscribers_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- private_parking_spaces
ALTER TABLE private_parking_spaces DROP CONSTRAINT IF EXISTS private_parking_spaces_parking_lot_id_fkey;
ALTER TABLE private_parking_spaces ADD CONSTRAINT private_parking_spaces_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- parking_sessions
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_parking_lot_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_parking_lot_id_fkey FOREIGN KEY (parking_lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE;

-- Cambiar vehículo a SET NULL en lugar de RESTRICT en parking_sessions si se llega a borrar un vehiculo,
-- pero para que al borrar parking_lot borre sessions no necesitamos cambiar vehicle_id_fkey. Sin embargo,
-- como solicitó "cambiando la restricción de los vehículos para que solo borre las sesiones", lo cambiamos
-- de RESTRICT a CASCADE en la relacion sessions -> vehicles:
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_vehicle_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;

-- Agregar columna para estado del parqueadero
ALTER TABLE parking_lots ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
