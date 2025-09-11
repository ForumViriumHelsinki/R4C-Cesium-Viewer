# Testing Documentation

## Overview

This project uses a comprehensive testing strategy with multiple types of tests to ensure code quality, functionality, and performance of the R4C Cesium Viewer climate visualization application.

## Test Architecture

### Test Pyramid Structure

```
                    /\
                   /  \
                  /E2E \     <- Few, expensive, high confidence
                 /______\
                /        \
               /Integration\ <- Some, moderate cost, good confidence  
              /____________\
             /              \
            /   Unit Tests   \ <- Many, cheap, fast, focused
           /__________________\
```

### Testing Frameworks

- **Unit/Integration Tests**: Vitest with Vue Test Utils
- **End-to-End Tests**: Playwright
- **Performance Tests**: Playwright with custom performance metrics
- **Coverage**: Vitest coverage with v8 provider

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Test individual components, services, and stores in isolation.

#### Store Tests
- **GlobalStore**: State management, actions, mutations
- **ToggleStore**: UI toggle states, reset functionality
- Coverage includes edge cases, error handling, and state transitions

#### Service Tests  
- **Address Service**: Building address resolution logic
- **Camera Service**: 3D camera controls and positioning
- Mock external dependencies (Cesium, APIs)

#### Component Tests
- **Loading Component**: Reactivity, store integration
- Vue component rendering and behavior

**Run unit tests:**
```bash
npm run test:unit
npm run test:coverage  # With coverage report
```

### 2. Integration Tests (`tests/integration/`)

Test interactions between multiple components and services.

#### API Integration
- External service integration (Geocoding, WMS)
- Store-to-store communication
- Component-store integration
- Data processing workflows

#### Error Handling
- Cascading failure scenarios
- Network timeout handling
- User-friendly error messages

**Run integration tests:**
```bash
npm run test:integration
```

### 3. End-to-End Tests (`tests/e2e/`)

Test complete user workflows and application functionality.

#### Core Functionality
- Application loading and initialization
- Map navigation and interaction
- Building information display
- Statistical grid interaction

#### Advanced Features
- HSY Background Maps integration
- Heat vulnerability visualization
- WMS layer management
- Timeline functionality

#### Cross-browser Testing
- Chromium, Firefox, WebKit
- Mobile viewport testing
- Responsive design validation

**Run E2E tests:**
```bash
npm run test:e2e
npm run test:e2e -- --headed  # With browser UI
npm run test:e2e -- --debug   # Debug mode
```

### 4. Performance Tests (`tests/performance/`)

Measure and validate application performance characteristics.

#### Load Performance
- Page load times
- Core Web Vitals (FCP, LCP, CLS)
- Resource loading efficiency

#### Runtime Performance
- Frame rate during interactions
- Memory usage patterns
- Response time under load

#### Network Performance
- Slow network adaptation
- Resource caching effectiveness
- Concurrent request handling

**Run performance tests:**
```bash
npm run test:performance
```

### 5. Backend Tests (`tests/unit/backend/`)

Test Express.js API endpoints and server functionality.

#### API Endpoints
- Cache management (`/api/cache/*`)
- WMS proxy (`/wms/proxy`)
- Paavo data (`/paavo`)

#### Error Scenarios
- Redis connection failures
- External API timeouts
- Malformed requests

**Run backend tests:**
```bash
cd backend
npm test
npm run test:coverage
```

## Test Configuration

### Vitest Configuration (`vitest.config.js`)

```javascript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
});
```

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] }
  ]
});
```

## Running Tests

### Local Development

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### CI/CD Pipeline

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Performance tests on main branch only

```bash
# CI command
npm run test:ci
```

## Test Data and Mocking

### Mock Strategy

#### Cesium Mocking
Heavy 3D library mocked to avoid loading in tests:
```javascript
vi.mock('cesium', () => ({
  Viewer: vi.fn(),
  Cartesian3: { fromDegrees: vi.fn() }
}));
```

#### API Mocking
External APIs mocked for reliable testing:
```javascript
axios.get.mockResolvedValue({
  data: mockGeoData
});
```

#### Store Mocking
Pinia stores initialized fresh for each test:
```javascript
beforeEach(() => {
  setActivePinia(createPinia());
});
```

## Coverage Thresholds

Minimum coverage requirements:
- **Branches**: 70%
- **Functions**: 70% 
- **Lines**: 70%
- **Statements**: 70%

Coverage reports generated in `coverage/` directory.

## Performance Benchmarks

### Target Metrics
- **Initial Load**: < 3 seconds
- **First Contentful Paint**: < 2 seconds
- **Frame Rate**: > 30 FPS during interactions
- **Memory Usage**: < 50MB increase per session
- **API Response**: < 5 seconds for WMS requests

### Performance Monitoring

Tests track:
- Page load times
- Network request patterns
- Memory usage patterns
- Frame rate during interactions
- Resource caching efficiency

## Best Practices

### Writing Tests

1. **Test Behavior, Not Implementation**
   ```javascript
   // Good: Test user-visible behavior
   expect(wrapper.find('.loading-message').text()).toBe('Loading data, please wait');
   
   // Bad: Test implementation details
   expect(component.isLoadingData).toBe(true);
   ```

2. **Use Descriptive Test Names**
   ```javascript
   // Good
   it('should display building information when valid building is selected')
   
   // Bad
   it('should work')
   ```

3. **Arrange-Act-Assert Pattern**
   ```javascript
   it('should calculate correct address', () => {
     // Arrange
     const properties = { katunimi_suomi: 'Test Street', osoitenumero: '123' };
     
     // Act
     const result = findAddressForBuilding(properties);
     
     // Assert
     expect(result).toBe('Test Street 123');
   });
   ```

4. **Test Edge Cases**
   - Null/undefined values
   - Empty inputs
   - Network failures
   - Extreme values

5. **Mock External Dependencies**
   - APIs
   - Heavy libraries (Cesium)
   - Browser APIs

### Performance Testing

1. **Set Realistic Thresholds**
2. **Test on Multiple Devices/Networks**
3. **Monitor Memory Leaks**
4. **Validate User Experience Metrics**

### E2E Testing

1. **Test Critical User Paths**
2. **Handle Async Operations Properly**
3. **Use Page Object Model**
4. **Test Cross-Browser Compatibility**

## Debugging Tests

### Unit Tests
```bash
# Run specific test file
npx vitest tests/unit/stores/globalStore.test.js

# Debug mode
npx vitest --reporter=verbose --run tests/unit/stores/globalStore.test.js
```

### E2E Tests
```bash
# Run with browser UI
npx playwright test --headed

# Debug specific test
npx playwright test --debug tests/e2e/comprehensive.spec.ts

# Trace viewer
npx playwright show-trace trace.zip
```

### Performance Tests
```bash
# Verbose output
npx vitest --reporter=verbose tests/performance/load.test.js
```

## Continuous Integration

### GitHub Actions Workflow

The CI pipeline runs:
1. **Unit Tests** (Node 18, 20)
2. **Integration Tests** (with Redis)
3. **E2E Tests** (with backend + frontend)
4. **Performance Tests** (main branch only)
5. **Security Scan** (npm audit)

### Test Artifacts
- Coverage reports
- Playwright test results
- Performance metrics
- Screenshots on failure

## Test Maintenance

### Regular Tasks
1. **Update dependencies** monthly
2. **Review and update test data** quarterly
3. **Adjust performance thresholds** as needed
4. **Add tests for new features**
5. **Remove/update tests for deprecated features**

### Monitoring
- Track test execution time
- Monitor flaky tests
- Review coverage trends
- Update browser versions

## Troubleshooting

### Common Issues

#### Cesium Loading Errors
```javascript
// Solution: Proper mocking in setup.js
vi.mock('cesium', () => ({...}));
```

#### Async Test Failures
```javascript
// Solution: Proper await usage
await nextTick();
await page.waitForSelector('canvas');
```

#### Memory Leaks in Tests
```javascript
// Solution: Proper cleanup
afterEach(() => {
  wrapper?.unmount();
});
```

#### Flaky E2E Tests
```javascript
// Solution: Better wait strategies
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);
```

For more specific troubleshooting, check the individual test files and their comments.