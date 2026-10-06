
import react from "@vitejs/plugin-react";
import "dotenv/config";
import path from "node:path";
import { defineConfig, splitVendorChunkPlugin } from "vite";
import injectHTML from "vite-plugin-html-inject";
import tsConfigPaths from "vite-tsconfig-paths";

type Extension = {
	name: string;
	version: string;
	config: Record<string, unknown>;
};

enum ExtensionName {
	FIREBASE_AUTH = "firebase-auth",
	STACK_AUTH = "stack-auth"
}

const listExtensions = (): Extension[] => {
	if (process.env.AUTH_PROVIDERS) {
		try {
			return JSON.parse(process.env.AUTH_PROVIDERS) as Extension[];
		} catch (err: unknown) {
			console.error("Error parsing AUTH_PROVIDERS", err);
			console.error(process.env.AUTH_PROVIDERS);
			return [];
		}
	}

	// Default configuration for Stack Auth
	return [
      {
        "name": "stack-auth",
        "version": "0.0.0",
        "config": {
          "projectId": "12f91f05-de2c-4548-abe3-c6948ea74265",
          "jwksUrl": "https://api.stack-auth.com/api/v1/projects/12f91f05-de2c-4548-abe3-c6948ea74265/.well-known/jwks.json",
          "publishableClientKey": "pck_yzzygk6kx3cz2t1y3dan8r19v9dcf04xcqv7zgdqye83g"
        }
      }
  ];
};

const extensions = listExtensions();

const getExtensionConfig = (name: string): string => {
	const extension = extensions.find((it) => it.name === name);

	if (!extension) {
		console.warn(`Extension ${name} not found`);
	}

	return JSON.stringify(extension?.config);
};

const buildVariables = () => {
	const appId = "citizenhub";

	const defines: Record<string, string> = {
		__APP_ID__: JSON.stringify(appId),
		__API_PATH__: JSON.stringify(process.env.API_PATH),
		__API_HOST__: JSON.stringify(""),
		__API_PREFIX_PATH__: JSON.stringify(""),
		__API_URL__: JSON.stringify("http://localhost:8000"),
		__WS_API_URL__: JSON.stringify("ws://localhost:8000"),
		__APP_TITLE__: JSON.stringify("Citizen Hub"),
		__APP_FAVICON_LIGHT__: JSON.stringify("/favicon-light.svg"),
		__APP_FAVICON_DARK__: JSON.stringify("/favicon-dark.svg"),
		__APP_DEPLOY_USERNAME__: JSON.stringify(""),
		__APP_DEPLOY_APPNAME__: JSON.stringify(""),
		__APP_DEPLOY_CUSTOM_DOMAIN__: JSON.stringify(""),
        __APP_BASE_PATH__: JSON.stringify(""),
		__STACK_AUTH_CONFIG__: getExtensionConfig(ExtensionName.STACK_AUTH),
		__FIREBASE_CONFIG__: getExtensionConfig(ExtensionName.FIREBASE_AUTH),
	};

	return defines;
};

// https://vite.dev/config/
export default defineConfig({
	define: buildVariables(),
	plugins: [react(), splitVendorChunkPlugin(), tsConfigPaths(), injectHTML()],
	server: {
		proxy: {
			"/api": {
				target: "http://127.0.0.1:8000",
				changeOrigin: true,
			},
		},
	},
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@/components/ui": path.resolve(__dirname, "./src/extensions/shadcn/components"),
            "@/components/hooks": path.resolve(__dirname, "./src/extensions/shadcn/hooks"),
            "@/hooks": path.resolve(__dirname, "./src/extensions/shadcn/hooks"),
            "components": path.resolve(__dirname, "./src/components"),
            "pages": path.resolve(__dirname, "./src/pages"),
            "app": path.resolve(__dirname, "./src/app"),
            "utils": path.resolve(__dirname, "./src/utils"),
        }
    }
});
