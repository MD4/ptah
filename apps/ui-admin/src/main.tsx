import * as React from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import "./index.scss";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PtahApp from "./components/ptah-app";
import { ptahTheme } from "./theme";

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);

  const twentyFourHoursInMs = 1000 * 60 * 60 * 24;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: twentyFourHoursInMs,
        retryDelay: 500,
      },
    },
  });

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={ptahTheme}>
          <BrowserRouter>
            <PtahApp />
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
} else {
  throw new Error("Could not find root element");
}
