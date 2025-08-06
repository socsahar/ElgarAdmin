-- Add closure reason field to events table
ALTER TABLE public.events 
ADD COLUMN closure_reason text,
ADD COLUMN closed_at timestamp with time zone,
ADD COLUMN closed_by_id uuid references public.users(id);

-- Add comment for documentation
COMMENT ON COLUMN public.events.closure_reason IS 'סיבת סגירת האירוע';
COMMENT ON COLUMN public.events.closed_at IS 'תאריך וזמן סגירת האירוע';
COMMENT ON COLUMN public.events.closed_by_id IS 'המשתמש שסגר את האירוע';
