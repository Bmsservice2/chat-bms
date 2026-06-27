import express from "express";
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

// Função cirúrgica para conversar diretamente com a API JSON que o seu plugin do Obsidian estabeleceu
async function callObsidianPlugin(method, params = {}) {
  const baseUrl = process.env.OBSIDIAN_MCP_URL.endsWith('/') 
    ? process.env.OBSIDIAN_MCP_URL.slice(0, -1) 
    : process.env.OBSIDIAN_MCP_URL;

  const response = await fetch(`${baseUrl}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OBSIDIAN_API_KEY}`
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`O Obsidian respondeu com status ${response.status}`);
  }

  return response.json();
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
    console.log("Solicitando lista de ferramentas ao plugin do Obsidian...");
    const toolsData = await callObsidianPlugin("tools/list");
    
    const mcpTools = (toolsData.result?.tools || []).map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema || t.input_schema
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
      system: "Você é o Assistente Claude conectado ao Obsidian da BMS Service. Sempre consulte as informações internas usando as ferramentas antes de responder para garantir precisão técnica.",
      messages,
      tools: mcpTools.length > 0 ? mcpTools : undefined
    });

    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(c => c.type === "tool_use");
      console.log(`Claude solicitou o uso da ferramenta: ${toolUse.name}`);
      
      const toolResultData = await callObsidianPlugin("tools/call", {
        name: toolUse.name,
        arguments: toolUse.input
      });
      
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [{ 
          type: "tool_result", 
          tool_use_id: toolUse.id, 
          content: JSON.stringify(toolResultData.result || toolResultData) 
        }]
      });

      const finalResponse = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: Number(process.env.MAX_TOKENS || 3000),
        messages,
        tools: mcpTools.length > 0 ? mcpTools : undefined
      });
      
      return res.json({ reply: finalResponse.content.find(c => c.type === "text")?.text || "" });
    }

    res.json({ reply: response.content.find(c => c.type === "text")?.text || "Processado." });
  } catch (error) {
    console.error("Erro na execução:", error);
    res.status(500).json({ error: `Falha na integração com o Obsidian: ${error.message || error}` });
  }
});

app.listen(3000, () => console.log("Servidor persistente ativo na porta 3000."));
