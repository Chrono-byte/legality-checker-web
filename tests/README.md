# Testing the PHL Legality Checker

## Overview

This directory contains automated tests for the Pioneer Highlander Legality
Checker web application. The tests cover various aspects of the application,
including:

- Basic route functionality
- API endpoints
- Card management logic
- Utility functions

## Running the Tests

To run all tests, use the following command from the root of the project:

```bash
deno task test
```

This will execute all test files in the `tests/` directory.

To run a specific test file:

```bash
deno test --allow-read --allow-env --allow-net tests/main_test.ts
```

## Test Files

- `main_test.ts`: Tests basic route functionality (home page, deck checker,
  etc.)
- `api_test.ts`: Tests API endpoints (check-legality, fetch-deck)
- `card_manager_test.ts`: Tests the CardManager class functionality
- `utils_test.ts`: Tests utility functions and classes (DeckCache, RateLimiter,
  etc.)

## Adding New Tests

When adding new features to the application, please add corresponding tests to
ensure the feature works as expected and to prevent regressions.

## Test Structure

Each test file uses Deno's built-in test framework. Tests are organized into
steps for better readability and easier debugging.

```typescript
Deno.test("Test name", async (t) => {
  await t.step("Step 1 description", async () => {
    // Test logic here
  });

  await t.step("Step 2 description", async () => {
    // More test logic
  });
});
```
