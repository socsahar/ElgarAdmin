-- Remove unwanted permissions from סייר users
-- These permissions should not be default for סייר role

-- Remove view_events_list permission from all סייר users
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'view_events_list'
AND is_active = true;

-- Remove view_own_summaries permission from all סייר users  
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'view_own_summaries'
AND is_active = true;

-- Remove access_summaries permission from all סייר users (if any)
DELETE FROM public.user_permissions 
WHERE user_id IN (
    SELECT id FROM public.users WHERE role = 'סייר'
) 
AND permission = 'access_summaries'
AND is_active = true;

-- Verify the changes
SELECT 
    'Permission Removal Summary' as info,
    u.role,
    u.full_name,
    u.username,
    CASE WHEN up_events.permission IS NOT NULL THEN 'YES' ELSE 'NO' END as has_events_access,
    CASE WHEN up_summaries.permission IS NOT NULL THEN 'YES' ELSE 'NO' END as has_summaries_access
FROM public.users u
LEFT JOIN public.user_permissions up_events ON u.id = up_events.user_id 
    AND up_events.permission = 'view_events_list' 
    AND up_events.is_active = true
LEFT JOIN public.user_permissions up_summaries ON u.id = up_summaries.user_id 
    AND up_summaries.permission IN ('view_own_summaries', 'access_summaries')
    AND up_summaries.is_active = true
WHERE u.role = 'סייר'
ORDER BY u.full_name
LIMIT 10;

-- Show count of affected users
SELECT 
    COUNT(*) as total_sayer_users,
    COUNT(CASE WHEN up_events.permission IS NOT NULL THEN 1 END) as users_with_events_access,
    COUNT(CASE WHEN up_summaries.permission IS NOT NULL THEN 1 END) as users_with_summaries_access
FROM public.users u
LEFT JOIN public.user_permissions up_events ON u.id = up_events.user_id 
    AND up_events.permission = 'view_events_list' 
    AND up_events.is_active = true
LEFT JOIN public.user_permissions up_summaries ON u.id = up_summaries.user_id 
    AND up_summaries.permission IN ('view_own_summaries', 'access_summaries')
    AND up_summaries.is_active = true
WHERE u.role = 'סייר';
