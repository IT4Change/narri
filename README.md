# Opinion Graph

A local-first collaborative opinion tracking application built with Jazz and React.

## Overview

Opinion Graph allows users to:
- Create and share assumptions/statements
- Vote on assumptions (🟢 Agree / 🟡 Neutral / 🔴 Disagree)
- See real-time vote aggregations
- Work offline with automatic sync

## Architecture

**Local-First with Jazz**
- No traditional backend required
- Data syncs via Jazz mesh network
- Keypair-based identity (DIDs)
- Offline-first, conflict-free CRDTs

**Tech Stack**
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + DaisyUI
- **Data Layer**: Jazz (CRDT sync)
- **Build Tool**: Vite

**Monorepo Structure**
```
opinion-graph/
├── app/          # React application
└── lib/          # opinion-graph-ui component library
    ├── schema/   # Jazz data schemas
    ├── hooks/    # React hooks for data access
    └── components/ (future UI components)
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Build the library
npm run build:lib

# Start development server
npm run dev
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Development Workflow

```bash
# Run lib in watch mode (one terminal)
cd lib && npm run dev

# Run app dev server (another terminal)
cd app && npm run dev

# Build everything
npm run build

# Lint
npm run lint
```

## Data Model

### Core Entities

**Assumption**
- Title and optional description
- Created by a user (keypair-based identity)
- Can have multiple tags
- Tracks votes from all users

**Vote**
- User's opinion on an assumption
- Values: `green` (agree), `yellow` (neutral), `red` (disagree)
- One vote per user per assumption
- Updates sync automatically

**Tag**
- Categorize assumptions
- Color-coded
- Shareable across users

### Jazz Schema

All data is defined as Jazz CRDTs in `lib/src/schema/`:
- Automatic conflict resolution
- Real-time sync across devices
- Works offline

## Identity & Auth

**Keypair-Based Identity**
- No passwords or email required
- Each user generates a keypair on first use
- DID (Decentralized Identifier) derived from public key
- Private key stored locally in browser

**Jazz DemoAuth**
- Currently uses Jazz's demo auth for quick start
- Production: can be replaced with custom auth provider
- Supports invite links for collaboration

## UI Components

Built with **DaisyUI** (using `tw:` prefix):
- `AssumptionCard`: Display assumption with vote controls
- `VoteBar`: Visual vote distribution (🟢/🟡/🔴)
- `AssumptionList`: List view of all assumptions
- `CreateAssumptionModal`: Form to create new assumptions

## Roadmap

- [ ] Tag management UI
- [ ] Filter/search assumptions
- [ ] Detailed assumption view with discussion
- [ ] User profiles
- [ ] Export/import data
- [ ] Custom auth provider
- [ ] PWA support for offline use
- [ ] Invite system for collaboration spaces

## License

MIT
