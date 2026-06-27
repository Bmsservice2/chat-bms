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

// Barramento expandido de ferramentas locais com capacidades de escrita e estruturação
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
        filename: { type: "string", description: "Nome do arquivo com extensão (ex: projetos.md ou subpasta/nota.md)" }
      },
      required: ["filename"]
    }
  },
  {
    name: "create_note",
    description: "Cria uma nova nota (.md) no cofre do Obsidian com o conteúdo técnico fornecido.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Nome do arquivo com extensão .md (ex: automacao_n8n.md ou 01 Oficios/documento.md)" },
        content: { type: "string", description: "Conteúdo completo estruturado em formato Markdown." }
      },
      required: ["filename", "content"]
    }
  },
  {
    name: "edit_note",
    description: "Edita ou sobrescreve completamente uma nota existente no cofre para atualizar procedimentos técnicos.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Nome do arquivo existente com extensão (ex: projetos.md)" },
        content: { type: "string", description: "Novo conteúdo atualizado completo da nota." }
      },
      required: ["filename", "content"]
    }
  },
  {
    name: "create_folder",
    description: "Cria uma nova pasta organizacional dentro do cofre do Obsidian.",
    input_schema: {
      type: "object",
      properties: {
        foldername: { type: "string", description: "Caminho ou nome da pasta a ser criada (ex: 08 Provas)" }
      },
      required: ["foldername"]
    }
  }
];

// Validador de segurança para mitigar falhas de Path Traversal fora do volume
function getSafePath(targetPath) {
  const resolvedPath = path.resolve(VAULT_PATH, targetPath);
  if (!resolvedPath.startsWith(VAULT_PATH)) {
    throw new Error("Acesso negado: Tentativa de manipulação fora do cofre corporativo.");
  }
  return resolvedPath;
}

function listNotesLocal() {
  if (!fs.existsSync(VAULT_PATH)) return { error: `Pasta ${VAULT_PATH} não encontrada.` };
  const getFilesRecursively = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      if (file.startsWith('.')) return;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath));
      } else if (file.endsWith('.md') || file.endsWith('.txt')) {
        results.push(path.relative(VAULT_PATH, fullPath));
      }
    });
    return results;
  };
  return { files: getFilesRecursively(VAULT_PATH) };
}

function readNoteLocal(filename) {
  const safePath = getSafePath(filename);
  if (!fs.existsSync(safePath)) return { error: `Arquivo ${filename} não encontrado.` };
  return { filename, content: fs.readFileSync(safePath, "utf-8") };
}

function createNoteLocal(filename, content) {
  const safePath = getSafePath(filename);
  fs.mkdirSync(path.dirname(safePath), { recursive: true });
  fs.writeFileSync(safePath, content, "utf-8");
  return { filename, status: "Nota criada com sucesso no sistema." };
}

function editNoteLocal(filename, content) {
  const safePath = getSafePath(filename);
  if (!fs.existsSync(safePath)) return { error: `Nota ${filename} não existe para ser editada.` };
  fs.writeFileSync(safePath, content, "utf-8");
  return { filename, status: "Nota atualizada com sucesso." };
}

function createFolderLocal(foldername) {
  const safePath = getSafePath(foldername);
  fs.mkdirSync(safePath, { recursive: true });
  return { foldername, status: "Diretório organizacional criado com sucesso." };
}

app.get("/api/status", (req, res) => {
  res.json({ status: missingVars.length === 0 ? "OK" : "CONFIG_INCOMPLETA" });
});

app.get("/api/notes", (req, res) => {
  try {
    res.json(listNotesLocal());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é o Assistente Claude conectado de forma nativa aos arquivos do Obsidian da BMS Service. Você possui ferramentas completas para listar, ler, criar e editar notas ou pastas. Execute as ações solicitadas imediatamente e retorne a confirmação.",
      messages,
      tools: localTools
    });

    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(c => c.type === "tool_use");
      let toolResult = {};

      console.log(`[BMS Execute] Operação local acionada: ${toolUse.name}`);
      
      try {
        if (toolUse.name === "list_notes") {
          toolResult = listNotesLocal();
        } else if (toolUse.name === "read_note") {
          toolResult = readNoteLocal(toolUse.input.filename);
        } else if (toolUse.name === "create_note") {
          toolResult = createNoteLocal(toolUse.input.filename, toolUse.input.content);
        } else if (toolUse.name === "edit_note") {
          toolResult = editNoteLocal(toolUse.input.filename, toolUse.input.content);
        } else if (toolUse.name === "create_folder") {
          toolResult = createFolderLocal(toolUse.input.foldername);
        }
      } catch (err) {
        toolResult = { error: err.message };
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
      });

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
