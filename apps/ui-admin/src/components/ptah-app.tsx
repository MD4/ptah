import type { PubsubMessage } from "@ptah/lib-models";
import { App, notification } from "antd";
import * as React from "react";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDebounceCallback } from "usehooks-ts";

import { SystemProvider } from "../domain/system.domain";
import PageLoader from "./atoms/page-loader";
import AppLayout from "./layouts/app.layout";
import HomePage from "./pages/home.page";
import ProgramPage from "./pages/program.page";
import SettingsPage from "./pages/settings.page";
import ShowPage from "./pages/show.page";

function PtahApp() {
  useEffect(() => {
    navigator.vibrate(30);
  }, []);

  const [{ error, success }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });

  const onMessage = React.useCallback(
    (message: PubsubMessage) => {
      switch (message.type) {
        case "show:load:success":
          success({
            message: message.showName,
            description: "Show successfully loaded",
          });
          break;
        case "show:load:error":
          error({
            message: message.showName,
            description: "Something went wrong",
          });
          break;
        default:
      }
    },
    [error, success],
  );

  const onMessageDebounced = useDebounceCallback(onMessage, 100);

  const ShowListPage = React.lazy(() => import("./pages/show/show-list.page"));
  const ShowCreatePage = React.lazy(
    () => import("./pages/show/show-create.page"),
  );
  const ShowDashboardPage = React.lazy(
    () => import("./pages/show/show-dashboard.page"),
  );
  const ShowMappingPage = React.lazy(
    () => import("./pages/show/show-mapping.page"),
  );
  const ShowPatchPage = React.lazy(
    () => import("./pages/show/show-patch.page"),
  );
  const ProgramListPage = React.lazy(
    () => import("./pages/program/program-list.page"),
  );
  const ProgramCreatePage = React.lazy(
    () => import("./pages/program/program-create.page"),
  );
  const ProgramEditPage = React.lazy(
    () => import("./pages/program/program-edit.page"),
  );

  return (
    <SystemProvider onMessage={onMessageDebounced}>
      <App>
        <Routes>
          <Route element={<AppLayout />} path="/">
            <Route
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <HomePage />
                </React.Suspense>
              }
              index
            />

            <Route
              path="settings"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </React.Suspense>
              }
            />

            <Route path="show">
              <Route
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ShowListPage />
                  </React.Suspense>
                }
                index
              />
              <Route
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ShowCreatePage />
                  </React.Suspense>
                }
                path="create"
              />

              <Route element={<ShowPage />} path=":showName">
                <Route
                  element={
                    <React.Suspense fallback={<PageLoader />}>
                      <ShowDashboardPage />
                    </React.Suspense>
                  }
                  index
                />
                <Route
                  element={
                    <React.Suspense fallback={<PageLoader />}>
                      <ShowMappingPage />
                    </React.Suspense>
                  }
                  path="mapping"
                />
                <Route
                  element={
                    <React.Suspense fallback={<PageLoader />}>
                      <ShowPatchPage />
                    </React.Suspense>
                  }
                  path="patch"
                />
              </Route>
            </Route>

            <Route path="program">
              <Route
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProgramListPage />
                  </React.Suspense>
                }
                index
              />
              <Route
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProgramCreatePage />
                  </React.Suspense>
                }
                path="create"
              />

              <Route element={<ProgramPage />} path=":programName">
                <Route
                  element={
                    <React.Suspense fallback={<PageLoader />}>
                      <ProgramEditPage />
                    </React.Suspense>
                  }
                  index
                />
              </Route>
            </Route>

            <Route element={<Navigate replace to="/" />} path="*" />
          </Route>
        </Routes>
      </App>
      {contextHolder}
    </SystemProvider>
  );
}

export default PtahApp;
