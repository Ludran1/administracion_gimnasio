-- FIX RLS FOR CLIENT ACCESS TO RUTINAS
-- The previous policies isolated data for Tenants (Admins/Staff) but blocked Clients from seeing their own data.
-- We need to add policies that allow authenticated users (Clients) to see routines linked to their email/id.

-- 1. RUTINAS
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can see their own routines" ON public.rutinas
    FOR SELECT
    USING (
        -- 1. Routines assigned to the client (matched by email -> client_id)
        cliente_id IN (
            SELECT id FROM public.clientes 
            WHERE email = auth.jwt() ->> 'email'
        )
        OR
        -- 2. Global/Public routines (null cliente_id)
        -- Optional: you might want to restrict global routines to the client's tenant if desired, 
        -- but usually global means global or null. 
        -- If tenant_id is used for global routines, we should check tenant matches client's tenant.
        (cliente_id IS NULL)
    );

-- 2. RUTINA_EJERCICIOS (Permissions cascade logic)
-- Users should see exercises if they can see the parent routine
ALTER TABLE public.rutina_ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can see exercises of visible routines" ON public.rutina_ejercicios
    FOR SELECT
    USING (
        rutina_id IN (
            SELECT id FROM public.rutinas
        )
        -- Note: The subquery "id IN (SELECT id FROM rutinas)" implies "visible rutinas" 
        -- because RLS is applied to the subquery on 'rutinas' automatically.
        -- So this simply says: "If verify_rutina_visibility(rutina_id) is true"
    );

-- 3. EJERCICIOS (Reference data)
-- Clients need to see the Exercise definitions (names, images) referenced by Rutina_Ejercicios
ALTER TABLE public.ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can see exercises" ON public.ejercicios
    FOR SELECT
    USING (
        -- Allow read access to all exercises (or restrict if needed)
        -- For now, allow all authenticated users to see exercises repository
        auth.role() = 'authenticated'
    );
