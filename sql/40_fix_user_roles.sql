-- Link user adrianolujan2004@gmail.com to the CORRECT main tenant
-- Tenant ID from screenshot: 92e77f75-c353-4654-ac7f-57e41cf4b741

DO $$
DECLARE
    target_user_id uuid;
    target_tenant_id uuid := '92e77f75-c353-4654-ac7f-57e41cf4b741';
    target_email text := 'adrianolujan2004@gmail.com';
BEGIN
    -- 1. Find the user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User % NOT FOUND in auth.users. Please create the user first or check the email.', target_email;
    END IF;

    RAISE NOTICE 'Found User ID: % for email %', target_user_id, target_email;

    -- 2. Clean up existing roles for this user to avoid conflicts
    DELETE FROM public.user_roles WHERE user_id = target_user_id;

    -- 3. Insert the new relationship
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (target_user_id, target_tenant_id, 'admin');

    RAISE NOTICE '✅ Successfully linked user % to tenant %', target_email, target_tenant_id;
END $$;
