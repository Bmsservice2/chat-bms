import express from "express";
import fs from "fs";
import path from "path";
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
const VAULT_PATH = "/app/obsidian_vault";

// Definição manual e nativa das ferramentas para evitar dependência do SDK quebrado
const localTools = [
  {
    name: "list_notes",
    description: "Lista todas as notas e arquivos disponíveis na base de conhecimento técnica do Obsidian.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "read_note",
    description: "Lê o conteúdo completo de uma nota específica do Obsidian para extrair procedimentos ou informações técnicas.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Nome do arquivo com extensão (ex: projetos.md ou n8n_workflow.md)" }
      },
      required: ["filename"]
    }
  }
];

// Funções locais de leitura de disco usando o core nativo do Node.js
function listNotesLocal() {
  if (!fs.existsSync(VAULT_PATH)) {
    return { error: `Pasta ${VAULT_PATH} não encontrada. Verifique o Storage no Coolify.` };
  }
  const files = fs.readdirSync(VAULT_PATH);
  return { files: files.filter(f => !f.startsWith('.')) };
}

function readNoteLocal(filename) {
  const safePath = path.join(VAULT_PATH, path.basename(filename));
  if (!fs.existsSync(safePath)) {
    return { error: `Arquivo ${filename} não encontrado no cofre corporativo.` };
  }
  const content = fs.readFileSync(safePath, "utf-8");
  return { filename, content };
}

app.get("/api/status", (req, res) => {
  res.json({ status: missingVars.length === 0 ? "OK" : "CONFIG_INCOMPLETA" });
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) return res.status(500).json({ error: "Configuração incompleta nas variáveis." });
  if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Senha inválida." });

  try {
    const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = userMessages
      .filter(msg => msg && ["user", "assistant"].includes(msg.role))
      .slice(-20)
      .map(msg => ({ role: msg.role, content: String(msg.content || "") }));

    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    // Chamada inicial para o Claude com a especificação das ferramentas locais
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é o Assistente Claude conectado de forma nativa aos arquivos do Obsidian da BMS Service. Sempre use as ferramentas disponíveis para listar e ler as notas técnicas antes de responder ao usuário.",
      messages,
      tools: localTools
    });

    // Se o Claude decidir usar alguma ferramenta para ler seu cofre
    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(c => c.type === "tool_use");
      let toolResult = {};

      console.log(`[BMS Execute] Claude chamou a ferramenta local: ${toolUse.name}`);
      
      if (toolUse.name === "list_notes") {
        toolResult = listNotesLocal();
      } else if (toolUse.name === "read_note") {
        toolResult = readNoteLocal(toolUse.input.filename);
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
      });

      // Segunda chamada enviando o conteúdo lido do disco para o Claude formular a resposta técnica
      const finalResponse = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: Number(process.env.MAX_TOKENS || 3000),
        messages,
        tools: localTools
      });
      
      return res.json({ reply: finalResponse.content.find(c => c.type === "text")?.text || "" });
    }

    res.json({ reply: response.content.find(c => c.type === "text")?.text || "Processado." });
  } catch (error) {
    console.error("Erro na execução local:", error);
    res.status(500).json({ error: `Erro na execução do MCP nativo: ${error.message}` });
  }
});

app.listen(3000, () => console.log("Servidor ativo e consolidado na porta 3000."));
