import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import pdfParse from "pdf-parse";

const app = express();

// ==========================================
// CONFIGURAÇÃO DO SERVIDOR E MIDDLEWARES
// ==========================================
app.use("/api/upload-vault", express.raw({ type: "*/*", limit: "50mb" }));
app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

const requiredEnv = ["ANTHROPIC_API_KEY", "APP_PASSWORD"];
let missingVars = [];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        missingVars.push(key);
    }
}

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// ==========================================
// DEFINIÇÃO DOS DIRETÓRIOS PRINCIPAIS
// ==========================================
const VAULT_PATH = path.join(process.cwd(), "obsidian_vault", "BaseConhecimento");
const DOWNLOADS_PATH = path.join(process.cwd(), "public", "downloads");

// Cria os diretórios necessários caso não existam
if (!fs.existsSync(VAULT_PATH)) {
    fs.mkdirSync(VAULT_PATH, { recursive: true });
    console.log(`[INFO] Cofre criado em: ${VAULT_PATH}`);
}
if (!fs.existsSync(DOWNLOADS_PATH)) {
    fs.mkdirSync(DOWNLOADS_PATH, { recursive: true });
}

// ==========================================
// DEFINIÇÃO DAS FERRAMENTAS DO CLAUDE (TOOLS)
// ==========================================
const localTools = [
    { 
        name: "list_notes", 
        description: "Lista processos, pastas e documentos do Cofre.", 
        input_schema: { type: "object", properties: {} } 
    },
    { 
        name: "read_note", 
        description: "Lê o conteúdo completo de um documento do Cofre.", 
        input_schema: { type: "object", properties: { filename: { type: "string" } }, required: ["filename"] } 
    },
    { 
        name: "create_note", 
        description: "Cria um novo documento Markdown (.md) no Cofre.", 
        input_schema: { type: "object", properties: { filename: { type: "string" }, content: { type: "string" } }, required: ["filename", "content"] } 
    },
    { 
        name: "edit_note", 
        description: "Edita e sobrescreve uma peça existente no Cofre.", 
        input_schema: { type: "object", properties: { filename: { type: "string" }, content: { type: "string" } }, required: ["filename", "content"] } 
    },
    { 
        name: "delete_item", 
        description: "Exclui permanentemente um arquivo ou pasta.", 
        input_schema: { type: "object", properties: { targetPath: { type: "string" } }, required: ["targetPath"] } 
    },
    { 
        name: "rename_item", 
        description: "Renomeia ou move um arquivo ou pasta.", 
        input_schema: { type: "object", properties: { oldPath: { type: "string" }, newPath: { type: "string" } }, required: ["oldPath", "newPath"] } 
    },
    { 
        name: "create_folder", 
        description: "Cria uma nova pasta no Cofre.", 
        input_schema: { type: "object", properties: { foldername: { type: "string" } }, required: ["foldername"] } 
    },
    { 
        name: "create_downloadable_file", 
        description: "Cria um arquivo físico para o usuário fazer download.", 
        input_schema: { type: "object", properties: { filename: { type: "string" }, content: { type: "string" } }, required: ["filename", "content"] } 
    }
];

// ==========================================
// FUNÇÕES DE SEGURANÇA E MANIPULAÇÃO DE CAMINHOS
// ==========================================
function getSafePath(targetPath) {
    const resolvedPath = path.resolve(VAULT_PATH, targetPath);
    if (!resolvedPath.startsWith(VAULT_PATH)) {
        throw new Error("Acesso negado de segurança.");
    }
    return resolvedPath;
}

const cleanPath = (p) => p.replace(/^(Cofre\/|BaseConhecimento\/)/i, '').trim();

// ==========================================
// FUNÇÕES DO SISTEMA DE ARQUIVOS (LOCAL)
// ==========================================
function listNotesLocal() {
    if (!fs.existsSync(VAULT_PATH)) {
        return { error: `Cofre não localizado no diretório: ${VAULT_PATH}` };
    }
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
    if (!fs.existsSync(safePath)) {
        return { error: `Arquivo ${filename} não encontrado no Cofre.` };
    }
    if (filename.toLowerCase().match(/\.(pdf|png|jpg|jpeg|docx)$/)) {
        return { error: `[ARQUIVO BINÁRIO] Use visualização nativa da interface para ler PDFs.` };
    }
    return { filename, content: fs.readFileSync(safePath, "utf-8") };
}

// ==========================================
// MOTOR OCR / PROCESSAMENTO DE IA 
// ==========================================
async function processDocumentWithClaude(fileBuffer, fileExt, originalName) {
    if (!anthropic) {
        return `> **Aviso de Sistema:** Chave ANTHROPIC_API_KEY ausente. Não é possível rodar o motor OCR/Markdown para o arquivo ${originalName}.`;
    }

    try {
        let extractedText = "";
        let isScanned = false;

        if (fileExt === '.pdf') {
            try {
                // Tenta extrair o texto diretamente do PDF
                const pdfData = await pdfParse(fileBuffer);
                extractedText = pdfData.text || "";
                
                // Heurística simples: se o PDF tiver pouquíssimo texto extraível, 
                // assumimos que é uma imagem escaneada.
                const alphanumericText = extractedText.replace(/[^a-zA-Z0-9À-ÿ]/g, '');
                if (alphanumericText.length < 100) {
                    isScanned = true;
                }
            } catch(err) {
                console.error("Erro no pdf-parse, assumindo como imagem:", err.message);
                isScanned = true; // Se falhar ao parsear, assume que é imagem/escaneado
            }
        } else if (fileExt === '.txt' || fileExt === '.csv') {
            extractedText = fileBuffer.toString('utf-8');
        }

        const systemPrompt = "Você é um motor de indexação corporativa operando a base de dados do Obsidian. Seu papel é transcrever documentos inteiros ou reescrever textos extraídos em Markdown profissional.\n\nDIRETRIZES:\n1. Extraia TODO O TEXTO VISÍVEL, sem ocultar partes.\n2. Corrija quebras de linha erradas.\n3. Crie títulos (##) para seções principais.\n4. OBRIGATÓRIO: Crie uma seção '### Metadados' no final contendo de 3 a 5 #tags relevantes ao conteúdo e links em formato [[...]] para assuntos principais como nomes de empresas ou temas jurídicos.\n\nRetorne APENAS o código Markdown bruto. Não adicione texto de conversa nem explique o que você fez.";

        // ROTA 1: Se for um PDF ESCANEADO, usamos a funcionalidade "Vision" da Anthropic
        if (isScanned && fileExt === '.pdf') {
            console.log(`[MOTOR OCR] PDF '${originalName}' é escaneado/imagem. Invocando Visão Computacional do Claude...`);
            const base64PDF = fileBuffer.toString('base64');
            
            const response = await anthropic.messages.create({
                model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
                max_tokens: 8192,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: [
                        { 
                            type: "document", 
                            source: { type: "base64", media_type: "application/pdf", data: base64PDF } 
                        },
                        { 
                            type: "text", 
                            text: `Este documento é um PDF escaneado (imagem). Por favor, leia e transcreva O TEXTO COMPLETO E EXATO de todas as páginas para Markdown estruturado. Extraia tudo. Arquivo original: ${originalName}` 
                        }
                    ]
                }]
            }, { 
                headers: { "anthropic-beta": "pdfs-2024-09-25" } // Ativa o suporte beta a PDF vision
            });

            return response.content.find(c => c.type === "text")?.text || `> Erro da Inteligência Artificial ao tentar ler as imagens do PDF escaneado. O retorno foi vazio.`;
        }

        // ROTA 2: Se for um PDF que já tem texto (ou um .txt), mandamos o texto puro
        console.log(`[MOTOR TEXTO] Formatando texto puro extraído de '${originalName}'...`);
        const response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
            max_tokens: 8192,
            system: systemPrompt,
            messages: [{ 
                role: "user", 
                content: `Transforme o texto extraído abaixo em Markdown estruturado rico e legível. Preserve o conteúdo na íntegra.\n\nOriginal: ${originalName}\n\nConteúdo Extraído:\n${extractedText.substring(0, 80000)}` 
            }]
        });
        
        return response.content.find(c => c.type === "text")?.text || `> Erro da Inteligência Artificial ao formatar o texto bruto.`;

    } catch (e) {
        console.error("Erro Crítico no Auto-Markdown/OCR:", e);
        return `> **Erro de Processamento de IA:** O modelo falhou ao tentar transcrever/ler o arquivo '${originalName}'.\n\n**Detalhe Técnico para TI:** ${e.message}`;
    }
}

// ==========================================
// ROTAS DA API
// ==========================================

app.get("/api/status", (req, res) => {
    if (missingVars.length > 0 || !fs.existsSync(VAULT_PATH)) {
        return res.status(500).json({ status: "ERRO" });
    }
    res.json({ status: "OK" });
});

app.get("/api/speedtest", (req, res) => {
    const size = 5 * 1024 * 1024;
    res.set({ 
        'Content-Type': 'application/octet-stream', 
        'Content-Length': size, 
        'Cache-Control': 'no-store' 
    });
    res.send(crypto.randomBytes(size));
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
    if (!filename) {
        return res.status(400).json({ error: "Falta parâmetro do arquivo." });
    }
    try {
        const result = readNoteLocal(filename);
        if (result.error) {
            return res.status(404).json(result);
        }
        res.json(result);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.get("/api/note-raw", (req, res) => {
    const filename = req.query.file;
    try {
        const safePath = getSafePath(cleanPath(filename));
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: "Arquivo bruto não encontrado." });
        }
        res.sendFile(safePath);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post("/api/create-folder", (req, res) => {
    try { 
        const safePath = getSafePath(cleanPath(req.body.foldername));
        fs.mkdirSync(safePath, { recursive: true }); 
        res.json({ success: true }); 
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post("/api/delete-item", (req, res) => {
    try {
        const sp = getSafePath(cleanPath(req.body.targetPath));
        if (fs.existsSync(sp)) {
            const stat = fs.statSync(sp);
            if (stat.isDirectory()) {
                fs.rmSync(sp, { recursive: true, force: true }); 
            } else {
                fs.unlinkSync(sp);
            }
            res.json({ success: true });
        } else { 
            res.status(404).json({ error: "Arquivo Inexistente." }); 
        }
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post("/api/rename-item", (req, res) => {
    try {
        const oldP = getSafePath(cleanPath(req.body.oldPath));
        const newP = getSafePath(cleanPath(req.body.newPath));
        if (fs.existsSync(oldP)) { 
            fs.mkdirSync(path.dirname(newP), { recursive: true }); 
            fs.renameSync(oldP, newP); 
            res.json({ success: true }); 
        } else { 
            res.status(404).json({ error: "Origem não encontrada no cofre." }); 
        }
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// A ROTA DA MALHA NEURAL ATUALIZADA (CLONE OBSIDIAN)
app.get("/api/graph-data", (req, res) => {
    try {
        const check = listNotesLocal();
        if (check.error || !check.items) {
            return res.json({ nodes: [], edges: [] });
        }
        
        const files = check.items.filter(i => i.type === "file");
        let nodesMap = new Map();
        let edges = [];

        // FUNÇÃO OBSIDIAN CLONE: Une MD e PDF no mesmo nó principal
        const getLogicalNode = (filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            const base = filePath.substring(0, filePath.lastIndexOf('.'));
            
            if (ext === '.md') {
                const pdfTwin = base + '.pdf';
                if (files.some(f => f.path === pdfTwin)) {
                    return pdfTwin;
                }
            }
            return filePath;
        };

        // PASSO 1: Cria os nós-raiz (os arquivos reais)
        files.forEach(f => {
            const logicalPath = getLogicalNode(f.path);
            if (!nodesMap.has(logicalPath)) {
                let displayLabel = logicalPath.split('/').pop().replace(/\.(md|pdf|txt)$/i, "");
                nodesMap.set(logicalPath, { 
                    id: logicalPath, 
                    label: displayLabel, 
                    type: "file" 
                });
            }
        });

        // PASSO 2: Mapeia Tags e Nós Fantasmas Lendo os MDs
        files.forEach(file => {
            if (file.path.toLowerCase().endsWith('.pdf')) {
                return;
            }
            
            try {
                const fullContent = fs.readFileSync(getSafePath(file.path), "utf-8");
                const sourceLogicalPath = getLogicalNode(file.path); 
                
                // Mapeia links de conexão do Obsidian: [[Assunto Qualquer]]
                const linkRegex = /\[\[(.*?)\]\]/g; 
                let match;
                while ((match = linkRegex.exec(fullContent)) !== null) {
                    let rawLink = match[1].split('|')[0].trim();
                    let targetName = rawLink.toLowerCase();
                    
                    // Procura se esse link já bate com algum arquivo existente
                    let foundKey = Array.from(nodesMap.keys()).find(k => k.split('/').pop().replace(/\.(md|pdf|txt)$/i, "").toLowerCase() === targetName);
                    
                    if (foundKey) {
                        edges.push({ source: sourceLogicalPath, target: foundKey });
                    } else {
                        // NÓ FANTASMA (Concept): O arquivo não existe, mas o tema conecta os arquivos!
                        let conceptId = `concept:${targetName}`;
                        if (!nodesMap.has(conceptId)) {
                            nodesMap.set(conceptId, { 
                                id: conceptId, 
                                label: rawLink, 
                                type: "concept" 
                            });
                        }
                        edges.push({ source: sourceLogicalPath, target: conceptId });
                    }
                }

                // Mapeia hashtags padrão
                const tagRegex = /#([a-zA-Z0-9À-ÿ_-]+)/g; 
                let tMatch;
                while ((tMatch = tagRegex.exec(fullContent)) !== null) {
                    const tagID = `#${tMatch[1].toLowerCase()}`; 
                    
                    if (!nodesMap.has(tagID)) {
                        const displayTag = `#${tMatch[1]}`;
                        nodesMap.set(tagID, { 
                            id: tagID, 
                            label: displayTag, 
                            type: "tag" 
                        });
                    }
                    edges.push({ source: sourceLogicalPath, target: tagID });
                }
            } catch (e) {
                // Ignora arquivo corrompido
            }
        });

        // Evita duplicidade de elásticos puxando e empurrando (A -> B é igual a B -> A)
        const uniqueEdges = [];
        const edgeSet = new Set();
        
        edges.forEach(e => {
            const key1 = `${e.source}->${e.target}`;
            const key2 = `${e.target}->${e.source}`;
            
            if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
                edgeSet.add(key1);
                uniqueEdges.push(e);
            }
        });

        res.json({ nodes: Array.from(nodesMap.values()), edges: uniqueEdges });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post("/api/reprocess-md", async (req, res) => {
    try {
        const filename = cleanPath(req.body.filename);
        const safePath = getSafePath(filename);
        
        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: "Arquivo original PDF não encontrado." });
        }
        
        console.log(`[REPROCESS] O usuário solicitou a releitura forçada do arquivo: ${filename}`);
        const ext = path.extname(filename).toLowerCase();
        const fileBuffer = fs.readFileSync(safePath);
        
        const mdContent = await processDocumentWithClaude(fileBuffer, ext, path.basename(filename));
        
        if (mdContent) {
            const mdPath = safePath.substring(0, safePath.lastIndexOf('.')) + ".md";
            fs.writeFileSync(mdPath, mdContent, "utf-8");
        }
        
        res.json({ success: true, markdown: mdContent });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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
            if (!textContent.startsWith("# ")) {
                textContent = `# ${path.basename(rawTarget, ".md")}\n\n${textContent}`;
            }
            fs.writeFileSync(safePath, textContent);
            return res.json({ success: true, markdown: textContent });
        }

        fs.writeFileSync(safePath, fileBuffer);

        const runAsyncEngine = async () => {
            const ext = path.extname(rawTarget).toLowerCase();
            const mdContent = await processDocumentWithClaude(fileBuffer, ext, path.basename(rawTarget));
            const mdPath = safePath.substring(0, safePath.lastIndexOf('.')) + ".md";
            fs.writeFileSync(mdPath, mdContent, "utf-8");
            return mdContent;
        };

        if (isSync) {
            const mdResult = await runAsyncEngine();
            res.json({ success: true, markdown: mdResult });
        } else {
            runAsyncEngine();
            res.json({ success: true, message: "Upload salvo. Markdown em processamento." });
        }

    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
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
                const ext = path.extname(file).toLowerCase();
                const baseName = file.substring(0, file.lastIndexOf(ext));
                const mdPath = path.join(dir, baseName + ".md");
                
                let shouldGenerate = false;
                
                if (!fs.existsSync(mdPath)) {
                    shouldGenerate = true;
                } else {
                    const existingMd = fs.readFileSync(mdPath, "utf-8");
                    if (existingMd.includes("Erro de Processamento de IA") || existingMd.includes("Aviso de Sistema") || existingMd.trim().length < 150) {
                        shouldGenerate = true;
                    }
                }

                if (shouldGenerate) {
                    console.log(`[RETROATIVO] Iniciando OCR/IA para: ${file}`);
                    try {
                        const buffer = fs.readFileSync(fullPath);
                        const mdContent = await processDocumentWithClaude(buffer, ext, file);
                        fs.writeFileSync(mdPath, mdContent, "utf-8");
                        console.log(`[RETROATIVO] Salvo com sucesso: ${baseName}.md`);
                    } catch (e) { 
                        console.error(`[RETROATIVO] Falha no arquivo ${file}:`, e.message); 
                    }
                }
            }
        }
    };
    
    scanAndConvert(VAULT_PATH).then(() => console.log("[RETROATIVO] Sincronização em massa concluída com sucesso!"));
});

app.post("/api/chat", async (req, res) => {
    if (missingVars.length > 0) {
        return res.status(500).json({ error: "Configuração de Chave Anthropic incompleta." });
    }
    
    // ==================================================
    // VALIDAÇÃO DE SEGURANÇA BASE64 (LOGIN INVISÍVEL)
    // A chave esperada é 'Ym1zOmx1aXph' que equivale a bms:luiza em base64
    // O app envia isso pelo header x-app-password
    // ==================================================
    const requestToken = req.headers["x-app-password"];
    
    if (!requestToken) {
         return res.status(401).json({ error: "Token de autenticação não fornecido." });
    }

    if (requestToken !== "luiza" && requestToken !== "Ym1zOmx1aXph") {
         return res.status(401).json({ error: "Credenciais de segurança inválidas." });
    }

    try {
        const userMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
        let messages = userMessages.filter(msg => msg && ["user", "assistant"].includes(msg.role)).slice(-20);
        
        if (messages.length > 0 && messages[0].role === "assistant") {
            messages.shift();
        }
        if (messages.length === 0) {
            return res.status(400).json({ error: "Mensagem vazia recebida pelo servidor." });
        }

        let citedFiles = new Set(); 

        let response = await anthropic.messages.create({
            model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            system: "Você é o Assistente BMS, inteligência corporativa (Modo Deus). Construa respostas excelentes baseadas nos documentos. Use links [[NomeDoArquivo]] e hashtags (#DireitoTrabalhista, etc) sempre que possível para alimentar a malha neural.",
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
                            citedFiles.add(block.input.filename);
                            toolResult = readNoteLocal(block.input.filename);
                        } else if (block.name === "create_note") {
                            const sp = getSafePath(cleanPath(block.input.filename));
                            fs.mkdirSync(path.dirname(sp), { recursive: true });
                            fs.writeFileSync(sp, block.input.content, "utf-8");
                            toolResult = { status: "Documento salvo." };
                        } else if (block.name === "edit_note") {
                            const sp = getSafePath(cleanPath(block.input.filename));
                            fs.writeFileSync(sp, block.input.content, "utf-8");
                            toolResult = { status: "Modificado." };
                        } else if (block.name === "delete_item") {
                            const sp = getSafePath(cleanPath(block.input.targetPath));
                            if (fs.existsSync(sp)) {
                                const stat = fs.statSync(sp);
                                if (stat.isDirectory()) {
                                    fs.rmSync(sp, { recursive: true, force: true });
                                } else {
                                    fs.unlinkSync(sp);
                                }
                                toolResult = { status: "Excluído com sucesso." };
                            } else { 
                                toolResult = { error: "Inexistente no sistema de arquivos." }; 
                            }
                        } else if (block.name === "rename_item") {
                            const oldP = getSafePath(cleanPath(block.input.oldPath));
                            const newP = getSafePath(cleanPath(block.input.newPath));
                            if (fs.existsSync(oldP)) {
                                fs.mkdirSync(path.dirname(newP), { recursive: true });
                                fs.renameSync(oldP, newP);
                                toolResult = { status: "Movido com sucesso." };
                            } else { 
                                toolResult = { error: "Erro de caminho. Origem inválida." }; 
                            }
                        } else if (block.name === "create_folder") {
                            const sp = getSafePath(cleanPath(block.input.foldername));
                            fs.mkdirSync(sp, { recursive: true });
                            toolResult = { status: "Pasta criada." };
                        } else if (block.name === "create_downloadable_file") {
                            const dlPath = path.join(DOWNLOADS_PATH, block.input.filename);
                            fs.writeFileSync(dlPath, block.input.content, "utf-8");
                            toolResult = { status: `Link de download gerado: /downloads/${block.input.filename}` };
                        }
                    } catch (err) { 
                        toolResult = { error: err.message }; 
                    }
                    toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(toolResult) });
                }
            }
            messages.push({ role: "user", content: toolResults });
            response = await anthropic.messages.create({ 
                model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022", 
                max_tokens: 4000, 
                messages, 
                tools: localTools 
            });
        }
        
        res.json({ 
            reply: response.content.find(c => c.type === "text")?.text || "OK.", 
            citedFiles: Array.from(citedFiles) 
        });
    } catch (error) { 
        console.error("ERRO CHAT:", error);
        res.status(500).json({ error: error.message }); 
    }
});

app.use((err, req, res, next) => { 
    res.status(500).json({ error: err.message }); 
});

app.listen(3000, () => console.log("BMS Server operante na porta 3000."));
