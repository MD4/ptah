import "@ant-design/v5-patch-for-react-19";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { IoProvider } from "socket.io-react-hook";

import "./index.scss";

import PageLoader from "./components/atoms/page-loader";
import { ptahTheme } from "./theme";

const PtahApp = React.lazy(() => import("./components/ptah-app"));

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
      <IoProvider>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider theme={ptahTheme}>
            <BrowserRouter>
              <React.Suspense fallback={<PageLoader />}>
                <PtahApp />
              </React.Suspense>
            </BrowserRouter>
          </ConfigProvider>
        </QueryClientProvider>
      </IoProvider>
    </React.StrictMode>,
  );
} else {
  throw new Error("Could not find root element");
}
