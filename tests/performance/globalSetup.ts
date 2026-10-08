import { resetMetrics } from './harness'

/** Runs once per `bun run test:performance`, before any test writes a metric. */
export default function setup(): void {
	resetMetrics()
}
