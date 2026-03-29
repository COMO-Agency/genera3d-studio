
-- 1a. Rename "Genera Eyewear" to "Genera3D" and update slug
UPDATE public.labels SET name = 'Genera3D', slug = 'genera3d' WHERE slug = 'genera-eyewear';

-- 1b. Insert new labels
INSERT INTO public.labels (name, slug) VALUES
  ('Leinz', 'leinz'),
  ('Raydient', 'raydient'),
  ('Optik Burger', 'optik-burger')
ON CONFLICT DO NOTHING;

-- 1c. Assign superadmin role to superadmin@genera.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('69e9e4cb-8371-4c34-acd6-c827f85b0164', 'admin')
ON CONFLICT DO NOTHING;

-- 2. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  RETURN NEW;
END;
$$;

-- Backfill existing users' emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. RLS: Platform-Admins can read ALL profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 4. RLS: Platform-Admins can manage user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- 5. RLS: Platform-Admins can update label_members (currently missing)
CREATE POLICY "Platform admins can update label_members"
ON public.label_members
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));
