
-- =============================================
-- Phase 3, Schritt 1: Core Label Tables + RLS
-- =============================================

-- 1. TABLE: labels
CREATE TABLE public.labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  description     TEXT,
  terms_conditions TEXT,
  stripe_account_id TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  ce_certificate_url TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLE: label_members
CREATE TABLE public.label_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id   UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'label_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(label_id, user_id)
);

-- 3. TABLE: label_designs
CREATE TABLE public.label_designs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id              UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  image_url             TEXT,
  glb_preview_url       TEXT,
  lens_width_mm         NUMERIC,
  bridge_width_mm       NUMERIC,
  temple_length_mm      NUMERIC,
  weight_g              NUMERIC,
  face_shapes           TEXT[] NOT NULL DEFAULT '{}',
  master_udi_di_base    TEXT NOT NULL,
  version               INTEGER NOT NULL DEFAULT 1,
  is_latest             BOOLEAN NOT NULL DEFAULT true,
  manufacturer_name     TEXT,
  manufacturer_address  TEXT,
  manufacturer_city     TEXT,
  manufacturer_atu      TEXT,
  manufacturer_contact  TEXT,
  mdr_responsible_person TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Helper functions (tables exist now)
CREATE OR REPLACE FUNCTION public.is_label_member(_user_id uuid, _label_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.label_members
    WHERE user_id = _user_id AND label_id = _label_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_label_admin(_user_id uuid, _label_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.label_members
    WHERE user_id = _user_id AND label_id = _label_id AND role = 'label_admin'
  )
$$;

-- 5. RLS: labels
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active labels"
  ON public.labels FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can insert labels"
  ON public.labels FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Label admins and platform admins can update labels"
  ON public.labels FOR UPDATE TO authenticated
  USING (is_label_admin(auth.uid(), id) OR has_role(auth.uid(), 'admin'))
  WITH CHECK (is_label_admin(auth.uid(), id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can delete labels"
  ON public.labels FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 6. RLS: label_members
ALTER TABLE public.label_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Label members and admins can view label_members"
  ON public.label_members FOR SELECT TO authenticated
  USING (is_label_member(auth.uid(), label_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can insert label_members"
  ON public.label_members FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can delete label_members"
  ON public.label_members FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 7. RLS: label_designs
ALTER TABLE public.label_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active label_designs"
  ON public.label_designs FOR SELECT TO authenticated
  USING (is_active = true OR is_label_member(auth.uid(), label_id) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Label members can insert label_designs"
  ON public.label_designs FOR INSERT TO authenticated
  WITH CHECK (is_label_member(auth.uid(), label_id));

CREATE POLICY "Label members can update label_designs"
  ON public.label_designs FOR UPDATE TO authenticated
  USING (is_label_member(auth.uid(), label_id))
  WITH CHECK (is_label_member(auth.uid(), label_id));

CREATE POLICY "Label admins can delete label_designs"
  ON public.label_designs FOR DELETE TO authenticated
  USING (is_label_admin(auth.uid(), label_id));

-- 8. Storage Bucket: label-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-assets', 'label-assets', true);

CREATE POLICY "Label assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'label-assets');

CREATE POLICY "Authenticated users can upload label assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'label-assets');

CREATE POLICY "Authenticated users can update label assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'label-assets');

CREATE POLICY "Authenticated users can delete label assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'label-assets');
