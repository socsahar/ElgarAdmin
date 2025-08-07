-- 🔧 SIMPLE FIX SAIYER PERMISSIONS - Remove unauthorized permissions
-- Date: August 7, 2025
-- Purpose: Remove view_events_list and access_summaries permissions from סייר users

-- 1. REMOVE UNAUTHORIZED PERMISSIONS FROM INDIVIDUAL USERS
DELETE FROM public.user_permissions 
WHERE user_id IN (SELECT id FROM public.users WHERE role = 'סייר')
AND permission IN (
    'view_events_list',
    'access_summaries', 
    'view_own_summaries',
    'access_analytics',
    'can_modify_privileges',
    'access_events_crud'
);

-- 2. ENSURE ROLE DEFAULTS DON'T HAVE UNAUTHORIZED PERMISSIONS
DELETE FROM public.role_default_permissions 
WHERE role = 'סייר' 
AND permission IN (
    'view_events_list',
    'access_summaries', 
    'view_own_summaries',
    'access_analytics',
    'can_modify_privileges',
    'access_events_crud'
);

-- 3. CREATE PROTECTIVE FUNCTION
CREATE OR REPLACE FUNCTION prevent_unauthorized_saiyer_permissions()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    unauthorized_permissions TEXT[] := ARRAY[
        'view_events_list',
        'access_summaries', 
        'view_own_summaries',
        'access_analytics',
        'can_modify_privileges',
        'access_events_crud'
    ];
BEGIN
    SELECT role INTO user_role FROM public.users WHERE id = NEW.user_id;
    
    IF user_role = 'סייר' AND NEW.permission = ANY(unauthorized_permissions) THEN
        RAISE EXCEPTION 'Cannot grant permission "%" to סייר users. This permission is not authorized for volunteers.', NEW.permission;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE TRIGGER
DROP TRIGGER IF EXISTS trigger_prevent_unauthorized_saiyer_permissions ON public.user_permissions;
CREATE TRIGGER trigger_prevent_unauthorized_saiyer_permissions
    BEFORE INSERT OR UPDATE ON public.user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_unauthorized_saiyer_permissions();

-- 5. VERIFICATION - Check if fix worked
SELECT 
    'VERIFICATION - Unauthorized permissions count' as check_type,
    COUNT(*) as should_be_zero
FROM public.user_permissions up
JOIN public.users u ON up.user_id = u.id
WHERE u.role = 'סייר' 
AND up.is_active = true
AND up.permission IN ('view_events_list', 'access_summaries', 'view_own_summaries', 'access_analytics', 'can_modify_privileges', 'access_events_crud');
