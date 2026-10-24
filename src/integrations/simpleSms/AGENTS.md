# Simple SMS Integration

## Purpose

Sends internal transactional text messages through Melipayamak's simple-SMS API.
It intentionally has no public HTTP route: payment completion is its only caller,
so arbitrary message dispatch is never exposed through the API.

## Flow

`PaymentService -> PetPurchaseSmsService -> SimpleSmsClient -> Melipayamak`

## Rules

- Use `MELIPAYAMAK_SIMPLE_SMS_TOKEN` and `MELIPAYAMAK_SIMPLE_SMS_FROM`; never reuse or log the OTP token.
- The client owns HTTP transport. The service validates provider data and builds the paid pet-purchase template.
- A provider failure must be surfaced to the caller; `PaymentService` owns logging it without rolling back a committed payment.
- Do not add timers, retries, sockets, or background work here. `fetch` owns an `AbortSignal.timeout` bounded by `MELIPAYAMAK_API.TIMEOUT_MS`.
