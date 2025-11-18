---
description: Comprehensive stack configuration review against latest best practices
---

# Stack Configuration Review

Perform a comprehensive review of your stack configuration, checking all major components against latest best practices, identifying performance optimizations, and ensuring tests aren't overmocked.

## Usage

`/stack-review`

## What It Reviews

### 1. **Dependencies & Versions**

- Check `package.json` for outdated or misconfigured packages
- Verify latest stable versions of major frameworks
- Identify security vulnerabilities
- Review dependency tree for redundancy

### 2. **Build Configuration (Vite/Webpack)**

- Build target and optimization settings
- Vendor chunk splitting strategy
- Source map configuration
- Bundle size optimization
- Tree-shaking effectiveness
- Development vs production configs

### 3. **Vue/React Framework Setup**

- Component auto-import configuration
- API auto-import setup (unplugin-auto-import)
- Tree-shaking optimization
- Framework-specific best practices
- State management configuration

### 4. **UI Framework (Vuetify/Material-UI/etc)**

- Tree-shaking configuration
- Component import strategy
- Bundle size impact
- Theming setup
- Performance optimization

### 5. **Test Configuration**

- Test framework setup (Playwright, Vitest, Jest)
- Test isolation and parallelization
- Mock strategy - **KEY CHECK**: Are tests overmocked?
- Test performance settings
- Coverage configuration
- CI/CD integration

### 6. **Code Quality Tools**

- ESLint configuration and rule strictness
- TypeScript type checking settings
- Prettier/formatting setup
- Pre-commit hooks

### 7. **Performance Monitoring**

- Error tracking (Sentry, etc.) configuration
- Bundle analysis tools
- Performance metrics collection
- Source map upload settings

### 8. **Backend/Database (if applicable)**

- Connection pooling
- Query optimization
- Index strategy
- Caching configuration

## Key Questions to Answer

1. **Are tests overmocked?**
   - Unit tests: Should mock heavy dependencies (DB, network, 3D engines)
   - E2E tests: Should use real DOM and user interactions
   - Integration tests: Should minimize mocking

2. **Is the bundle optimized?**
   - Vendor chunks separated for caching?
   - Tree-shaking properly configured?
   - Dead code eliminated?

3. **Are we on latest stable versions?**
   - Framework versions up to date?
   - Security patches applied?
   - Breaking changes considered?

4. **Is the config using modern patterns?**
   - ESLint flat config (not legacy .eslintrc)?
   - Vite instead of Webpack (for Vue/React)?
   - Modern test runners (Vitest over Jest)?

5. **Are there quick wins available?**
   - Simple config changes for big impact?
   - Low-hanging performance improvements?
   - Obvious misconfigurations?

## Review Process

### Phase 1: Quick Scan (5-10 min)

1. Read `package.json` - check versions and scripts
2. Read main config files:
   - `vite.config.js` or `webpack.config.js`
   - `playwright.config.ts` or `vitest.config.js`
   - `tsconfig.json`
   - `eslint.config.js`
3. Check main entry point (`main.js`, `main.ts`, `index.tsx`)

### Phase 2: Deep Dive (10-15 min)

1. **Sample test files** - Check 2-3 examples:
   - E2E test: Look for excessive mocking
   - Unit test: Check if appropriately isolated
   - Integration test: Verify realistic interactions

2. **Build output analysis**:
   - Run `npm run build` and check bundle sizes
   - Look for warnings about large chunks
   - Identify vendor bundle composition

3. **Framework-specific checks**:
   - Vue: Vuetify tree-shaking, auto-imports
   - React: Code splitting, lazy loading
   - Angular: Optimization budget, lazy modules

### Phase 3: Document Findings (5-10 min)

Create structured report with:

- ✅ Excellent practices found
- ⚠️ Issues discovered with priority (High/Med/Low)
- 🚀 Quick wins (< 1 hour, high impact)
- 📊 Expected impact metrics
- 🎯 Prioritized action items

## Expected Output Format

```markdown
## ✅ Excellent Practices Found

- Test architecture: E2E tests use real interactions (not overmocked)
- CesiumJS properly optimized with request render mode
- Database has comprehensive spatial indexes

## ⚠️ Issues & Recommendations

### High Priority

1. **Vuetify bundle not optimized** (Impact: ~150KB savings)
   - Current: Importing all components
   - Fix: Enable tree-shaking in vite.config.js

### Medium Priority

2. **ESLint too permissive** (Impact: Code quality)
   - Current: no-unused-vars disabled
   - Fix: Enable as warnings

## 🚀 Quick Wins (< 1 hour)

1. Fix Vuetify tree-shaking (10 min) - 150KB savings
2. Add vendor chunk splitting (5 min) - Better caching
3. Enable ESLint warnings (5 min) - Catch dead code

## 📊 Summary Scores

| Category            | Score | Notes                          |
| ------------------- | ----- | ------------------------------ |
| Test Quality        | 9/10  | Excellent, minimal overmocking |
| Bundle Optimization | 7/10  | Good but missing vendor chunks |
| Code Quality        | 6/10  | ESLint too permissive          |

**Overall: 7.5/10** - Solid with specific opportunities
```

## Common Issues & Solutions

### Issue: Tests Run Too Slow

**Check:**

- Vitest using `singleFork: true` instead of parallel
- Playwright running all browsers when not needed
- No test sharding for large suites

**Fix:**

- Enable parallel execution where safe
- Use tags to run subsets of tests
- Configure appropriate worker count

### Issue: Large Bundle Size

**Check:**

- No vendor chunk splitting
- Importing entire UI libraries
- Not using tree-shaking
- Including dev dependencies in production

**Fix:**

- Configure `manualChunks` in rollup options
- Use auto-import plugins
- Enable tree-shaking in configs
- Check bundle analyzer output

### Issue: Tests Overmocked

**Check:**

- E2E tests mocking DOM/browser APIs
- Unit tests with real database connections
- Integration tests mocking everything

**Fix:**

- E2E: Use real DOM, real user interactions
- Unit: Mock external dependencies only
- Integration: Use test doubles, not full mocks

### Issue: Outdated Dependencies

**Check:**

- Run `npm outdated`
- Check for major version updates
- Look for deprecated packages

**Fix:**

- Update to latest stable versions
- Test after each major update
- Read migration guides

## Best Practices Checklist

- [ ] Vue/React on latest stable major version
- [ ] UI framework properly tree-shaken
- [ ] Vendor chunks separated for caching
- [ ] Auto-import configured for APIs/components
- [ ] ESLint rules at warn level minimum
- [ ] TypeScript type checking enabled
- [ ] Test parallelization where appropriate
- [ ] E2E tests not overmocked
- [ ] Bundle analyzer available
- [ ] Error tracking configured per environment
- [ ] Build memory limits set (for large apps)

## Integration with Other Commands

- Run `/stack-review` periodically (monthly/quarterly)
- After major dependency updates
- When experiencing build/test performance issues
- Before major refactoring projects
- When onboarding new team members

## Files to Review

**Always check:**

- `package.json` - Dependencies and scripts
- `vite.config.js` or `webpack.config.js` - Build config
- `vitest.config.js` or `jest.config.js` - Test config
- `playwright.config.ts` - E2E test config
- `tsconfig.json` - TypeScript config
- `eslint.config.js` - Linting rules
- `main.js/main.ts` - App entry point

**Framework-specific:**

- Vue: Check Vuetify/Quasar config, Pinia setup
- React: Check MUI/Ant Design config, Redux/Zustand setup
- Angular: Check angular.json, module imports

**Sample tests:**

- E2E test example (check for overmocking)
- Unit test example (check isolation)
- Integration test example (check balance)

## Time Estimate

**Quick Review**: 20-30 minutes

- Scan configs
- Identify obvious issues
- List quick wins

**Comprehensive Review**: 1-2 hours

- Full config analysis
- Test sampling and analysis
- Build output review
- Detailed recommendations

## Resources

- **Vite Best Practices**: https://vitejs.dev/guide/performance.html
- **Vue 3 Performance**: https://vuejs.org/guide/best-practices/performance.html
- **Playwright Best Practices**: https://playwright.dev/docs/best-practices
- **Vitest Configuration**: https://vitest.dev/config/
- **Bundle Analysis**: Use `rollup-plugin-visualizer` or `webpack-bundle-analyzer`

## Related Skills

- `.claude/skills/test-pattern-library.md` - Test quality patterns
- `.claude/skills/playwright-accessibility-testing.md` - E2E testing best practices
- `.claude/skills/package-lock-management.md` - Dependency management

## Example Session

```
User: /stack-review

Claude: I'll conduct a comprehensive stack configuration review. Let me check:
1. Dependencies and versions... ✅
2. Vite configuration... ⚠️ Found optimization opportunities
3. Vue 3 & Vuetify setup... ⚠️ Not using tree-shaking
4. Test configuration... ✅ Excellent - not overmocked
5. ESLint rules... ⚠️ Too permissive
...

[Detailed findings report]

Would you like me to implement the Quick Wins (5 changes, ~30 min)?
```
