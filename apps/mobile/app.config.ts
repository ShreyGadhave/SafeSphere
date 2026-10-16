import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json; this file only adds values that must not be committed.
 *
 * google-services.json (Firebase, needed for push notifications) is kept outside the repo in
 * D:\Major Project\secrets. EAS builds receive it through the secret file variable
 * GOOGLE_SERVICES_JSON; local prebuilds fall back to the secrets folder.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? '../../../secrets/google-services.json',
  },
});
