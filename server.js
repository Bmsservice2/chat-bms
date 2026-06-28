import express from "express";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const app = express();

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
    description: "Lista todos os processos e documentos jurídicos disponíveis no Cofre de arquivos.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "read_note",
    description: "Lê o conteúdo completo de uma peça processual ou documento técnico do Cofre.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Nome do arquivo com extensão (ex: subpasta/documento.md)" }
      },
      required: ["filename"]
    }
  },
  {
    name: "create_note",
    description: "Cria um novo documento ou petição (.md) dentro do Cofre com a estrutura informada.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Nome do arquivo com extensão .md (ex: 01 Oficios/documento.md)" },
        content: { type: "string", description: "Conteúdo estruturado completo." }
      },
      required: ["filename", "content"]
    }
  },
  {
    name: "edit_note",
    description: "Edita ou sobrescreve uma peça existente no Cofre para atualizar teses ou informações.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Nome do arquivo existente com extensão (ex: tese.md)" },
        content: { type: "string", description: "Novo conteúdo atualizado completo." }
      },
      required: ["filename", "content"]
    }
  },
  {
    name: "create_folder",
    description: "Cria uma nova pasta organizacional de processos dentro do Cofre.",
    input_schema: {
      type: "object",
      properties: {
        foldername: { type: "string", description: "Caminho ou nome da pasta a ser criada (ex: PastaDeTestes)" }
      },
      required: ["foldername"]
    }
  }
];

function getSafePath(targetPath) {
  const resolvedPath = path.resolve(VAULT_PATH, targetPath);
  if (!resolvedPath.startsWith(VAULT_PATH)) {
    throw new Error("Acesso negado: Tentativa de manipulação externa.");
  }
  return resolvedPath;
}

function listNotesLocal() {
  if (!fs.existsSync(VAULT_PATH)) return { error: `Cofre de dados não localizado na VPS.` };
  const getFilesRecursively = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      if (file.startsWith('.')) return;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath));
      } else if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.pdf')) {
        results.push(path.relative(VAULT_PATH, fullPath));
      }
    });
    return results;
  };
  return { files: getFilesRecursively(VAULT_PATH) };
}

function readNoteLocal(filename) {
  const safePath = getSafePath(filename);
  if (!fs.existsSync(safePath)) return { error: `Documento ${filename} não encontrado.` };
  return { filename, content: fs.readFileSync(safePath, "utf-8") };
}

function createNoteLocal(filename, content) {
  const safePath = getSafePath(filename);
  fs.mkdirSync(path.dirname(safePath), { recursive: true });
  fs.writeFileSync(safePath, content, "utf-8");
  return { filename, status: "Documento integrado com sucesso." };
}

function editNoteLocal(filename, content) {
  const safePath = getSafePath(filename);
  if (!fs.existsSync(safePath)) return { error: `Documento não localizado para edição.` };
  fs.writeFileSync(safePath, content, "utf-8");
  return { filename, status: "Peça processual atualizada." };
}

function createFolderLocal(foldername) {
  const safePath = getSafePath(foldername);
  fs.mkdirSync(safePath, { recursive: true });
  return { foldername, status: "Diretório estrutural criado." };
}

// Verifica de verdade a integridade física da pasta compartilhada
app.get("/api/status", (req, res) => {
  if (missingVars.length > 0 || !fs.existsSync(VAULT_PATH)) {
    return res.status(500).json({ status: "ERRO" });
  }
  res.json({ status: "OK" });
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
  if (!filename) return res.status(400).json({ error: "Parâmetro obrigatório." });
  try {
    const result = readNoteLocal(filename);
    if (result.error) return res.status(404).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/note-raw", (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: "Parâmetro obrigatório." });
  try {
    const safePath = getSafePath(filename);
    if (!fs.existsSync(safePath)) return res.status(404).json({ error: "Arquivo não encontrado." });
    res.sendFile(safePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint direto para manipulação manual de pastas pelo front-end
app.post("/api/create-folder", (req, res) => {
  const { foldername } = req.body;
  if (!foldername) return res.status(400).json({ error: "Nome do diretório ausente." });
  try {
    const result = createFolderLocal(foldername);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/graph-data", (req, res) => {
  try {
    const check = listNotesLocal();
    if (check.error || !check.files) return res.json({ nodes: [], edges: [] });
    
    const files = check.files;
    const nodes = files.map(f => ({ id: f, label: f.split('/').pop().replace(/\.(md|pdf|txt)$/i, "") }));
    const edges = [];

    files.forEach(file => {
      if (file.toLowerCase().endsWith('.pdf')) return;
      try {
        const fullContent = fs.readFileSync(getSafePath(file), "utf-8");
        const linkRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = linkRegex.exec(fullContent)) !== null) {
          const targetLabel = match[1].trim().replace(/\.(md|pdf|txt)$/i, "");
          const targetNode = nodes.find(n => n.label === targetLabel || n.id === match[1].trim());
          if (targetNode) {
            edges.push({ source: file, target: targetNode.id });
          }
        }
      } catch (e) {
        console.error(e.message);
      }
    });

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/upload-vault", (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: "Caminho de gravação inválido." });
  try {
    const safePath = getSafePath(filename);
    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) return res.status(500).json({ error: "Configuração incompleta." });
  if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Chave inválida." });

  try {
    const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = userMessages
      .filter(msg => msg && ["user", "assistant"].includes(msg.role))
      .slice(-20)
      .map(msg => ({ role: msg.role, content: msg.content }));

    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    // REQUISITO 1: Restrição absoluta de identidade da IA corporativa
    let response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: Number(process.env.MAX_TOKENS || 3000),
      system: "Você é o Assistente BMS, uma inteligência especializada e copiloto de alta performance conectado de forma nativa ao Cofre de documentos e processos jurídicos da empresa. Em hipótese alguma mencione marcas como Claude ou Anthropic. Nunca utilize o termo 'Obsidian', chame a base local exclusivamente de 'Cofre'. Use as ferramentas disponíveis para listar, ler, criar e alterar arquivos sempre que necessário.",
      messages,
      tools: localTools
    });

    while (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          let toolResult = {};
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

    res.json({ reply: response.content.find(c => c.type === "text")?.text || "Processado com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Falha crítica no barramento local.` });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: "Erro interno no servidor do cofre." });
});

app.listen(3000, () => console.log("Servidor ativo e consolidado na porta 3000."));
