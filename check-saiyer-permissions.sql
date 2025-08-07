-- 🔍 VERIFICATION SCRIPT - Check סייר permissions
-- Run this script to see what permissions סייר users currently have

-- 1. Show all individual permissions granted to סייר users
SELECT 
    '🚨 INDIVIDUAL PERMISSIONS FOR סייר USERS' as title,
    u.username,
    u.full_name,
    up.permission,
    up.granted_at,
    CASE 
        WHEN up.permission IN ('view_events_list', 'access_summaries', 'view_own_summaries', 'access_analytics', 'can_modify_privileges', 'access_events_crud') 
        THEN '❌ UNAUTHORIZED'
        ELSE '✅ AUTHORIZED'
    END as status
FROM public.user_permissions up
JOIN public.users u ON up.user_id = u.id
WHERE u.role = 'סייר' AND up.is_active = true
ORDER BY u.username, up.permission;

-- 2. Show role default permissions for סייר
SELECT 
    '✅ ROLE DEFAULT PERMISSIONS FOR סייר' as title,
    permission,
    is_default
FROM public.role_default_permissions 
WHERE role = 'סייר'
ORDER BY permission;

-- 3. Count unauthorized permissions
SELECT 
    'COUNT OF UNAUTHORIZED PERMISSIONS' as check_type,
    COUNT(*) as unauthorized_count
FROM public.user_permissions up
JOIN public.users u ON up.user_id = u.id
WHERE u.role = 'סייר' 
AND up.is_active = true
AND up.permission IN ('view_events_list', 'access_summaries', 'view_own_summaries', 'access_analytics', 'can_modify_privileges', 'access_events_crud');

-- 4. Show summary of all סייר users
SELECT 
    'SUMMARY OF סייר USERS' as title,
    COUNT(*) as total_saiyer_users
FROM public.users 
WHERE role = 'סייר' AND is_active = true;
