# Genera3D — Feature-Dokumentation

> Diese Datei dokumentiert alle aktuellen Funktionen der App. Bei jeder neuen Funktion wird sie aktualisiert.

---

## 1. Authentifizierung & Onboarding

- **Login/Signup** — E-Mail + Passwort mit separatem "Account erstellen" Modus und Passwort-Bestätigung
- **Magic Link** — Passwortloser Login via E-Mail-Link
- **Session Persistence** — Automatische Session-Wiederherstellung
- **Browser-Autofill** — `autoComplete`-Attribute + Credential Management API für Passwort-Speichern in SPAs
- **Org Join** — Organisation beitreten via License Key (RPC `join_organization`) mit Spinner-Feedback
- **Onboarding Banner** — Dashboard-Hinweis mit kopierbarem Demo License Key `G3D-7F42-9B1E-3C8D`
- **Dynamischer Seitentitel** — Jede Route setzt `document.title` (z.B. "Dashboard | Genera3D")

## 2. Dashboard

- **Typewriter Greeting** — Dynamische Begrüßung je nach Tageszeit + Vorname
- **Dynamischer Subtitle** — Zeigt Anzahl heutiger Aufträge oder Motivationstext
- **KPI Cards** — Heute produziert, GTIN-Pool-Status, Material — komplett auf Deutsch
- **Sparklines** — 7-Tage-Trend mit unique Gradient-IDs (useId)
- **Quick Actions** — "Rahmen anlegen", "Historie anzeigen", "Post-Market"
- **Recent Activity** — Letzte 8 Production Logs mit Status, Modus, Farbe (denormalisiert)
- **Error-Recovery** — Verbindungsfehler-Alert mit "Erneut versuchen" Button

## 3. Produktionsmodi (Brillentypen)

Es gibt genau 3 Produktionsmodi:

| Modus (DB-Wert) | Bezeichnung | CE-Zertifikat |
|---|---|---|
| `optical` | Optische Brille (MDR) | MDR |
| `optical_sun` | Optische Sonnenbrille (MDR+PSA) | MDR + PSA |
| `sunglasses` | Sonnenbrille (PSA) | nur PSA |

- Jeder Produktionsauftrag erfordert ein Design und einen Modus
- Default-Modus: `optical`

## 4. Design-System (org_designs)

Alle Designs werden als organisationseigene Designs (`org_designs`) verwaltet:

- **Kollektionen** — Brusset, Philipp Haffmans, Frame Shaper
- **Konstruktionsweisen** — Full Frame (Digital Eyewear) und Combo Frame (Digital Eyewear + Metal Temples)
- **Größen** — S, M, L, One Size
- **Kastenmaße** — Glasbreite, Stegbreite, Bügellänge (numerisch, mm)
- **Feste GTINs** — Jedes Design hat eine fest zugewiesene GTIN (UNIQUE)
- **Serial-Präfix** — Organisationsspezifisches Präfix für Seriennummern (z.B. ME01S, PHDe, FS08)
- **UDI-DI** — `master_udi_di_base` pro Design, konstruktionsabhängig
- **Bild-Upload** — Optional, pro Design
- **Design-Bearbeitung** — Edit-Sheet in MyDesigns zum nachträglichen Eintragen von Kastenmaßen etc.

### Importierte Designs (50 Stück)

| Kollektion | Anzahl | Konstruktion | UDI-DI |
|---|---|---|---|
| Brusset Full Frame (ME01-ME07 × S/M/L) | 21 | full_frame | 912014351DE-Full4J |
| Brusset Metal Temple (ME01-ME07 × One Size) | 7 | combo_frame | individuell (W9-W15) |
| Philipp Haffmans (12 Designs × One Size) | 12 | full_frame | 912014351DE-Full4J |
| Frame Shaper (ME08-ME17 × One Size) | 10 | full_frame | 912014351DE-Full4J |

## 5. GTIN-System

- **GTIN = UDI-DI** — Globale Artikelnummer von GS1, weltweit eindeutig
- **Feste GTINs** — Designs mit `fixed_gtin` nutzen ihre eigene GTIN (kein Pool-Verbrauch)
- **GTIN-Pool** — Fallback: Freie GTINs aus dem Pool für Designs ohne feste GTIN
- **GS1-String** — Format: `(01)0[GTIN](11)YYMMDD(21)[SerialPrefix]-[FarbCode][Counter]`
- **Seriennummer** — `[Prefix]-[ColorCode][0001-XXXX]`, z.B. `ME01S-BK0001`
- **Farbcode** — Aus `org_colors.color_code` (2 Zeichen), Fallback: erste 2 Buchstaben des Farbnamens
- **Eindeutigkeit** — Kombination GTIN + Datum + Serial ist immer einzigartig (globaler Counter)
- **Stornierung** — Pool-GTINs werden zurückgegeben; feste GTINs haben keine Pool-Interaktion
- **GTIN-Import** — SuperAdmins können per CSV/Textfeld GTINs importieren
- **GTIN-Verzeichnis** — Durchsuchbare Übersicht aller vergebenen GTINs unter `/udi`

## 6. GS1 QR-Code

- **QR-Code statt DataMatrix** — Designs mit fester GTIN erhalten einen GS1 QR-Code
- **bwip-js** — Unterstützt sowohl `gs1datamatrix` als auch `gs1qrcode` via `type`-Prop
- **UDI-Label** — Vorschau und PDF-Export mit QR-Code
- **On-the-fly Generierung** — QR-Code wird bei der Produktion live aus GTIN + Datum + Serial erzeugt

## 7. Katalog

- **Org-Designs** — Alle organisationseigenen Designs im Katalog
- **Kollektions-Tabs** — Automatische Gruppierung nach `collection`
- **"Alle" Tab** — Zeigt alle Designs auf einen Blick
- **Favoriten** — Tab mit favorisierten Designs
- **Design Cards** — Name, Gewicht, Kollektion, Größe, UDI-DI
- **Suche** — Echtzeit-Filterung nach Design-Name
- **Deep-Linking** — URL-Parameter `?design=ID` öffnet automatisch das Detail-Sheet
- **Konfigurieren & Drucken** — Button öffnet Production Modal
- **CE-Zertifikat** — Button auf jeder Design-Karte für direkten PDF-Download

## 8. Druckauftrag-Modal

- **Farbauswahl** — Aus Org-Farbkatalog (`org_colors`, CMYK-basiert)
- **Modus-Auswahl** — optical / optical_sun / sunglasses (3 Buttons)
- **Kundenreferenz** — Freitext-Eingabe für Bestellreferenz
- **Bestätigungsschritt** — Warnung vor GTIN-Verbrauch mit Abbrechen/Bestätigen
- **GS1-Label Vorschau** — Nach erfolgreichem Job: Label mit GTIN, GS1 String, QR-Code

## 9. EU-Konformitätserklärung (CE-Zertifikat)

PDF-Generator gemäß MDR 2017/745, basierend auf DOCX-Vorlagen:

- **Zwei Varianten** — DE-Full (Full Frame) und DE-ME-Full (Combo Frame), automatisch nach `construction_type`
- **Dynamische Felder** — Modell, Farbe, UDI-DI, Herstellerdaten
- **Konfigurierbares Datum** — Date-Picker statt automatisch "heute"
- **SRN** — Single Registration Number in Org-Settings
- **Unterschrift** — PNG-Upload in `org-signatures` Bucket, eingebettet im PDF
- **MDR-Verantwortlicher** — Separates Feld für Art. 15 MDR
- **Doppel-Signatur** — CEO + MDR-Verantwortliche Person
- **Normen** — MDR 2017/745, REACH, EN ISO 12870
- **5 Jahre Gültigkeit** — Automatisch berechnet
- **PSA-Zertifikat** — Separate Generierung für Sonnenbrillen (`generatePsaCertificatePdf`)
- **Design-Quelle** — Ausschließlich `org_designs` (keine globale `designs`-Tabelle)

## 10. Produktionshistorie

- **Tabellen-Ansicht** — Design, Status, Modus, Farbe, Kundenreferenz, GTIN, GS1 String, Zeitstempel
- **Timeline-Ansicht** — Chronologische Darstellung mit Status-Dots
- **Suche** — Nach Design, GTIN oder Seriennummer
- **Filter** — Status, Modus, Zeitraum
- **Pagination** — Client-seitig, 20 Einträge pro Seite
- **CSV Export** — Vollständiger Export mit deutschen Spaltenköpfen
- **QC-Check** — Qualitätskontrolle mit Checkliste pro Rahmen
- **Stornierung** — Pool-GTINs werden zurückgelegt (kein Credit-System)
- **Denormalisierte Daten** — `design_name`, `color_name`, `design_udi_di_base` direkt im Log

## 11. Farbkatalog

- **CMYK-Farbdefinitionen** — Jede Organisation verwaltet eigene Farben
- **Farbcode** — 2-Zeichen-Kürzel pro Farbe (z.B. BK, TR) für Seriennummern
- **Opazität** — Opak/Transparent/Transluzent
- **Farbvorschau** — Hex-Preview aus CMYK-Werten
- **CMYK-Indikator** — Visuelle Darstellung der Farbzusammensetzung

## 12. Post-Market-Überwachung

- **Vorfallmeldung** — Rückgaben, Reklamationen, Bruch-Vorfälle
- **Design-Zuordnung** — Design-Name aus denormalisierten Production-Log-Daten
- **Status-Tracking** — Offen/Gelöst mit Lösungsbemerkung
- **MDR-konform** — Dokumentation gemäß regulatorischen Anforderungen

## 13. Multi-Label-System

- **Label-Shop** — Übersicht aller verfügbaren Labels/Brands
- **Label-Subscription** — Optiker können Labels abonnieren (mit T&C-Akzeptanz)
- **Label-Admin** — Label-Admins verwalten eigene Designs und UDI-Pools
- **Label-Designs** — Eigene Designkollektionen pro Label

## 14. Dokumenten-Portal

- **AGB-Gate** — Hersteller müssen AGB akzeptieren bevor sie Zugang erhalten
- **AGB-Persistenz** — Akzeptanz in `profiles.docs_tc_accepted_at` gespeichert
- **Dokumente** — Technische Doku, Risikomanagement, Gebrauchsanweisung, EU-Konformitätserklärung
- **Nur für Hersteller** — Sichtbar für Label-Admins und Platform-Admins

## 15. Benachrichtigungen

- **Material-Warnungen** — Wenn Material unter 20% fällt
- **Produktionslogs** — Letzte 5 Produktionen mit Design-Name (denormalisiert)
- **Status-Mapping** — QC bestanden, QC ausstehend, QC fehlgeschlagen, storniert, gedruckt
- **Gelesen/Ungelesen** — LocalStorage-basierte Read-Markierung

## 16. Administration

- **Admin: Benutzer** — Rollen zuweisen (admin/user), Label-Mitgliedschaften verwalten
- **Admin: GTIN-Import** — Bulk-Import von GTINs per CSV/Textarea für Organisationen und Labels

## 17. Navigation & UX

- **Sidebar** — Desktop: collapsible mit localStorage-Persistenz; Mobile: Sheet-Overlay
- **Command Palette** — Cmd+K (Desktop) + Such-Icon (Mobile), zeigt org_designs
- **Dark Mode** — Toggle mit Theme-Persistenz
- **Page Transitions** — Fade-In Animation
- **Error Boundary** — Globaler Fehler-Handler mit Retry
- **404 Seite** — Custom Not Found mit NeonRing
- **Sprache** — Durchgehend Deutsch

## 18. Architektur & Performance

- **React + Vite + TypeScript + Tailwind CSS**
- **Supabase** — PostgreSQL mit Row Level Security
- **TanStack Query** — Caching mit 5min staleTime
- **Realtime** — Live-Updates für production_logs via Supabase Channels
- **GS1 QR-Code** — bwip-js für normkonforme GS1 QR-Codes und DataMatrix
- **PDF** — jsPDF für clientseitige PDF-Generierung (CE + PSA)
- **Denormalisierung** — Production-Logs speichern Design- und Farbdaten direkt (kein FK zu designs)
- **RPC `start_production`** — Liest ausschließlich aus `org_designs` (kein Fallback auf globale `designs`); Fixed-GTIN-Pfad verwendet direkte Variable statt anonymem Record
- **Credential Management API** — `navigator.credentials.store()` für Browser-Passwortmanager in SPA-Umgebung
- **Typisierung** — `ProductionLogWithDesign` Interface für alle Production-Log-Hooks

---

## Entfernte Features (Legacy)

- ~~Sonderanfertigung (Art. 21)~~ — Entfernt, da laut Spectaris keine Sonderanfertigung bei maschineller Herstellung
- ~~UDI-Credits~~ — Ersetzt durch GTIN-Pool-System und feste GTINs
- ~~Master UDI-DI~~ — Ersetzt durch individuelle GTINs pro Rahmen
- ~~Dokumente-Seite im Cockpit~~ — Ausgelagert in separates Dokumenten-Portal mit AGB-Gate
- ~~FreeCustomDialog~~ — Entfernt (kein custom-Modus mehr)
- ~~colorLabelMap~~ — Entfernt, Farbnamen kommen jetzt denormalisiert aus `color_name`
- ~~Globale `designs`-Tabelle im Katalog~~ — Ersetzt durch `org_designs`
- ~~`useCollections` Hook~~ — Entfernt, Katalog nutzt nur noch `org_designs`
- ~~Admin: Designs Seite~~ — Entfernt, Herstellerdaten werden in `org_designs` verwaltet
- ~~`organizations.udi_credits` + `custom_counter`~~ — Spalten entfernt
- ~~ColorDots (statische Farbpalette)~~ — Entfernt, Farbauswahl nur im ProductionModal via `org_colors`
- ~~CompareBar / CompareSheet~~ — Vergleichs-Feature war nie aktiviert, toter Code entfernt
- ~~FaceShapeFilter~~ — Nie importiert, toter Code entfernt
- ~~`collection_id` / `print_file_url` in DesignDetailSheet~~ — Nie befüllt, aus Interface entfernt
- ~~`start_production` Fallback auf globale `designs`~~ — RPC liest nur noch aus `org_designs`
- ~~`v_gtin_row := ROW(...)` in `start_production`~~ — Anonymer Record durch direkte Variable ersetzt (Fixed-GTIN-Pfad)

*Letzte Aktualisierung: 2026-03-22 (RPC v_gtin_row Fix; Browser-Autofill; finaler Audit bestanden)*
