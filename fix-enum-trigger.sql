-- Fix ENUM comparison issue in trigger function
-- This fixes the "operator does not exist: permission_type = text" error

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
    -- Cast ENUM to text for comparison with text array
    IF user_role = 'סייר' AND NEW.permission::text = ANY(unauthorized_permissions) THEN
        RAISE EXCEPTION 'Cannot grant permission "%" to סייר users. This permission is not authorized for volunteers.', NEW.permission;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Trigger function updated successfully - ENUM comparison fixed' AS result;
