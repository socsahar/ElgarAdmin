-- Add new vehicle permission delegation capability
-- This allows מפתח to delegate permission management to trusted users

-- Add the new permission with Hebrew label
INSERT INTO public.vehicle_permissions (permission, label_hebrew, description_hebrew) 
VALUES (
    'vehicle_delegate_permissions',
    'מתן הרשאה למתן הרשאות',
    'יכולת להעניק הרשאות עריכה, מחיקה והוספת רכבים למשתמשים אחרים'
) ON CONFLICT (permission) DO NOTHING;

-- Verify the new permission was added
SELECT * FROM public.vehicle_permissions WHERE permission = 'vehicle_delegate_permissions';
