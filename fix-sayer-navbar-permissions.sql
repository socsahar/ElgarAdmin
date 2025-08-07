-- Complete fix for סייר users seeing unwanted pages in navbar
-- This script removes both existing permissions and default permissions

BEGIN;

-- Step 1: Remove unwanted permissions from existing סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission IN ('view_events_list', 'view_own_summaries', 'access_summaries')
AND is_active = true;

-- Step 2: Remove unwanted default permissions from סייר role  
DELETE FROM public.role_default_permissions 
WHERE role = 'סייר' 
AND permission IN ('view_events_list', 'view_own_summaries', 'access_summaries');

-- Step 3: Verify the fix
SELECT 
    'Verification Report' as section,
    'After cleanup - סייר users with problematic permissions:' as description;

SELECT 
    u.full_name,
    u.username,
    up.permission,
    up.granted_at
FROM public.users u
JOIN public.user_permissions up ON u.id = up.user_id
WHERE u.role = 'סייר' 
AND up.permission IN ('view_events_list', 'view_own_summaries', 'access_summaries')
AND up.is_active = true
ORDER BY u.full_name, up.permission;

SELECT 
    'Default Permissions Check' as section,
    'Remaining default permissions for סייר role:' as description;

SELECT 
    permission,
    is_default
FROM public.role_default_permissions 
WHERE role = 'סייר'
ORDER BY permission;

-- Show summary count
SELECT 
    'Summary' as section,
    COUNT(*) as total_sayer_users,
    COUNT(CASE WHEN up.permission IS NOT NULL THEN 1 END) as users_still_with_problematic_permissions
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id 
    AND up.permission IN ('view_events_list', 'view_own_summaries', 'access_summaries')
    AND up.is_active = true
WHERE u.role = 'סייר';

COMMIT;
