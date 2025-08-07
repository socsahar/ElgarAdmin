-- 🔧 FIX SAIYER PERMISSIONS - Remove unauthorized permissions
-- Date: August 7, 2025
-- Purpose: Remove view_events_list and access_summaries permissions from סייר users

BEGIN;

-- 1. REMOVE UNAUTHORIZED PERMISSIONS FROM INDIVIDUAL USERS
-- Remove view_events_list permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'view_events_list';

-- Remove access_summaries permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'access_summaries';

-- Remove view_own_summaries permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'view_own_summaries';

-- Remove access_analytics permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'access_analytics';

-- Remove can_modify_privileges permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'can_modify_privileges';

-- Remove access_events_crud permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'access_events_crud';

-- 2. ENSURE ROLE DEFAULTS DON'T HAVE UNAUTHORIZED PERMISSIONS
-- Remove any incorrect default permissions from role_default_permissions table
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

-- 3. VERIFICATION - Show current סייר permissions
DO $$
DECLARE
    user_count INTEGER;
    permission_count INTEGER;
BEGIN
    -- Count סייר users
    SELECT COUNT(*) INTO user_count FROM public.users WHERE role = 'סייר';
    
    -- Count individual permissions for סייר users
    SELECT COUNT(*) INTO permission_count 
    FROM public.user_permissions up
    JOIN public.users u ON up.user_id = u.id
    WHERE u.role = 'סייר' AND up.is_active = true;
    
    RAISE NOTICE '✅ Found % סייר users with % total individual permissions', user_count, permission_count;
    
    -- Show any remaining individual permissions for סייר users
    FOR rec IN (
        SELECT u.username, u.full_name, up.permission, up.granted_at
        FROM public.user_permissions up
        JOIN public.users u ON up.user_id = u.id
        WHERE u.role = 'סייר' AND up.is_active = true
        ORDER BY u.username, up.permission
    ) LOOP
        RAISE NOTICE '📋 User: % (%) has permission: % (granted: %)', 
            rec.username, rec.full_name, rec.permission, rec.granted_at;
    END LOOP;
    
    RAISE NOTICE '✅ סייר role should only have these default permissions:';
    FOR rec IN (
        SELECT permission FROM public.role_default_permissions 
        WHERE role = 'סייר' AND is_default = true
        ORDER BY permission
    ) LOOP
        RAISE NOTICE '   ✓ %', rec.permission;
    END LOOP;
END
$$;

-- 4. CREATE FUNCTION TO PREVENT UNAUTHORIZED PERMISSIONS IN FUTURE
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
    -- Get user role
    SELECT role INTO user_role FROM public.users WHERE id = NEW.user_id;
    
    -- If user is סייר and trying to get unauthorized permission, block it
    IF user_role = 'סייר' AND NEW.permission = ANY(unauthorized_permissions) THEN
        RAISE EXCEPTION 'Cannot grant permission "%" to סייר users. This permission is not authorized for volunteers.', NEW.permission;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce this rule
DROP TRIGGER IF EXISTS trigger_prevent_unauthorized_saiyer_permissions ON public.user_permissions;
CREATE TRIGGER trigger_prevent_unauthorized_saiyer_permissions
    BEFORE INSERT OR UPDATE ON public.user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_unauthorized_saiyer_permissions();

COMMIT;

-- 5. FINAL VERIFICATION QUERY
-- Run this to verify the fix worked
SELECT 
    'VERIFICATION' as check_type,
    COUNT(*) as saiyer_users_with_unauthorized_permissions
FROM public.user_permissions up
JOIN public.users u ON up.user_id = u.id
WHERE u.role = 'סייר' 
AND up.is_active = true
AND up.permission IN ('view_events_list', 'access_summaries', 'view_own_summaries', 'access_analytics', 'can_modify_privileges', 'access_events_crud');

-- Final success messages
DO $$
BEGIN
    RAISE NOTICE '🎉 סייר permissions fix completed successfully!';
    RAISE NOTICE '📝 If verification shows 0 unauthorized permissions, the fix worked correctly.';
    RAISE NOTICE '⚠️  If any users still see restricted pages, clear browser cache and restart the application.';
END $$;
