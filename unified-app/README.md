# Unified App

Eine modulare, local-first Anwendung, die mehrere Funktionsbereiche in einer einheitlichen Oberfläche zusammenführt. Basiert auf Automerge CRDTs für Offline-First Synchronisation.

## Features

### Multi-Modul Architektur

Die Unified App kombiniert drei Module in einem gemeinsamen Workspace:

| Modul | Icon | Beschreibung |
|-------|------|--------------|
| **Narrative** | 💭 | Kollaboratives Assumption Tracking - Erfasse Annahmen, tagge sie und stimme ab |
| **Karte** | 🗺️ | Interaktive Karte zum Teilen von Standorten mit anderen Nutzern |
| **Marktplatz** | 🛒 | Biete & Suche - Lokaler Marktplatz für Angebote und Gesuche |

### Workspace Management

- **Mehrere Workspaces**: Erstelle und wechsle zwischen verschiedenen Collaboration-Spaces
- **Workspace-Metadaten**: Jeder Workspace hat Name und optionales Avatar-Bild
- **Persistenz**: Workspaces werden lokal gespeichert und über URL-Hash geteilt

### Shared Infrastructure

Alle Module teilen sich:
- **Identitäten**: DID-basierte Benutzeridentität mit Display-Name und Avatar
- **Trust/Web of Trust**: Verifiziere andere Nutzer via QR-Code
- **Real-time Sync**: Automatische Synchronisation über WebSocket

## Architektur

```
unified-app/
├── src/
│   ├── App.tsx              # Automerge Repository Setup
│   ├── UnifiedApp.tsx       # Hauptkomponente mit Routing & State
│   ├── types.ts             # UnifiedDocument & Module-Typen
│   └── components/
│       ├── ModuleSwitcher.tsx      # Tab-Navigation zwischen Modulen
│       ├── WorkspaceSwitcher.tsx   # Dropdown für Workspace-Wechsel
│       ├── NewWorkspaceModal.tsx   # Dialog zum Erstellen neuer Workspaces
│       ├── NarrativeModuleWrapper.tsx
│       ├── MarketModuleWrapper.tsx
│       └── MapModuleWrapper.tsx
```

### Document Structure

```typescript
interface UnifiedDocument {
  version: string;
  lastModified: number;

  // Workspace-Metadaten
  context: {
    name: string;
    avatar?: string;  // Data-URL
  };

  // Aktivierte Module
  enabledModules: {
    narrative: boolean;
    market: boolean;
    map: boolean;
  };

  // Shared Identity & Trust
  identities: Record<DID, IdentityProfile>;
  trustAttestations: Record<string, TrustAttestation>;

  // Module-spezifische Daten
  data: {
    narrative?: OpinionGraphData;
    market?: MarketAppData;
    map?: MapData;
  };
}
```

### Module Wrapper Pattern

Jedes Modul wird über einen Wrapper integriert:

```typescript
// Beispiel: MapModuleWrapper
function MapModuleWrapper({ doc, docHandle, identity, hiddenUserDids }) {
  // Auto-Initialisierung für bestehende Dokumente
  if (!doc.data.map && docHandle) {
    docHandle.change((d) => {
      d.data.map = { locations: {} };
    });
  }

  // Mutations-Handler
  const onSetLocation = (lat, lng) => {
    docHandle.change((d) => {
      // CRDT-konforme Mutation
    });
  };

  return <MapModule {...props} />;
}
```

## Development

```bash
# Aus dem Monorepo-Root
npm install

# Development Server starten
npm run dev:unified

# Build
npm run build:unified

# Alle Workspaces bauen (lib muss zuerst gebaut werden)
npm run build
```

## Dependencies

Die Unified App importiert Module aus den einzelnen App-Packages:

- `narrative-ui` - Shared Components & Schema
- `narrative-app` - Narrative Module & Schema
- `market-app` - Market Module & Schema
- `map-app` - Map Module & Schema

### Tailwind CSS

Die `tailwind.config.js` muss alle Source-Pfade enthalten:

```javascript
content: [
  './src/**/*.{js,ts,jsx,tsx}',
  '../lib/src/**/*.{js,ts,jsx,tsx}',
  '../narrative-app/src/**/*.{js,ts,jsx,tsx}',
  '../market-app/src/**/*.{js,ts,jsx,tsx}',
  '../map-app/src/**/*.{js,ts,jsx,tsx}',
],
```

## URL-basiertes Sharing

Workspaces werden über URL-Hash geteilt:

```
https://app.example.com/#doc=automerge:abc123...
```

Beim Öffnen eines geteilten Links:
1. Document wird vom Sync-Server geladen
2. Lokale Workspace-Liste wird aktualisiert
3. User kann sofort kollaborieren

## Responsive Design

- **Desktop**: Volle Navbar mit Workspace-Name und Modul-Labels
- **Tablet**: Modul-Labels ausgeblendet, nur Icons
- **Mobile**: Kompakte Navbar, nur Icons für Module und Workspace

## Tech Stack

- React 18 + TypeScript
- Automerge 2.x (CRDT)
- Tailwind CSS + DaisyUI
- Vite
- Leaflet (für Map-Modul)
