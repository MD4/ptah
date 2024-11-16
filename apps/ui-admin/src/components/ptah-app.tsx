import { type PubsubMessage } from "@ptah/lib-models";
import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDebounceCallback } from "usehooks-ts";

import { App, notification } from "antd";

import AppLayout from "./layouts/app.layout";
import HomePage from "./pages/home.page";
import ProgramCreatePage from "./pages/program/program-create.page";
import ProgramEditPage from "./pages/program/program-edit.page";
import ProgramListPage from "./pages/program/program-list.page";
import ProgramPage from "./pages/program.page";
import ShowCreatePage from "./pages/show/show-create.page";
import ShowDashboardPage from "./pages/show/show-dashboard.page";
import ShowListPage from "./pages/show/show-list.page";
import ShowMappingPage from "./pages/show/show-mapping.page";
import ShowPatchPage from "./pages/show/show-patch.page";
import ShowPage from "./pages/show.page";
import { SystemProvider } from "../domain/system.domain";

function PtahApp(): JSX.Element {
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

  return (
    <SystemProvider onMessage={onMessageDebounced}>
      <App>
        <Routes>
          <Route element={<AppLayout />} path="/">
            <Route element={<HomePage />} index />

            <Route path="show">
              <Route element={<ShowListPage />} index />
              <Route element={<ShowCreatePage />} path="create" />

              <Route element={<ShowPage />} path=":showName">
                <Route element={<ShowDashboardPage />} index />
                <Route element={<ShowMappingPage />} path="mapping" />
                <Route element={<ShowPatchPage />} path="patch" />
              </Route>
            </Route>

            <Route path="program">
              <Route element={<ProgramListPage />} index />
              <Route element={<ProgramCreatePage />} path="create" />

              <Route element={<ProgramPage />} path=":programName">
                <Route element={<ProgramEditPage />} index />
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
