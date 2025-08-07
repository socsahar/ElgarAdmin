-- Remove unwanted default permissions from סייר role
-- This prevents future סייר users from getting these permissions automatically

-- Remove view_events_list from default permissions for סייר
DELETE FROM public.role_default_permissions 
WHERE role = 'סייר' 
AND permission = 'view_events_list';

-- Remove view_own_summaries from default permissions for סייר
DELETE FROM public.role_default_permissions 
WHERE role = 'סייר' 
AND permission = 'view_own_summaries';

-- Remove access_summaries from default permissions for סייר
DELETE FROM public.role_default_permissions 
WHERE role = 'סייר' 
AND permission = 'access_summaries';

-- Verify the changes - show remaining default permissions for סייר
SELECT 
    'Current Default Permissions for סייר' as info,
    permission,
    is_default
FROM public.role_default_permissions 
WHERE role = 'סייר'
ORDER BY permission;
