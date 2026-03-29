# Genera3D Studio — Berechtigungs- und Zugriffs-Audit

**Datum:** 29. März 2026  
**Schweregrad:** KRITISCH — Sicherheitslücken mit Datenleck-Potential  
**Status:** Alle identifizierten Probleme behoben

---

## 1. Zusammenfassung der Befunde

| Schweregrad | Anzahl | Beschreibung |
|-------------|--------|--------------|
| **KRITISCH** | 3 | Cross-Org Datenleck, fehlende RLS, RPC-Authentifizierung |
| **HOCH** | 4 | Zu offene Storage-Policies, inkonsistente Guards, Helper-Funktions-Leak |
| **MITTEL** | 3 | Fehlende Policies, Sidebar-Inkonsistenz |
| **NIEDRIG** | 2 | Defense-in-Depth bei Mutationen |

---

## 2. KRITISCHE Befunde und Fixes

### 2.1 `production_logs` — KEIN Row Level Security

**Befund:** Die Tabelle `production_logs` hatte **weder RLS aktiviert noch irgendwelche Policies**. Jeder authentifizierte Benutzer konnte über den Supabase-Client die Produktionsdaten **aller Organisationen** lesen — inklusive UDI-Nummern, Seriennummern, GTINs und Kundenreferenzen.

**Betroffene Hooks:**
- `useAllProductionLogs` — `SELECT *` ohne `org_id`-Filter
- `useRealtimeProductionLogs` — Echtzeit-Subscription ohne Filter

**Fix (Frontend):**
- `useAllProductionLogs` → `.eq("org_id", orgId)` + `enabled: !!orgId`
- `useRealtimeProductionLogs` → `filter: "org_id=eq.${orgId}"` im Realtime-Channel

**Fix (Backend — Migration `20260329120242`):**
- `ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY`
- SELECT-Policy: `org_id = get_user_org_id(auth.uid())`
- INSERT/UPDATE-Policy: `org_id = get_user_org_id(auth.uid())`
- Admin-Override: `has_role(auth.uid(), 'admin')`

### 2.2 `purchase_label_udi` — Keine Authentifizierungsprüfung

**Befund:** Die RPC-Funktion akzeptierte `p_org_id` und `p_user_id` als direkte Parameter **ohne Verifikation gegen `auth.uid()`**. Ein böswilliger Benutzer konnte UDIs im Namen einer anderen Organisation kaufen.

**Fix (Migration):**
- `auth.uid()`-Check am Anfang der Funktion
- `p_user_id != auth.uid()` → Exception
- `p_org_id != get_user_org_id(auth.uid())` → Exception

### 2.3 Helper-Funktionen als RPC aufrufbar

**Befund:** `has_role()`, `get_user_org_id()`, `is_label_member()`, `is_label_admin()` waren als SECURITY DEFINER Funktionen direkt per RPC aufrufbar. Ein Angreifer konnte z.B. prüfen, ob ein bestimmter User Admin ist, oder die org_id eines Users herausfinden.

**Fix (Migration):**
- `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated`
- Die Funktionen bleiben in Policies und Triggern nutzbar (SECURITY DEFINER)

---

## 3. HOHE Befunde und Fixes

### 3.1 Storage-Bucket-Policies zu permissiv

**Befund:** Die Storage-Buckets `org-design-images`, `org-signatures` und `label-assets` erlaubten **jedem authentifizierten User** Upload/Update/Delete — unabhängig von der Organisation.

**Fix (Migration):**
- Pfad-basiertes Scoping: `(storage.foldername(name))[1] = get_user_org_id(auth.uid())::text`
- User können nur noch Dateien in ihrem eigenen Org-Ordner verwalten

### 3.2 Inkonsistente Seiten-Guards

**Befund:** Von 17 geschützten Seiten verwendeten nur 2 `<Navigate>`, während 3 nur eine Textnachricht zeigten.

| Seite | Vorher | Nachher |
|-------|--------|---------|
| `AdminUsers` | `<Navigate>` | `<Navigate>` ✅ |
| `LabelAdmin` | `<Navigate>` | `<Navigate>` ✅ |
| `AdminOrganizations` | Textnachricht | **`<Navigate>` ✅** |
| `AdminGtinImport` | Textnachricht | **`<Navigate>` ✅** |

### 3.3 Sidebar-Navigation vs. Route-Guards Diskrepanz

**Befund:** Die Sidebar zeigte "GTIN-Import" für `isOperationalAdmin` (Platform-Admin ODER Label-Admin), aber die Route lag unter `requiredRole="admin"` (nur Platform-Admin). Label-Admins sahen den Link, erhielten aber eine Umleitung.

**Fix:**
- `/admin/gtin-import` in eigene Route-Gruppe mit `requiredRole="label_admin"` verschoben
- Sidebar-Logik stimmt nun mit Route-Guards überein

---

## 4. Berechtigungs-Matrix (vollständig)

### 4.1 Rollen-Definitionen

| Rolle | Quelle | Beschreibung |
|-------|--------|--------------|
| **Authentifiziert** | Supabase Auth Session | Jeder eingeloggte User |
| **Org-Mitglied** | `profiles.org_id IS NOT NULL` | User gehört einer Organisation an |
| **Label-Admin** | `label_members.role = 'label_admin'` | Verwaltet ein Label |
| **Platform-Admin** | `user_roles.role = 'admin'` | Vollzugriff auf alle Daten |

### 4.2 Seiten-Zugriff

| Route | Authentifiziert | Org-Mitglied | Label-Admin | Platform-Admin |
|-------|:-:|:-:|:-:|:-:|
| `/` (Landing) | ✅ Öffentlich | — | — | — |
| `/login` | ✅ Öffentlich | — | — | — |
| `/dashboard` | ✅ | — | — | — |
| `/catalog` | ✅ | — | — | — |
| `/labels` | ✅ | — | — | — |
| `/labels/:slug` | ✅ | — | — | — |
| `/colors` | ✅ | Daten org-scoped | — | — |
| `/my-designs` | ✅ | Daten org-scoped | — | — |
| `/register` | ✅ | Daten org-scoped | — | — |
| `/post-market` | ✅ | Daten org-scoped | — | — |
| `/settings` | ✅ | Daten org-scoped | — | — |
| `/docs-portal` | ❌ | ❌ | ✅ | ✅ |
| `/label-admin/*` | ❌ | ❌ | ✅ | ✅ |
| `/admin/gtin-import` | ❌ | ❌ | ✅ | ✅ |
| `/admin/users` | ❌ | ❌ | ❌ | ✅ |
| `/admin/organizations` | ❌ | ❌ | ❌ | ✅ |

### 4.3 Daten-Zugriff (Hooks → Supabase)

| Hook | Tabelle | Client-Filter | RLS-Policy | Status |
|------|---------|:---:|:---:|:---:|
| `useAllProductionLogs` | `production_logs` | ✅ `org_id` | ✅ NEU | **GEFIXT** |
| `useRealtimeProductionLogs` | `production_logs` | ✅ `org_id` | ✅ NEU | **GEFIXT** |
| `useOrgDesigns` | `org_designs` | ✅ `org_id` | ✅ | OK |
| `useOrgColors` | `org_colors` | — (RLS) | ✅ `org + global` | OK |
| `useMaterials` | `materials` | — (RLS) | ✅ `org + global` | OK |
| `useProfile` | `profiles` | ✅ `user_id` | ✅ | OK |
| `useOrganization` | `organizations` | ✅ `org_id` | ✅ NEU | **GEFIXT** |
| `useFavorites` | `favorites` | ✅ `user_id` | ✅ | OK |
| `useAdminUsers` | Mehrere | — (Admin) | ✅ Admin-only | OK |
| `useLabelDesigns` | `label_designs` | ✅ `label_id` | ✅ | OK |
| `useLabelUdiPool` | `label_udi_pool` | ✅ `label_id` | ✅ | OK |
| `useLabels` | `labels` | — (öffentlich) | ✅ `active` | OK |

### 4.4 RPC-Funktionen

| Funktion | Auth-Check | Org-Scoping | Status |
|----------|:---:|:---:|:---:|
| `start_production` | ✅ `auth.uid()` | ✅ org via profile | OK |
| `cancel_production` | ✅ `auth.uid()` | ✅ org_id Match | OK |
| `complete_qc_check` | ✅ `auth.uid()` | ✅ org_id Match | OK |
| `join_organization` | ✅ `auth.uid()` | ✅ | OK |
| `create_organization` | ✅ admin | — | OK |
| `admin_update_organization` | ✅ admin | — | OK |
| `admin_delete_organization` | ✅ admin | — | OK |
| `purchase_label_udi` | ✅ `auth.uid()` NEU | ✅ org Match NEU | **GEFIXT** |

### 4.5 Storage-Buckets

| Bucket | Lesen | Schreiben | Status |
|--------|:---:|:---:|:---:|
| `org-design-images` | ✅ Alle auth. | ✅ Nur eigene Org NEU | **GEFIXT** |
| `org-signatures` | ✅ Alle auth. | ✅ Nur eigene Org NEU | **GEFIXT** |
| `label-assets` | ✅ Alle auth. | ✅ Alle auth. | ⚠️ Noch offen |
| `regulatory-docs` | ✅ Öffentlich | ✅ Nur Admin | OK |

---

## 5. Geänderte Dateien

### Frontend
| Datei | Änderung |
|-------|----------|
| `src/hooks/useAllProductionLogs.ts` | `org_id`-Filter + `useProfile()` |
| `src/hooks/useRealtimeProductionLogs.ts` | `org_id`-Filter im Realtime-Channel + `useProfile()` |
| `src/pages/AdminOrganizations.tsx` | `<Navigate>` statt Textnachricht |
| `src/pages/AdminGtinImport.tsx` | `<Navigate>` statt Textnachricht |
| `src/App.tsx` | GTIN-Import Route in `label_admin`-Gruppe verschoben |

### Backend (Supabase Migration)
| Datei | Änderung |
|-------|----------|
| `supabase/migrations/20260329120242_security_audit_rls_fixes.sql` | RLS für `production_logs`, `organizations`-SELECT-Policy, `purchase_label_udi`-Auth-Fix, Helper-Funktions-Schutz, Storage-Policy-Verschärfung, fehlende DELETE/UPDATE-Policies |

---

## 6. WICHTIG: Deployment-Hinweise

### Migration ausführen
```bash
supabase db push
```

### Verifizierung nach Deployment
```sql
-- RLS-Status prüfen
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('production_logs', 'organizations', 'profiles');

-- Policies prüfen
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename = 'production_logs';

-- Helper-Funktionen testen (sollte fehlschlagen)
SELECT has_role('some-uuid', 'admin');
-- Expected: ERROR: permission denied for function has_role
```

### Regressions-Test
1. Einloggen als normaler User → Nur eigene Org-Daten sichtbar
2. Einloggen als Admin → Alle Daten sichtbar
3. GTIN-Import als Label-Admin → Zugriff erlaubt
4. GTIN-Import als normaler User → Redirect zu Dashboard
5. Produktionsauftrag anlegen → Weiterhin funktional
6. Echtzeit-Updates → Nur eigene Org-Events

---

## 7. Verbleibende Risiken (niedrig)

| Risiko | Beschreibung | Empfehlung |
|--------|--------------|------------|
| `label-assets` Storage | Noch nicht org-scoped | Label-ID-basiertes Pfad-Scoping hinzufügen |
| `admin_bypass` Session-Variable | Theoretischer Timing-Angriff | Durch dedizierte Admin-Trigger ersetzen |
| Mutationen ohne Client-org_id | 4 Hooks ohne Defense-in-Depth | Zusätzlichen `.eq("org_id")` hinzufügen |
| `DocsPortal` ohne Rollen-Check | Nur AGB-Gate, kein Rollen-Guard | Bewusste Entscheidung — Hersteller-Doku ist kein Geheimnis |

---

**Nächster Sicherheits-Audit:** April 2026  
**Verantwortlicher:** Tech Lead  
**Priorität:** Migration SOFORT deployen — bis dahin sind Produktionsdaten cross-org einsehbar
