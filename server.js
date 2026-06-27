import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const requiredEnv = ["ANTHROPIC_API_KEY", "APP_PASSWORD"];
let missingVars = [];

for (const key of requiredEnv) {
  if (!process.env[key]) missingVars.push(key);
}

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
let mcpClient = null;

async function connectMCP() {
  if (mcpClient) return mcpClient;

  console.log("Iniciando Servidor MCP nativo via Stdio...");
  
  // Executa o motor MCP diretamente sobre a pasta mapeada do Obsidian
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./node_modules/@modelcontextprotocol/server-filesystem/dist/index.js", "/app/obsidian_vault"]
  });

  mcpClient = new Client({ name: "chat-client", version: "1.0.0" }, { capabilities: {} });
  await mcpClient.connect(transport);
  
  console.log("Conexão com a base de conhecimento estabelecida localmente via Stdio.");
  return mcpClient;
}

app.get("/api/status", (req, res) => {
  res.json({ status: missingVars.length === 0 ? "OK" : "CONFIG_INCOMPLETA" });
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) return res.status(500).json({ error: "Configuração incompleta nas variáveis." });
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

    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é o assistente Claude conectado à base de conhecimento da BMS Service. Sempre consulte os arquivos locais usando as ferramentas disponíveis antes de responder.",
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
    res.status(500).json({ error: `Erro na execução do MCP local: ${error.message}` });
  }
});

app.listen(3000, () => console.log("Servidor ativo na porta 3000."));
