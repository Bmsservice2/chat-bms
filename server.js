import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";

const app = express();

app.use("/api/upload-vault", express.raw({ type: "*/*", limit: "50mb" }));
app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

const requiredEnv = ["ANTHROPIC_API_KEY", "APP_PASSWORD"];
let missingVars = [];

for (const key of requiredEnv) {
  if (!process.env[key]) missingVars.push(key);
}

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const VAULT_PATH = "/app/obsidian_vault/BaseConhecimento";
const DOWNLOADS_PATH = path.join(process.cwd(), "public", "downloads");

if (!fs.existsSync(DOWNLOADS_PATH)) fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });

const localTools = [
  {
    name: "list_notes",
    description: "Lista processos, pastas e documentos jurídicos do Cofre.",
    input_schema: { type: "object", properties: {} }
  },
  {
    name: "read_note",
    description: "Lê o conteúdo completo de um documento do Cofre.",
    input_schema: {
      type: "object",
      properties: { filename: { type: "string", description: "Caminho do arquivo" } },
      required: ["filename"]
    }
  },
  {
    name: "create_note",
    description: "Cria um novo documento permanente em formato Markdown (.md) no Cofre.",
    input_schema: {
      type: "object",
      properties: { filename: { type: "string" }, content: { type: "string" } },
      required: ["filename", "content"]
    }
  },
  {
    name: "edit_note",
    description: "Edita e sobrescreve uma peça existente no Cofre adicionando tags (#) ou conexões ([[links]]).",
    input_schema: {
      type: "object",
      properties: { filename: { type: "string" }, content: { type: "string" } },
      required: ["filename", "content"]
    }
  },
  {
    name: "delete_item",
    description: "Exclui permanentemente um arquivo ou pasta do Cofre.",
    input_schema: {
      type: "object",
      properties: { targetPath: { type: "string" } },
      required: ["targetPath"]
    }
  },
  {
    name: "rename_item",
    description: "Renomeia ou move um arquivo ou pasta.",
    input_schema: {
      type: "object",
      properties: { oldPath: { type: "string" }, newPath: { type: "string" } },
      required: ["oldPath", "newPath"]
    }
  },
  {
    name: "create_folder",
    description: "Cria uma nova pasta no Cofre.",
    input_schema: {
      type: "object",
      properties: { foldername: { type: "string" } },
      required: ["foldername"]
    }
  },
  {
    name: "create_downloadable_file",
    description: "Cria um arquivo físico para o usuário fazer download.",
    input_schema: {
      type: "object",
      properties: { filename: { type: "string" }, content: { type: "string" } },
      required: ["filename", "content"]
    }
  }
];

function getSafePath(targetPath) {
  const resolvedPath = path.resolve(VAULT_PATH, targetPath);
  if (!resolvedPath.startsWith(VAULT_PATH)) throw new Error("Acesso negado de segurança.");
  return resolvedPath;
}

const cleanPath = (p) => p.replace(/^(Cofre\/|BaseConhecimento\/)/i, '').trim();

function listNotesLocal() {
  if (!fs.existsSync(VAULT_PATH)) return { error: `Cofre não localizado.` };
  const items = [];
  const scanDir = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      if (file.startsWith('.')) return;
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(VAULT_PATH, fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        items.push({ path: relativePath + "/", type: "directory" });
        scanDir(fullPath);
      } else if (file.endsWith('.md') || file.endsWith('.txt') || file.endsWith('.pdf')) {
        items.push({ path: relativePath, type: "file" });
      }
    });
  };
  scanDir(VAULT_PATH);
  return { items };
}

function readNoteLocal(filename) {
  const safePath = getSafePath(cleanPath(filename));
  if (!fs.existsSync(safePath)) return { error: `O documento ${filename} não foi encontrado.` };
  
  if (filename.toLowerCase().match(/\.(pdf|png|jpg|jpeg|docx)$/)) {
      return { error: `[ARQUIVO BINÁRIO] O arquivo ${filename} é estrutural. A leitura direta de texto puro via código não é possível.` };
  }
  return { filename, content: fs.readFileSync(safePath, "utf-8") };
}

app.get("/api/status", (req, res) => {
  if (missingVars.length > 0 || !fs.existsSync(VAULT_PATH)) return res.status(500).json({ status: "ERRO" });
  res.json({ status: "OK" });
});

app.get("/api/speedtest", (req, res) => {
  const size = 5 * 1024 * 1024;
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Length': size,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  res.send(crypto.randomBytes(size));
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
    const safePath = getSafePath(cleanPath(filename));
    if (!fs.existsSync(safePath)) return res.status(404).json({ error: "Não encontrado." });
    res.sendFile(safePath);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/create-folder", (req, res) => {
  try {
    const safePath = getSafePath(cleanPath(req.body.foldername));
    fs.mkdirSync(safePath, { recursive: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/delete-item", (req, res) => {
  try {
    const safePath = getSafePath(cleanPath(req.body.targetPath));
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
    const safeOld = getSafePath(cleanPath(req.body.oldPath));
    const safeNew = getSafePath(cleanPath(req.body.newPath));
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
    if (check.error || !check.items) return res.json({ nodes: [], edges: [] });
    
    const files = check.items.filter(i => i.type === "file");
    let nodesMap = new Map();
    let edges = [];

    files.forEach(f => {
      nodesMap.set(f.path, { id: f.path, label: f.path.split('/').pop(), type: "file" });
    });

    files.forEach(file => {
      if (file.path.toLowerCase().endsWith('.pdf')) return;
      try {
        const fullContent = fs.readFileSync(getSafePath(file.path), "utf-8");
        const linkRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = linkRegex.exec(fullContent)) !== null) {
          const rawLink = match[1].split('|')[0].trim();
          const targetName = rawLink.split('/').pop().replace(/\.(md|pdf|txt)$/i, "").toLowerCase();
          let foundKey = Array.from(nodesMap.keys()).find(k => k.split('/').pop().replace(/\.(md|pdf|txt)$/i, "").toLowerCase() === targetName);
          if (foundKey) edges.push({ source: file.path, target: foundKey });
        }

        const tagRegex = /#([a-zA-Z0-9À-ÿ_-]+)/g;
        let tMatch;
        while ((tMatch = tagRegex.exec(fullContent)) !== null) {
          const tagLabel = `#${tMatch[1]}`;
          if (!nodesMap.has(tagLabel)) {
            nodesMap.set(tagLabel, { id: tagLabel, label: tagLabel, type: "tag" });
          }
          edges.push({ source: file.path, target: tagLabel });
        }
      } catch (e) {}
    });
    res.json({ nodes: Array.from(nodesMap.values()), edges });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/upload-vault", (req, res) => {
  try {
    let rawTarget = cleanPath(req.query.file);
    if (rawTarget.toLowerCase().endsWith('.txt')) {
        rawTarget = rawTarget.slice(0, -4) + ".md";
    }
    const safePath = getSafePath(rawTarget);
    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    
    let contentBuffer = req.body;
    if (rawTarget.endsWith('.md')) {
        const textContent = req.body.toString("utf-8");
        if (!textContent.startsWith("# ")) {
            const title = path.basename(rawTarget, ".md");
            contentBuffer = Buffer.from(`# ${title}\n\n${textContent}`, "utf-8");
        }
    }
    fs.writeFileSync(safePath, contentBuffer);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/chat", async (req, res) => {
  if (missingVars.length > 0) return res.status(500).json({ error: "Chave de API ausente." });
  if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Senha inválida." });

  try {
    const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
    let messages = userMessages.filter(msg => msg && ["user", "assistant"].includes(msg.role)).slice(-20);
    
    if (messages.length > 0 && messages[0].role === "assistant") {
        messages.shift();
    }
    if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

    let citedFiles = new Set(); 

    let response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      system: "Você é o Assistente BMS, uma inteligência jurídica sênior operando em Modo Deus. Quando criar ou editar notas, use intensamente links [[NomeDoArquivo]] e hashtags tematizadas como #DireitoTrabalhista, #Prazo ou #Contradição para alimentar a malha neural do usuário. Se o usuário pedir para gerar um documento, envie o texto e ofereça criar um arquivo físico de download via ferramenta 'create_downloadable_file', exibindo na mensagem exatamente: '[📥 Clique aqui para baixar o Arquivo](/downloads/NOME_DO_ARQUIVO)'.",
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
            else if (block.name === "read_note") {
                citedFiles.add(block.input.filename);
                toolResult = readNoteLocal(block.input.filename);
            }
            else if (block.name === "create_note") {
              const sp = getSafePath(cleanPath(block.input.filename));
              fs.mkdirSync(path.dirname(sp), { recursive: true });
              fs.writeFileSync(sp, block.input.content, "utf-8");
              toolResult = { status: "Documento criado." };
            }
            else if (block.name === "edit_note") {
              const sp = getSafePath(cleanPath(block.input.filename));
              fs.writeFileSync(sp, block.input.content, "utf-8");
              toolResult = { status: "Documento modificado." };
            }
            else if (block.name === "delete_item") {
              const sp = getSafePath(cleanPath(block.input.targetPath));
              if (fs.existsSync(sp)) {
                const stat = fs.statSync(sp);
                if (stat.isDirectory()) fs.rmSync(sp, { recursive: true, force: true });
                else fs.unlinkSync(sp);
                toolResult = { status: "Excluído." };
              } else { toolResult = { error: "Inexistente." }; }
            }
            else if (block.name === "rename_item") {
              const oldP = getSafePath(cleanPath(block.input.oldPath));
              const newP = getSafePath(cleanPath(block.input.newPath));
              if (fs.existsSync(oldP)) {
                fs.mkdirSync(path.dirname(newP), { recursive: true });
                fs.renameSync(oldP, newP);
                toolResult = { status: "Movido com sucesso." };
              } else { toolResult = { error: "Erro de caminho." }; }
            }
            else if (block.name === "create_folder") {
              const sp = getSafePath(cleanPath(block.input.foldername));
              fs.mkdirSync(sp, { recursive: true });
              toolResult = { status: "Pasta criada." };
            }
            else if (block.name === "create_downloadable_file") {
              const dlPath = path.join(DOWNLOADS_PATH, block.input.filename);
              fs.writeFileSync(dlPath, block.input.content, "utf-8");
              toolResult = { status: `Link de download gerado: /downloads/${block.input.filename}` };
            }
          } catch (err) { toolResult = { error: err.message }; }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(toolResult) });
        }
      }
      messages.push({ role: "user", content: toolResults });
      response = await anthropic.messages.create({ model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022", max_tokens: 4000, messages, tools: localTools });
    }
    
    res.json({ 
        reply: response.content.find(c => c.type === "text")?.text || "OK.",
        citedFiles: Array.from(citedFiles)
    });

  } catch (error) { 
    console.error("ERRO CHAT:", error);
    res.status(500).json({ error: error.message || "Falha na conexão com Anthropic." }); 
  }
});

app.listen(3000, () => console.log("Servidor ativo e blindado."));
