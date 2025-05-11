import { describe, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "./index";

describe("text", () => {
  it("テキストフレームの一覧が取得できる", async () => {
    const client = new Client({
      name: "test client",
      version: "0.1.0",
    });

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.callTool({
      name: "list_textframes",
      arguments: {},
    });
  });

  /*it("テキストが入力できる", async () => {
    const client = new Client({
      name: "test client",
      version: "0.1.0",
    });

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    await client.callTool({
      name: "create_textframes",
      arguments: {
        count: 4,
      },
    });
  });

  it("使用可能なフォント一覧が取得できる", async () => {
    const client = new Client({
      name: "test client",
      version: "0.1.0",
    });

    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    const result = await client.callTool({
      name: "list_fonts",
      arguments: {},
    });
    console.log(result);
  });*/
});
