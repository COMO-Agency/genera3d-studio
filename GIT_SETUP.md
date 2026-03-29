# Git Setup Anleitung - Genera3D Studio

## Voraussetzung: Im richtigen Verzeichnis sein!

```bash
# WICHTIG: Zuerst ins Projekt-Verzeichnis wechseln!
cd /Users/thomas/project_code/genera3d-studio-main

# Prüfen ob du im richtigen Verzeichnis bist
pwd
# Ausgabe sollte sein: /Users/thomas/project_code/genera3d-studio-main
```

---

## Option 1: Neues Repository (empfohlen)

```bash
# 1. Ins Projekt-Verzeichnis wechseln
cd /Users/thomas/project_code/genera3d-studio-main

# 2. Git initialisieren
git init

# 3. Alle Dateien hinzufügen
git add .

# 4. Ersten Commit erstellen
git commit -m "Initial commit: Genera3D Studio with stabilization fixes"

# 5. Mit GitHub verbinden (ersetze USERNAME!)
git remote add origin https://github.com/USERNAME/genera3d-studio.git

# 6. Branch umbenennen
git branch -M main

# 7. Zu GitHub pushen
git push -u origin main
```

---

## Option 2: Existierendes Repository aktualisieren

Wenn du schon ein Repo auf GitHub hast:

```bash
# 1. Ins Projekt-Verzeichnis wechseln
cd /Users/thomas/project_code/genera3d-studio-main

# 2. Git initialisieren
git init

# 3. Alle Dateien hinzufügen
git add .

# 4. Commit erstellen
git commit -m "Stabilisierung Phase 1-7: Bugfixes, Type-Safety, Tests, CI/CD"

# 5. Mit existierendem Repo verbinden (ersetze URL!)
git remote add origin https://github.com/USERNAME/genera3d-studio.git

# 6. Änderungen pushen (force-push weil neue Historie)
git push -f origin main
```

---

## Was wurde geändert? (Commit-Message Details)

```bash
# Alternative: Detaillierter Commit mit allen Änderungen
git commit -m "Stabilisierung Genera3D Studio

**Bugfixes:**
- Async/await in CommandPalette
- Null-Checks in UdiDetailSheet
- Toast ID Kollisions-Schutz
- Error Boundary mit Reset
- WebSocket Reconnect-Logik

**Neue Features:**
- Input Sanitierung (XSS-Schutz)
- Formular-Validierung
- Einheitliche Loading States
- Error Reporting Infrastruktur

**Konfiguration:**
- ESLint strict mode
- CI/CD Pipeline
- Pre-commit Hooks

**Tests:**
- 90+ Unit Tests
- E2E Test Setup

**Dokumentation:**
- Coding Standards
- Testing Guide
- Audit Berichte"
```

---

## Fehlerbehebung

### Fehler: "not a git repository"
```bash
# Du bist im falschen Verzeichnis!
# Lösung:
cd /Users/thomas/project_code/genera3d-studio-main
git init
```

### Fehler: "remote already exists"
```bash
# Lösung: Remote entfernen und neu hinzufügen
git remote remove origin
git remote add origin https://github.com/USERNAME/genera3d-studio.git
```

### Fehler: "failed to push"
```bash
# Lösung: Force push (Achtung: Überschreibt Remote!)
git push -f origin main
```

---

## Nach dem Push: GitHub Actions aktivieren

1. Gehe zu: `https://github.com/USERNAME/genera3d-studio/actions`
2. Klicke "I understand my workflows, go ahead and enable them"
3. Die CI/CD Pipeline wird automatisch bei jedem Push ausgeführt

---

## Schnell-Checkliste

- [ ] `cd /Users/thomas/project_code/genera3d-studio-main`
- [ ] `git init`
- [ ] `git add .`
- [ ] `git commit -m "message"`
- [ ] `git remote add origin URL`
- [ ] `git push -u origin main`
- [ ] Auf GitHub prüfen ob Code da ist
- [ ] GitHub Actions aktivieren

---

**Wichtig:** Ersetze `USERNAME` mit deinem tatsächlichen GitHub Username!
