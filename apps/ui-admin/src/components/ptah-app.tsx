import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { App } from "antd";
import HomePage from "./pages/home.page";
import AppLayout from "./layouts/app.layout";
import ShowCreatePage from "./pages/show/show-create.page";
import ShowDashboardPage from "./pages/show/show-dashboard.page";
import ShowPage from "./pages/show.page";
import ShowMappingPage from "./pages/show/show-mapping.page";
import ShowPatchPage from "./pages/show/show-patch.page";
import ProgramListPage from "./pages/program/program-list.page";
import ProgramCreatePage from "./pages/program/program-create.page";
import ShowListPage from "./pages/show/show-list.page";
import ProgramEditPage from "./pages/program/program-edit.page";
import ProgramPage from "./pages/program.page";

function PtahApp(): JSX.Element {
  return (
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
  );
}

export default PtahApp;
