import {
  PUBLIC_LOOKUP_GENERIC_FAILURE,
  burstIngestResponseSchema,
  healthResponseSchema,
  messageHistoryResponseSchema,
  nodeListResponseSchema,
  readinessResponseSchema,
  webRouteManifestResponseSchema
} from "@loom/contracts";
import {
  burstRequest,
  fixtureAdmin,
  fixtureNodeOwner,
  fixtureSecondNodeOwner,
  publicLookupFailureFixture,
  publicLookupSuccessFixture,
  validMeshMessage
} from "@loom/test-fixtures";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { TestServer } from "../testApp";
import { createTestServer } from "../testApp";

describe("LOOM API", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  beforeEach(async () => {
    await server.reset();
  });

  afterAll(async () => {
    await server?.close();
  });

  it("reports health and readiness", async () => {
    const health = await request(server.app).get("/health").expect(200);
    expect(healthResponseSchema.parse(health.body).status).toBe("ok");

    const ready = await request(server.app).get("/ready").expect(200);
    expect(readinessResponseSchema.parse(ready.body)).toMatchObject({
      status: "ready",
      mongo: true,
      indexes: true
    });
  });

  it("serves the frontend route manifest for landing, public, and admin surfaces", async () => {
    const response = await request(server.app).get("/api/web/routes").expect(200);
    expect(webRouteManifestResponseSchema.parse(response.body)).toMatchObject({
      landing: {
        home: "/",
        publicMap: "/public",
        publicHistory: "/public/history",
        adminLogin: "/admin/login"
      },
      admin: {
        dashboard: "/admin",
        map: "/admin/map",
        nodes: "/admin/nodes",
        messages: "/admin/messages"
      },
      api: {
        publicHeatmap: "/api/public/map/heatmap",
        publicMarkers: "/api/public/map/markers",
        publicHistoryLookup: "/api/public/history/lookup",
        adminHeatmap: "/api/admin/map/heatmap",
        adminMarkers: "/api/admin/map/markers",
        adminMessages: "/api/admin/messages"
      }
    });
  });

  it("supports admin login, session fetch, and logout", async () => {
    const agent = request.agent(server.app);
    await agent
      .post("/api/admin/auth/login")
      .send({ username: fixtureAdmin.username, password: fixtureAdmin.password })
      .expect(200)
      .expect((response) => {
        expect(response.body.authenticated).toBe(true);
        expect(response.headers["set-cookie"]).toBeDefined();
      });

    await agent
      .get("/api/admin/auth/session")
      .expect(200)
      .expect((response) => {
        expect(response.body.authenticated).toBe(true);
        expect(response.body.admin.username).toBe("admin");
      });

    await agent.post("/api/admin/auth/logout").expect(200);
    await agent
      .get("/api/admin/auth/session")
      .expect(200)
      .expect((response) => {
        expect(response.body.authenticated).toBe(false);
        expect(response.body.admin).toBeNull();
      });
  });

  it("rejects invalid admin login", async () => {
    await request(server.app)
      .post("/api/admin/auth/login")
      .send({ username: fixtureAdmin.username, password: "wrong-password" })
      .expect(401);
  });

  it("registers, lists, searches, and fetches nodes", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);
    await registerNode(agent, fixtureSecondNodeOwner).expect(201);

    const list = await agent.get("/api/admin/nodes").expect(200);
    expect(nodeListResponseSchema.parse(list.body).nodes).toHaveLength(2);

    await agent
      .get("/api/admin/nodes?search=42")
      .expect(200)
      .expect((response) => {
        expect(response.body.nodes[0].nodeIdNumeric).toBe(42);
      });

    await agent
      .get("/api/admin/nodes?search=Ayu")
      .expect(200)
      .expect((response) => {
        expect(response.body.nodes[0].ownerFullName).toBe("Ayu Lestari");
      });

    await agent
      .get("/api/admin/nodes/42")
      .expect(200)
      .expect((response) => {
        expect(response.body.node.nodeIdNumeric).toBe(42);
      });
  });

  it("rejects duplicate and invalid node IDs", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);
    await registerNode(agent, fixtureNodeOwner).expect(409);
    await registerNode(agent, { ...fixtureNodeOwner, nodeId: 16_777_216 }).expect(400);
  });

  it("ingests valid, duplicate, cross-phone duplicate, and mixed invalid batches", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);

    const first = await request(server.app)
      .post("/api/ingest/burst")
      .send(burstRequest())
      .expect(202);
    expect(burstIngestResponseSchema.parse(first.body).accepted).toHaveLength(1);

    const duplicate = await request(server.app)
      .post("/api/ingest/burst")
      .send(burstRequest())
      .expect(202);
    expect(duplicate.body.duplicate).toHaveLength(1);

    const crossPhone = await request(server.app)
      .post("/api/ingest/burst")
      .send(burstRequest([validMeshMessage()], { mobileInstallationId: "mobile-test-2" }))
      .expect(202);
    expect(crossPhone.body.duplicate).toHaveLength(1);

    const mixed = await request(server.app)
      .post("/api/ingest/burst")
      .send(burstRequest([validMeshMessage({ seqId: 2 }), { seqId: "bad" } as never]))
      .expect(202);
    expect(mixed.body.accepted).toHaveLength(1);
    expect(mixed.body.rejected).toHaveLength(1);
  });

  it("normalizes E6-only burst coordinates for history, heatmap, and marker metadata", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);

    await request(server.app)
      .post("/api/ingest/burst")
      .send(
        burstRequest([
          validMeshMessage({
            seqId: 33,
            lat: undefined,
            lon: undefined,
            latE6: -6_208_763,
            lonE6: 106_845_599
          })
        ])
      )
      .expect(202);

    await agent
      .get("/api/admin/messages?nodeId=42")
      .expect(200)
      .expect((response) => {
        const message = messageHistoryResponseSchema.parse(response.body).messages[0];
        expect(message).toMatchObject({
          lat: -6.208763,
          lon: 106.845599,
          latE6: -6_208_763,
          lonE6: 106_845_599
        });
      });

    await request(server.app)
      .get("/api/public/map/heatmap")
      .expect(200)
      .expect((response) => {
        expect(response.body.points[0]).toMatchObject({
          lat: -6.208763,
          lon: 106.845599
        });
      });

    await request(server.app)
      .get("/api/public/map/markers")
      .expect(200)
      .expect((response) => {
        expect(response.body.markers[0]).toMatchObject({
          lat: -6.208763,
          lon: 106.845599
        });
      });
  });

  it("rejects malformed coordinate pairs and treats zero-zero E6 as no location", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);

    const response = await request(server.app)
      .post("/api/ingest/burst")
      .send(
        burstRequest([
          validMeshMessage({ seqId: 34, lat: undefined, lon: undefined, latE6: 0, lonE6: 0 }),
          validMeshMessage({
            seqId: 35,
            lat: undefined,
            lon: undefined,
            latE6: -6_208_763,
            lonE6: undefined
          }),
          validMeshMessage({
            seqId: 36,
            lat: -6.208763,
            lon: 106.845599,
            latE6: -6_200_000,
            lonE6: 106_845_599
          })
        ])
      )
      .expect(202);

    expect(response.body.accepted).toHaveLength(1);
    expect(response.body.rejected).toHaveLength(2);

    const history = await agent.get("/api/admin/messages?nodeId=42").expect(200);
    const message = messageHistoryResponseSchema.parse(history.body).messages[0];
    expect(message).toMatchObject({
      seqId: 34,
      lat: null,
      lon: null,
      latE6: null,
      lonE6: null
    });
  });

  it("handles concurrent duplicate burst requests with one stored message", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);

    const [first, second] = await Promise.all([
      request(server.app)
        .post("/api/ingest/burst")
        .send(burstRequest([validMeshMessage({ seqId: 9 })])),
      request(server.app)
        .post("/api/ingest/burst")
        .send(burstRequest([validMeshMessage({ seqId: 9 })]))
    ]);

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(first.body.accepted.length + second.body.accepted.length).toBe(1);
    expect(first.body.duplicate.length + second.body.duplicate.length).toBe(1);
    expect(await server.mongo.collections.meshMessages.countDocuments({ dedupKey: "42:9" })).toBe(
      1
    );
  });

  it("serves heatmap, marker, and admin message history responses", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);
    await request(server.app).post("/api/ingest/burst").send(burstRequest()).expect(202);

    await request(server.app)
      .get("/api/map/heatmap")
      .expect(200)
      .expect((response) => {
        expect(response.body.points[0]).toMatchObject({ message: "fine", count: 1 });
      });
    await request(server.app)
      .get("/api/map/heatmap?message=medical_help")
      .expect(200)
      .expect((response) => {
        expect(response.body.points).toHaveLength(0);
      });
    await request(server.app)
      .get("/api/map/markers")
      .expect(200)
      .expect((response) => {
        expect(response.body.markers[0].ownerFullName).toBeUndefined();
      });
    await request(server.app)
      .get("/api/public/map/heatmap")
      .expect(200)
      .expect((response) => {
        expect(response.body.points[0]).toMatchObject({ message: "fine", count: 1 });
      });
    await request(server.app)
      .get("/api/public/map/markers")
      .expect(200)
      .expect((response) => {
        expect(response.body.markers[0].ownerFullName).toBeUndefined();
      });
    await agent
      .get("/api/admin/map/heatmap")
      .expect(200)
      .expect((response) => {
        expect(response.body.points[0]).toMatchObject({ message: "fine", count: 1 });
      });
    await agent
      .get("/api/admin/map/heatmap?message=medical_help")
      .expect(200)
      .expect((response) => {
        expect(response.body.points).toHaveLength(0);
      });
    await agent
      .get("/api/admin/map/markers")
      .expect(200)
      .expect((response) => {
        expect(response.body.markers[0].ownerFullName).toBe("Ayu Lestari");
      });

    const history = await agent.get("/api/admin/messages?nodeId=42").expect(200);
    expect(messageHistoryResponseSchema.parse(history.body).messages).toHaveLength(1);

    await agent
      .get("/api/admin/nodes/42/messages")
      .expect(200)
      .expect((response) => {
        expect(response.body.messages[0].dedupKey).toBe("42:1");
      });
  });

  it("gates public lookup by full name and birth date with generic failures", async () => {
    const agent = await loggedInAgent(server);
    await registerNode(agent, fixtureNodeOwner).expect(201);
    await request(server.app).post("/api/ingest/burst").send(burstRequest()).expect(202);

    await request(server.app)
      .post("/api/public/history/lookup")
      .send(publicLookupSuccessFixture)
      .expect(200)
      .expect((response) => {
        expect(response.body.ok).toBe(true);
        expect(response.body.messages[0].dedupKey).toBe("42:1");
      });

    const wrongBirthDate = await request(server.app)
      .post("/api/public/history/lookup")
      .send(publicLookupFailureFixture)
      .expect(404);
    const unknownName = await request(server.app)
      .post("/api/public/history/lookup")
      .send({ ownerFullName: "Unknown Person", ownerBirthDate: fixtureNodeOwner.ownerBirthDate })
      .expect(404);

    expect(wrongBirthDate.body).toEqual({ ok: false, message: PUBLIC_LOOKUP_GENERIC_FAILURE });
    expect(unknownName.body).toEqual(wrongBirthDate.body);
  });

  it("returns not ready when MongoDB is unreachable", async () => {
    await server.mongo.client.close();
    const response = await request(server.app).get("/ready").expect(503);
    expect(response.body).toMatchObject({ status: "not_ready", mongo: false, indexes: false });
  });
});

type LoggedInAgent = ReturnType<typeof request.agent>;

const loggedInAgent = async (server: TestServer): Promise<LoggedInAgent> => {
  const agent = request.agent(server.app);
  await agent
    .post("/api/admin/auth/login")
    .send({ username: fixtureAdmin.username, password: fixtureAdmin.password })
    .expect(200);
  return agent;
};

const registerNode = (
  agent: LoggedInAgent,
  node: { nodeId: number; ownerFullName: string; ownerBirthDate: string }
): request.Test =>
  agent.post("/api/admin/nodes").send({
    nodeId: node.nodeId,
    ownerFullName: node.ownerFullName,
    ownerBirthDate: node.ownerBirthDate
  });
