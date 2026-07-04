import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import pdfParse from "pdf-parse";

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
    { name: "list_notes", description: "Lista processos, pastas e documentos do Cofre.", input_schema: { type: "object", properties: {} } },
    { name: "read_note", description: "Lê o conteúdo completo de um documento do Cofre.", input_schema: { type: "object", properties: { filename: { type: "string" } }, required: ["filename"] } },
    { name: "create_note", description: "Cria um novo documento Markdown (.md) no Cofre.", input_schema: { type: "object", properties: { filename: { type: "string" }, content: { type: "string" } }, required: ["filename", "content"] } },
    { name: "edit_note", description: "Edita e sobrescreve uma peça existente no Cofre.", input_schema: { type: "object", properties: { filename: { type: "string" }, content: { type: "string" } }, required: ["filename", "content"] } },
    { name: "delete_item", description: "Exclui permanentemente um arquivo ou pasta.", input_schema: { type: "object", properties: { targetPath: { type: "string" } }, required: ["targetPath"] } },
    { name: "rename_item", description: "Renomeia ou move um arquivo ou pasta.", input_schema: { type: "object", properties: { oldPath: { type: "string" }, newPath: { type: "string" } }, required: ["oldPath", "newPath"] } },
    { name: "create_folder", description: "Cria uma nova pasta no Cofre.", input_schema: { type: "object", properties: { foldername: { type: "string" } }, required: ["foldername"] } },
    { name: "create_downloadable_file", description: "Cria um arquivo físico para o usuário fazer download.", input_schema: { type: "object", properties: { filename: { type: "string" }, content: { type: "string" } }, required: ["filename", "content"] } }
];

function getSafePath(targetPath) {
    const resolvedPath = path.resolve(VAULT_PATH, targetPath);
    if (!resolvedPath.startsWith(VAULT_PATH)) throw new Error("Acesso negado.");
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
    if (!fs.existsSync(safePath)) return { error: `Arquivo ${filename} não encontrado.` };
    if (filename.toLowerCase().match(/\.(pdf|png|jpg|jpeg|docx)$/)) {
        return { error: `[ARQUIVO BINÁRIO] Use visualização nativa para ler PDFs.` };
    }
    return { filename, content: fs.readFileSync(safePath, "utf-8") };
}

// MOTOR MELHORADO PARA GARANTIR RETORNO, MESMO SEM CLAUDE
async function generateMarkdownWithClaude(rawText, originalName) {
    if (!rawText || rawText.trim().length === 0) {
        return `> **Aviso de Sistema:** O extrator tentou ler o arquivo '${originalName}', mas nenhum texto real foi encontrado. É provável que este PDF seja uma imagem escaneada, necessitando de um motor OCR (Optical Character Recognition) externo para ler seu conteúdo.`;
    }

    if (!anthropic) {
        return `> **Aviso de Sistema:** A Chave de API do Claude (ANTHROPIC_API_KEY) não foi detectada no servidor. Abaixo está o texto bruto extraído do arquivo '${originalName}' sem formatação de Inteligência Artificial:\n\n---\n\n${rawText}`;
    }

    try {
        const response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: "Você é um motor de indexação corporativa operando o Obsidian. Seu papel é reescrever textos extraídos (OCR/PDF) em Markdown profissional. Corrija quebras de linha erradas, crie títulos (##) para seções principais e use formatação limpa. OBRIGATÓRIO: Crie uma seção '### Metadados' no final contendo de 3 a 5 #tags relevantes e links [[...]]. Retorne APENAS o código Markdown bruto. Não fale com o usuário.",
            messages: [{ role: "user", content: `Transforme o conteúdo abaixo em Markdown rico. Original: ${originalName}\n\nConteúdo:\n${rawText.substring(0, 60000)}` }]
        });
        return response.content.find(c => c.type === "text")?.text || `> Erro da IA ao formatar o texto bruto. O Claude retornou vazio. \n\n${rawText}`;
    } catch (e) {
        console.error("Erro no Auto-Markdown:", e);
        return `> **Aviso de Sistema:** Falha de comunicação com a API da Anthropic durante a formatação. Abaixo está o texto bruto extraído:\n\n---\n\n${rawText}`;
    }
}

app.get("/api/status", (req, res) => {
    if (missingVars.length > 0 || !fs.existsSync(VAULT_PATH)) return res.status(500).json({ status: "ERRO" });
    res.json({ status: "OK" });
});

app.get("/api/speedtest", (req, res) => {
    const size = 5 * 1024 * 1024;
    res.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': size, 'Cache-Control': 'no-store' });
    res.send(crypto.randomBytes(size));
});

app.get("/api/notes", (req, res) => {
    try { res.json(listNotesLocal()); } catch (err) { res.status(500).json({ error: err.message }); }
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
    try { fs.mkdirSync(getSafePath(cleanPath(req.body.foldername)), { recursive: true }); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/delete-item", (req, res) => {
    try {
        const sp = getSafePath(cleanPath(req.body.targetPath));
        if (fs.existsSync(sp)) {
            const stat = fs.statSync(sp);
            if (stat.isDirectory()) fs.rmSync(sp, { recursive: true, force: true }); else fs.unlinkSync(sp);
            res.json({ success: true });
        } else { res.status(404).json({ error: "Inexistente." }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/rename-item", (req, res) => {
    try {
        const oldP = getSafePath(cleanPath(req.body.oldPath));
        const newP = getSafePath(cleanPath(req.body.newPath));
        if (fs.existsSync(oldP)) { fs.mkdirSync(path.dirname(newP), { recursive: true }); fs.renameSync(oldP, newP); res.json({ success: true }); } else { res.status(404).json({ error: "Origem não encontrada." }); }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/graph-data", (req, res) => {
    try {
        const check = listNotesLocal();
        if (check.error || !check.items) return res.json({ nodes: [], edges: [] });
        
        const files = check.items.filter(i => i.type === "file");
        let nodesMap = new Map();
        let edges = [];

        files.forEach(f => { nodesMap.set(f.path, { id: f.path, label: f.path.split('/').pop(), type: "file" }); });

        files.forEach(file => {
            if (file.path.toLowerCase().endsWith('.pdf')) return;
            try {
                const fullContent = fs.readFileSync(getSafePath(file.path), "utf-8");
                
                const linkRegex = /\[\[(.*?)\]\]/g; let match;
                while ((match = linkRegex.exec(fullContent)) !== null) {
                    const targetName = match[1].split('|')[0].trim().split('/').pop().replace(/\.(md|pdf|txt)$/i, "").toLowerCase();
                    let foundKey = Array.from(nodesMap.keys()).find(k => k.split('/').pop().replace(/\.(md|pdf|txt)$/i, "").toLowerCase() === targetName);
                    if (foundKey) edges.push({ source: file.path, target: foundKey });
                }

                const tagRegex = /#([a-zA-Z0-9À-ÿ_-]+)/g; let tMatch;
                while ((tMatch = tagRegex.exec(fullContent)) !== null) {
                    const tagLabel = `#${tMatch[1]}`;
                    if (!nodesMap.has(tagLabel)) nodesMap.set(tagLabel, { id: tagLabel, label: tagLabel, type: "tag" });
                    edges.push({ source: file.path, target: tagLabel });
                }
            } catch (e) {}
        });
        res.json({ nodes: Array.from(nodesMap.values()), edges });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/upload-vault", async (req, res) => {
    try {
        let rawTarget = cleanPath(req.query.file);
        const isSync = req.query.sync === 'true'; 
        const safePath = getSafePath(rawTarget);
        
        fs.mkdirSync(path.dirname(safePath), { recursive: true });
        
        const fileBuffer = req.body;
        
        if (rawTarget.toLowerCase().endsWith('.md')) {
            let textContent = fileBuffer.toString("utf-8");
            if (!textContent.startsWith("# ")) textContent = `# ${path.basename(rawTarget, ".md")}\n\n${textContent}`;
            fs.writeFileSync(safePath, textContent);
            return res.json({ success: true, markdown: textContent });
        }

        fs.writeFileSync(safePath, fileBuffer);

        const processFileToMarkdown = async () => {
            try {
                let extractedText = "";
                if (rawTarget.toLowerCase().endsWith('.pdf')) {
                    const pdfData = await pdfParse(fileBuffer);
                    extractedText = pdfData.text;
                } else if (rawTarget.toLowerCase().endsWith('.txt') || rawTarget.toLowerCase().endsWith('.csv')) {
                    extractedText = fileBuffer.toString('utf-8');
                }

                const mdContent = await generateMarkdownWithClaude(extractedText, path.basename(rawTarget));
                if (mdContent) {
                    const mdPath = safePath.substring(0, safePath.lastIndexOf('.')) + ".md";
                    fs.writeFileSync(mdPath, mdContent, "utf-8");
                    return mdContent;
                }
            } catch(e) { 
                console.error("Erro interno no ProcessFile:", e); 
                return `> Erro no servidor: O interpretador nativo falhou completamente ao tentar ler o arquivo: ${e.message}`;
            }
            return "Extração falhou.";
        };

        if (isSync) {
            const mdResult = await processFileToMarkdown();
            res.json({ success: true, markdown: mdResult });
        } else {
            processFileToMarkdown();
            res.json({ success: true, message: "Em processamento." });
        }

    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/sync-retroactive", async (req, res) => {
    res.json({ success: true, message: "Started" });
    
    const scanAndConvert = async (dir) => {
        const list = fs.readdirSync(dir);
        for (let file of list) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                await scanAndConvert(fullPath);
            } else if (file.toLowerCase().endsWith('.pdf') || file.toLowerCase().endsWith('.txt')) {
                const ext = path.extname(file);
                const baseName = file.substring(0, file.lastIndexOf(ext));
                const mdPath = path.join(dir, baseName + ".md");
                
                if (!fs.existsSync(mdPath)) {
                    console.log(`[RETROATIVO] Iniciando varredura em: ${file}`);
                    try {
                        const buffer = fs.readFileSync(fullPath);
                        let text = "";
                        if (ext.toLowerCase() === '.pdf') {
                            const pdfData = await pdfParse(buffer);
                            text = pdfData.text;
                        } else {
                            text = buffer.toString('utf-8');
                        }
                        
                        const mdContent = await generateMarkdownWithClaude(text, file);
                        if (mdContent) {
                            fs.writeFileSync(mdPath, mdContent, "utf-8");
                            console.log(`[RETROATIVO] Salvo: ${baseName}.md`);
                        }
                        
                    } catch (e) { console.error(`[RETROATIVO] Falha no arquivo ${file}:`, e.message); }
                }
            }
        }
    };
    
    scanAndConvert(VAULT_PATH).then(() => console.log("[RETROATIVO] Sincronização em massa finalizada!"));
});

app.post("/api/chat", async (req, res) => {
    if (missingVars.length > 0) return res.status(500).json({ error: "Configuração de Chave Anthropic incompleta." });
    if (req.headers["x-app-password"] !== process.env.APP_PASSWORD) return res.status(401).json({ error: "Senha de acesso local inválida." });

    try {
        const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
        let messages = userMessages.filter(msg => msg && ["user", "assistant"].includes(msg.role)).slice(-20);
        
        if (messages.length > 0 && messages[0].role === "assistant") messages.shift();
        if (messages.length === 0) return res.status(400).json({ error: "Mensagem vazia." });

        let citedFiles = new Set(); 

        let response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: "Você é o Assistente BMS, inteligência corporativa (Modo Deus). Construa respostas excelentes baseadas nos documentos. Use links [[NomeDoArquivo]] e hashtags (#DireitoTrabalhista, etc) sempre que possível para expandir a malha neural do usuário.",
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
                            toolResult = { status: "Documento salvo." };
                        }
                        else if (block.name === "edit_note") {
                            const sp = getSafePath(cleanPath(block.input.filename));
                            fs.writeFileSync(sp, block.input.content, "utf-8");
                            toolResult = { status: "Modificado." };
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
                                toolResult = { status: "Movido." };
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
                            toolResult = { status: `Link gerado: /downloads/${block.input.filename}` };
                        }
                    } catch (err) { toolResult = { error: err.message }; }
                    toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(toolResult) });
                }
            }
            messages.push({ role: "user", content: toolResults });
            response = await anthropic.messages.create({ model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022", max_tokens: 4000, messages, tools: localTools });
        }
        
        res.json({ reply: response.content.find(c => c.type === "text")?.text || "OK.", citedFiles: Array.from(citedFiles) });
    } catch (error) { 
        console.error("ERRO CHAT:", error);
        res.status(500).json({ error: error.message }); 
    }
});

app.use((err, req, res, next) => { res.status(500).json({ error: err.message }); });
app.listen(3000, () => console.log("Servidor ativo com Sincronizador de PDF Avançado."));
