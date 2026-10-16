---
name: prevent-memory-leaks
description: Prevent and remediate memory and resource leaks across this Node.js application. Use for every code change or review that creates, changes, or owns timers, event listeners, streams, sockets, database cursors or sessions, file watchers, background work, caches, subscriptions, or other long-lived resources, and whenever diagnosing growing memory, open handles, duplicate callbacks, or shutdown hangs.
---

# Prevent Memory Leaks

Treat every acquired resource as requiring an explicit owner, lifetime, and release path. Do not claim that code is leak-free without inspecting relevant allocations and testing meaningful cleanup paths.

## Required workflow

1. Search the affected subsystem for resource creation and cleanup before editing. Include callers and application startup/shutdown code.
2. Inventory timers, listeners, streams, sockets, database resources, watchers, subscriptions, background jobs, abort controllers, and caches.
3. Identify one owner and one bounded lifetime for every resource. Prefer the narrowest owner that fully controls the resource.
4. Add cleanup for success, cancellation, error, client disconnect, and application shutdown as applicable. Make cleanup safe to invoke more than once.
5. Preserve the original error when cleanup also fails; log or aggregate the cleanup failure according to the surrounding error policy.
6. Add tests that prove acquisition and cleanup behavior. Use fake timers or injected lifecycle dependencies where practical.
7. Run focused tests and lint, then the broadest practical suite. Use Jest open-handle detection or runtime profiling when a leak is suspected but ownership inspection is inconclusive.

## Timer rules

- Store every `setTimeout`, `setInterval`, and `setImmediate` handle when the callback can outlive its owner.
- Clear timeout and immediate handles on early completion, cancellation, error, and shutdown. Clear interval handles on every termination path.
- Put cleanup in `finally` when an operation has multiple exit paths.
- Do not create an interval without an explicit stop function or lifecycle hook.
- For an intentionally detached one-shot timer, document why it may outlive the caller and call `unref()` when it must not keep the process alive. Detached intervals are not allowed.
- Avoid recursive scheduling that can overlap. Schedule the next iteration only after the current work settles, and stop scheduling after cancellation.

Use this shape for bounded timers:

```js
let timeoutId;

try {
  await new Promise((resolve) => {
    timeoutId = setTimeout(resolve, timeoutMs);
  });
} finally {
  clearTimeout(timeoutId);
}
```

## Other resource rules

- Register named event handlers and remove the exact same handler during teardown. Prefer `once` for genuinely one-shot events. Do not use `removeAllListeners()` as local cleanup.
- Destroy or close streams and sockets when their owner ends. Handle request/response `close` events for work that must stop after client disconnect.
- Close MongoDB cursors and change streams, end sessions in `finally`, abort transactions on failure, and disconnect application-owned connections during graceful shutdown.
- Cancel in-flight external requests with `AbortController` when their owner ends.
- Stop file watchers, consumers, schedulers, and subscriptions during teardown.
- Bound caches by size or TTL. Do not retain request objects, response objects, large buffers, errors, or model documents in process-wide collections.
- Avoid closures that retain large object graphs longer than needed. Release references after teardown when the owner itself remains long-lived.
- Ensure start/stop functions are single-flight or idempotent so retries and repeated signals cannot duplicate resources.

## Review searches

Start with targeted searches such as:

```text
rg -n "setTimeout|setInterval|setImmediate|\.on\(|addEventListener|watch\(|createReadStream|createWriteStream|\.cursor\(|startSession" src
rg -n "clearTimeout|clearInterval|clearImmediate|\.off\(|removeEventListener|unwatch|\.destroy\(|\.close\(|endSession|disconnect" src
```

Interpret results by ownership and lifetime; matching creation and cleanup counts alone does not prove correctness.

## Completion gate

Do not complete a code task until every newly introduced or changed long-lived resource has documented ownership in the code structure, deterministic cleanup, and relevant test coverage. Report the cleanup paths verified and disclose any resource whose lifecycle could not be proven.
