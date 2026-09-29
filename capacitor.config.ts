import type { CapacitorConfig } from "@capacitor/cli";

import { PRODUCTION_SITE_URL } from "./src/lib/constants/public-site-url";

const CAPACITOR_APP_ID = "de.zeloxtag.app";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || PRODUCTION_SITE_URL;
const allowCleartext = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: CAPACITOR_APP_ID,
  appName: "ZeloxTag",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: allowCleartext,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0f172a",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
  },
};

export default config;
