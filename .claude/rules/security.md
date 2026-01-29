# Security

## Input Validation

### Postal Code Validation

**CRITICAL**: Postal codes are used in CQL filters and MUST be validated to prevent injection attacks.

```javascript
// ✅ CORRECT: Validate before use
import { validatePostalCode } from '@/utils/validators';

function buildUrl(postalCode) {
	const validated = validatePostalCode(postalCode); // Throws on invalid input
	return `${base}?CQL_FILTER=postinumero='${encodeURIComponent(validated)}'`;
}
```

```javascript
// ❌ WRONG: Direct interpolation (CQL injection risk)
function buildUrl(postalCode) {
	return `${base}?CQL_FILTER=postinumero='${postalCode}'`;
	// Attack: postalCode = "00100' OR '1'='1"
}
```

### Validator Utility

**Location**: `src/utils/validators.js`

```javascript
// Finnish postal codes: exactly 5 digits
export function validatePostalCode(code) {
	if (!/^\d{5}$/.test(code)) {
		throw new Error(`Invalid postal code format: ${code}`);
	}
	return code;
}
```

**Usage**:

- All URL getters in `urlStore.js`
- `cacheWarmer.js`
- Any service constructing CQL filters

## URL Parameter Encoding

**ALWAYS** use `encodeURIComponent()` for URL parameters:

```javascript
// ✅ CORRECT
const url = `${base}/items?posno=${encodeURIComponent(postinumero)}`;
```

```javascript
// ❌ WRONG: Missing encoding
const url = `${base}/items?posno=${postinumero}`;
```

## JSON Parsing Safety

### Validate Before Parsing

```javascript
// ✅ CORRECT: Size + type + prototype pollution checks
function importConfig(jsonString) {
	// 1. Size validation (prevent DoS)
	if (jsonString.length > 100000) {
		throw new Error('Configuration too large');
	}

	const parsed = JSON.parse(jsonString);

	// 2. Type validation
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error('Configuration must be an object');
	}

	// 3. Prototype pollution prevention
	if ('__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed) {
		throw new Error('Invalid configuration keys detected');
	}

	return parsed;
}
```

```javascript
// ❌ WRONG: No validation
function importConfig(jsonString) {
	const config = JSON.parse(jsonString); // Vulnerable!
	return config;
}
```

**Apply validation in**:

- `FeatureFlagsPanel.vue` `doImport()`
- `featureFlagStore.ts` `loadOverrides()`
- Any localStorage/user-provided JSON parsing

## OWASP Top 10 Awareness

### A03:2021 - Injection

**Prevent**:

- Validate all external input (postal codes, user input)
- Use parameterized queries where applicable
- Encode output in URLs

### A08:2021 - Software and Data Integrity Failures

**Prevent**:

- Validate JSON structure before parsing
- Check for prototype pollution (`__proto__`, `constructor`, `prototype`)
- Size-limit user input to prevent DoS

## Known Safe Patterns

The codebase already follows these security best practices:

- ✅ No `eval()` or `Function()` constructor usage
- ✅ No `innerHTML` - uses safe DOM manipulation
- ✅ No hardcoded secrets - uses environment variables
- ✅ Sentry integration for error monitoring

## Security Review Checklist

When adding new features, verify:

- [ ] User input is validated before use in queries
- [ ] URL parameters use `encodeURIComponent()`
- [ ] JSON parsing includes size/type/prototype checks
- [ ] No direct string interpolation in CQL/SQL filters
- [ ] Sensitive data not logged or exposed to client
