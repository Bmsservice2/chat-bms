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
    description: "Lista processos e documentos jurídicos do Cofre.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "read_note",
    description: "Lê o conteúdo completo de uma peça processual do Cofre.",
    input_schema: {
      type: "object",
      properties: { filename: { type: "string", description: "Nome do arquivo com extensão" } },
      required: ["filename"]
    }
  },
  {
    name: "create_note",
    description: "Cria um novo documento no Cofre.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string" },
        content: { type: "string" }
      },
      required: ["filename", "content"]
    }
  },
  {
    name: "edit_note",
    description: "Edita uma peça existente no Cofre.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string" },
        content: { type: "string" }
      },
      required: ["filename", "content"]
    }
  }
];

function getSafePath(targetPath) {
  const resolvedPath = path.resolve(VAULT_PATH, targetPath);
  if (!resolvedPath.startsWith(VAULT_PATH)) throw new Error("Acesso negado.");
  return resolvedPath;
}

// Leitura inteligente de arquivos E PASTAS (Pastas retornam com uma "/" no final)
function listNotesLocal() {
  if (!fs.existsSync(VAULT_PATH)) return { error: `Cofre não localizado.` };
  const files = [];
  const scanDir = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      if (file.startsWith('.')) return;
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(VAULT_PATH, fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        files.push(relativePath + "/"); // Identificador de pasta
        scanDir(fullPath);
      } else if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.pdf')) {
        files.push(relativePath);
      }
    });
  };
  scanDir(VAULT_PATH);
  return { files };
}

function readNoteLocal(filename) {
  const safePath = getSafePath(filename);
  if (!fs.existsSync(safePath)) return { error: `Documento não encontrado.` };
  return { filename, content: fs.readFileSync(safePath, "utf-8") };
}

app.get("/api/status", (req, res) => {
  if (missingVars.length > 0 || !fs.existsSync(VAULT_PATH)) return res.status(500).json({ status: "ERRO" });
  res.json({ status: "OK" });
});

app.get("/api/notes", (req, res) => {
  try { res.json(listNotesLocal()); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/note-content", (req, res) => {
  const filename = req.query.file;
  if (!filename) return res.status(400).json({ error: "Falta parâmetro." });
  try {
    const result = readNoteLocal(filename);
    if (result.error) return res.status(404).json(result);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/note-raw", (req, res) => {
  const filename = req.query.file;
  try {
    const safePath = getSafePath(filename);
    if (!fs.existsSync(safePath)) return res.status(404).json({ error: "Não encontrado." });
    res.sendFile(safePath);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ROTAS OPERACIONAIS DOS TRÊS PONTOS (Faltava isso no seu servidor antigo)
app.post("/api/create-folder", (req, res) => {
  try {
    const safePath = getSafePath(req.body.foldername);
    fs.mkdirSync(safePath, { recursive: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/delete-item", (req, res) => {
  try {
    const safePath = getSafePath(req.body.targetPath);
    if (fs.existsSync(safePath)) {
      const stat = fs.statSync(safePath);
      if (stat.isDirectory()) fs.rmSync(safePath, { recursive: true, force: true });
      else fs.unlinkSync(safePath);
      res.json({ success: true });
    } else { res.status(404).json({ error: "Item não encontrado." }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/rename-item", (req, res) => {
  try {
    const safeOld = getSafePath(req.body.oldPath);
    const safeNew = getSafePath(req.body.newPath);
    if (fs.existsSync(safeOld)) {
      fs.mkdirSync(path.dirname(safeNew), { recursive: true });
      fs.renameSync(safeOld, safeNew);
      res.json({ success: true });
    } else { res.status(404).json({ error: "Não encontrado." }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/graph-data", (req, res) => {
  try {
    const check = listNotesLocal();
    if (check.error || !check.files) return res.json({ nodes: [], edges: [] });
    
    const files = check.files.filter(f => !f.endsWith("/")); // Filtra pastas
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
          if (targetNode) edges.push({ source: file, target: targetNode.id });
        }
      } catch (e) {}
    });
    res.json({ nodes, edges });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/upload-vault", (req, res) => {
  try {
    const safePath = getSafePath(req.query.file);
    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, req.body);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) return res.status(500).json({ error: "Erro de Config." });
  if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Senha inválida." });

  try {
    const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = userMessages.filter(msg => msg && ["user", "assistant"].includes(msg.role)).slice(-20);
    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    let response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      system: "Você é o Assistente BMS, uma inteligência corporativa. Nunca cite marcas. Chame o sistema de 'Cofre'.",
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
            if (block.name === "list_notes") toolResult = listNotesLocal();
            else if (block.name === "read_note") toolResult = readNoteLocal(block.input.filename);
            else if (block.name === "create_note") {
              const sp = getSafePath(block.input.filename);
              fs.mkdirSync(path.dirname(sp), { recursive: true });
              fs.writeFileSync(sp, block.input.content, "utf-8");
              toolResult = { status: "OK" };
            }
          } catch (err) { toolResult = { error: err.message }; }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(toolResult) });
        }
      }
      messages.push({ role: "user", content: toolResults });
      response = await anthropic.messages.create({ model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022", max_tokens: 3000, messages, tools: localTools });
    }
    res.json({ reply: response.content.find(c => c.type === "text")?.text || "OK." });
  } catch (error) { res.status(500).json({ error: "Falha de IA." }); }
});

app.listen(3000, () => console.log("Servidor ativo."));
