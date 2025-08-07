-- Add vehicle search permissions to the system
-- This script adds the necessary permissions for the vehicle search system

-- Insert vehicle search permissions if they don't exist
INSERT INTO permissions (permission_name, description, category, is_active)
VALUES 
    ('vehicle_search_access', 'גישה לחיפוש רכבים - אפשרות לחפש וצפות במידע על רכבים ובעליהם', 'vehicle_management', true),
    ('vehicle_admin_access', 'ניהול מלא של מערכת הרכבים - הוספה, עריכה ומחיקה של רכבים ובעלים', 'vehicle_management', true)
ON CONFLICT (permission_name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Add vehicle_search_access to all active users by default
INSERT INTO user_permissions (user_id, permission_name, granted_by, is_active)
SELECT 
    u.id as user_id,
    'vehicle_search_access' as permission_name,
    (SELECT id FROM users WHERE role = 'מפתח' LIMIT 1) as granted_by,
    true as is_active
FROM users u
WHERE u.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_permissions up 
        WHERE up.user_id = u.id 
        AND up.permission_name = 'vehicle_search_access'
    );

-- Add vehicle_admin_access to specific roles
INSERT INTO user_permissions (user_id, permission_name, granted_by, is_active)
SELECT 
    u.id as user_id,
    'vehicle_admin_access' as permission_name,
    (SELECT id FROM users WHERE role = 'מפתח' LIMIT 1) as granted_by,
    true as is_active
FROM users u
WHERE u.is_active = true
    AND u.role IN ('מפתח', 'אדמין', 'פיקוד יחידה')
    AND NOT EXISTS (
        SELECT 1 FROM user_permissions up 
        WHERE up.user_id = u.id 
        AND up.permission_name = 'vehicle_admin_access'
    );

-- Verify the permissions were added
SELECT 
    p.permission_name,
    p.description,
    COUNT(up.user_id) as users_with_permission
FROM permissions p
LEFT JOIN user_permissions up ON p.permission_name = up.permission_name AND up.is_active = true
WHERE p.permission_name IN ('vehicle_search_access', 'vehicle_admin_access')
GROUP BY p.permission_name, p.description
ORDER BY p.permission_name;

-- Show which users have vehicle permissions
SELECT 
    u.username,
    u.role,
    up.permission_name,
    up.granted_at
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE up.permission_name IN ('vehicle_search_access', 'vehicle_admin_access')
    AND up.is_active = true
    AND u.is_active = true
ORDER BY u.role, u.username, up.permission_name;

COMMIT;
