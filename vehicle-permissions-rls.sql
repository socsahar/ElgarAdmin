-- Additional Row Level Security policies for vehicle search system
-- This file contains supplementary RLS policies and security configurations

-- Ensure RLS is enabled on all relevant tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_search_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "vehicle_search_select_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicle_admin_all_policy" ON vehicles;
DROP POLICY IF EXISTS "vehicle_owner_search_select_policy" ON vehicle_owners;
DROP POLICY IF EXISTS "vehicle_owner_admin_all_policy" ON vehicle_owners;
DROP POLICY IF EXISTS "search_logs_own_select_policy" ON vehicle_search_logs;
DROP POLICY IF EXISTS "search_logs_own_insert_policy" ON vehicle_search_logs;
DROP POLICY IF EXISTS "search_logs_admin_select_policy" ON vehicle_search_logs;

-- Vehicle table policies
-- Read access for users with vehicle_search_access
CREATE POLICY "vehicle_search_select_policy" ON vehicles
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.permission_name = 'vehicle_search_access'
            AND up.is_active = true
            AND u.is_active = true
        )
    );

-- Full access for users with vehicle_admin_access
CREATE POLICY "vehicle_admin_all_policy" ON vehicles
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.permission_name = 'vehicle_admin_access'
            AND up.is_active = true
            AND u.is_active = true
        )
    );

-- Vehicle owners table policies
-- Read access for users with vehicle_search_access
CREATE POLICY "vehicle_owner_search_select_policy" ON vehicle_owners
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.permission_name = 'vehicle_search_access'
            AND up.is_active = true
            AND u.is_active = true
        )
    );

-- Full access for users with vehicle_admin_access
CREATE POLICY "vehicle_owner_admin_all_policy" ON vehicle_owners
    FOR ALL USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.permission_name = 'vehicle_admin_access'
            AND up.is_active = true
            AND u.is_active = true
        )
    );

-- Search logs policies
-- Users can view their own search logs
CREATE POLICY "search_logs_own_select_policy" ON vehicle_search_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
            AND u.id = vehicle_search_logs.user_id
            AND u.is_active = true
        )
    );

-- Users can insert their own search logs
CREATE POLICY "search_logs_own_insert_policy" ON vehicle_search_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.auth_user_id = auth.uid()
            AND u.id = vehicle_search_logs.user_id
            AND u.is_active = true
        )
    );

-- Admins can view all search logs
CREATE POLICY "search_logs_admin_select_policy" ON vehicle_search_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND up.permission_name = 'vehicle_admin_access'
            AND up.is_active = true
            AND u.is_active = true
        )
    );

-- Create a function to check vehicle permissions
CREATE OR REPLACE FUNCTION check_vehicle_permission(permission_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    -- Check if user has the specific vehicle permission
    SELECT EXISTS (
        SELECT 1 FROM user_permissions up
        JOIN users u ON up.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND up.permission_name = permission_type
        AND up.is_active = true
        AND u.is_active = true
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to log vehicle searches
CREATE OR REPLACE FUNCTION log_vehicle_search(
    search_query_param TEXT,
    search_type_param TEXT,
    results_count_param INTEGER,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    current_user_id UUID;
BEGIN
    -- Get the current user ID from the users table
    SELECT u.id INTO current_user_id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
    AND u.is_active = true;
    
    -- Insert the search log
    INSERT INTO vehicle_search_logs (
        user_id,
        search_query,
        search_type,
        results_count,
        ip_address,
        user_agent
    ) VALUES (
        current_user_id,
        search_query_param,
        search_type_param,
        results_count_param,
        ip_address_param,
        user_agent_param
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_vehicle_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_vehicle_search(TEXT, TEXT, INTEGER, INET, TEXT) TO authenticated;

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(user_id, permission_name) WHERE is_active = true;

-- Comments
COMMENT ON FUNCTION check_vehicle_permission(TEXT) IS 'בדיקת הרשאות רכב לפי סוג ההרשאה';
COMMENT ON FUNCTION log_vehicle_search(TEXT, TEXT, INTEGER, INET, TEXT) IS 'רישום חיפוש רכב במערכת הלוגים';

COMMIT;
