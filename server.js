import express from "express";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const requiredEnv = [
  "ANTHROPIC_API_KEY",
  "OBSIDIAN_MCP_URL",
  "OBSIDIAN_API_KEY",
  "APP_PASSWORD"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Variável obrigatória ausente: ${key}`);
    process.exit(1);
  }
}

function checkPassword(req, res, next) {
  const password = req.headers["x-app-password"];

  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: "Senha inválida." });
  }

  next();
}

function extractTextFromClaudeResponse(data) {
  if (!Array.isArray(data.content)) return "";

  return data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n\n")
    .trim();
}

app.post("/api/chat", checkPassword, async (req, res) => {
  try {
    const userMessages = Array.isArray(req.body.messages)
      ? req.body.messages
      : [];

    const messages = userMessages
      .filter((msg) => msg && ["user", "assistant"].includes(msg.role))
      .slice(-20)
      .map((msg) => ({
        role: msg.role,
        content: String(msg.content || "").slice(0, 12000)
      }));

    if (messages.length === 0) {
      return res.status(400).json({ error: "Mensagem vazia." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-11-20"
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: Number(process.env.MAX_TOKENS || 3000),
        system: `
Você é um assistente conectado ao Obsidian da empresa via MCP.

Regras:
- Quando o usuário perguntar sobre informações internas, notas, documentos,
  processos, clientes, projetos ou base de conhecimento, use o MCP do Obsidian
  antes de responder.
- Cite os nomes das notas ou arquivos usados sempre que possível.
- Responda em português claro.
- Não invente informação que deveria estar no Obsidian.
- Se não encontrar informação suficiente nas notas, diga claramente que não encontrou.
- Você tem permissão apenas para consultar informações.
- Não escreva, mova, renomeie nem apague arquivos.
`.trim(),
        messages,
        mcp_servers: [
          {
            type: "url",
            name: "obsidian",
            url: process.env.OBSIDIAN_MCP_URL,
            authorization_token: process.env.OBSIDIAN_API_KEY
          }
        ],
        tools: [
          {
            type: "mcp_toolset",
            mcp_server_name: "obsidian",
            default_config: { enabled: false },
            configs: {
              vault_list: { enabled: true },
              vault_read: { enabled: true },
              vault_get_document_map: { enabled: true },
              search_simple: { enabled: true },
              search_query: { enabled: true },
              tag_list: { enabled: true }
            }
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Anthropic:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        error: "Erro ao chamar Claude API.",
        details: data
      });
    }

    const text = extractTextFromClaudeResponse(data);

    res.json({
      reply: text || "Recebi a resposta, mas não encontrei texto final para exibir."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.listen(3000, () => {
  console.log("Chat rodando na porta 3000");
});
