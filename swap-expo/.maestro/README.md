# Maestro E2E Testing

End-to-end testing for the Swap mobile app using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. **Install Maestro CLI:**
   ```bash
   # macOS
   curl -Ls "https://get.maestro.mobile.dev" | bash

   # Or via Homebrew
   brew tap mobile-dev-inc/tap
   brew install maestro
   ```

2. **Verify installation:**
   ```bash
   maestro --version
   ```

3. **Start the app:**
   ```bash
   # Development build (recommended for E2E)
   npx expo run:ios
   # or
   npx expo run:android
   ```

## Running Tests

### Run All Tests
```bash
cd frontend/swap-expo
maestro test .maestro/flows/
```

### Run Specific Flow
```bash
# Signup flow
maestro test .maestro/flows/signup-flow.yaml

# Login flow
maestro test .maestro/flows/login-flow.yaml

# Send money flow
maestro test .maestro/flows/send-money-flow.yaml
```

### Run with Tags
```bash
# Run only critical tests
maestro test .maestro/flows/ --include-tags critical

# Run smoke tests
maestro test .maestro/flows/ --include-tags smoke
```

### Run in CI Mode
```bash
maestro test .maestro/flows/ --format junit --output test-results.xml
```

## Test Flows

| Flow | Priority | Description |
|------|----------|-------------|
| `signup-flow.yaml` | CRITICAL | Phone signup → OTP → Profile creation |
| `login-flow.yaml` | CRITICAL | Phone login → OTP verification |
| `send-money-flow.yaml` | HIGH | P2P money transfer |

## Configuration

Edit `.maestro/config.yaml` to configure:
- Test environment variables
- Timeouts
- Output settings

## Test Data

Tests use dedicated test accounts:
- Test Phone: `+50937000001`
- Test OTP: `123456` (development only)
- Test Recipient: `+50937000002`

**Important:** These test accounts should be configured in the backend to bypass real OTP verification in test environments.

## Writing New Tests

1. Create a new YAML file in `.maestro/flows/`
2. Follow the existing patterns for element selection
3. Use `testID` props in React Native components for reliable selection
4. Tag flows appropriately (smoke, critical, regression)

### Element Selection Priority
1. `id` (testID) - Most reliable
2. `text` - Human readable, may change
3. `anyOf` - Flexible matching

### Example Test
```yaml
appId: com.swap.mobile
tags:
  - regression

---
- launchApp:
    clearState: true
- assertVisible: "Welcome"
- tapOn:
    id: "my-button"
- inputText: "test input"
- takeScreenshot: "test_complete"
```

## CI/CD Integration

Add to GitHub Actions:
```yaml
- name: Run E2E Tests
  run: |
    maestro test .maestro/flows/ \
      --format junit \
      --output test-results.xml
```

## Troubleshooting

### Test fails to find element
- Ensure `testID` prop is set on the component
- Use Maestro Studio to inspect: `maestro studio`

### App not launching
- Verify app is built: `npx expo run:ios` or `npx expo run:android`
- Check `appId` matches your app bundle identifier

### Timeout errors
- Increase timeout in `extendedWaitUntil`
- Check network conditions
- Verify test data is correct
