-- Check current constraints on message_groups table
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.message_groups'::regclass;

-- Drop the problematic unique constraint on id_group if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_groups_id_group_unique' 
        AND conrelid = 'public.message_groups'::regclass
    ) THEN
        ALTER TABLE public.message_groups DROP CONSTRAINT message_groups_id_group_unique;
    END IF;
END $$;

-- Ensure we have the correct unique constraint on (id_group, id_user) 
-- which allows multiple users per group but prevents duplicate user entries in same group
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'message_groups' 
        AND indexname = 'ux_message_groups_group_user'
    ) THEN
        CREATE UNIQUE INDEX ux_message_groups_group_user ON public.message_groups (id_group, id_user);
    END IF;
END $$;