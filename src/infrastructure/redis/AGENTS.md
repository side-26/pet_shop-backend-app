# Redis Infrastructure

## Purpose

This folder owns the shared Redis connection and Redis-backed infrastructure behavior. Redis connects during server startup and is disconnected only after HTTP draining and MongoDB cleanup finish.

## Important Files

- `client.js` — creates one Redis client, owns its error listener, deduplicates concurrent connection work, and performs idempotent graceful disconnect cleanup.
- `client.unit.test.js` — verifies configuration, singleton behavior, connection sharing, failure cleanup, and disconnect behavior without a Redis server.
- `rateLimit/redisRateLimit.store.js` — atomically increments fixed-window counters, applies the first-request TTL, reads state, and resets keys.
- `otp/redisOtp.store.js` — atomically reserves bounded phone-and-IP OTP keys, replaces owned reservations with hashes, reads hashes with their TTL for verification, reuses and reads phone-owned five-minute password-reset tokens, conditionally deletes only a matching reset token after use, applies their phone-and-IP request limit, and safely releases failed reservations.
- `rateLimit/rateLimit.core.js` — maps Express route patterns, HTTP methods, namespaces, and requester IPs to rate-limit buckets and response headers.
- `rateLimit/*.unit.test.js` — isolates the store from Redis and the middleware from its store.
- `rateLimit/rateLimit.integration.test.js` — exercises Express and real Redis when `REDIS_TEST_URL` points to an isolated test Redis instance.

## Lifecycle

`server.js -> RedisClient.connect() -> HTTP service -> HTTP drain -> MongoDB disconnect -> RedisClient.disconnect()`

The Redis client class owns the connection and its listener. Callers obtain the shared instance through `getClient()` and must not close it themselves.

## Modification Rules

- Keep Express behavior in entity controllers or `rateLimit.core.js`, Redis commands in stores, and connection ownership in `client.js`.
- Keep multi-command counter changes atomic and ensure every temporary key has a bounded TTL.
- Use lowercase colon-separated keys and route patterns rather than raw URLs so query strings and dynamic values cannot bypass a route bucket.
- Unit tests must mock Redis. Real-Redis integration tests must use `REDIS_TEST_URL`, isolate keys by test namespace, use `SCAN`, and remove only owned keys.
- Any new listener, timer, connection, or background task must have deterministic teardown on startup failure, normal shutdown, and test completion.
