# Swap Mobile App

## Environment Setup

This project uses environment variables to configure different environments (development, production, etc.).

### Environment Files

The project includes three environment files:

- `.env`: Default environment variables (fallback)
- `.env.development`: Development environment variables
- `.env.production`: Production environment variables

### Available Environment Variables

| Variable                             | Description                                  | Default                                  |
| ------------------------------------ | -------------------------------------------- | ---------------------------------------- |
| `EXPO_PUBLIC_ENV`                    | Current environment (development/production) | development                              |
| `EXPO_PUBLIC_SUPABASE_URL`           | Supabase URL                                 | your_supabase_url_here |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`      | Supabase anonymous key                       | (key value)                              |
| `EXPO_PUBLIC_NEST_API_URL`           | Backend API URL                              | http://127.0.0.1:3000                    |
| `EXPO_PUBLIC_ENABLE_DEV_TOOLS`       | Enable development tools                     | true                                     |
| `EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH` | Show mock data when no auth token            | true                                     |

### How to Use

The environment variables are loaded automatically based on the current environment. In development mode, the `.env.development` file is used. In production mode, the `.env.production` file is used.

You can access these variables in your code through the `ENV` object:

```javascript
import { ENV } from "../config/env";

// Use environment variables
const apiUrl = ENV.NEST_API_URL;
const isDevelopment = ENV.IS_DEVELOPMENT;
```

### Running in Different Environments

To run the app in development mode:

```bash
npm run start
```

To run the app in production mode:

```bash
NODE_ENV=production npm run start
```

### Configuring Mock Data

In development mode, you can control whether to show mock data when no authentication token is available by setting the `EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH` variable in your `.env.development` file:

```
EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH=true  # Show mock data
EXPO_PUBLIC_MOCK_DATA_WHEN_NO_AUTH=false # Show real errors
```

This allows you to test your app with or without authentication during development.
