

# Plan: App-Test, Prettier-Formatierung, ColorPickerPanel-Fixes

## 3 Aufgaben

### 1. App testen (Browser)
Dashboard, Katalog und Produktionsregister im Preview durchklicken und pruefen ob nach den ESLint/Type-Safety-Fixes alles noch korrekt rendert.

### 2. Prettier-Formatierung
`npm run format` ausfuehren um alle ~140 Dateien zu formatieren. Danach CI-Workflow anpassen: `prettier --check` als harten Gate aktivieren (das `|| true` entfernen).

### 3. ColorPickerPanel exhaustive-deps Fixes
4 Warnings in `src/components/colors/ColorPickerPanel.tsx`:

| Zeile | Problem | Loesung |
|-------|---------|---------|
| 59 | `hsv` fehlt in deps von sync-Effect | Intentional — `hsv` als dep wuerde Endlosschleife verursachen. Behalte `eslint-disable` aber mit erklaerenden Kommentar |
| 92 | `hsv[0]` als dep statt `hsv` | Extrahiere `const hue = hsv[0]` vor dem Effect, nutze `[hue]` als dep |
| 103 | `hsv[0]` als dep in useCallback | Gleich: extrahiere `hue`, nutze `[hue, emit]` |
| 107 | `pickFromCanvas` in Effect-deps | Bereits korrekt in deps, kein Warning hier |

**Konkrete Aenderung**: `hue` als separate Variable extrahieren, damit ESLint die Array-Index-Deps versteht:

```typescript
const hue = hsv[0];

useEffect(() => {
  // ... canvas drawing mit hsvToHex(hue, 1, 1)
}, [hue]);

const pickFromCanvas = useCallback(
  (e) => {
    // ... emit(hue, s, v)
  },
  [hue, emit]
);
```

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/colors/ColorPickerPanel.tsx` | `hue` extrahieren, deps fixen |
| `.github/workflows/quality.yml` | Prettier als harten Gate |
| Alle `src/**/*.{ts,tsx,css,json}` | Prettier-Formatierung |

