-- Drop the old restricted policy
DROP POLICY IF EXISTS "Profiles - Admins can view profiles in their parking lot" ON profiles;

-- Create the updated policy that allows admins to see their own parking lot profiles,
-- and allows superadmins to see all profiles across the system.
CREATE POLICY "Profiles - Admins and Superadmins can view profiles" ON profiles
    FOR SELECT USING (
        (profiles.parking_lot_id = get_user_parking_lot() AND get_user_role() = 'admin') OR
        (get_user_role() = 'superadmin')
    );

-- Drop any restrictive policies on device_approvals just in case
DROP POLICY IF EXISTS "Public Device Approvals" ON device_approvals;
CREATE POLICY "Device Approvals - All authenticated access" ON device_approvals
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
