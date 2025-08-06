-- Add missing view_events_list permission for event management roles
-- This script adds the view_events_list permission to users who should be able to access the Events page

-- Add view_events_list permission to existing מפקד משל"ט users
INSERT INTO public.user_permissions (user_id, permission, is_active, granted_by_id, granted_at)
SELECT 
    u.id,
    'view_events_list',
    true,
    u.id, -- Self-granted for system update
    NOW()
FROM public.users u
WHERE u.role = 'מפקד משל"ט'
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = 'view_events_list'
);

-- Add view_events_list permission to existing מוקדן users
INSERT INTO public.user_permissions (user_id, permission, is_active, granted_by_id, granted_at)
SELECT 
    u.id,
    'view_events_list',
    true,
    u.id, -- Self-granted for system update
    NOW()
FROM public.users u
WHERE u.role = 'מוקדן'
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = 'view_events_list'
);

-- Add view_events_list permission to existing פיקוד יחידה users
INSERT INTO public.user_permissions (user_id, permission, is_active, granted_by_id, granted_at)
SELECT 
    u.id,
    'view_events_list',
    true,
    u.id, -- Self-granted for system update
    NOW()
FROM public.users u
WHERE u.role = 'פיקוד יחידה'
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = 'view_events_list'
);

-- Add comprehensive permissions to existing מפתח users
INSERT INTO public.user_permissions (user_id, permission, is_active, granted_by_id, granted_at)
SELECT 
    u.id,
    p.permission,
    true,
    u.id, -- Self-granted for system update
    NOW()
FROM public.users u
CROSS JOIN (
    VALUES 
    ('גישה לאתר'),
    ('can_connect_to_website'),
    ('view_dashboard_events'),
    ('view_events_list'),
    ('view_users_info'),
    ('manage_own_action_reports'),
    ('view_own_summaries')
) AS p(permission)
WHERE u.role = 'מפתח'
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = p.permission
);

-- Add comprehensive permissions to existing אדמין users
INSERT INTO public.user_permissions (user_id, permission, is_active, granted_by_id, granted_at)
SELECT 
    u.id,
    p.permission,
    true,
    u.id, -- Self-granted for system update
    NOW()
FROM public.users u
CROSS JOIN (
    VALUES 
    ('גישה לאתר'),
    ('can_connect_to_website'),
    ('view_dashboard_events'),
    ('view_events_list'),
    ('view_users_info'),
    ('manage_own_action_reports'),
    ('view_own_summaries')
) AS p(permission)
WHERE u.role = 'אדמין'
AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = u.id 
    AND up.permission = p.permission
);

-- Verify the changes
SELECT 
    'Events Access Summary' as info,
    u.role,
    u.full_name,
    u.username,
    CASE WHEN up.permission IS NOT NULL THEN 'YES' ELSE 'NO' END as has_events_access
FROM public.users u
LEFT JOIN public.user_permissions up ON u.id = up.user_id 
    AND up.permission = 'view_events_list' 
    AND up.is_active = true
WHERE u.role IN ('מפקד משל"ט', 'מוקדן', 'פיקוד יחידה', 'אדמין', 'מפתח')
ORDER BY 
    CASE u.role
        WHEN 'מפתח' THEN 1
        WHEN 'אדמין' THEN 2  
        WHEN 'פיקוד יחידה' THEN 3
        WHEN 'מפקד משל"ט' THEN 4
        WHEN 'מוקדן' THEN 5
        ELSE 6
    END,
    u.full_name;
