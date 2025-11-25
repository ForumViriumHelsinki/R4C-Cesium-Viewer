# Product Requirements Document: Map Click User Experience Enhancement

**Document Version:** 1.0
**Last Updated:** 2025-11-18
**Status:** Draft - Awaiting Stakeholder Review
**Project:** R4C Cesium Viewer
**Feature:** Improve Map Click Responsiveness and Visual Feedback

---

## Executive Summary

### Problem Statement

Users currently experience a disorienting and frustrating interaction when clicking on postal code boundaries in the R4C Cesium Viewer application. The current implementation provides no visual feedback, blocks subsequent clicks with a silent 500ms debounce, forces users through a non-interruptible 3-second camera animation, and imposes a 1-second timeout before UI restoration. This results in a total wait time of 4+ seconds with minimal feedback, creating a poor user experience that users describe as "annoying."

### Proposed Solution

Implement a three-phase enhancement strategy that provides immediate visual feedback (<100ms), enables user control over camera animations (interruptible with ESC key), and progressively loads data during camera flight. This approach reduces perceived wait time to under 2 seconds while giving users control and constant feedback throughout the interaction.

### Business Impact

**User Experience Benefits:**

- Eliminate disorienting "dead space" between interactions
- Reduce perceived wait time from 4+ seconds to <2 seconds
- Empower users with animation control (skip capability)
- Improve accessibility through keyboard controls and screen reader support

**Technical Benefits:**

- Parallel data loading during camera animation
- Improved application responsiveness perception
- Better state management and error handling
- Enhanced accessibility compliance (WCAG 2.1 AA)

**Success Metrics:**

- Time to first visual feedback: Target <100ms (currently none)
- Perceived wait time: Target <2 seconds (down from 4+)
- User satisfaction: Track animation skip rate as insight metric
- Accessibility: 100% WCAG 2.1 AA compliance for interaction flows

---

## Stakeholders & Personas

### Primary Stakeholders

**Accountable:**

- Product Owner - Final decision authority on feature prioritization and scope
- UX/UI Designer - Responsible for visual feedback design and accessibility compliance

**Responsible:**

- Frontend Engineering Team - Implementation of Vue components and state management
- CesiumJS Specialist - Camera animation control and 3D interaction handling

**Consulted:**

- QA/Testing Team - Test strategy and regression validation
- Accessibility Specialist - WCAG compliance verification
- End Users - User acceptance testing and feedback

**Informed:**

- Climate Research Stakeholders - Impact on research workflows
- Support Team - New features and user guidance materials

### User Personas

**Primary Persona: Climate Research Analyst**

- **Role:** Urban planning researcher analyzing heat exposure data
- **Context:** Frequently clicks between postal code areas to compare climate metrics
- **Pain Points:**
  - "The building info disappears and nothing happens - I'm not sure if my click registered"
  - "I can't cancel the animation if I realize I clicked the wrong area"
  - "The wait time makes it hard to quickly explore different regions"
- **Needs:**
  - Immediate confirmation that click was registered
  - Ability to interrupt navigation if wrong area selected
  - Faster perceived response time for exploratory workflows
- **Success Criteria:** Can rapidly explore multiple postal codes without frustration

**Secondary Persona: Accessibility-Focused User**

- **Role:** Government analyst using screen reader technology
- **Context:** Navigates application primarily with keyboard
- **Pain Points:**
  - No screen reader announcement when postal code is clicked
  - Cannot interrupt camera animation with keyboard
  - Unclear loading state for non-visual users
- **Needs:**
  - Clear ARIA live region announcements
  - Keyboard control for all interactions (ESC key support)
  - Status updates communicated to assistive technology
- **Success Criteria:** Can complete all map click workflows using keyboard and screen reader

### User Stories

**US-1: Immediate Visual Feedback**

- **As a** climate research analyst
- **I want to** see immediate visual feedback when I click a postal code boundary
- **So that** I know my click was registered and the application is processing my request
- **Acceptance Criteria:**
  - Visual loading indicator appears within 100ms of click
  - Loading overlay displays clicked postal code name
  - Previous building information panel is replaced (not just removed)
  - Loading state persists until new view is ready

**US-2: Interruptible Camera Animation**

- **As a** climate research analyst
- **I want to** interrupt the camera animation if I realize I clicked the wrong postal code
- **So that** I can quickly correct my mistake without waiting for the full animation
- **Acceptance Criteria:**
  - ESC key cancels camera animation and returns to previous view
  - Visual "Press ESC to cancel" button displayed during flight
  - Animation cancellation takes <500ms to restore previous view
  - State is properly restored without data corruption

**US-3: Progressive Data Loading**

- **As a** climate research analyst
- **I want to** see data appear as soon as it's available
- **So that** I can start analyzing information without waiting for everything to finish loading
- **Acceptance Criteria:**
  - Camera animation and data loading happen in parallel
  - UI updates progressively as data becomes available
  - Skeleton loaders show expected content structure
  - Loading failures don't block entire interaction

**US-4: Accessible Loading States**

- **As an** accessibility-focused user with screen reader
- **I want to** hear announcements about loading progress
- **So that** I understand what the application is doing without visual feedback
- **Acceptance Criteria:**
  - ARIA live region announces "Loading postal code [name]"
  - Screen reader announces when camera animation can be cancelled
  - Loading completion is announced
  - Error states are clearly communicated

**US-5: Error Recovery**

- **As a** climate research analyst
- **I want to** understand what went wrong if data fails to load
- **So that** I can retry or choose a different action
- **Acceptance Criteria:**
  - Clear error messages displayed if data loading fails
  - Retry button available for failed operations
  - Previous view state is preserved if loading fails
  - Errors are logged for debugging

### User Journey Mapping

**Current User Journey (Problematic):**

```
1. User clicks postal code boundary (0ms)
   - State: Interacting
   - Feedback: None

2. Building info panel disappears (immediate)
   - State: Confused
   - Feedback: Screen shows empty space, no indication of processing
   - Pain Point: "Did my click register?"

3. 500ms debounce check (blocking)
   - State: Waiting (unaware)
   - Feedback: None
   - Pain Point: Silent block of rapid clicks

4. Camera animation starts (500ms-3500ms)
   - State: Watching forced animation
   - Feedback: Camera movement only
   - Pain Point: "I clicked the wrong area but can't stop it"

5. Animation completes (3500ms)
   - State: Still waiting
   - Feedback: View has changed but no UI yet

6. 1-second UI restore timeout (3500ms-4500ms)
   - State: Confused
   - Feedback: None
   - Pain Point: "Is it broken?"

7. Data loading begins (4500ms+)
   - State: Finally seeing progress
   - Feedback: Loading indicator appears
   - Pain Point: "Why did this take so long?"

TOTAL TIME: 4500ms+ with minimal feedback
EMOTIONAL STATE: Frustrated, confused, impatient
```

**Improved User Journey (Target):**

```
1. User clicks postal code boundary (0ms)
   - State: Interacting
   - Feedback: Click registered

2. Loading overlay appears (<100ms)
   - State: Informed
   - Feedback: "Loading Postal Code: [Name]" with spinner
   - Improvement: Immediate confirmation, no dead space

3. Camera animation starts (100ms)
   - State: Engaged
   - Feedback: Loading overlay + "Press ESC to cancel" button
   - Improvement: User has control
   - Data loading begins in parallel (background)

4. During animation (100ms-3100ms)
   - State: Monitoring progress
   - Feedback: Progressive updates as data loads
   - Improvement: Useful information appearing

5. Animation completes (3100ms)
   - State: Ready to interact
   - Feedback: Full UI restored with loaded data
   - Improvement: Seamless transition

6. All data loaded (1500ms-2000ms perceived)
   - State: Productive
   - Feedback: Complete postal code view
   - Improvement: 50% reduction in perceived wait

TOTAL TIME: <2000ms perceived (with progressive loading)
EMOTIONAL STATE: Confident, in control, efficient
```

---

## Goals and Objectives

### Primary Goals

1. **Eliminate Visual Feedback Gap**
   - Provide immediate confirmation of user interaction
   - Replace building info panel with loading state (no empty screen)
   - Show clear progress indication throughout process

2. **Enable User Control**
   - Allow interruption of camera animation via ESC key
   - Provide visual indication of cancellation capability
   - Ensure clean state restoration on cancellation

3. **Reduce Perceived Wait Time**
   - Implement parallel data loading during animation
   - Display progressive UI updates as data becomes available
   - Target <2 second perceived wait time (down from 4+)

4. **Improve Accessibility**
   - Add ARIA live regions for status announcements
   - Support keyboard navigation (ESC key)
   - Ensure screen reader compatibility
   - Achieve WCAG 2.1 AA compliance

### Secondary Goals

1. **Maintain Data Integrity**
   - Ensure clean state transitions
   - Handle edge cases (rapid clicks, cancellations)
   - Prevent race conditions in data loading

2. **Preserve Performance**
   - Keep first visual feedback under 100ms
   - Avoid blocking main thread
   - Maintain 60fps during animations

3. **Enable Future Enhancements**
   - Create reusable loading overlay component
   - Establish pattern for progressive data loading
   - Build foundation for animation optimization

### Non-Goals (Explicitly Out of Scope)

1. **Not changing camera animation duration** - 3-second animation remains for UX consistency
2. **Not modifying debounce logic** - 500ms debounce stays as performance safeguard
3. **Not changing data loading architecture** - Using existing data services without refactoring
4. **Not redesigning building info panel** - Focus on loading state only
5. **Not implementing animation speed controls** - Skip capability sufficient for v1

---

## Functional Requirements

### Phase 1: Immediate Visual Feedback (Quick Win)

**Priority:** P0 (Critical - Must Have)
**Estimated Effort:** 3-5 days
**Dependencies:** None

#### FR-1.1: Click Processing State Management

**Requirement:** Add state tracking for map click processing lifecycle

**Implementation Details:**

- Add `clickProcessingState` object to `globalStore.js`:
  ```javascript
  clickProcessingState: {
    isProcessing: false,      // Is click being handled?
    postalCode: null,          // Target postal code
    postalCodeName: null,      // Display name
    stage: null,               // 'loading', 'animating', 'complete'
    startTime: null,           // Performance tracking
    canCancel: false           // Can user interrupt?
  }
  ```
- Add action `setClickProcessingState(state)` to update this state
- Add computed getter `isClickProcessing` for component access

**Acceptance Criteria:**

- State is updated within 10ms of click event
- State transitions are logged for debugging
- State persists across component lifecycle
- Previous state is cleared before new click

#### FR-1.2: Loading Overlay Component

**Requirement:** Create visual overlay component to replace building info panel

**Component Specification:**

- **File:** `src/components/MapClickLoadingOverlay.vue`
- **Props:**
  - `postalCode: String` - Postal code being loaded
  - `postalCodeName: String` - Display name
  - `stage: String` - Current stage ('loading', 'animating', 'complete')
  - `canCancel: Boolean` - Show cancel button
- **Emits:**
  - `cancel` - User requested cancellation
- **Visual Design:**
  - Semi-transparent dark overlay (rgba(0,0,0,0.5))
  - Centered card with spinner and text
  - Postal code name prominently displayed
  - Smooth fade-in animation (150ms)
  - Vuetify `v-progress-circular` spinner
  - Cancel button (if `canCancel` prop is true)

**Accessibility Requirements:**

- ARIA live region with `aria-live="polite"`
- Role `role="status"`
- Focus management for cancel button
- Keyboard trap prevention

**Acceptance Criteria:**

- Overlay appears within 100ms of click
- Smoothly replaces building info panel
- Does not interfere with camera controls
- Properly z-indexed above map but below dialogs
- Accessible to screen readers

#### FR-1.3: Click Handler Integration

**Requirement:** Update `CesiumViewer.vue` click handler to show loading state immediately

**Implementation Details:**

- Modify `addFeaturePicker()` method in `CesiumViewer.vue`:

  ```javascript
  // Before featurepicker.processClick()
  store.setClickProcessingState({
  	isProcessing: true,
  	postalCode: pickedPostalCode,
  	postalCodeName: pickedName,
  	stage: 'loading',
  	startTime: performance.now(),
  	canCancel: false,
  });

  // Then call featurepicker
  featurepicker.processClick(event);
  ```

- Add conditional rendering of `MapClickLoadingOverlay` component
- Remove or modify existing `store.setShowBuildingInfo(false)` logic

**Acceptance Criteria:**

- Loading overlay appears before building info disappears
- No visual "gap" or empty screen
- Click processing state is set synchronously
- Performance: <50ms between click and state update

#### FR-1.4: Loading State Progression

**Requirement:** Update loading state as click processing progresses

**State Transition Flow:**

```
'loading' → 'animating' → 'complete' → cleared
```

**Integration Points:**

- Update to 'animating' when `camera.flyTo()` is called
- Update to 'complete' when animation completes
- Clear state when new postal code view is ready
- Set `canCancel: true` during 'animating' stage

**Acceptance Criteria:**

- State transitions occur at correct lifecycle points
- UI reflects current state visually
- State cleanup prevents memory leaks
- Errors in state transitions are logged

### Phase 2: Animation Control (User Empowerment)

**Priority:** P0 (Critical - Must Have)
**Estimated Effort:** 5-7 days
**Dependencies:** Phase 1 complete

#### FR-2.1: Camera Flight Cancellation

**Requirement:** Add capability to interrupt `camera.flyTo()` animation

**Implementation Details:**

- Add to `src/services/camera.js`:

  ```javascript
  class Camera {
  	constructor() {
  		this.currentFlight = null; // Track active flight
  		this.flightCancelRequested = false;
  	}

  	cancelFlight() {
  		if (this.currentFlight) {
  			this.currentFlight.cancelFlight = true;
  			this.flightCancelRequested = true;
  			console.log('[Camera] Flight cancellation requested');
  		}
  	}

  	// Modify existing flyTo methods to store flight reference
  	switchTo3DView() {
  		this.currentFlight = this.viewer.camera.flyTo({
  			// ... existing parameters
  			complete: () => this.onFlightComplete(),
  			cancel: () => this.onFlightCancelled(),
  		});
  	}
  }
  ```

- Add cleanup logic in `onFlightCancelled()` callback
- Reset `currentFlight` and `flightCancelRequested` on completion

**Technical Considerations:**

- CesiumJS `flyTo()` returns a Promise-like object with `cancelFlight` property
- Cancellation may not be instantaneous (frame-based)
- Need to handle state restoration on cancellation

**Acceptance Criteria:**

- `cancelFlight()` method successfully stops camera animation
- Camera returns to previous position within 500ms
- No visual glitches or camera jumps
- State is properly restored on cancellation
- Works with all camera animation methods

#### FR-2.2: ESC Key Handler

**Requirement:** Implement keyboard event listener for ESC key during animation

**Implementation Details:**

- Add to `CesiumViewer.vue` mounted hook:

  ```javascript
  const handleEscKey = (event) => {
  	if (event.key === 'Escape' && store.clickProcessingState.canCancel) {
  		camera.cancelFlight();
  		store.setClickProcessingState({ isProcessing: false });
  		store.setShowBuildingInfo(true); // Restore previous view
  	}
  };

  document.addEventListener('keydown', handleEscKey);

  // Cleanup in beforeUnmount
  document.removeEventListener('keydown', handleEscKey);
  ```

- Prevent default ESC behavior during camera flight
- Ensure ESC works from any focused element

**Accessibility Requirements:**

- ESC key behavior announced to screen readers
- Works regardless of focus position
- Does not interfere with other ESC key uses (dialogs, etc.)

**Acceptance Criteria:**

- ESC key reliably cancels camera animation
- Works when focus is on map, controls, or any element
- Does not interfere with dialog/modal ESC handlers
- Screen reader announces cancellation capability

#### FR-2.3: Cancel Button Component

**Requirement:** Create visual cancel button during camera animation

**Component Specification:**

- **File:** `src/components/CameraSkipButton.vue`
- **Visual Design:**
  - Floating button in bottom-right of overlay
  - Vuetify `v-btn` with `color="primary"` variant
  - Icon: `mdi-skip-next` or `mdi-close`
  - Text: "Press ESC to Cancel" (shows keyboard shortcut)
  - Subtle pulse animation to draw attention
- **Behavior:**
  - Only visible when `canCancel` is true
  - Emits `cancel` event on click
  - Shows tooltip on hover
  - Focus ring for keyboard navigation

**Accessibility Requirements:**

- Button is keyboard focusable
- ARIA label: "Cancel camera animation, press Escape"
- Tooltip announces keyboard shortcut
- Focus indicator clearly visible

**Acceptance Criteria:**

- Button appears during 'animating' stage
- Click triggers flight cancellation
- Visual design matches application style
- Accessible via keyboard navigation
- Tooltip provides clear guidance

#### FR-2.4: State Restoration on Cancellation

**Requirement:** Properly restore application state when animation is cancelled

**Restoration Requirements:**

- Restore camera to previous position
- Show previous building info panel (if applicable)
- Clear click processing state
- Reset any partial data loads
- Log cancellation event for analytics

**Implementation Details:**

- Store previous camera position before flight
- Store previous view state in `clickProcessingState`
- Create `restorePreviousViewState()` action in globalStore
- Call restoration logic in cancellation handler

**Edge Cases to Handle:**

- User cancels then immediately clicks new postal code
- Rapid cancel/click/cancel sequence
- Cancellation during data loading
- Network requests in flight during cancellation

**Acceptance Criteria:**

- Previous view is fully restored within 500ms
- No visual artifacts or glitches
- Data loading requests are properly aborted
- Application state is consistent after cancellation
- User can immediately interact with map again

### Phase 3: Progressive Enhancement (Performance)

**Priority:** P1 (High Priority - Should Have)
**Estimated Effort:** 7-10 days
**Dependencies:** Phase 1 & 2 complete

#### FR-3.1: Parallel Data Loading

**Requirement:** Load postal code data concurrently with camera animation

**Current Sequential Flow:**

```
1. Camera animation (3000ms)
2. Wait for animation complete callback
3. Start data loading (variable time)
4. Display data when loaded
```

**Improved Parallel Flow:**

```
1. Start camera animation
   ├─ Animation runs (3000ms)
   └─ Data loading starts immediately in parallel
2. Both complete around same time
3. Display data immediately
```

**Implementation Details:**

- Modify `featurepicker.js` `handleFeatureWithProperties()`:

  ```javascript
  async handleFeatureWithProperties(id) {
    if (id.properties.posno) {
      const postalCode = id.properties.posno._value;

      // Start both in parallel
      const [cameraPromise, dataPromise] = await Promise.allSettled([
        this.cameraService.switchTo3DView(),  // Returns promise
        this.loadPostalCode(postalCode)       // Data loading
      ]);

      // Handle results
      if (cameraPromise.status === 'rejected') {
        console.error('Camera animation failed:', cameraPromise.reason);
      }

      if (dataPromise.status === 'rejected') {
        console.error('Data loading failed:', dataPromise.reason);
        // Show error UI
      }
    }
  }
  ```

- Convert camera methods to return Promises
- Handle race conditions (data finishes before animation)

**Technical Considerations:**

- Camera animation may complete before data loads
- Need to handle partial data availability
- Error in one shouldn't block the other
- Memory management for concurrent operations

**Acceptance Criteria:**

- Data loading starts immediately with camera animation
- Both operations run in parallel
- Total time reduced by 50% or more
- Error in one operation doesn't crash the other
- Loading overlay shows both operations' status

#### FR-3.2: Progressive UI Updates

**Requirement:** Update UI components as individual data chunks become available

**Progressive Loading Stages:**

1. **Postal code boundary** (fast) - Show outline immediately
2. **Socioeconomic data** (fast) - Update stats panel
3. **Building footprints** (medium) - Render building shapes
4. **Heat exposure data** (medium) - Color buildings by temperature
5. **Tree coverage** (slow) - Add tree overlays

**Implementation Details:**

- Modify `loadPostalCode()` to return individual data promises
- Update UI components as each promise resolves
- Show skeleton loaders for pending data
- Display "Loaded X of Y datasets" progress indicator

**Component Updates:**

- Modify `MapClickLoadingOverlay.vue` to show progress:
  ```vue
  <template>
  	<div class="loading-progress">
  		<v-progress-linear :model-value="loadingProgress" color="primary" />
  		<span>Loading {{ currentDataset }}...</span>
  	</div>
  </template>
  ```

**Acceptance Criteria:**

- UI updates incrementally as data arrives
- User sees progress rather than blank loading screen
- Fastest data (boundary) appears within 500ms
- Slowest data (trees) doesn't block other content
- Progress indicator accurately reflects completion

#### FR-3.3: Loading Performance Optimization

**Requirement:** Optimize data loading to minimize total wait time

**Optimization Strategies:**

1. **Preload Critical Data:**
   - Preload postal code boundaries on app startup
   - Cache frequently accessed postal codes
   - Use service worker for offline support

2. **Lazy Load Non-Critical Data:**
   - Delay tree coverage loading until after buildings
   - Load heat data on-demand based on user toggles
   - Defer sensor data until requested

3. **Optimize Network Requests:**
   - Use HTTP/2 multiplexing for parallel requests
   - Enable gzip compression for GeoJSON
   - Implement request deduplication

4. **Leverage Existing Cache:**
   - Check `cacheWarmer` service for preloaded data
   - Use in-memory cache before hitting network
   - Implement smart cache invalidation

**Implementation Details:**

- Modify `datasource.js` to check cache first
- Add loading priority system (critical, high, normal, low)
- Implement request queue with priority
- Add performance timing metrics

**Performance Targets:**

- Time to first visual change: <100ms
- Time to building footprints visible: <1000ms
- Time to full data loaded: <2000ms
- 50th percentile (P50): <1500ms
- 95th percentile (P95): <3000ms

**Acceptance Criteria:**

- Critical data loads before animation completes
- Non-critical data loads in background
- Cache is utilized when available
- Performance metrics are logged
- Total perceived wait time <2 seconds for 80% of users

#### FR-3.4: Error Handling and Retry Logic

**Requirement:** Gracefully handle data loading failures with user-friendly error messages

**Error Scenarios:**

1. **Network timeout** - No response after 10 seconds
2. **Server error** - 500 response from API
3. **Invalid data** - Malformed GeoJSON
4. **Partial failure** - Some datasets load, others fail
5. **User cancellation** - User pressed ESC during loading

**Error Handling Strategy:**

- Show specific error message based on failure type
- Provide retry button for transient failures
- Display partial data if some datasets loaded successfully
- Log errors to console and analytics
- Fallback to cached data if available

**Implementation Details:**

- Add error state to `clickProcessingState`:
  ```javascript
  clickProcessingState: {
    // ... existing fields
    error: null,           // Error object if failure occurred
    partialData: null,     // Data that loaded successfully
    retryCount: 0          // Number of retry attempts
  }
  ```
- Create `LoadingErrorOverlay.vue` component
- Implement retry logic with exponential backoff
- Add fallback to cached/stale data

**User-Facing Error Messages:**

- "Failed to load postal code data. [Retry]"
- "Slow network detected. Loading may take longer..."
- "Some data failed to load. Showing partial view. [Retry Missing Data]"

**Acceptance Criteria:**

- Errors are displayed clearly to user
- Retry button successfully re-attempts loading
- Partial data is shown when available
- Users can continue using application after error
- Errors are logged with sufficient context for debugging

---

## Non-Functional Requirements

### Performance Requirements

**NFR-1: Responsiveness**

- Time to first visual feedback: <100ms (P50), <150ms (P95)
- Time to complete postal code load: <2000ms (P50), <3000ms (P95)
- Animation cancellation response: <500ms
- Frame rate during animation: 60fps minimum
- Main thread blocking: <50ms for any single operation

**NFR-2: Resource Usage**

- Memory overhead for new components: <5MB additional
- Network bandwidth: Optimize to existing levels (no increase)
- CPU usage during animation: <30% on modern hardware
- Battery impact on mobile: Negligible increase

**NFR-3: Scalability**

- Support concurrent click processing (queue subsequent clicks)
- Handle rapid click sequences without crashes
- Gracefully degrade on slow connections
- Work efficiently with large postal code datasets (100+ entities)

### Accessibility Requirements (WCAG 2.1 AA)

**NFR-4: Keyboard Navigation**

- ESC key cancels animation (FR-2.2)
- All interactive elements keyboard focusable
- Focus order is logical and predictable
- No keyboard traps (user can always escape)
- Tab navigation works during loading states

**NFR-5: Screen Reader Support**

- ARIA live regions announce loading state changes
- All status messages communicated to assistive technology
- Cancel button has descriptive ARIA label
- Loading progress is announced incrementally
- Error messages are announced with `aria-live="assertive"`

**NFR-6: Visual Accessibility**

- Loading overlay has sufficient contrast (4.5:1 minimum)
- Spinner animation has reduced motion alternative
- Focus indicators are clearly visible (3:1 contrast)
- Text is readable at 200% zoom
- Color is not the only indicator of status

**NFR-7: Cognitive Accessibility**

- Clear, simple language in all messages
- Predictable behavior (animations work consistently)
- Progress indicators show current status
- Error messages suggest remediation steps
- No time limits on user interactions

### Security Requirements

**NFR-8: Input Validation**

- Validate postal code data before processing
- Sanitize user input from click events
- Prevent injection attacks in error messages
- Validate GeoJSON structure before rendering

**NFR-9: Error Information Disclosure**

- Error messages do not expose sensitive system details
- Network errors show user-friendly messages only
- Stack traces are logged but not displayed to users
- API endpoint URLs are not exposed in error UI

### Compatibility Requirements

**NFR-10: Browser Support**

- Chrome 90+ (primary)
- Firefox 88+ (primary)
- Safari 14+ (secondary)
- Edge 90+ (secondary)
- No IE11 support required

**NFR-11: Device Support**

- Desktop: 1920x1080 minimum (primary use case)
- Tablet: 1024x768 minimum (testing only)
- Mobile: Not primary target, but should not crash

**NFR-12: CesiumJS Compatibility**

- Compatible with CesiumJS 1.x (current project version)
- Use only documented CesiumJS APIs
- Handle CesiumJS API changes gracefully
- Test with both requestRenderMode enabled and disabled

### Maintainability Requirements

**NFR-13: Code Quality**

- Follow Vue 3 Composition API patterns
- Use TypeScript type hints in JSDoc comments
- Maximum component complexity: 200 lines
- Minimum test coverage: 80% for new code
- ESLint/Prettier compliance required

**NFR-14: Documentation**

- JSDoc comments for all public methods
- README section explaining new features
- Inline comments for complex logic
- Architecture decision records (ADRs) for major decisions

**NFR-15: Testing Requirements**

- Unit tests for state management (Vitest)
- Component tests for Vue components (Vitest + Vue Test Utils)
- E2E tests for user flows (Playwright)
- Accessibility tests (Playwright + axe-core)
- Performance regression tests (Lighthouse)

---

## Technical Requirements

### Architecture Changes

**TR-1: State Management Extensions**

**File:** `src/stores/globalStore.js`

**New State Properties:**

```javascript
state: () => ({
	// ... existing state

	// NEW: Click processing lifecycle state
	clickProcessingState: {
		isProcessing: false,
		postalCode: null,
		postalCodeName: null,
		stage: null, // 'loading' | 'animating' | 'complete'
		startTime: null,
		canCancel: false,
		error: null,
		partialData: null,
		retryCount: 0,
		previousViewState: null, // For restoration on cancel
	},
});
```

**New Actions:**

```javascript
actions: {
  // ... existing actions

  setClickProcessingState(newState) {
    this.clickProcessingState = {
      ...this.clickProcessingState,
      ...newState
    };
  },

  resetClickProcessingState() {
    this.clickProcessingState = {
      isProcessing: false,
      postalCode: null,
      postalCodeName: null,
      stage: null,
      startTime: null,
      canCancel: false,
      error: null,
      partialData: null,
      retryCount: 0,
      previousViewState: null
    };
  },

  captureViewState() {
    const camera = this.cesiumViewer.camera;
    this.clickProcessingState.previousViewState = {
      position: camera.position.clone(),
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll
      },
      showBuildingInfo: this.showBuildingInfo,
      buildingAddress: this.buildingAddress
    };
  },

  restorePreviousViewState() {
    const prevState = this.clickProcessingState.previousViewState;
    if (prevState) {
      this.cesiumViewer.camera.setView({
        destination: prevState.position,
        orientation: prevState.orientation
      });
      this.showBuildingInfo = prevState.showBuildingInfo;
      this.buildingAddress = prevState.buildingAddress;
    }
  }
}
```

**Acceptance Criteria:**

- State is reactive (Vue 3 reactivity)
- State persists across components
- State is properly typed in JSDoc
- State cleanup prevents memory leaks

---

**TR-2: Camera Service Extensions**

**File:** `src/services/camera.js`

**New Properties and Methods:**

```javascript
class Camera {
	constructor() {
		// ... existing properties
		this.currentFlight = null;
		this.flightCancelRequested = false;
		this.previousCameraState = null;
	}

	/**
	 * Cancels the current camera flight animation
	 * @returns {boolean} True if cancellation was initiated
	 */
	cancelFlight() {
		if (this.currentFlight && !this.flightCancelRequested) {
			this.currentFlight.cancelFlight = true;
			this.flightCancelRequested = true;
			console.log('[Camera] Flight cancellation requested');
			return true;
		}
		return false;
	}

	/**
	 * Captures current camera state for restoration
	 */
	captureCurrentState() {
		const camera = this.viewer.camera;
		this.previousCameraState = {
			position: camera.position.clone(),
			heading: camera.heading,
			pitch: camera.pitch,
			roll: camera.roll,
		};
	}

	/**
	 * Restores previously captured camera state
	 */
	restoreCapturedState() {
		if (this.previousCameraState) {
			this.viewer.camera.setView({
				destination: this.previousCameraState.position,
				orientation: {
					heading: this.previousCameraState.heading,
					pitch: this.previousCameraState.pitch,
					roll: this.previousCameraState.roll,
				},
			});
		}
	}

	/**
	 * Handles flight completion callback
	 * @private
	 */
	onFlightComplete() {
		this.currentFlight = null;
		this.flightCancelRequested = false;
		this.previousCameraState = null;
		console.log('[Camera] Flight completed');
	}

	/**
	 * Handles flight cancellation callback
	 * @private
	 */
	onFlightCancelled() {
		console.log('[Camera] Flight cancelled');
		this.restoreCapturedState();
		this.currentFlight = null;
		this.flightCancelRequested = false;

		// Notify store
		const globalStore = useGlobalStore();
		globalStore.restorePreviousViewState();
		globalStore.resetClickProcessingState();
	}
}
```

**Modified Methods:**

```javascript
// Update switchTo3DView to support cancellation
switchTo3DView() {
  this.captureCurrentState();  // NEW: Capture before flight

  // Find postal code entity (existing logic)
  const postCodesDataSource = this.viewer.dataSources._dataSources.find(
    (ds) => ds.name === 'PostCodes'
  );

  for (let i = 0; i < postCodesDataSource._entityCollection._entities._array.length; i++) {
    let entity = postCodesDataSource._entityCollection._entities._array[i];

    if (entity._properties._posno._value == this.store.postalcode) {
      // NEW: Store flight reference
      this.currentFlight = this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          entity._properties._center_x._value,
          entity._properties._center_y._value - 0.025,
          2000
        ),
        orientation: {
          heading: 0.0,
          pitch: Cesium.Math.toRadians(-35.0),
          roll: 0.0,
        },
        duration: 3,
        complete: () => this.onFlightComplete(),  // NEW
        cancel: () => this.onFlightCancelled()    // NEW
      });

      // NEW: Update store state
      const globalStore = useGlobalStore();
      globalStore.setClickProcessingState({
        stage: 'animating',
        canCancel: true
      });

      return this.currentFlight;  // NEW: Return promise
    }
  }
}
```

**Acceptance Criteria:**

- `cancelFlight()` reliably stops animation
- Camera state restoration works correctly
- No memory leaks from stored references
- Works with all camera animation methods
- Proper cleanup in all code paths

---

**TR-3: FeaturePicker Service Extensions**

**File:** `src/services/featurepicker.js`

**Modified Methods:**

```javascript
/**
 * Handles feature selection with improved feedback and parallel loading
 * @param {Object} id - Picked entity
 */
async handleFeatureWithProperties(id) {
  console.log('[FeaturePicker] Clicked feature properties:', id.properties);

  // ... existing validation logic

  // NEW: Postal code handling with improved UX
  if (id.properties.posno) {
    const newPostalCode = id.properties.posno._value;
    const postalCodeName = id.properties.nimi?._value || `Postal Code ${newPostalCode}`;
    const currentPostalCode = this.store.postalcode;

    // NEW: Capture view state before any changes
    this.store.captureViewState();

    if (
      newPostalCode !== currentPostalCode ||
      this.store.level === 'start' ||
      this.store.level === 'building'
    ) {
      console.log('[FeaturePicker] Starting parallel loading for:', newPostalCode);

      // NEW: Set loading state immediately
      this.store.setClickProcessingState({
        isProcessing: true,
        postalCode: newPostalCode,
        postalCodeName: postalCodeName,
        stage: 'loading',
        startTime: performance.now(),
        canCancel: false
      });

      // Update postal code in store
      this.store.setPostalCode(newPostalCode);

      // NEW: Start camera animation and data loading in parallel
      try {
        const [cameraResult, dataResult] = await Promise.allSettled([
          this.cameraService.switchTo3DView(),        // Returns promise now
          this.loadPostalCodeData(newPostalCode)      // NEW: Renamed method
        ]);

        // Handle results
        if (cameraResult.status === 'rejected') {
          console.error('[FeaturePicker] Camera animation failed:', cameraResult.reason);
          // Don't fail entire operation if camera fails
        }

        if (dataResult.status === 'rejected') {
          console.error('[FeaturePicker] Data loading failed:', dataResult.reason);
          this.store.setClickProcessingState({
            error: {
              message: 'Failed to load postal code data',
              details: dataResult.reason
            }
          });
        } else {
          // Success - update UI
          this.elementsDisplayService.setViewDisplay('none');
          this.store.setClickProcessingState({
            stage: 'complete',
            error: null
          });
        }
      } catch (error) {
        console.error('[FeaturePicker] Unexpected error during postal code loading:', error);
        this.store.setClickProcessingState({
          error: {
            message: 'Unexpected error occurred',
            details: error.message
          }
        });
      } finally {
        // Clean up after short delay
        setTimeout(() => {
          this.store.resetClickProcessingState();
        }, 500);
      }
    }
  }

  // ... rest of existing logic
}

/**
 * NEW: Loads postal code data with progressive updates
 * @param {string} postalCode - Postal code to load
 * @returns {Promise<void>}
 */
async loadPostalCodeData(postalCode) {
  console.log('[FeaturePicker] Loading data for postal code:', postalCode);

  // Set zone name
  this.setNameOfZone();
  this.elementsDisplayService.setSwitchViewElementsDisplay('inline-block');
  this.datasourceService.removeDataSourcesAndEntities();

  // Load region-specific data based on view mode
  if (!this.toggleStore.helsinkiView) {
    await this.capitalRegionService.loadCapitalRegionElements();
  } else {
    await this.helsinkiService.loadHelsinkiElements();
  }

  this.store.setLevel('postalCode');
  console.log('[FeaturePicker] Data loading complete for:', postalCode);
}
```

**Acceptance Criteria:**

- Parallel loading works correctly
- Error in one operation doesn't crash the other
- State is properly managed throughout
- Performance is improved vs sequential loading
- Existing functionality is preserved

---

### Component Specifications

**TR-4: MapClickLoadingOverlay Component**

**File:** `src/components/MapClickLoadingOverlay.vue`

**Full Implementation:**

```vue
<template>
	<v-overlay :model-value="isVisible" persistent class="map-click-loading-overlay" :z-index="1000">
		<v-card
			class="loading-card pa-6"
			elevation="8"
			min-width="400"
			role="status"
			aria-live="polite"
			aria-atomic="true"
		>
			<!-- Header -->
			<div class="d-flex align-center mb-4">
				<v-progress-circular indeterminate color="primary" size="32" :width="3" class="mr-4" />
				<div>
					<h3 class="text-h6">
						{{ stageText }}
					</h3>
					<p class="text-body-2 text-medium-emphasis mb-0">
						{{ postalCodeName }}
					</p>
				</div>
			</div>

			<!-- Progress bar for data loading -->
			<v-progress-linear
				v-if="showProgress"
				:model-value="loadingProgress"
				color="primary"
				height="6"
				class="mb-3"
			/>

			<!-- Cancel button (during animation stage) -->
			<v-btn
				v-if="canCancel"
				variant="outlined"
				color="primary"
				block
				@click="handleCancel"
				@keydown.esc="handleCancel"
				aria-label="Cancel camera animation, press Escape key"
			>
				<v-icon start>mdi-close</v-icon>
				Press ESC to Cancel
			</v-btn>

			<!-- Error state -->
			<v-alert v-if="error" type="error" variant="tonal" class="mt-4">
				<div class="d-flex align-center justify-space-between">
					<span>{{ error.message }}</span>
					<v-btn size="small" variant="text" @click="handleRetry"> Retry </v-btn>
				</div>
			</v-alert>
		</v-card>
	</v-overlay>
</template>

<script>
import { computed } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';

export default {
	name: 'MapClickLoadingOverlay',

	emits: ['cancel', 'retry'],

	setup(props, { emit }) {
		const store = useGlobalStore();

		const isVisible = computed(() => store.clickProcessingState.isProcessing);
		const postalCodeName = computed(
			() => store.clickProcessingState.postalCodeName || 'Loading...'
		);
		const stage = computed(() => store.clickProcessingState.stage);
		const canCancel = computed(() => store.clickProcessingState.canCancel);
		const error = computed(() => store.clickProcessingState.error);

		const stageText = computed(() => {
			switch (stage.value) {
				case 'loading':
					return 'Loading Postal Code';
				case 'animating':
					return 'Moving Camera';
				case 'complete':
					return 'Almost Ready';
				default:
					return 'Processing';
			}
		});

		const showProgress = computed(() => stage.value === 'loading' || stage.value === 'animating');

		// Simulated progress (real implementation would track actual data loading)
		const loadingProgress = computed(() => {
			switch (stage.value) {
				case 'loading':
					return 30;
				case 'animating':
					return 60;
				case 'complete':
					return 100;
				default:
					return 0;
			}
		});

		const handleCancel = () => {
			emit('cancel');
		};

		const handleRetry = () => {
			emit('retry');
		};

		return {
			isVisible,
			postalCodeName,
			stage,
			stageText,
			canCancel,
			error,
			showProgress,
			loadingProgress,
			handleCancel,
			handleRetry,
		};
	},
};
</script>

<style scoped>
.map-click-loading-overlay {
	display: flex;
	align-items: center;
	justify-content: center;
}

.loading-card {
	background: rgba(255, 255, 255, 0.98);
	backdrop-filter: blur(10px);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
	.v-progress-circular {
		animation: none;
	}
}
</style>
```

**Acceptance Criteria:**

- Component renders based on store state
- Proper ARIA attributes for accessibility
- Cancel button works via click and ESC key
- Error state displays correctly
- Smooth animations with reduced motion support
- Z-index properly stacks above map but below dialogs

---

**TR-5: Integration in CesiumViewer**

**File:** `src/pages/CesiumViewer.vue`

**Template Changes:**

```vue
<template>
	<div id="cesiumContainer">
		<!-- Camera Controls -->
		<CameraControls />

		<!-- Loading Component -->
		<Loading v-if="store.isLoading" />

		<!-- NEW: Map Click Loading Overlay -->
		<MapClickLoadingOverlay @cancel="handleCancelAnimation" @retry="handleRetryLoading" />

		<!-- Disclaimer Popup -->
		<DisclaimerPopup class="disclaimer-popup" />

		<!-- Building Information (modified conditional) -->
		<BuildingInformation v-if="shouldShowBuildingInformation" />

		<!-- Error Snackbar -->
		<v-snackbar><!-- ... existing ... --></v-snackbar>
	</div>
</template>
```

**Script Changes:**

```javascript
import MapClickLoadingOverlay from '../components/MapClickLoadingOverlay.vue';

export default {
	components: {
		// ... existing components
		MapClickLoadingOverlay, // NEW
	},

	setup() {
		// ... existing setup code

		/**
		 * NEW: Handles cancellation of camera animation via ESC key or button
		 */
		const handleCancelAnimation = () => {
			console.log('[CesiumViewer] User requested animation cancellation');

			const camera = new Camera();
			const wasCancelled = camera.cancelFlight();

			if (wasCancelled) {
				// Camera service handles state restoration
				console.log('[CesiumViewer] Animation cancelled successfully');
			}
		};

		/**
		 * NEW: Handles retry of failed postal code loading
		 */
		const handleRetryLoading = () => {
			console.log('[CesiumViewer] User requested data loading retry');

			const postalCode = store.clickProcessingState.postalCode;
			if (postalCode) {
				// Reset error state
				store.setClickProcessingState({
					error: null,
					retryCount: store.clickProcessingState.retryCount + 1,
				});

				// Retry loading
				const featurepicker = new Featurepicker();
				featurepicker.loadPostalCodeData(postalCode);
			}
		};

		/**
		 * NEW: Global ESC key handler for animation cancellation
		 */
		const handleGlobalEscKey = (event) => {
			if (event.key === 'Escape' && store.clickProcessingState.canCancel) {
				handleCancelAnimation();
			}
		};

		onMounted(async () => {
			await initViewer();
			// ... existing onMounted code

			// NEW: Register ESC key handler
			document.addEventListener('keydown', handleGlobalEscKey);
		});

		onBeforeUnmount(() => {
			// NEW: Clean up ESC key handler
			document.removeEventListener('keydown', handleGlobalEscKey);
		});

		return {
			// ... existing returns
			handleCancelAnimation, // NEW
			handleRetryLoading, // NEW
		};
	},
};
```

**Acceptance Criteria:**

- Component is properly imported and registered
- Event handlers are connected correctly
- ESC key handler is registered and cleaned up
- No regressions in existing functionality
- Component renders at correct position in layout

---

### Data Flow Diagram

**Current Flow (Sequential):**

```
User Click → Debounce Check → Camera Animation → Wait → Data Load → UI Update
    0ms         500ms            500-3500ms      4500ms    4500ms+    5000ms+
     |            |                   |             |          |          |
     └─[no feedback]──────────────────┘             └──────────┘
                                                   (still no UI)
```

**Improved Flow (Parallel with Feedback):**

```
User Click → Store Update → UI Feedback → Camera Animation → UI Update
    0ms         <10ms         <100ms         100-3100ms       1500ms+
     |            |              |                 |              |
     └────────────┴──────────────┴─────────────────┴──────────────┘
           (immediate feedback throughout)
                                └─────┬─────┘
                                      │
                                Data Loading (parallel)
                                100ms - 2000ms
```

**State Transitions:**

```
Initial State
     │
     ├─ User clicks postal code
     │
     ▼
clickProcessingState: {
  isProcessing: true,
  stage: 'loading',
  canCancel: false
}
     │
     ├─ Camera animation starts
     │
     ▼
clickProcessingState: {
  stage: 'animating',
  canCancel: true
}
     │
     ├─ Animation + Data loading complete
     │
     ▼
clickProcessingState: {
  stage: 'complete',
  canCancel: false
}
     │
     ├─ 500ms delay
     │
     ▼
clickProcessingState reset
(isProcessing: false)
```

---

### Testing Strategy

**TR-6: Unit Tests (Vitest)**

**Test File:** `src/stores/globalStore.spec.js`

```javascript
describe('globalStore - clickProcessingState', () => {
	it('should initialize with default click processing state', () => {
		const store = useGlobalStore();
		expect(store.clickProcessingState.isProcessing).toBe(false);
		expect(store.clickProcessingState.postalCode).toBeNull();
	});

	it('should update click processing state', () => {
		const store = useGlobalStore();
		store.setClickProcessingState({
			isProcessing: true,
			postalCode: '00100',
			stage: 'loading',
		});
		expect(store.clickProcessingState.isProcessing).toBe(true);
		expect(store.clickProcessingState.postalCode).toBe('00100');
	});

	it('should capture and restore view state', () => {
		// Test captureViewState and restorePreviousViewState
	});

	it('should reset click processing state', () => {
		// Test resetClickProcessingState
	});
});
```

**Test File:** `src/services/camera.spec.js`

```javascript
describe('Camera - flight cancellation', () => {
	it('should cancel active flight', () => {
		const camera = new Camera();
		// Mock viewer and initiate flight
		const wasCancelled = camera.cancelFlight();
		expect(wasCancelled).toBe(true);
	});

	it('should restore previous camera position on cancellation', () => {
		// Test state restoration
	});

	it('should return false if no active flight', () => {
		const camera = new Camera();
		expect(camera.cancelFlight()).toBe(false);
	});
});
```

**Test File:** `src/components/MapClickLoadingOverlay.spec.js`

```javascript
describe('MapClickLoadingOverlay', () => {
	it('should render when isProcessing is true', () => {
		// Test component visibility
	});

	it('should emit cancel event when ESC is pressed', () => {
		// Test ESC key handling
	});

	it('should show cancel button when canCancel is true', () => {
		// Test conditional rendering
	});

	it('should display error state correctly', () => {
		// Test error display
	});

	it('should have correct ARIA attributes', () => {
		// Test accessibility attributes
	});
});
```

**Coverage Target:** 80% minimum for new code

---

**TR-7: E2E Tests (Playwright)**

**Test File:** `tests/e2e/map-click-ux.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Map Click UX Enhancement', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:5173');
		await page.waitForSelector('#cesiumContainer');
	});

	test('should show loading overlay within 100ms of postal code click', async ({ page }) => {
		// Click a postal code boundary
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Expect loading overlay to appear quickly
		const loadingOverlay = page.locator('.map-click-loading-overlay');
		await expect(loadingOverlay).toBeVisible({ timeout: 100 });

		// Verify postal code name is displayed
		await expect(loadingOverlay).toContainText('Postal Code');
	});

	test('should allow cancellation of camera animation with ESC key', async ({ page }) => {
		// Click postal code to start animation
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Wait for animating stage (cancel button should appear)
		await page.waitForSelector('text=Press ESC to Cancel');

		// Press ESC to cancel
		await page.keyboard.press('Escape');

		// Loading overlay should disappear
		const loadingOverlay = page.locator('.map-click-loading-overlay');
		await expect(loadingOverlay).not.toBeVisible({ timeout: 1000 });

		// Previous view should be restored
		// (verify building info panel or previous state)
	});

	test('should allow cancellation via cancel button click', async ({ page }) => {
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		const cancelButton = page.locator('text=Press ESC to Cancel');
		await cancelButton.waitFor({ state: 'visible' });
		await cancelButton.click();

		// Verify cancellation
		const loadingOverlay = page.locator('.map-click-loading-overlay');
		await expect(loadingOverlay).not.toBeVisible({ timeout: 1000 });
	});

	test('should complete loading within 3 seconds', async ({ page }) => {
		const startTime = Date.now();

		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Wait for loading to complete
		const loadingOverlay = page.locator('.map-click-loading-overlay');
		await expect(loadingOverlay).not.toBeVisible({ timeout: 3000 });

		const duration = Date.now() - startTime;
		expect(duration).toBeLessThan(3000);
	});

	test('should show error state on data loading failure', async ({ page }) => {
		// Mock network failure
		await page.route('**/assets/data/**', (route) => route.abort());

		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Expect error message to appear
		const errorAlert = page.locator('.v-alert--type-error');
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText('Failed to load');

		// Retry button should be available
		const retryButton = page.locator('text=Retry');
		await expect(retryButton).toBeVisible();
	});
});
```

---

**TR-8: Accessibility Tests (Playwright + axe-core)**

**Test File:** `tests/accessibility/map-click-loading.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Map Click Loading - Accessibility', () => {
	test('should meet WCAG 2.1 AA standards for loading overlay', async ({ page }) => {
		await page.goto('http://localhost:5173');
		await injectAxe(page);

		// Trigger loading overlay
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });
		await page.waitForSelector('.map-click-loading-overlay');

		// Run accessibility checks
		await checkA11y(page, '.map-click-loading-overlay', {
			detailedReport: true,
			detailedReportOptions: { html: true },
		});
	});

	test('should have proper ARIA live region announcements', async ({ page }) => {
		await page.goto('http://localhost:5173');

		// Click postal code
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Verify ARIA attributes
		const loadingCard = page.locator('[role="status"]');
		await expect(loadingCard).toHaveAttribute('aria-live', 'polite');
		await expect(loadingCard).toHaveAttribute('aria-atomic', 'true');
	});

	test('should support keyboard navigation for cancel button', async ({ page }) => {
		await page.goto('http://localhost:5173');

		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Tab to cancel button
		await page.keyboard.press('Tab');
		// (may need multiple tabs depending on layout)

		// Verify focus on cancel button
		const cancelButton = page.locator('text=Press ESC to Cancel');
		await expect(cancelButton).toBeFocused();

		// Press Enter to activate
		await page.keyboard.press('Enter');

		// Verify cancellation
		const loadingOverlay = page.locator('.map-click-loading-overlay');
		await expect(loadingOverlay).not.toBeVisible({ timeout: 1000 });
	});

	test('should have sufficient color contrast', async ({ page }) => {
		await page.goto('http://localhost:5173');
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Check contrast ratios (axe will handle this in checkA11y)
		await injectAxe(page);
		await checkA11y(page, '.map-click-loading-overlay', {
			rules: {
				'color-contrast': { enabled: true },
			},
		});
	});
});
```

---

**TR-9: Performance Tests**

**Test File:** `tests/performance/map-click-timing.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Map Click Performance', () => {
	test('should show feedback within 100ms', async ({ page }) => {
		await page.goto('http://localhost:5173');
		await page.waitForSelector('#cesiumContainer');

		// Measure time to first feedback
		const startTime = await page.evaluate(() => performance.now());

		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		await page.waitForSelector('.map-click-loading-overlay');

		const endTime = await page.evaluate(() => performance.now());
		const duration = endTime - startTime;

		console.log(`Time to first feedback: ${duration}ms`);
		expect(duration).toBeLessThan(100);
	});

	test('should complete full loading within 3 seconds (P95)', async ({ page }) => {
		await page.goto('http://localhost:5173');

		const measurements = [];

		// Run multiple iterations
		for (let i = 0; i < 10; i++) {
			const startTime = await page.evaluate(() => performance.now());

			await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });
			await page.waitForSelector('.map-click-loading-overlay', { state: 'hidden', timeout: 5000 });

			const endTime = await page.evaluate(() => performance.now());
			measurements.push(endTime - startTime);

			// Reset for next iteration
			await page.goto('http://localhost:5173');
			await page.waitForSelector('#cesiumContainer');
		}

		// Calculate P95
		measurements.sort((a, b) => a - b);
		const p95Index = Math.floor(measurements.length * 0.95);
		const p95 = measurements[p95Index];

		console.log(`P95 loading time: ${p95}ms`);
		expect(p95).toBeLessThan(3000);
	});

	test('should maintain 60fps during animation', async ({ page }) => {
		await page.goto('http://localhost:5173');

		// Start performance monitoring
		await page.evaluate(() => {
			window.frameTimings = [];
			let lastTime = performance.now();

			function measureFrame() {
				const currentTime = performance.now();
				window.frameTimings.push(currentTime - lastTime);
				lastTime = currentTime;
				requestAnimationFrame(measureFrame);
			}

			requestAnimationFrame(measureFrame);
		});

		// Trigger animation
		await page.click('#cesiumContainer', { position: { x: 500, y: 400 } });

		// Wait for animation to complete
		await page.waitForTimeout(3500);

		// Analyze frame timings
		const frameTimings = await page.evaluate(() => window.frameTimings);
		const avgFrameTime = frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;
		const fps = 1000 / avgFrameTime;

		console.log(`Average FPS during animation: ${fps}`);
		expect(fps).toBeGreaterThan(55); // Allow slight variance from 60fps
	});
});
```

---

## Success Metrics and KPIs

### Primary Metrics

**M-1: Time to First Visual Feedback**

- **Definition:** Time from user click to loading overlay appearing
- **Measurement:** `performance.now()` at click event → loading overlay render
- **Target:** <100ms (P50), <150ms (P95)
- **Current Baseline:** No feedback (effectively infinite)
- **Data Collection:**
  - Client-side performance timing in `clickProcessingState.startTime`
  - Log to analytics on overlay render
- **Success Criteria:** 90% of interactions show feedback within 100ms

**M-2: Perceived Wait Time**

- **Definition:** Total time user feels they're waiting (click → can interact with new view)
- **Measurement:** Click event → `clickProcessingState.stage = 'complete'`
- **Target:** <2000ms (P50), <3000ms (P95)
- **Current Baseline:** 4500ms+ (sequential loading)
- **Data Collection:**
  - Performance mark at click: `performance.mark('click-start')`
  - Performance mark at complete: `performance.mark('click-complete')`
  - Calculate measure: `performance.measure('click-interaction', 'click-start', 'click-complete')`
- **Success Criteria:** 50% reduction in perceived wait time

**M-3: Animation Cancellation Rate**

- **Definition:** Percentage of camera animations cancelled by users
- **Measurement:** Count of `cancelFlight()` calls / total animations started
- **Target:** <10% (low cancellation indicates correct postal code selection)
- **Current Baseline:** N/A (feature doesn't exist)
- **Data Collection:**
  - Increment counter on `cancelFlight()` call
  - Log to analytics with postal code context
- **Insight Value:** High cancellation rate may indicate:
  - UI/UX confusion (users clicking wrong areas)
  - Need for postal code preview on hover
  - Overly long animation duration

**M-4: User Satisfaction Score**

- **Definition:** User-reported satisfaction with map interaction speed
- **Measurement:** Post-interaction survey or in-app feedback widget
- **Target:** >80% "satisfied" or "very satisfied"
- **Current Baseline:** Unknown (collect before/after data)
- **Data Collection:**
  - Optional feedback prompt after 5 interactions
  - Simple thumbs up/down or 5-star rating
- **Success Criteria:** Measurable improvement in satisfaction scores

### Secondary Metrics

**M-5: Accessibility Compliance Rate**

- **Definition:** Percentage of WCAG 2.1 AA success criteria passed
- **Measurement:** Automated axe-core testing + manual testing
- **Target:** 100% (all applicable criteria)
- **Current Baseline:** Unknown (establish via initial audit)
- **Data Collection:**
  - Automated axe-core reports in CI/CD
  - Manual accessibility audit checklist
- **Success Criteria:** Zero WCAG 2.1 AA violations in interaction flow

**M-6: Error Rate**

- **Definition:** Percentage of postal code loads that fail
- **Measurement:** Count of errors / total load attempts
- **Target:** <2% (mostly network issues)
- **Current Baseline:** Unknown (not currently tracked)
- **Data Collection:**
  - Log all errors to analytics with context:
    - Postal code
    - Error type (network, timeout, invalid data)
    - Retry success rate
- **Success Criteria:** Error handling prevents user frustration (measured via satisfaction)

**M-7: Performance Regression**

- **Definition:** Ensure new features don't slow down existing functionality
- **Measurement:** Lighthouse performance scores before/after
- **Target:** No decrease in Lighthouse score (maintain or improve)
- **Current Baseline:** Run baseline Lighthouse audit
- **Data Collection:**
  - Automated Lighthouse runs in CI/CD
  - Track scores over time
- **Success Criteria:** Performance score remains within 5 points of baseline

### Business Metrics

**M-8: User Engagement**

- **Definition:** Number of postal code interactions per session
- **Measurement:** Count of postal code clicks per user session
- **Target:** 10-20% increase (users explore more confidently)
- **Current Baseline:** Establish via current analytics
- **Data Collection:**
  - Track postal code selection events in analytics
  - Segment by user type (new vs returning)
- **Success Criteria:** Increased exploration indicates improved UX

**M-9: Task Completion Rate**

- **Definition:** Percentage of users who successfully complete research tasks
- **Measurement:** Task-based usability testing
- **Target:** >90% task completion
- **Current Baseline:** Establish via initial usability testing
- **Data Collection:**
  - Usability testing sessions (5-10 users)
  - Task scenarios: "Compare heat exposure in 3 postal codes"
- **Success Criteria:** Faster and more confident task completion

### Measurement Methodology

**Data Collection Implementation:**

```javascript
// In globalStore.js
actions: {
  setClickProcessingState(newState) {
    // Existing state update logic
    this.clickProcessingState = { ...this.clickProcessingState, ...newState };

    // NEW: Track metrics
    if (newState.stage === 'loading' && newState.startTime) {
      // Mark start of interaction
      performance.mark('map-click-start');
    }

    if (newState.stage === 'complete') {
      // Mark completion
      performance.mark('map-click-complete');

      // Measure total duration
      performance.measure('map-click-interaction', 'map-click-start', 'map-click-complete');

      // Get measurement
      const measure = performance.getEntriesByName('map-click-interaction')[0];
      const duration = measure.duration;

      // Log to analytics
      if (window.analytics) {
        window.analytics.track('Map Click Completed', {
          postalCode: this.clickProcessingState.postalCode,
          duration: duration,
          stage: 'complete',
          hadError: !!this.clickProcessingState.error
        });
      }

      // Clean up performance entries
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}
```

**Analytics Dashboard:**

- Create dedicated dashboard tracking all metrics
- Daily/weekly reports on key metrics
- Alerts for regressions (e.g., P95 > 3500ms)
- A/B testing capability for future optimizations

---

## Out of Scope

### Explicitly Excluded Features

**ES-1: Camera Animation Speed Control**

- **Description:** UI controls to adjust animation duration (faster/slower)
- **Rationale:** Adds complexity without addressing core pain point; skip capability sufficient
- **Future Consideration:** May revisit in v2 if user feedback requests variable speeds

**ES-2: Postal Code Preview on Hover**

- **Description:** Tooltip showing postal code info when hovering over boundary
- **Rationale:** Different feature scope; focus on click interaction first
- **Future Consideration:** Good candidate for separate PRD after click UX is improved

**ES-3: Animation Path Customization**

- **Description:** Allow users to customize camera flight path (arc vs direct)
- **Rationale:** Niche requirement; default path works for most use cases
- **Future Consideration:** Advanced user feature for later iteration

**ES-4: Offline Data Caching**

- **Description:** Service worker caching for offline postal code browsing
- **Rationale:** Out of scope for click UX improvement; separate infrastructure work
- **Future Consideration:** Good PWA enhancement but not critical for this feature

**ES-5: Multi-Postal Code Selection**

- **Description:** Select multiple postal codes for comparison
- **Rationale:** Different interaction model; requires separate design work
- **Future Consideration:** Future enhancement after single-selection UX is solid

**ES-6: Debounce Logic Modification**

- **Description:** Remove or adjust the 500ms click debounce
- **Rationale:** Performance safeguard; immediate feedback sufficient without removing debounce
- **Future Consideration:** May revisit if immediate feedback still feels laggy

**ES-7: Building Info Panel Redesign**

- **Description:** Redesign entire building information panel UI
- **Rationale:** Separate UX workstream; focus on loading states only
- **Future Consideration:** Natural follow-up after loading experience is improved

**ES-8: Camera Animation Refactoring**

- **Description:** Replace CesiumJS camera system with custom implementation
- **Rationale:** High risk, low reward; leverage existing Cesium capabilities
- **Future Consideration:** Only if Cesium limitations become blocking

### Future Enhancements (Not in v1)

**FE-1: Predictive Preloading**

- Preload adjacent postal codes based on user viewport
- Machine learning to predict next interaction
- Smarter cache warming based on usage patterns

**FE-2: Animation Optimization**

- Investigate faster animation algorithms
- Terrain-aware camera paths
- Dynamic animation duration based on distance

**FE-3: Progressive Web App Features**

- Offline support with service workers
- Background sync for data updates
- Push notifications for new data

**FE-4: Advanced Analytics**

- Heatmaps of user interaction patterns
- A/B testing framework for UX variations
- Real-time performance monitoring dashboard

**FE-5: Enhanced Accessibility**

- Voice control for map navigation
- Haptic feedback for mobile devices
- High contrast themes for visual impairments

---

## Dependencies and Risks

### Technical Dependencies

**D-1: CesiumJS Camera API**

- **Description:** Reliance on CesiumJS `camera.flyTo()` cancellation capability
- **Risk Level:** Medium
- **Mitigation:**
  - Verify cancellation support in current CesiumJS version
  - Create fallback using `camera.setView()` if cancellation fails
  - Test thoroughly across CesiumJS versions
- **Contingency Plan:** If cancellation proves unreliable, implement "fast-forward" to end of animation instead

**D-2: Vue 3 Reactivity System**

- **Description:** State management relies on Vue 3 reactive refs/computed
- **Risk Level:** Low
- **Mitigation:**
  - Use well-documented Vue 3 Composition API patterns
  - Follow Pinia state management best practices
- **Contingency Plan:** N/A - Vue 3 reactivity is stable and proven

**D-3: Vuetify Component Library**

- **Description:** Loading overlay uses Vuetify components (v-overlay, v-card, etc.)
- **Risk Level:** Low
- **Mitigation:**
  - Use only stable Vuetify components
  - Test across different viewport sizes
- **Contingency Plan:** Could fall back to custom HTML/CSS if Vuetify issues arise

**D-4: Existing Data Loading Services**

- **Description:** Parallel loading depends on existing `datasource.js`, `building.js`, etc.
- **Risk Level:** Medium
- **Mitigation:**
  - Thoroughly understand existing service contracts
  - Add error handling for all data loading paths
  - Implement timeout protection (10 second max)
- **Contingency Plan:** Fall back to sequential loading if parallel causes issues

### Integration Risks

**R-1: Race Conditions in State Management**

- **Description:** Rapid clicks or cancellations could cause inconsistent state
- **Impact:** High (broken UI, data corruption)
- **Probability:** Medium
- **Mitigation:**
  - Implement state machine for click processing lifecycle
  - Add state transition guards to prevent invalid transitions
  - Queue subsequent clicks during active processing
- **Detection:** Unit tests for state transitions, E2E tests for rapid interaction
- **Contingency:** Add mutex lock on click processing state

**R-2: Memory Leaks from Event Listeners**

- **Description:** ESC key listener or animation callbacks not properly cleaned up
- **Impact:** Medium (degraded performance over time)
- **Probability:** Low
- **Mitigation:**
  - Use Vue lifecycle hooks correctly (onBeforeUnmount)
  - Remove all event listeners in cleanup
  - Test for memory leaks with Chrome DevTools
- **Detection:** Memory profiling during development
- **Contingency:** Implement weak references or cleanup service

**R-3: Breaking Changes in Existing Services**

- **Description:** Modifying camera.js and featurepicker.js could break other functionality
- **Impact:** High (regressions in unrelated features)
- **Probability:** Medium
- **Mitigation:**
  - Comprehensive regression testing
  - Feature flags to enable/disable new behavior
  - Backwards compatibility for existing method signatures
- **Detection:** Full test suite run before merge
- **Contingency:** Feature flag allows rollback without code changes

**R-4: Performance Degradation**

- **Description:** Parallel loading could overwhelm browser or server
- **Impact:** Medium (slower loading than current)
- **Probability:** Low
- **Mitigation:**
  - Implement request throttling/queuing
  - Monitor network request concurrency
  - Load test with multiple simultaneous users
- **Detection:** Performance tests in CI/CD
- **Contingency:** Add configurable concurrency limits

### Usability Risks

**R-5: User Confusion from Loading Overlay**

- **Description:** New overlay UI might confuse existing users
- **Impact:** Low (users adapt quickly)
- **Probability:** Low
- **Mitigation:**
  - Clear, descriptive text in overlay
  - Consistent with existing loading patterns
  - User testing before release
- **Detection:** User acceptance testing, post-release feedback
- **Contingency:** Iterate on messaging based on feedback

**R-6: ESC Key Conflicts**

- **Description:** ESC key might conflict with other application functions
- **Impact:** Medium (unexpected behavior)
- **Probability:** Low
- **Mitigation:**
  - Only handle ESC when `canCancel` is true
  - Don't preventDefault unless we handle it
  - Test with dialogs, modals, and other ESC-using components
- **Detection:** E2E tests covering ESC key in various contexts
- **Contingency:** Add preference to disable ESC cancellation

**R-7: Accessibility Regressions**

- **Description:** New components might introduce accessibility barriers
- **Impact:** High (blocks users with disabilities)
- **Probability:** Low
- **Mitigation:**
  - Automated axe-core testing
  - Manual screen reader testing
  - ARIA attributes from the start
- **Detection:** Accessibility test suite
- **Contingency:** Must fix before release (accessibility is non-negotiable)

### External Dependencies

**D-5: Browser Support**

- **Description:** Requires modern browser features (ESC key handling, Promise.allSettled)
- **Risk Level:** Low
- **Mitigation:**
  - Target browsers already defined (Chrome 90+, Firefox 88+, Safari 14+)
  - Polyfill `Promise.allSettled` if needed
- **Contingency:** Graceful degradation for older browsers

**D-6: Network Reliability**

- **Description:** Users on slow/unstable networks may see partial loading failures
- **Risk Level:** Medium
- **Mitigation:**
  - Implement robust error handling
  - Show partial data when available
  - Retry logic with exponential backoff
- **Contingency:** Detailed error messages guide users to retry

### Mitigation Summary

**Risk Mitigation Strategy:**

1. **Comprehensive Testing:** Unit, integration, E2E, accessibility, and performance tests
2. **Feature Flags:** Enable gradual rollout and quick rollback if issues arise
3. **Monitoring:** Real-time performance and error monitoring in production
4. **User Testing:** Usability testing with representative users before release
5. **Documentation:** Clear code comments and architecture decisions recorded
6. **Rollback Plan:** Can disable feature via feature flag without code deployment

**Go/No-Go Criteria:**

- All P0 acceptance criteria met
- Zero critical or high-severity bugs
- Accessibility tests passing 100%
- Performance targets met (P95 < 3000ms)
- Successful user acceptance testing (n ≥ 5 users)

---

## Implementation Phases

### Phase 1: Immediate Visual Feedback (Week 1-2)

**Objective:** Eliminate "dead space" and provide instant confirmation

**Deliverables:**

1. ✅ `clickProcessingState` added to globalStore
2. ✅ `MapClickLoadingOverlay.vue` component created
3. ✅ Click handler updated in `CesiumViewer.vue`
4. ✅ Unit tests for state management
5. ✅ Component tests for loading overlay
6. ✅ E2E test for immediate feedback

**Success Criteria:**

- Loading overlay appears <100ms after click
- No visual gap between building info disappearing and overlay appearing
- All tests passing

**Estimated Effort:** 3-5 days
**Team:** 1 frontend engineer
**Dependencies:** None

---

### Phase 2: Animation Control (Week 3-4)

**Objective:** Enable user control via ESC key and cancel button

**Deliverables:**

1. ✅ `cancelFlight()` method in camera.js
2. ✅ ESC key handler in CesiumViewer.vue
3. ✅ `CameraSkipButton.vue` component (optional, or integrate into MapClickLoadingOverlay)
4. ✅ State restoration logic
5. ✅ Unit tests for camera cancellation
6. ✅ E2E tests for ESC key and button cancellation
7. ✅ Accessibility tests for keyboard navigation

**Success Criteria:**

- ESC key reliably cancels animation
- Previous view state is restored within 500ms
- No crashes or state corruption from rapid cancel/click sequences
- Accessibility tests pass

**Estimated Effort:** 5-7 days
**Team:** 1 frontend engineer + 1 QA engineer (for testing)
**Dependencies:** Phase 1 complete

---

### Phase 3: Progressive Enhancement (Week 5-7)

**Objective:** Reduce perceived wait time through parallel loading

**Deliverables:**

1. ✅ Parallel loading implementation in featurepicker.js
2. ✅ Camera methods return Promises
3. ✅ Progressive UI updates as data loads
4. ✅ Loading progress indicator in overlay
5. ✅ Error handling and retry logic
6. ✅ Performance optimization (cache utilization)
7. ✅ Unit tests for parallel loading
8. ✅ E2E tests for progressive loading
9. ✅ Performance regression tests

**Success Criteria:**

- Perceived wait time <2000ms (P50)
- Data loads in parallel with camera animation
- UI updates progressively as data arrives
- Performance targets met (no regressions)

**Estimated Effort:** 7-10 days
**Team:** 1 frontend engineer + 1 performance specialist
**Dependencies:** Phase 1 & 2 complete

---

### Phase 4: Testing and Polish (Week 8)

**Objective:** Comprehensive testing, bug fixes, and documentation

**Deliverables:**

1. ✅ Full regression test suite run
2. ✅ Accessibility audit and remediation
3. ✅ Performance testing and optimization
4. ✅ User acceptance testing (5-10 users)
5. ✅ Documentation updates (README, JSDoc)
6. ✅ Analytics implementation for metrics tracking
7. ✅ Code review and approval

**Success Criteria:**

- All tests passing (unit, integration, E2E, accessibility, performance)
- User acceptance testing shows positive feedback
- Documentation is complete and accurate
- Code review approved by team

**Estimated Effort:** 5 days
**Team:** Full team (frontend engineer, QA, UX designer, product owner)
**Dependencies:** Phases 1, 2, 3 complete

---

### Phase 5: Deployment and Monitoring (Week 9)

**Objective:** Safe production deployment with monitoring

**Deliverables:**

1. ✅ Feature flag configuration
2. ✅ Staged rollout plan (10% → 50% → 100%)
3. ✅ Production deployment
4. ✅ Real-time monitoring dashboard
5. ✅ Post-deployment smoke tests
6. ✅ User feedback collection mechanism
7. ✅ Post-launch retrospective

**Success Criteria:**

- Successful production deployment with zero downtime
- Monitoring shows metrics within target ranges
- No critical bugs reported in first 48 hours
- User feedback is neutral or positive

**Estimated Effort:** 3-5 days (including monitoring period)
**Team:** Full team + DevOps
**Dependencies:** Phase 4 complete and approved

---

### Total Timeline

**Estimated Duration:** 8-9 weeks (2 months)

**Breakdown:**

- Phase 1 (Immediate Feedback): 1-2 weeks
- Phase 2 (Animation Control): 1-2 weeks
- Phase 3 (Progressive Enhancement): 2-3 weeks
- Phase 4 (Testing and Polish): 1 week
- Phase 5 (Deployment): 1 week

**Team Composition:**

- 1 Frontend Engineer (primary developer)
- 1 QA Engineer (testing support)
- 1 UX Designer (design validation, user testing)
- 1 Product Owner (requirements clarification, acceptance)
- 1 Accessibility Specialist (part-time consultation)
- 1 DevOps Engineer (deployment support)

**Critical Path:**
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (linear dependencies)

**Parallel Work Opportunities:**

- Documentation can start during Phase 3
- Test planning can happen during Phase 1
- Analytics setup can happen during Phase 3

---

## Testing and Validation Strategy

### Test Coverage Requirements

**Unit Tests (Vitest):**

- State management (globalStore): 100% coverage
- Camera service methods: 90% coverage
- Component logic (MapClickLoadingOverlay): 85% coverage
- Utility functions: 100% coverage

**Integration Tests (Vitest + Vue Test Utils):**

- Store and component interaction: 80% coverage
- Service layer integration: 75% coverage
- Event handling between components: 90% coverage

**E2E Tests (Playwright):**

- Critical user flows: 100% coverage
- Error scenarios: 80% coverage
- Accessibility workflows: 100% coverage
- Cross-browser testing: Chrome, Firefox, Safari

**Accessibility Tests (Playwright + axe-core):**

- WCAG 2.1 AA: 100% compliance
- Keyboard navigation: All interactive elements
- Screen reader compatibility: NVDA, JAWS, VoiceOver

**Performance Tests:**

- Time to first feedback: 100% of interactions measured
- Perceived wait time: 100% of interactions measured
- Frame rate during animation: Continuous monitoring
- Memory leak detection: Long-running session tests

### Test Strategy by Phase

**Phase 1 Testing:**

- ✅ Unit tests for globalStore state management
- ✅ Component tests for MapClickLoadingOverlay rendering
- ✅ E2E test for immediate feedback (<100ms)
- ✅ Visual regression test for overlay appearance

**Phase 2 Testing:**

- ✅ Unit tests for camera.cancelFlight()
- ✅ Unit tests for state restoration logic
- ✅ E2E test for ESC key cancellation
- ✅ E2E test for cancel button click
- ✅ E2E test for rapid cancel/click sequences
- ✅ Accessibility test for keyboard navigation
- ✅ Edge case test for cancellation during data loading

**Phase 3 Testing:**

- ✅ Unit tests for parallel loading logic
- ✅ Unit tests for Promise.allSettled handling
- ✅ E2E test for progressive data loading
- ✅ E2E test for error handling and retry
- ✅ Performance test for perceived wait time
- ✅ Performance test for parallel vs sequential loading
- ✅ Load test for concurrent users

**Phase 4 Testing:**

- ✅ Full regression test suite (all existing tests)
- ✅ Cross-browser compatibility testing
- ✅ Mobile device testing (tablet-sized viewports)
- ✅ User acceptance testing with real users
- ✅ Exploratory testing for edge cases

### Acceptance Testing

**User Acceptance Test Scenarios:**

**Scenario 1: Happy Path**

1. User clicks postal code boundary
2. Loading overlay appears immediately
3. User waits for animation to complete
4. New postal code view loads successfully
5. User can interact with new view

**Expected Result:** Smooth, responsive experience with clear feedback

**Scenario 2: Animation Cancellation**

1. User clicks postal code boundary
2. Loading overlay appears with cancel button
3. User presses ESC key during animation
4. Animation stops and previous view is restored
5. User can click again immediately

**Expected Result:** Clean cancellation with no visual glitches

**Scenario 3: Network Error**

1. User clicks postal code boundary (disconnect network)
2. Loading overlay appears
3. Error message appears after timeout
4. User clicks "Retry" button (reconnect network)
5. Loading succeeds

**Expected Result:** Clear error message with recovery path

**Scenario 4: Rapid Clicks**

1. User clicks postal code A
2. User immediately clicks postal code B (before animation completes)
3. First click is cancelled
4. Second click proceeds normally

**Expected Result:** Latest click wins, no crashes or corruption

**Scenario 5: Accessibility**

1. Screen reader user navigates to map
2. User clicks postal code boundary
3. Screen reader announces "Loading postal code [name]"
4. User presses ESC key (announced as option)
5. Screen reader announces "Loading cancelled"

**Expected Result:** Full screen reader support throughout interaction

### Quality Gates

**Pre-Merge Requirements:**

- ✅ All unit tests passing (80%+ coverage)
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Zero ESLint errors
- ✅ Code review approval from 2+ engineers
- ✅ Accessibility audit passing (zero violations)

**Pre-Deployment Requirements:**

- ✅ All tests passing in staging environment
- ✅ Performance targets met in staging
- ✅ User acceptance testing completed (n ≥ 5)
- ✅ Product owner approval
- ✅ Security review completed (if applicable)
- ✅ Documentation updated

**Post-Deployment Validation:**

- ✅ Smoke tests pass in production
- ✅ Real-user monitoring shows metrics within targets
- ✅ No critical errors in first 24 hours
- ✅ User feedback is neutral or positive

---

## Appendix

### A: Glossary

**Terms:**

- **Perceived Wait Time:** The duration a user feels they're waiting, as opposed to actual technical processing time
- **Progressive Loading:** Displaying content incrementally as it becomes available, rather than waiting for all data
- **Dead Space:** UI state where no content is visible and no feedback is provided to the user
- **Camera Flight:** CesiumJS animation that moves the camera from one position to another
- **Debounce:** Technique that delays function execution until a specified time has passed since the last call
- **WCAG 2.1 AA:** Web Content Accessibility Guidelines, Level AA compliance standard

**Acronyms:**

- **ARIA:** Accessible Rich Internet Applications
- **P50/P95:** 50th/95th percentile (median/top 5% slowest)
- **PRD:** Product Requirements Document
- **UX:** User Experience
- **E2E:** End-to-End (testing)
- **FPS:** Frames Per Second
- **KPI:** Key Performance Indicator

### B: Related Documentation

**Internal Documentation:**

- `/docs/TESTING.md` - Testing guidelines and framework documentation
- `/docs/PERFORMANCE_MONITORING.md` - Performance testing and regression monitoring
- `CLAUDE.md` - Project development guidelines and architecture
- `.claude/skills/test-pattern-library.md` - Testing patterns and best practices

**External References:**

- [CesiumJS Camera API Documentation](https://cesium.com/learn/cesiumjs/ref-doc/Camera.html)
- [Vue 3 Composition API Guide](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia State Management](https://pinia.vuejs.org/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Playwright Testing Documentation](https://playwright.dev/docs/intro)

### C: Change History

| Version | Date       | Author      | Changes           |
| ------- | ---------- | ----------- | ----------------- |
| 1.0     | 2025-11-18 | Claude Code | Initial PRD draft |

### D: Approval Sign-off

**Awaiting Approval:**

| Role                     | Name               | Approval Date  | Signature      |
| ------------------------ | ------------------ | -------------- | -------------- |
| Product Owner            | ******\_\_\_****** | ****\_\_\_**** | ****\_\_\_**** |
| UX Designer              | ******\_\_\_****** | ****\_\_\_**** | ****\_\_\_**** |
| Engineering Lead         | ******\_\_\_****** | ****\_\_\_**** | ****\_\_\_**** |
| QA Lead                  | ******\_\_\_****** | ****\_\_\_**** | ****\_\_\_**** |
| Accessibility Specialist | ******\_\_\_****** | ****\_\_\_**** | ****\_\_\_**** |

---

**Document Status:** Draft - Ready for Stakeholder Review
**Next Steps:** Schedule PRD review meeting with stakeholders
**Expected Approval Date:** TBD

---

_This PRD serves as the authoritative source of requirements for the Map Click UX Enhancement feature. Any changes to scope, requirements, or timelines must be documented through a formal change request process and approved by the Product Owner._
