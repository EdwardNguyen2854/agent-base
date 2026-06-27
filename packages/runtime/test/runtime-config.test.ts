import { describe, expect, it } from "vitest";
import { createRuntimeConfig } from "../src/runtime-config.js";

describe("Agent Base runtime configuration", () => {
  it("binds the web and database listeners to loopback", () => {
    const config = createRuntimeConfig({ dataDirectory: "/agent-base-data" });

    expect(config.web.origin).toBe("http://127.0.0.1:3210");
    expect(config.database.host).toBe("127.0.0.1");
    expect(config.database.listenAddresses).toBe("127.0.0.1");
  });
});
