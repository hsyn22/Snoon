/**
 * Stub for the `server-only` package under Vitest.
 *
 * `server-only` throws unless it is resolved through a server condition, which
 * Vitest does not set — so importing anything guarded by it fails the test for a
 * reason unrelated to the code. Aliasing it here keeps the guard doing its real
 * job in the Next build while letting the server modules be unit-tested.
 */
export {}
