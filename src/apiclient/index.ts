import { auth } from "app/auth";
import { API_HOST, API_PATH } from "../constants";
import { Apiclient } from "./Apiclient";
import type { RequestParams } from "./http-client";
import { resilientFetch } from "./resilient-fetch";

const constructBaseUrl = (): string => {
  // Always use the current origin for the API base path in production/deployment
  return `${window.location.origin}/api`;
};

type BaseApiParams = Omit<RequestParams, "signal" | "baseUrl" | "cancelToken">;

const constructBaseApiParams = (): BaseApiParams => {
  return {
    credentials: "include",
    secure: true,
  };
};

const constructClient = () => {
  const baseUrl = constructBaseUrl();
  const baseApiParams = constructBaseApiParams();

  return new Apiclient({
    baseUrl,
    baseApiParams,
    customFetch: (url, options) => {
      // The generated client uses the legacy /routes prefix. FastAPI is mounted at /api.
      const endpoint = new URL(String(url), window.location.origin);
      if (endpoint.origin === window.location.origin && endpoint.pathname.startsWith("/api/routes/")) {
        endpoint.pathname = endpoint.pathname.replace(/^\/api\/routes\//, "/api/");
      }
      return resilientFetch(endpoint, options);
    },
    securityWorker: async () => {
      return {
        headers: {
          Authorization: await auth.getAuthHeaderValue(),
        },
      };
    },
  });
};

const apiclient = constructClient();

export default apiclient;
