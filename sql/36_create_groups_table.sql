-- Create groups table
CREATE TABLE IF NOT EXISTS grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    lider_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add group_id to clients
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

-- Simple policies (matching likely existing lax policies for admin app)
CREATE POLICY "Enable read access for all authenticated users" ON grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for all authenticated users" ON grupos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for all authenticated users" ON grupos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for all authenticated users" ON grupos FOR DELETE TO authenticated USING (true);

