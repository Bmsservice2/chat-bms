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

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const urlStr = String(url);
  if (urlStr.includes("127.0.0.1:3005") && process.env.OBSIDIAN_MCP_URL) {
    try {
      const parsed = new URL(process.env.OBSIDIAN_MCP_URL);
      const redirectedUrl = urlStr.replace("127.0.0.1:3005", parsed.host);
      console.log(`[MCP Router] Redirecionando de ${urlStr} para ${redirectedUrl}`);
      return originalFetch(redirectedUrl, options);
    } catch (e) {
      console.error("[MCP Router] Erro no redirecionamento:", e);
    }
  }
  return originalFetch(url, options);
};

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
let mcpClient = null;

async function connectMCP() {
  if (mcpClient) return mcpClient;

  console.log("=== INICIANDO AUTO-DETECÇÃO DE ENDPOINT MCP ===");
  
  let baseUrl = "";
  try {
    // Vacina: Extrai estritamente o protocolo e o IP:Porta, eliminando barras ou caminhos digitados por engano
    const parsed = new URL(process.env.OBSIDIAN_MCP_URL);
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch (err) {
    throw new Error(`URL inválida configurada no OBSIDIAN_MCP_URL: ${process.env.OBSIDIAN_MCP_URL}`);
  }

  // Matriz de caminhos agora totalmente limpa e sem duplicações
  const candidatePaths = [
    `${baseUrl}/sse`,
    `${baseUrl}/`,
    `${baseUrl}/mcp/sse`
  ];

  let validUrl = null;
  let diagnosticLog = "";

  for (const url of candidatePaths) {
    try {
      console.log(`Testando endpoint: ${url}`);
      const res = await originalFetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${process.env.OBSIDIAN_API_KEY}` }
      });
      
      const bodySnippet = await res.text().then(t => t.slice(0, 150)).catch(() => "N/A");
      diagnosticLog += `\n• Rota: ${url} -> Status: ${res.status} | Resposta: ${bodySnippet.replace(/[\n\r]/g, ' ')}`;
      
      if (res.status === 200 || res.headers.get("content-type")?.includes("event-stream")) {
        validUrl = url;
        console.log(`[SUCESSO] Endpoint funcional detectado: ${validUrl}`);
        break;
      }
    } catch (err) {
      diagnosticLog += `\n• Rota: ${url} -> Falha de Rede: ${err.message}`;
    }
  }

  if (!validUrl) {
    throw new Error(`Nenhum endpoint MCP válido respondeu no servidor. Relatório de Varredura:${diagnosticLog}`);
  }

  console.log(`Conectando canal SSE em: ${validUrl}`);
  const transport = new SSEClientTransport(new URL(validUrl), {
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
  console.log("Canal MCP verificado e pronto para uso.");
  
  return mcpClient;
}

app.get("/api/status", (req, res) => {
  res.json({ status: missingVars.length === 0 ? "OK" : "CONFIG_INCOMPLETA" });
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) {
    return res.status(500).json({ error: `Variáveis ausentes no Coolify: ${missingVars.join(", ")}` });
  }

  if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: "Senha inválida." });
  }

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
      .map(msg => ({
        role: msg.role,
        content: String(msg.content || "").slice(0, 12000)
      }));

    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é um assistente conectado ao Obsidian da empresa via MCP. Consulte as informações internas usando as ferramentas antes de responder.",
      messages,
      tools: mcpTools
    });

    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(c => c.type === "tool_use");
      const toolResult = await client.callTool({
        name: toolUse.name,
        arguments: toolUse.input
      });
      
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
      });

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
    console.error("Erro interno detectado:", error);
    res.status(500).json({ error: `Erro na comunicação MCP com o Obsidian: ${error.message || error}` });
  }
});

app.listen(3000, () => console.log("Servidor persistente ativo na porta 3000."));
