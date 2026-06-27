import { describe, expect, it } from "vitest";
import {
  createPostgresHostAuthentication,
  createRuntimeConfig,
} from "../src/runtime-config.js";

describe("Agent Base runtime configuration", () => {
  it("binds the web and database listeners to loopback", () => {
    const config = createRuntimeConfig({ dataDirectory: "/agent-base-data" });

    expect(config.web.origin).toBe("http://127.0.0.1:3210");
    expect(config.database.host).toBe("127.0.0.1");
    expect(config.database.listenAddresses).toBe("127.0.0.1");
  });

  it("allows bootstrap access to the maintenance database without widening application access", () => {
    expect(createPostgresHostAuthentication()).toEqual([
      "local all all reject",
      "host postgres agent_base_admin 127.0.0.1/32 scram-sha-256",
      "host agent_base agent_base_admin 127.0.0.1/32 scram-sha-256",
      "host agent_base agent_base 127.0.0.1/32 scram-sha-256",
      "host all all 0.0.0.0/0 reject",
      "host all all ::0/0 reject",
    ]);
  });
});
