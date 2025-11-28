/**
 * TypeScript interfaces for Playwright testing
 */

import type { Page } from '@playwright/test';

// Type-only export for Page
export type { Page };

// Type alias for Page - extend if custom methods needed
export type PlaywrightPage = Page;

export interface TestHelper {
	dismissDisclaimer(): Promise<void>;
	waitForMapLoad(): Promise<void>;
	clickOnMap(_x: number, _y: number): Promise<void>;
	waitForCesiumReady(_timeout?: number): Promise<void>;
	waitForAppReady(_timeout?: number): Promise<void>;
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
	currentState?: any;
	timestamp?: string;
	url?: string;
}
