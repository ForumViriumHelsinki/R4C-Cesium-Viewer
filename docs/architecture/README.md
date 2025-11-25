# Architecture Documentation

System architecture diagrams, component relationships, and structural design documentation.

## Contents

- [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md) - System architecture diagrams and component overview

## Overview

The R4C Cesium Viewer follows a layered architecture:

```
┌─────────────────────────────────────────────┐
│           Vue 3 Components (UI)              │
│  CesiumViewer, ControlPanel, Building, etc   │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│        Pinia Stores (State Management)       │
│  globalStore, buildingStore, toggleStore     │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│         Services Layer (Business Logic)      │
│  datasource, wms, featurepicker, camera      │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│              CesiumJS (3D Engine)            │
│         Map rendering, entity management     │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│         Data Sources (APIs/Databases)        │
│  pygeoapi (OGC API), PostgreSQL + PostGIS    │
└─────────────────────────────────────────────┘
```

## Key Architectural Patterns

### State Management (Pinia)

Centralized state management with dedicated stores for different domains:

- Global application state (view modes, selections)
- Feature-specific state (buildings, trees, heat exposure)
- UI state (toggles, layer visibility)
- URL state (deep linking)

### Service Layer

Business logic encapsulated in service modules:

- Data fetching and transformation
- CesiumJS API interactions
- Feature picking and selection
- Camera management and animations

### Component Architecture

Vue 3 Composition API with:

- Clear separation of concerns
- Reusable composables
- Props-down, events-up data flow
- Scoped styling

## Data Flow

1. **User Interaction** → Vue component event handlers
2. **State Update** → Pinia store actions
3. **Side Effects** → Service layer methods
4. **CesiumJS Update** → Map rendering updates
5. **Data Fetch** → API requests to pygeoapi
6. **State Sync** → Reactive updates to UI

## Related Documentation

- [../core/](../core/) - Development and testing practices
- [../database/](../database/) - Database schema and optimization
- [../GETTING_STARTED.md](../GETTING_STARTED.md) - Local development setup
