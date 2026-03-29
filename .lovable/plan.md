

# Plan: Free-Design-Hersteller, GTIN-Anzeige, PDF-Vereinheitlichung und Daten-Reset

## 4 Probleme — 4 Loesungen

### Problem 1: Free Designs zeigen falsche Firma auf dem Label
`ProductionModal` gibt immer `org?.name` (z.B. "Sachsenweger") als `orgName` weiter. Bei Free Designs muss aber **GENERA PRINTER GmbH** stehen.

**Loesung**: 
- `ProductionModal`: Wenn das Design ein Free Design ist (nicht in `orgDesigns`), Hersteller-Info aus der `designs`-Tabelle laden statt aus `useOrganization()`
- Dazu: DB-Migration zum Backfill der `designs`-Tabelle mit Genera-Herstellerdaten (`manufacturer_name`, `manufacturer_address`, `manufacturer_city`, `manufacturer_contact`)
- `ProductionModal` fragt per Supabase-Query die `designs`-Tabelle ab wenn `designId` nicht in `orgDesigns` ist

### Problem 2: UdiDetailSheet zeigt `design_udi_di_base` als "GTIN" — falsche Beschriftung
Die echte GTIN liegt in `assigned_gtin` (z.B. `09120143510011`), aber das Sheet-Interface hat kein `assigned_gtin`-Feld.

**Loesung**:
- `UdiDetailSheet` Interface um `assigned_gtin` erweitern
- Feld "GTIN" zeigt `assigned_gtin` an
- Neues separates Feld "UDI-DI Basis" zeigt `design_udi_di_base`

### Problem 3: PDF im Produktionsregister hat anderes Layout als Konfigurationsvorschau
Zwei separate PDF-Generierungen mit unterschiedlichem Layout.

**Loesung**:
- Gemeinsame PDF-Helper-Funktion in `src/lib/generateLabelPdf.ts`
- Beide Stellen (`UdiLabelPreview` und `UdiDetailSheet`) nutzen denselben Helper
- Einheitliches Layout: QR links, AI-Breakdown rechts, Firmendaten oben

### Problem 4: Sachsenweger-Testdaten zuruecksetzen und `org_designs`-GTIN-Konflikt
Sachsenweger hat org_designs deren `fixed_gtin` mit bestehenden Genera-Logs kollidiert. Test-Produktionslogs muessen storniert werden.

**Loesung**:
- Data-Korrektur: Genera-Produktionslogs fuer Brusset-Designs auf `cancelled` setzen damit der Counter zurueckgesetzt wird
- Sachsenweger-Logs sind bereits leer (durch vorherige Migration)
- GTIN-Unique-Index bleibt bestehen (regulatorisch korrekt)

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| DB-Migration (Data) | Backfill `designs.manufacturer_*` mit Genera-Daten |
| DB-Migration (Data) | Genera Brusset-Test-Logs auf cancelled setzen |
| `src/lib/generateLabelPdf.ts` | **Neu**: Gemeinsamer PDF-Helper |
| `src/components/ProductionModal.tsx` | Free-Design-Erkennung, Hersteller aus `designs`-Tabelle |
| `src/components/UdiDetailSheet.tsx` | `assigned_gtin` ins Interface, korrekte Labels, shared PDF |
| `src/components/UdiLabelPreview.tsx` | Shared PDF-Helper nutzen |

## Ergebnis
- Free Designs zeigen "GENERA PRINTER GmbH" als Hersteller
- GTIN und UDI-DI korrekt getrennt im Produktionsregister
- PDF identisch bei Konfiguration und im Register
- Test-Counter zurueckgesetzt

