import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const requiredEnv = ["ANTHROPIC_API_KEY", "OBSIDIAN_MCP_URL", "OBSIDIAN_API_KEY", "APP_PASSWORD"];
let missingVars = [];

for (const key of requiredEnv) {
  if (!process.env[key]) missingVars.push(key);
}

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
let mcpClient = null;

async function connectMCP() {
  if (mcpClient) return mcpClient;

  // Endpoint SSE exato do plugin Semantic Notes Vault
  const parsed = new URL(process.env.OBSIDIAN_MCP_URL);
  const targetUrl = `${parsed.protocol}//${parsed.host}/mcp/sse`;
  
  console.log(`Conectando canal SSE em: ${targetUrl}`);
  
  const transport = new SSEClientTransport(new URL(targetUrl), {
    eventSourceInit: {
      headers: { "Authorization": `Bearer ${process.env.OBSIDIAN_API_KEY}` }
    },
    requestInit: {
      headers: { "Authorization": `Bearer ${process.env.OBSIDIAN_API_KEY}` }
    }
  });
  
  mcpClient = new Client({ name: "chat-client", version: "1.0.0" }, { capabilities: {} });
  await mcpClient.connect(transport);
  
  console.log("Aguardando estabilização da transmissão (2s)...");
  await new Promise(resolve => setTimeout(resolve, 2000));
  return mcpClient;
}

app.get("/api/status", (req, res) => {
  res.json({ status: missingVars.length === 0 ? "OK" : "CONFIG_INCOMPLETA" });
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) return res.status(500).json({ error: "Configuração incompleta." });
  if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Senha inválida." });

  try {
    const client = await connectMCP();
    const toolsResponse = await client.listTools();
    const mcpTools = toolsResponse.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema
    }));

    const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = userMessages
      .filter(msg => msg && ["user", "assistant"].includes(msg.role))
      .slice(-20)
      .map(msg => ({ role: msg.role, content: String(msg.content || "") }));

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é o assistente conectado ao Obsidian da BMS Service. Consulte as informações internas usando as ferramentas antes de responder.",
      messages,
      tools: mcpTools.length > 0 ? mcpTools : undefined
    });

    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(c => c.type === "tool_use");
      const toolResult = await client.callTool({ name: toolUse.name, arguments: toolUse.input });
      
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] });

      const finalResponse = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: Number(process.env.MAX_TOKENS || 3000),
        messages,
        tools: mcpTools
      });
      return res.json({ reply: finalResponse.content.find(c => c.type === "text")?.text || "" });
    }

    res.json({ reply: response.content.find(c => c.type === "text")?.text || "Processado." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Erro na comunicação MCP: ${error.message}` });
  }
});

app.listen(3000, () => console.log("Servidor ativo na porta 3000."));
