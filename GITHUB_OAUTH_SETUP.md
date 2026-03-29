# GitHub OAuth (Google) + Terminal Setup

**Du nutzt GitHub mit Google-Anmeldung?**  
Hier ist die Lösung für das Terminal.

---

## Das Problem

- GitHub erlaubt kein Passwort-Login mehr für Git-Operationen (Sicherheit)
- Mit Google OAuth hast du kein GitHub-Passwort
- Du brauchst einen **Personal Access Token (PAT)**

---

## Lösung: Personal Access Token erstellen

### Schritt 1: Token erstellen (im Browser)

1. Gehe zu: https://github.com/settings/tokens
   - Melde dich mit deinem Google-Konto bei GitHub an
   
2. Klicke: **"Generate new token (classic)"**

3. Token-Einstellungen:
   - **Note:** "Genera3D Studio Terminal"
   - **Expiration:** 90 days (oder "No expiration" für einfacheren Start)
   - **Scopes:**
     - ☑️ `repo` (Vollzugriff auf Repositories)
     - ☑️ `workflow` (für GitHub Actions)

4. Klicke: **"Generate token"**

5. **WICHTIG:** Kopiere den Token sofort!  
   (Er wird nur einmal angezeigt: `ghp_xxxxxxxxxxxx`)

---

### Schritt 2: Token speichern (im Terminal)

```bash
# Im Terminal:
cd /Users/thomas/project_code/genera3d-studio-main

# GitHub speichern (ersetze USERNAME und TOKEN!)
git config --global credential.helper osxkeychain

# Das Token wird beim ersten Push abgefragt und gespeichert
```

---

### Schritt 3: Repository pushen

```bash
# Ins Projekt gehen
cd /Users/thomas/project_code/genera3d-studio-main

# Git initialisieren (falls noch nicht geschehen)
git init

# Alle Dateien hinzufügen
git add .

# Commit erstellen
git commit -m "Stabilisierung Genera3D Studio - Phase 1-7"

# MIT TOKEN - Verwende das Token als Passwort!
git remote add origin https://USERNAME:TOKEN@github.com/USERNAME/genera3d-studio.git

# Alternative: Ohne Token in URL (wird beim Push abgefragt)
# git remote add origin https://github.com/USERNAME/genera3d-studio.git

git branch -M main

# Push (hier wirst du nach Passwort gefragt - gib das TOKEN ein!)
git push -u origin main
```

---

## Alternative: GitHub CLI (einfacher!)

Die einfachste Lösung für OAuth-User:

```bash
# 1. GitHub CLI installieren
brew install gh

# 2. Mit GitHub anmelden (öffnet Browser)
gh auth login
# - Wähle: HTTPS
# - Wähle: Login with a web browser
# - Bestätige im Browser mit Google

# 3. Repository erstellen und pushen
cd /Users/thomas/project_code/genera3d-studio-main
gh repo create genera3d-studio --public --source=. --push

# Fertig! Alles automatisch.
```

---

## Schnell-Lösung: Copy-Paste Befehle

```bash
# 1. GitHub CLI installieren (einmalig)
brew install gh

# 2. Anmelden (öffnet Browser für Google Auth)
gh auth login

# 3. Ins Projekt gehen
cd /Users/thomas/project_code/genera3d-studio-main

# 4. Repo erstellen und Code pushen
gh repo create genera3d-studio --public --source=. --remote=origin --push

# 5. Fertig! Code ist auf GitHub.
```

---

## Nach dem Push prüfen

1. Gehe zu: `https://github.com/USERNAME/genera3d-studio`
2. Du solltest alle Dateien sehen
3. Unter "Actions" sollte die CI/CD Pipeline laufen

---

## Troubleshooting

### "Authentication failed"
```bash
# Lösung: Credentials zurücksetzen
git credential-osxkeychain erase
host=github.com
protocol=https

# Dann erneut pushen, Token wird neu abgefragt
git push
```

### "Repository not found"
```bash
# Prüfe Remote URL
git remote -v

# Falls falsch, korrigieren:
git remote set-url origin https://github.com/USERNAME/genera3d-studio.git
```

### "Permission denied"
```bash
# Token hat nicht genug Rechte
# Neuen Token erstellen mit "repo" Scope
```

---

## Sicherheitshinweis

- **Token niemals teilen!**
- Token bei GitHub unter "Settings > Developer settings > Tokens" verwalten
- Bei Verdacht auf Leck: Token sofort löschen und neu erstellen

---

**Empfehlung:** Verwende `gh` (GitHub CLI) - das ist die einfachste Lösung für Google OAuth User!
