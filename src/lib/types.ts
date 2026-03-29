import type { Json } from "@/integrations/supabase/types";

/** A production_log row with denormalized design data */
export interface ProductionLogWithDesign {
  id: string;
  org_id: string | null;
  design_id: string | null;
  user_id: string | null;
  mode: string | null;
  assigned_udi_pi: string | null;
  full_udi_string: string | null;
  status: string | null;
  color: string | null;
  customer_ref: string | null;
  created_at: string | null;
  assigned_gtin: string | null;
  material_id: string | null;
  design_name: string | null;
  design_udi_di_base: string | null;
  design_version: number | null;
  color_name: string | null;
}

/** Return value from start_production RPC */
export interface StartProductionResult {
  success: boolean;
  log_id: string;
  udi_pi: string;
  full_gs1: string | null;
  gtin: string | null;
  mode: string;
}

/** Return value from cancel_production RPC */
export interface CancelProductionResult {
  success: boolean;
  gtin_returned: boolean;
}

/** Return value from complete_qc_check RPC */
export interface CompleteQcCheckResult {
  success: boolean;
  qc_id: string;
  passed: boolean;
}

/** Organization settings stored as JSONB */
export interface OrgSettings {
  language?: string;
  printer_type?: string;
  g1_serial?: string;
  f1_serial?: string;
  c1_serial?: string;
  address?: string;
  atu_number?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  city?: string;
  mdr_responsible_person?: string;
  ceo_name?: string;
  srn?: string;
  signature_url?: string;
  mdr_signature_url?: string;
  logo_url?: string;
  [key: string]: string | undefined;
}

/** Helper to safely parse org settings from Json */
export function parseOrgSettings(settings: Json | null | undefined): OrgSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  return settings as unknown as OrgSettings;
}
