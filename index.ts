import { devConfig } from './dev';

// Environment-specific configurations
const ENV_CONFIG = {
  dev: devConfig,
  // Add other environments (e.g., 'prod') here as needed
};

/**
 * Get environment configuration based on NODE_ENV or default to 'dev'
 */
export function getEnvConfig(env: string = process.env.NODE_ENV || 'dev') {
  const config = ENV_CONFIG[env as keyof typeof ENV_CONFIG];
  if (!config) {
    throw new Error(`Unknown environment: ${env}. Supported environments: ${Object.keys(ENV_CONFIG).join(', ')}`);
  }
  return config;
}