import bodyParser from "body-parser";
import express from "express";
import supertest from "supertest";

// Mock all services before importing routes
jest.mock("../services/show.service");
jest.mock("../services/program.service");
jest.mock("../services/settings.service");
jest.mock("@ptah-app/lib-logger", () => ({ logError: jest.fn() }));

import { configureRoutes } from "../routes";
import * as programService from "../services/program.service";
import * as settingsService from "../services/settings.service";
import * as showService from "../services/show.service";

const validUuid = "123e4567-e89b-12d3-a456-426614174000";

const makeApp = () => {
  const app = express();
  app.use(bodyParser.json());
  return configureRoutes(app);
};

const validShow = {
  id: validUuid,
  name: "test-show",
  mapping: {},
  patch: {},
  programs: {},
};

const validProgram = {
  id: validUuid,
  name: "test-prog",
  nodes: [],
  edges: [],
};

const validSettings = {
  version: "0.2.0",
  midiVirtualPortName: "ptah",
  midiChannel: 1,
  appAdminPort: 3000,
};

// ─── Show routes ─────────────────────────────────────────────────────────────

describe("GET /show", () => {
  it("returns 200 with list of show names", async () => {
    (showService.handleShowList as jest.Mock).mockResolvedValue(["test-show"]);
    const res = await supertest(makeApp()).get("/show");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["test-show"]);
  });

  it("returns 500 on service error", async () => {
    (showService.handleShowList as jest.Mock).mockRejectedValue(
      new Error("disk error"),
    );
    const res = await supertest(makeApp()).get("/show");
    expect(res.status).toBe(500);
  });
});

describe("POST /show", () => {
  it("returns 201 on create", async () => {
    (showService.handleShowCreate as jest.Mock).mockResolvedValue(validShow);
    const res = await supertest(makeApp())
      .post("/show")
      .send({ name: "test-show" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "test-show" });
  });

  it("returns 400 on invalid body (missing name)", async () => {
    const res = await supertest(makeApp()).post("/show").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid body (name with space)", async () => {
    const res = await supertest(makeApp())
      .post("/show")
      .send({ name: "bad name" });
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    (showService.handleShowCreate as jest.Mock).mockRejectedValue(
      new Error("write error"),
    );
    const res = await supertest(makeApp())
      .post("/show")
      .send({ name: "test-show" });
    expect(res.status).toBe(500);
  });
});

describe("GET /show/:name", () => {
  it("returns 200 with show data", async () => {
    (showService.handleShowGet as jest.Mock).mockResolvedValue(validShow);
    const res = await supertest(makeApp()).get("/show/test-show");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "test-show" });
  });

  it("returns 500 when show not found", async () => {
    (showService.handleShowGet as jest.Mock).mockRejectedValue(
      new Error("not found"),
    );
    const res = await supertest(makeApp()).get("/show/nonexistent");
    expect(res.status).toBe(500);
  });
});

describe("PUT /show/:name", () => {
  it("returns 200 with updated show", async () => {
    (showService.handleShowSave as jest.Mock).mockResolvedValue(validShow);
    const res = await supertest(makeApp())
      .put("/show/test-show")
      .send(validShow);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "test-show" });
  });

  it("returns 400 with invalid show body", async () => {
    const res = await supertest(makeApp())
      .put("/show/test-show")
      .send({ bad: true });
    expect(res.status).toBe(400);
  });

  it("returns 400 with invalid name param", async () => {
    const res = await supertest(makeApp())
      .put("/show/bad name!")
      .send(validShow);
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    (showService.handleShowSave as jest.Mock).mockRejectedValue(
      new Error("write error"),
    );
    const res = await supertest(makeApp())
      .put("/show/test-show")
      .send(validShow);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /show/:name", () => {
  it("returns 204 on delete", async () => {
    (showService.handleShowDelete as jest.Mock).mockResolvedValue(undefined);
    const res = await supertest(makeApp()).delete("/show/test-show");
    expect(res.status).toBe(204);
  });

  it("returns 500 on service error", async () => {
    (showService.handleShowDelete as jest.Mock).mockRejectedValue(
      new Error("delete error"),
    );
    const res = await supertest(makeApp()).delete("/show/test-show");
    expect(res.status).toBe(500);
  });
});

// ─── Program routes ───────────────────────────────────────────────────────────

describe("GET /program", () => {
  it("returns 200 with list of program names", async () => {
    (programService.handleProgramList as jest.Mock).mockResolvedValue([
      "test-prog",
    ]);
    const res = await supertest(makeApp()).get("/program");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["test-prog"]);
  });

  it("returns 500 on service error", async () => {
    (programService.handleProgramList as jest.Mock).mockRejectedValue(
      new Error("disk error"),
    );
    const res = await supertest(makeApp()).get("/program");
    expect(res.status).toBe(500);
  });
});

describe("POST /program", () => {
  it("returns 201 on create", async () => {
    (programService.handleProgramCreate as jest.Mock).mockResolvedValue(
      validProgram,
    );
    const res = await supertest(makeApp())
      .post("/program")
      .send({ name: "test-prog" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "test-prog" });
  });

  it("returns 400 on invalid body (empty name)", async () => {
    const res = await supertest(makeApp()).post("/program").send({ name: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /program/:name", () => {
  it("returns 200 with program data", async () => {
    (programService.handleProgramGet as jest.Mock).mockResolvedValue(
      validProgram,
    );
    const res = await supertest(makeApp()).get("/program/test-prog");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "test-prog" });
  });

  it("returns 400 with invalid program name", async () => {
    const res = await supertest(makeApp()).get("/program/bad name");
    expect(res.status).toBe(400);
  });
});

describe("PUT /program/:name", () => {
  it("returns 200 with saved program", async () => {
    (programService.handleProgramSave as jest.Mock).mockResolvedValue(
      validProgram,
    );
    const res = await supertest(makeApp())
      .put("/program/test-prog")
      .send(validProgram);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "test-prog" });
  });

  it("returns 400 with invalid program body", async () => {
    const res = await supertest(makeApp())
      .put("/program/test-prog")
      .send({ bad: true });
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    (programService.handleProgramSave as jest.Mock).mockRejectedValue(
      new Error("write error"),
    );
    const res = await supertest(makeApp())
      .put("/program/test-prog")
      .send(validProgram);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /program/:name", () => {
  it("returns 204 on delete", async () => {
    (programService.handleProgramDelete as jest.Mock).mockResolvedValue(
      undefined,
    );
    const res = await supertest(makeApp()).delete("/program/test-prog");
    expect(res.status).toBe(204);
  });
});

// ─── Settings routes ──────────────────────────────────────────────────────────

describe("GET /settings", () => {
  it("returns 200 with settings", async () => {
    (settingsService.handleSettingsGet as jest.Mock).mockResolvedValue(
      validSettings,
    );
    const res = await supertest(makeApp()).get("/settings");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ midiChannel: 1 });
  });

  it("returns 500 on service error", async () => {
    (settingsService.handleSettingsGet as jest.Mock).mockRejectedValue(
      new Error("error"),
    );
    const res = await supertest(makeApp()).get("/settings");
    expect(res.status).toBe(500);
  });
});

describe("PUT /settings", () => {
  it("returns 200 with updated settings", async () => {
    (settingsService.handleSettingsPut as jest.Mock).mockResolvedValue(
      validSettings,
    );
    const res = await supertest(makeApp()).put("/settings").send(validSettings);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ midiChannel: 1 });
  });

  it("returns 500 on service error", async () => {
    (settingsService.handleSettingsPut as jest.Mock).mockRejectedValue(
      new Error("error"),
    );
    const res = await supertest(makeApp()).put("/settings").send(validSettings);
    expect(res.status).toBe(500);
  });
});
