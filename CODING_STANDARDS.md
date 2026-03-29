# Genera3D Studio - Coding Standards

**Version:** 1.0  
**Datum:** 23. März 2026  
**Gültigkeit:** Alle Contributors

---

## Inhaltsverzeichnis

1. [Allgemeine Prinzipien](#1-allgemeine-prinzipien)
2. [TypeScript Standards](#2-typescript-standards)
3. [React Patterns](#3-react-patterns)
4. [Sicherheit](#4-sicherheit)
5. [Performance](#5-performance)
6. [Testing](#6-testing)
7. [Git Workflow](#7-git-workflow)

---

## 1. Allgemeine Prinzipien

### 1.1 Defensive Programmierung

**Jede Funktion muss defensive Programmierung implementieren:**

```typescript
// ✅ Richtig
function processDesign(design: Design | null | undefined): string {
  if (!design) return 'Unbekannt';
  return design.name ?? 'Unbekannt';
}

// ❌ Falsch
function processDesign(design: Design): string {
  return design.name; // Kann null sein!
}
```

### 1.2 Null/Undefined Handling

- **Keine Non-Null Assertions (`!`)** ohne explizite Prüfung
- **Optional Chaining** (`?.`) bevorzugen
- **Nullish Coalescing** (`??`) für Defaults

```typescript
// ✅ Richtig
const name = design?.name ?? 'Unbekannt';
const userId = user?.id;

// ❌ Falsch
const name = design!.name; // Nur wenn design garantiert existiert
```

### 1.3 Early Returns

- Reduziere Nesting durch Early Returns
- Validierung zuerst, Logik danach

```typescript
// ✅ Richtig
function saveDesign(design: DesignInput): Result {
  if (!design.name?.trim()) {
    return { success: false, error: 'Name erforderlich' };
  }
  
  if (design.name.length > 100) {
    return { success: false, error: 'Name zu lang' };
  }
  
  // ... Speicherlogik
  return { success: true };
}

// ❌ Falsch
function saveDesign(design: DesignInput): Result {
  if (design.name?.trim()) {
    if (design.name.length <= 100) {
      // ... tief verschachtelt
    }
  }
}
```

---

## 2. TypeScript Standards

### 2.1 Typdefinitionen

- **Explizite Rückgabetypen** für alle öffentlichen Funktionen
- **Interface über Type** für Objekte
- **Type über Interface** für Unions/Intersections

```typescript
// ✅ Richtig
interface Design {
  id: string;
  name: string;
}

type DesignMode = 'optical' | 'optical_sun' | 'sunglasses';

function getDesign(id: string): Promise<Design | null> {
  // ...
}
```

### 2.2 Enums vs. Unions

- **String-Literal Unions** bevorzugen für einfache Typen
- **Enums** nur für komplexe Mapping-Szenarien

```typescript
// ✅ Bevorzugt
type ProductionStatus = 
  | 'qc_pending' 
  | 'qc_passed' 
  | 'qc_failed' 
  | 'cancelled';

// ✅ Für komplexe Mappings
const statusLabels: Record<ProductionStatus, string> = {
  qc_pending: 'QC ausstehend',
  qc_passed: 'QC bestanden',
  qc_failed: 'QC fehlgeschlagen',
  cancelled: 'Storniert',
};
```

### 2.3 Generic Patterns

```typescript
// ✅ Wiederverwendbare Generics
interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

// ✅ Constrainted Generics
interface SortableItem {
  id: string;
  created_at: string;
}

function sortByDate<T extends SortableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```

---

## 3. React Patterns

### 3.1 Komponenten-Struktur

```typescript
// ✅ Standard-Reihenfolge
import { useState, useEffect, useCallback, memo } from 'react';
// 1. React Imports
// 2. External Libraries
// 3. Internal Imports (lib, hooks, components)
// 4. Types
// 5. Component

interface Props {
  designId: string;
  onComplete?: () => void;
}

export const DesignCard = memo(function DesignCard({ 
  designId, 
  onComplete 
}: Props) {
  // 1. Hooks
  const { data: design } = useDesign(designId);
  const [isEditing, setIsEditing] = useState(false);
  
  // 2. Computed Values
  const displayName = design?.name ?? 'Unbekannt';
  
  // 3. Event Handlers
  const handleSave = useCallback(() => {
    setIsEditing(false);
    onComplete?.();
  }, [onComplete]);
  
  // 4. Effects
  useEffect(() => {
    // ...
  }, [designId]);
  
  // 5. Render
  return (
    // ...
  );
});
```

### 3.2 Custom Hooks

**Namenskonvention:** `use[Noun][Verb]?`

```typescript
// ✅ Richtig
useDesign()           // Holt ein Design
useUpdateDesign()     // Aktualisiert ein Design
useDesignSearch()     // Sucht Designs
useFormValidation()   // Validiert Formulare

// ❌ Falsch
useGetDesign()        // Verbos
useDesigns()          // Plural ohne Unterschied
useHandleDesign()     // Zu generisch
```

**Hook-Struktur:**

```typescript
export function useDesign(id: string | undefined) {
  // 1. Guard Clauses
  if (!id) {
    return { data: null, isLoading: false, error: null };
  }
  
  // 2. Other Hooks
  const queryClient = useQueryClient();
  
  // 3. Query/Mutation
  return useQuery({
    queryKey: ['design', id],
    queryFn: () => fetchDesign(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
```

### 3.3 Performance

```typescript
// ✅ Memo für teure Berechnungen
const expensiveValue = useMemo(() => {
  return data?.reduce((acc, item) => acc + item.value, 0);
}, [data]);

// ✅ Callback für Event Handler
const handleSubmit = useCallback(() => {
  submitForm(data);
}, [data]);

// ✅ React.memo für List-Items
export const DesignListItem = memo(function DesignListItem({ 
  design, 
  onSelect 
}: ListItemProps) {
  return (
    <div onClick={() => onSelect(design.id)}>
      {design.name}
    </div>
  );
});
```

---

## 4. Sicherheit

### 4.1 Input-Sanitierung

**Jeder externe Input muss sanitisiert werden:**

```typescript
import { sanitizeText, sanitizeForCsv, isValidEmail } from '@/lib/sanitize';

// ✅ Formular-Input
function handleChange(value: string) {
  const sanitized = sanitizeText(value);
  setState(sanitized);
}

// ✅ CSV-Export
function exportData(data: string[]) {
  const safeData = data.map(sanitizeForCsv);
  // ... exportieren
}

// ✅ E-Mail-Validierung
if (!isValidEmail(email)) {
  showError('Ungültige E-Mail');
  return;
}
```

### 4.2 Keine Geheimnisse im Code

```typescript
// ❌ NIE im Code
const API_KEY = 'sk_live_1234567890abcdef';

// ✅ Umgebungsvariablen
const API_KEY = import.meta.env.VITE_API_KEY;
```

### 4.3 SQL-Injection-Schutz

- **Niemals** String-Konkatenation für Queries
- **Immer** parametrisierte Queries verwenden
- **Oder** ORM/Query Builder verwenden

```typescript
// ✅ Supabase (automatisch parametrisiert)
const { data } = await supabase
  .from('designs')
  .select('*')
  .eq('id', userId);  // Parameterisiert!

// ❌ NIE direkt
const query = `SELECT * FROM designs WHERE id = '${userId}'`;
```

---

## 5. Performance

### 5.1 TanStack Query Cache

```typescript
// ✅ Cache-Konfiguration
useQuery({
  queryKey: ['designs', orgId],
  queryFn: fetchDesigns,
  staleTime: 5 * 60 * 1000,    // 5 Minuten frisch
  gcTime: 10 * 60 * 1000,      // 10 Minuten im Cache
  refetchOnWindowFocus: false, // Kein Refetch bei Fokus
  retry: 2,                    // 2 Wiederholungen
});

// ✅ Placeholder Data
useQuery({
  queryKey: ['production_logs'],
  queryFn: fetchLogs,
  placeholderData: (prev) => prev, // Alte Daten während Loading
});
```

### 5.2 Lazy Loading

```typescript
// ✅ Route-basiertes Code Splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ Komponenten-basiert
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// ✅ Mit Suspense
<Suspense fallback={<LoadingState type="spinner" />}>
  <Dashboard />
</Suspense>
```

### 5.3 Bildoptimierung

```typescript
// ✅ Lazy Loading
<img 
  src={imageUrl} 
  loading="lazy" 
  alt={design.name}
/>

// ✅ WebP bevorzugen
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="..." />
</picture>
```

---

## 6. Testing

### 6.1 Test-Struktur

```typescript
// ✅ Describe-Blocks für Struktur
describe('useFormValidation', () => {
  describe('initial state', () => {
    it('should initialize with empty values', () => {
      // ...
    });
  });
  
  describe('validation', () => {
    it('should validate required fields', () => {
      // ...
    });
    
    it('should validate email format', () => {
      // ...
    });
  });
});
```

### 6.2 Testing Library Patterns

```typescript
// ✅ User-centric Testing
render(<Login />);
await userEvent.type(screen.getByLabelText('E-Mail'), 'test@example.com');
await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

expect(await screen.findByText('Willkommen')).toBeInTheDocument();

// ❌ Nicht implementierungsabhängig
expect(container.querySelector('.login-form')).toBeInTheDocument();
```

---

## 7. Git Workflow

### 7.1 Commit Messages

```
feat: add UDI pool management
fix: resolve XSS vulnerability in search
refactor: optimize production history table
docs: update API documentation
test: add E2E tests for checkout flow
chore: update dependencies
```

### 7.2 Branch Naming

```
feature/udi-pool-management
fix/xss-sanitization
refactor/query-caching
```

### 7.3 Pull Request Template

```markdown
## Beschreibung
Kurze Beschreibung der Änderungen

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manually tested

## Security
- [ ] No new security vulnerabilities
- [ ] Input sanitization implemented
- [ ] No secrets exposed
```

---

## Anhänge

### A. Verbotene Patterns

```typescript
// ❌ Keine Non-Null Assertions
const value = obj!.property;

// ❌ Keine any-Typen
const data: any = fetchData();

// ❌ Keine eval()
eval(userInput);

// ❌ Keine innerHTML ohne Sanitierung
element.innerHTML = userContent;

// ❌ Keine setState in render
render() {
  this.setState({}); // ENDLOS-SCHLEIFE!
}
```

### B. Empfohlene Libraries

| Zweck | Library |
|-------|---------|
| Forms | `react-hook-form` + `zod` |
| Dates | `date-fns` |
| Testing | `vitest` + `@testing-library/react` |
| Charts | `recharts` |
| Tables | `@tanstack/react-table` |
| Virtualization | `@tanstack/react-virtual` |

### C. ESLint Konfiguration

```json
{
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/prefer-nullish-coalescing": "error",
  "@typescript-eslint/prefer-optional-chain": "error",
  "react-hooks/exhaustive-deps": "error",
  "no-console": ["warn", { "allow": ["error"] }]
}
```

---

**Letzte Aktualisierung:** 23. März 2026  
**Verantwortlich:** Tech Lead  
**Nächste Review:** 23. April 2026
