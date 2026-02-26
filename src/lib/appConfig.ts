/**
 * Configuration for multiple HubSpot apps
 * Each app can have its own OAuth credentials and tokens
 */

export type AppName = 'potat' | 'instapotat' | 'loadedpotat' | 'potataugratin' | 'tater';

export interface AppConfig {
  name: AppName;
  displayName: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export const APP_CONFIGS: Record<AppName, AppConfig> = {
  potat: {
    name: 'potat',
    displayName: 'Potat',
    clientId: import.meta.env.VITE_HUBSPOT_CLIENT_ID,
    clientSecret: import.meta.env.VITE_HUBSPOT_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_HUBSPOT_REDIRECT_URI
  },
  instapotat: {
    name: 'instapotat',
    displayName: 'Insta Potat',
    // Fallback to main app credentials if Insta Potat-specific ones aren't set
    clientId: import.meta.env.VITE_INSTAPOTAT_CLIENT_ID || import.meta.env.VITE_HUBSPOT_CLIENT_ID,
    clientSecret: import.meta.env.VITE_INSTAPOTAT_CLIENT_SECRET || import.meta.env.VITE_HUBSPOT_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_INSTAPOTAT_REDIRECT_URI || import.meta.env.VITE_HUBSPOT_REDIRECT_URI
  },
  loadedpotat: {
    name: 'loadedpotat',
    displayName: 'Loaded Potat',
    clientId: import.meta.env.VITE_LOADEDPOTAT_CLIENT_ID,
    clientSecret: import.meta.env.VITE_LOADEDPOTAT_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_LOADEDPOTAT_REDIRECT_URI
  },
  potataugratin: {
    name: 'potataugratin',
    displayName: 'Potat Au Gratin',
    clientId: import.meta.env.VITE_AU_GRATIN_CLIENT_ID,
    clientSecret: import.meta.env.VITE_AU_GRATIN_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_AU_GRATIN_REDIRECT_URI
  },
  tater: {
    name: 'tater',
    displayName: 'Tater',
    clientId: import.meta.env.VITE_TATER_CLIENT_ID,
    clientSecret: import.meta.env.VITE_TATER_CLIENT_SECRET,
    redirectUri: import.meta.env.VITE_TATER_REDIRECT_URI
  }
};

/**
 * Get configuration for a specific app
 */
export function getAppConfig(appName: AppName): AppConfig {
  const config = APP_CONFIGS[appName];
  if (!config) {
    throw new Error(`Invalid app name: ${appName}`);
  }
  return config;
}

/**
 * Validate if a string is a valid app name
 */
export function isValidAppName(name: string): name is AppName {
  return ['potat', 'instapotat', 'loadedpotat', 'potataugratin'].includes(name);
}

/**
 * Get all app names
 */
export function getAllAppNames(): AppName[] {
  return ['potat', 'instapotat', 'loadedpotat', 'potataugratin'];
}
