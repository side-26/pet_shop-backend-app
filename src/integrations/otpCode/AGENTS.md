# OTP Code Integration

## Purpose

Sends an Iranian mobile number to Melipayamak and returns the provider's OTP-code response through a public application endpoint.

## Flow

`public route -> controller -> body validation -> service -> Melipayamak client`

## Modification Rules

- Keep the Melipayamak token in environment configuration.
- Keep HTTP transport in `otpCode.client.js` and provider-response validation and error mapping in `otpCode.service.js`.
- Preserve public access on `POST /api/otp-code` for pre-authentication clients.
