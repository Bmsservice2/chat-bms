import express from "express";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const app = express();

// Configura o parser binário bruto para a rota de upload antes do parser de JSON
app.use("/api/upload-vault", express.raw({ type: "*/*", limit: "25mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const requiredEnv = ["ANTHROPIC_API_KEY", "APP_PASSWORD"];
let missingVars = [];

for (const key of requiredEnv) {
  if (!process.env[key]) missingVars.push(key);
}

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const VAULT_PATH = "/app/obsidian_vault/BaseConhecimento";

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
        filename: { type: "string", description: "Nome do arquivo com extensão .md (ex: projetos.md ou subpasta/nota.md)" }
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
        filename: { type: "string", description: "Nome do arquivo com extensão .md (ex: automacao_n8n.md)" },
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
        foldername: { type: "string", description: "Caminho ou nome da pasta a ser criada (ex: NovaPasta)" }
      },
      required: ["foldername"]
    }
  }
];

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

app.get("/api/note-content", (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: "Parâmetro 'file' obrigatório." });
  try {
    const result = readNoteLocal(filename);
    if (result.error) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota de Upload Físico Direto para o Volume Compartilhado do Obsidian
app.post("/api/upload-vault", (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: "Nome do arquivo não especificado." });
  
  try {
    const safePath = getSafePath(filename);
    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, req.body);
    console.log(`[BMS Storage] Arquivo gravado com sucesso: ${filename}`);
    res.json({ success: true, message: "Arquivo integrado ao Obsidian." });
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
      .map(msg => ({ role: msg.role, content: msg.content }));

    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    let response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é o Assistente Claude conectado de forma nativa aos arquivos do Obsidian da BMS Service. Você possui ferramentas completas para listar, ler, criar e editar notas ou pastas. Execute as ações solicitadas imediatamente e retorne a confirmação.",
      messages,
      tools: localTools
    });

    while (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          let toolResult = {};
          console.log(`[BMS Loop Execute] Executando: ${block.name}`);
          
          try {
            if (block.name === "list_notes") {
              toolResult = listNotesLocal();
            } else if (block.name === "read_note") {
              toolResult = readNoteLocal(block.input.filename);
            } else if (block.name === "create_note") {
              toolResult = createNoteLocal(block.input.filename, block.input.content);
            } else if (block.name === "edit_note") {
              toolResult = editNoteLocal(block.input.filename, block.input.content);
            } else if (block.name === "create_folder") {
              toolResult = createFolderLocal(block.input.foldername);
            }
          } catch (err) {
            toolResult = { error: err.message };
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(toolResult)
          });
        }
      }

      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: Number(process.env.MAX_TOKENS || 3000),
        messages,
        tools: localTools
      });
    }

    res.json({ reply: response.content.find(c => c.type === "text")?.text || "Ação concluída com sucesso." });
  } catch (error) {
    console.error("Erro na execução local do loop:", error);
    res.status(500).json({ error: `Erro na execução do MCP nativo: ${error.message}` });
  }
});

app.listen(3000, () => console.log("Servidor ativo e consolidado na porta 3000."));
