# WMS Optimization Monitoring Checklist

## Background

This document provides a monitoring checklist for tracking the impact of WMS tile optimization deployed in PR #340 and extended in PR #357.

**Optimization Summary:**

- **Change**: Increased WMS tile size from 256x256px (default) to 512x512px
- **Expected Impact**: Reduce tile requests from ~600 to ~150 on page load (75% reduction)
- **Affected Services**:
  - Helsinki WMS layers (`src/services/wms.js`)
  - Flood visualization layers (`src/services/floodwms.js`)
  - Land cover layers (`src/services/landcover.js`)
- **Additional Constraints**: Maximum zoom level limited to 18 to prevent excessive tile generation

**Issue Reference:** [#344 - Monitor WMS optimization impact in Sentry post-deployment](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/344)

**Related PRs:**

- [#340 - Optimize WMS tile requests to reduce N+1 API calls by 75%](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/pull/340)
- [#357 - Apply WMS tile optimization to flood and landcover services](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/pull/357)

## Pre-Deployment Baseline

Capture these metrics **before** the optimization is deployed to production:

### Sentry Error Tracking Baseline

- [ ] **Record REGIONS4CLIMATE-1H event count** (last 7 days)
  - Navigate to: Sentry → Issues → Filter by `REGIONS4CLIMATE-1H`
  - Record: Total events, unique users affected, frequency
  - Expected: High frequency of tile request errors

- [ ] **Identify related error patterns**
  - Search for WMS-related errors: `wms`, `tile`, `imagery`
  - Document error types: timeout, rate limiting, 429 responses
  - Note peak usage times when errors occur most frequently

- [ ] **Network request baseline**
  - Use browser DevTools Network tab on production site
  - Load homepage and navigate to typical user flows:
    - Capital Region view (default landing)
    - Zoom to postal code level
    - Navigate to building detail view
  - Record:
    - Total WMS tile requests per page load
    - Request patterns (burst behavior, request timing)
    - Any failed requests or timeouts

### Performance Baseline

- [ ] **Sentry Performance Monitoring** (if enabled)
  - Record page load times (p50, p95, p99)
  - Record transaction durations for map initialization
  - Note any performance issues related to tile loading

- [ ] **Browser Performance Metrics**
  - Measure Time to Interactive (TTI) on homepage
  - Measure First Contentful Paint (FCP)
  - Record memory usage during typical navigation flows

### User Impact Baseline

- [ ] **Traffic patterns**
  - Record daily active users (last 7 days)
  - Note typical peak usage times
  - Document common user journeys from analytics

- [ ] **Support tickets/feedback**
  - Review any user-reported performance issues
  - Document complaints about slow loading or errors

## Post-Deployment Monitoring (24-48 hours)

Monitor these metrics after optimization deployment to production:

### Immediate Verification (First 4 hours)

- [ ] **Verify optimization is active**
  - Open browser DevTools → Network tab
  - Load application and filter for WMS requests
  - Confirm tile requests use `WIDTH=512&HEIGHT=512` parameters
  - Expected: ~150 tile requests on page load (down from ~600)

- [ ] **Check for new errors**
  - Monitor Sentry Issues for new error types
  - Watch for memory-related errors (especially on mobile)
  - Check for tile loading failures at zoom level 18 boundary

- [ ] **Initial performance check**
  - Verify page loads successfully across:
    - Desktop browsers (Chrome, Firefox, Safari)
    - Mobile devices (iOS Safari, Android Chrome)
    - Different network conditions (fast 3G, 4G, WiFi)
  - Confirm no visual regressions in tile rendering

### 24-Hour Monitoring

- [ ] **REGIONS4CLIMATE-1H event reduction**
  - Check Sentry for REGIONS4CLIMATE-1H event count
  - **Success criteria**: >75% reduction in events
  - Compare to pre-deployment baseline (same time period)

- [ ] **New error patterns**
  - Monitor for unexpected errors:
    - Memory exhaustion (OutOfMemory, heap size)
    - Tile loading failures (especially at zoom level 18)
    - Performance degradation on mobile devices
  - Filter Sentry by device type to isolate mobile issues

- [ ] **Performance metrics**
  - Compare page load times (p50, p95, p99) to baseline
  - Expected: Improved or neutral (not degraded)
  - Check transaction durations for map initialization

- [ ] **User behavior analytics**
  - Verify user session counts are stable
  - Check bounce rate for any unusual changes
  - Monitor time spent on map views

### 48-Hour Monitoring

- [ ] **Sustained error reduction**
  - Confirm REGIONS4CLIMATE-1H events remain reduced
  - Verify no new compensating errors emerged
  - Check error distribution across user segments

- [ ] **Memory usage patterns**
  - Review Sentry for memory-related issues
  - Pay special attention to:
    - Mobile device errors (iOS/Android)
    - Extended session users (>10 minutes)
    - Users navigating between multiple views
  - Expected: No significant increase in memory errors

- [ ] **Cross-browser stability**
  - Verify optimization performs well across browsers
  - Check for browser-specific issues (Safari, Firefox, Edge)
  - Confirm tile caching works as expected

- [ ] **Geographic distribution**
  - Verify performance improvements across regions
  - Check for network-related issues in specific areas
  - Confirm CDN/proxy behavior is optimal

## Sentry Dashboard Queries

### Finding REGIONS4CLIMATE-1H Events

**Filter by Issue ID:**

```
issue.id:REGIONS4CLIMATE-1H
```

**Filter by WMS-related errors:**

```
message:"wms" OR message:"tile" OR message:"imagery"
```

**Filter by mobile devices:**

```
device.family:iPhone OR device.family:Android
browser.name:Mobile Safari OR browser.name:Chrome Mobile
```

**Performance transaction queries:**

```
transaction.op:pageload
transaction.name:CesiumViewer
```

### Creating Custom Queries

**Weekly event comparison:**

1. Navigate to: Issues → Search
2. Set date range: Last 7 days
3. Apply filters: `issue.id:REGIONS4CLIMATE-1H`
4. Compare to previous 7-day period

**Error rate by browser:**

1. Navigate to: Issues → [REGIONS4CLIMATE-1H]
2. Click "Stats" tab
3. Group by: `browser.name`

**Performance impact:**

1. Navigate to: Performance → Transactions
2. Filter: `transaction.name:CesiumViewer`
3. Compare p95 durations before/after deployment

## Expected Outcomes

### Primary Success Metrics

**Error Reduction:**

- [ ] REGIONS4CLIMATE-1H events reduced by **>75%**
- [ ] No increase in other WMS-related error types
- [ ] No new memory-related errors on mobile devices

**Performance Improvement:**

- [ ] Page load times stable or improved (p95 < baseline)
- [ ] Map initialization time stable or improved
- [ ] No increase in Time to Interactive (TTI)

**User Experience:**

- [ ] No increase in bounce rate
- [ ] Session duration stable or improved
- [ ] No user-reported issues related to map loading

### Secondary Success Metrics

**Network Efficiency:**

- [ ] WMS tile requests reduced from ~600 to ~150 on page load
- [ ] Bandwidth usage per session potentially increased (larger tiles) but acceptable
- [ ] HTTP/2 connection pooling working effectively

**Mobile Performance:**

- [ ] No memory warnings or crashes on mobile devices
- [ ] Tile loading smooth on mobile networks (3G/4G)
- [ ] Battery usage not significantly impacted

## Rollback Criteria

**Immediate rollback required if:**

- [ ] REGIONS4CLIMATE-1H events increase or do not decrease by >50%
- [ ] New critical errors emerge (P0/P1 severity)
- [ ] Memory errors increase by >25% (especially mobile)
- [ ] Page load times (p95) degrade by >20%
- [ ] Multiple user reports of broken maps or loading failures

**Staged rollback if:**

- [ ] Errors reduced but by less than expected (<50% reduction)
- [ ] Performance neutral but memory usage increases significantly
- [ ] Mobile-specific issues affect >10% of mobile users

**Rollback process:**

1. Revert PR #340 and #357 commits
2. Deploy previous stable version
3. Monitor for error count returning to baseline
4. Investigate root cause and create new optimization strategy

## Success Criteria for Closing Issue #344

**All of the following must be met:**

- [ ] **Error reduction verified**: REGIONS4CLIMATE-1H events reduced by >75% for 48 consecutive hours
- [ ] **Performance stable**: No degradation in p95 page load times compared to baseline
- [ ] **No new critical errors**: No P0/P1 errors introduced by optimization
- [ ] **Mobile stability**: No increase in mobile-specific errors or crashes
- [ ] **User experience unchanged**: Bounce rate and session metrics stable
- [ ] **Monitoring period complete**: 48-hour observation window finished
- [ ] **Documentation updated**: This checklist completed and results documented

**Final verification steps:**

1. Compare all metrics to pre-deployment baseline
2. Document quantitative improvements (% error reduction, request reduction)
3. Capture Sentry dashboard screenshots showing improvement
4. Update issue #344 with summary of results
5. Close issue with "Verified - optimization successful" comment

## Monitoring Timeline

```
Day 0: Pre-Deployment
├─ Capture baseline metrics
├─ Document current error rates
└─ Record performance benchmarks

Day 0-1: First 24 Hours
├─ [Hour 1-4] Immediate verification
│  ├─ Confirm optimization active
│  ├─ Check for new errors
│  └─ Verify basic functionality
├─ [Hour 4-12] Early monitoring
│  ├─ Monitor error trends
│  └─ Check performance metrics
└─ [Hour 12-24] First checkpoint
   ├─ Verify >75% error reduction
   └─ Confirm no regressions

Day 1-2: Extended Monitoring
├─ [24-36 hours] Sustained improvement
│  ├─ Confirm error reduction holds
│  └─ Monitor memory usage patterns
└─ [36-48 hours] Final verification
   ├─ Complete all checklist items
   └─ Prepare summary for issue closure

Day 2+: Post-Monitoring
├─ Document final results
├─ Update issue #344
└─ Close issue or escalate if needed
```

## Notes and Observations

Use this section to document findings during monitoring:

**Unexpected Behaviors:**

- [Add notes here]

**Performance Insights:**

- [Add notes here]

**User Feedback:**

- [Add notes here]

**Lessons Learned:**

- [Add notes here]

## References

- [Issue #339 - N+1 API Call Optimization (root cause)](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/339)
- [PR #340 - Optimize WMS tile requests](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/pull/340)
- [PR #357 - Apply optimization to flood and landcover services](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/pull/357)
- [Issue #344 - Monitor WMS optimization impact in Sentry](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/344)
- [OGC WMS Specification](https://www.ogc.org/standards/wms)
- [Sentry Performance Monitoring Docs](https://docs.sentry.io/product/performance/)
