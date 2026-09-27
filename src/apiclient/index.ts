import { auth } from "app/auth";
import { API_HOST, API_PATH } from "../constants";
import { Apiclient } from "./Apiclient";
import type { RequestParams } from "./http-client";

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
      // Ensure we always call /api endpoints
      return fetch(url, options);
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
