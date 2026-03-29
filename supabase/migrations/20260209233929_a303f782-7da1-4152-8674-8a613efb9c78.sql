
-- Add dimension and face shape columns to designs
ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS face_shapes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bridge_width_mm numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lens_width_mm numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS temple_length_mm numeric DEFAULT NULL;

-- Create favorites table
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  session_name text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, design_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own favorites
CREATE POLICY "Users manage own favorites"
  ON public.favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
