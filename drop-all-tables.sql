-- SIMPLE DROP ALL TABLES SCRIPT
-- Run this in your Supabase SQL Editor to drop everything

-- Drop all tables (regardless of what they are)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies first
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
    
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || r.tablename || ' CASCADE';
    END LOOP;
    
    -- Drop all custom types
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') 
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || r.typname || ' CASCADE';
    END LOOP;
END $$;

SELECT 'All tables dropped! Ready for fresh install.' as message;
