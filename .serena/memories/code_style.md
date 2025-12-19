# Code Style and Conventions

## Formatting (Biome)

- **Indent**: Tabs (width 2)
- **Line width**: 100 characters
- **Quotes**: Single quotes
- **Semicolons**: As needed (no semicolons)
- **Trailing commas**: ES5 style

## Linting Rules

### Enabled (warn level)

- `noUnusedVariables` - Warn on unused vars
- `noUnusedImports` - Warn on unused imports
- `noExplicitAny` - Warn on `any` type (off in tests)
- `noDoubleEquals` - Prefer `===` over `==`
- `useConst` - Prefer `const` over `let`
- `noFloatingPromises` - Warn on unhandled promises

### Disabled

- `noForEach` - forEach allowed
- `noNonNullAssertion` - `!` assertions allowed
- `noAssignInExpressions` - Assignment in expressions allowed

## Vue Conventions

### Component Style

- Use Composition API with `<script setup>`
- Single-file components (`.vue`)
- PascalCase for component names
- kebab-case for custom events

### State Management (Pinia)

```javascript
// Store naming: use<Domain>Store
import { useGlobalStore } from '@/stores/globalStore';

// Access in components
const store = useGlobalStore();
```

### Key Stores

- `globalStore` - Main application state
- `buildingStore` - Building data and selection
- `toggleStore` - UI toggle states
- `urlStore` - URL state for deep linking

## File Organization

### Components

- `src/components/` - Reusable components
- `src/pages/` - Page-level components
- `src/views/` - View components

### Services

- `src/services/` - Business logic, API calls, Cesium integration
- Key services: `datasource.js`, `wms.js`, `featurepicker.js`, `camera.js`

### Composables

- `src/composables/` - Vue composition functions
- Prefix with `use` (e.g., `useMapControls`)

## Testing Conventions

### Test File Naming

- Unit tests: `*.spec.ts` in `tests/unit/`
- E2E tests: `*.spec.ts` in `tests/e2e/`
- Accessibility tests: `tests/e2e/accessibility/`

### Test Organization

- Use descriptive test names
- Group related tests with `describe`
- Use test tags for categorization: `@accessibility`, `@e2e`, `@smoke`

## Import Order (auto-organized by Biome)

1. External packages
2. Internal aliases (`@/`)
3. Relative imports
