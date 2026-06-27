import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const requiredEnv = ["ANTHROPIC_API_KEY", "OBSIDIAN_MCP_URL", "OBSIDIAN_API_KEY", "APP_PASSWORD"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Variável obrigatória ausente: ${key}`);
    process.exit(1);
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
let mcpClient = null;

async function connectMCP() {
  if (!mcpClient) {
    console.log("Conectando ao MCP via SSE em:", process.env.OBSIDIAN_MCP_URL);
    
    // Injeta a API Key do Obsidian direto nos cabeçalhos da conexão
    const transport = new SSEClientTransport(new URL(process.env.OBSIDIAN_MCP_URL), {
      eventSourceInit: {
        headers: { "Authorization": `Bearer ${process.env.OBSIDIAN_API_KEY}` }
      },
      requestInit: {
        headers: { "Authorization": `Bearer ${process.env.OBSIDIAN_API_KEY}` }
      }
    });
    
    mcpClient = new Client({ name: "chat-client", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    console.log("MCP Conectado com sucesso!");
  }
  return mcpClient;
}

app.post("/api/chat", async (req, res) => {
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
      system: "Você é um assistente conectado ao Obsidian da empresa via MCP. Consulte as informações internas usando as ferramentas antes de responder. Não invente dados.",
      messages,
      tools: mcpTools
    });

    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(c => c.type === "tool_use");
      console.log("Ferramenta acionada:", toolUse.name);
      
      const toolResult = await client.callTool({
        name: toolUse.name,
        arguments: toolUse.input
      });
      
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [{ 
          type: "tool_result", 
          tool_use_id: toolUse.id, 
          content: JSON.stringify(toolResult)
        }]
      });

      const finalResponse = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: Number(process.env.MAX_TOKENS || 3000),
        messages,
        tools: mcpTools
      });
      
      return res.json({ reply: finalResponse.content.find(c => c.type === "text")?.text || "" });
    }

    res.json({ reply: response.content.find(c => c.type === "text")?.text || "Resposta processada." });
  } catch (error) {
    console.error("Erro interno:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.listen(3000, () => console.log("Chat rodando na porta 3000"));
