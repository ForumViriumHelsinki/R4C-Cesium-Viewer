/**
 * TypeScript interfaces for Playwright testing
 */

import { Page, Locator, BrowserContext } from '@playwright/test';

export interface PlaywrightPage extends Page {
  // Add any custom methods or properties if needed
}

export interface TestHelper {
  dismissDisclaimer(): Promise<void>;
  waitForMapLoad(): Promise<void>;
  clickOnMap(x: number, y: number): Promise<void>;
  waitForCesiumReady(timeout?: number): Promise<void>;
  waitForAppReady(timeout?: number): Promise<void>;
}

export interface ApiResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export interface TestMetrics {
  startTime: number;
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

export interface CesiumTestState {
  viewer?: any;
  scene?: any;
  camera?: any;
  entities?: any;
  currentState: any;
}