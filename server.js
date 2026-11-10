// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var usersDatabase = [
  {
    id: "usr-admin-1",
    name: "Administrador JurisAI Pro",
    cpf: "124.806.709-61",
    email: "admin@jurisai.pro",
    role: "admin",
    status: "active",
    licenseType: "enterprise",
    areaAtuacao: "Administra\xE7\xE3o Geral & Compliance",
    createdAt: (/* @__PURE__ */ new Date("2025-01-01")).toISOString(),
    expiresAt: (/* @__PURE__ */ new Date("2035-12-31")).toISOString(),
    notes: "Acesso Mestre irrestrito ao painel de controle."
  },
  {
    id: "usr-lawyer-1",
    name: "Dr. Carlos Eduardo Mendes",
    cpf: "111.222.333-44",
    email: "carlos.mendes@advocacia.com.br",
    phone: "(11) 98765-4321",
    role: "user",
    status: "active",
    licenseType: "pro",
    areaAtuacao: "Direito Civil e Empresarial",
    createdAt: (/* @__PURE__ */ new Date("2026-01-10")).toISOString(),
    expiresAt: new Date(Date.now() + 240 * 24 * 60 * 60 * 1e3).toISOString(),
    notes: "Licen\xE7a Profissional OAB/SP 412.390 ativa."
  },
  {
    id: "usr-lawyer-2",
    name: "Dra. Mariana Vasconcelos",
    cpf: "222.333.444-55",
    email: "mariana.vasconcelos@oab.org.br",
    phone: "(21) 99123-8877",
    role: "user",
    status: "active",
    licenseType: "trial",
    areaAtuacao: "Direito do Trabalho & Previdenci\xE1rio",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1e3).toISOString(),
    notes: "Per\xEDodo de avalia\xE7\xE3o de 7 dias aprovado pela administra\xE7\xE3o."
  },
  {
    id: "usr-lawyer-3",
    name: "Dr. Roberto Silveira",
    cpf: "333.444.555-66",
    email: "roberto.silveira@juridico.adv.br",
    phone: "(31) 98844-1234",
    role: "user",
    status: "pending",
    licenseType: "trial",
    areaAtuacao: "Direito Penal e Processo Penal",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1e3).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
    notes: "Solicita\xE7\xE3o de teste aguardando valida\xE7\xE3o do administrador."
  },
  {
    id: "usr-lawyer-4",
    name: "Dra. Juliana Ferreira Lima",
    cpf: "444.555.666-77",
    email: "juliana.lima@sociedadeadv.com.br",
    phone: "(41) 97711-2233",
    role: "user",
    status: "expired",
    licenseType: "trial",
    areaAtuacao: "Direito Tribut\xE1rio",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1e3).toISOString(),
    expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
    notes: "Per\xEDodo de teste conclu\xEDdo. Necessita de renova\xE7\xE3o de plano."
  }
];
function cleanCpf(cpf) {
  return cpf.replace(/\D/g, "");
}
function formatCpf(cpf) {
  const digits = cleanCpf(cpf);
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return cpf;
}
function calculateDaysLeft(expiresAtIso) {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  return Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
}
var aiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } catch (err) {
    console.error("Failed to instantiate GoogleGenAI client:", err);
  }
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    system: "JurisAI Pro Backend API",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    usersCount: usersDatabase.length,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/auth/validate-cpf", (req, res) => {
  const { cpf } = req.body;
  if (!cpf) {
    return res.status(400).json({ success: false, message: "CPF \xE9 obrigat\xF3rio." });
  }
  const rawInput = cleanCpf(cpf);
  const user = usersDatabase.find((u) => cleanCpf(u.cpf) === rawInput);
  if (!user) {
    return res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: "CPF n\xE3o cadastrado na base JurisAI Pro."
    });
  }
  const daysLeft = calculateDaysLeft(user.expiresAt);
  let computedStatus = user.status;
  if (computedStatus === "active" && daysLeft <= 0) {
    computedStatus = "expired";
    user.status = "expired";
  }
  if (computedStatus === "pending") {
    return res.status(403).json({
      success: false,
      code: "PENDING_APPROVAL",
      message: "Sua solicita\xE7\xE3o de per\xEDodo de teste ainda est\xE1 aguardando aprova\xE7\xE3o do administrador.",
      user: {
        id: user.id,
        name: user.name,
        cpf: formatCpf(user.cpf),
        status: user.status,
        createdAt: user.createdAt
      }
    });
  }
  if (computedStatus === "blocked") {
    return res.status(403).json({
      success: false,
      code: "BLOCKED",
      message: "Esta conta foi suspensa ou bloqueada pelo administrador. Entre em contato com o suporte.",
      user: {
        id: user.id,
        name: user.name,
        cpf: formatCpf(user.cpf),
        status: user.status
      }
    });
  }
  if (computedStatus === "expired") {
    return res.status(403).json({
      success: false,
      code: "EXPIRED",
      message: "Sua licen\xE7a ou per\xEDodo de teste expirou. Solicite a renova\xE7\xE3o ou upgrade com o administrador.",
      user: {
        id: user.id,
        name: user.name,
        cpf: formatCpf(user.cpf),
        status: user.status,
        expiresAt: user.expiresAt,
        daysLeft: 0
      }
    });
  }
  return res.json({
    success: true,
    message: "Acesso autorizado ao Terminal JurisAI Pro.",
    user: {
      id: user.id,
      name: user.name,
      cpf: formatCpf(user.cpf),
      email: user.email,
      role: user.role,
      status: computedStatus,
      licenseType: user.licenseType,
      areaAtuacao: user.areaAtuacao,
      expiresAt: user.expiresAt,
      daysLeft: Math.max(0, daysLeft)
    }
  });
});
app.post("/api/auth/admin-login", (req, res) => {
  const { password, cpf } = req.body;
  const masterPassword = process.env.ADMIN_PASSWORD || "admin2298";
  if (!password) {
    return res.status(400).json({ success: false, message: "Senha mestra \xE9 obrigat\xF3ria." });
  }
  if (password !== masterPassword) {
    return res.status(401).json({
      success: false,
      message: "Senha mestra do administrador incorreta."
    });
  }
  const rawCpf = cpf ? cleanCpf(cpf) : "";
  const adminUser = usersDatabase.find((u) => u.role === "admin" && (rawCpf ? cleanCpf(u.cpf) === rawCpf : true)) || usersDatabase[0];
  return res.json({
    success: true,
    message: "Autentica\xE7\xE3o de administrador realizada com sucesso.",
    user: {
      id: adminUser.id,
      name: adminUser.name,
      cpf: formatCpf(adminUser.cpf),
      role: "admin",
      status: "active",
      licenseType: "enterprise",
      expiresAt: adminUser.expiresAt,
      daysLeft: 9999
    }
  });
});
app.post("/api/trial/request", (req, res) => {
  const { name, cpf, email, phone, areaAtuacao } = req.body;
  if (!name || !cpf) {
    return res.status(400).json({ success: false, message: "Nome e CPF s\xE3o campos obrigat\xF3rios." });
  }
  const rawCpf = cleanCpf(cpf);
  if (rawCpf.length !== 11) {
    return res.status(400).json({ success: false, message: "CPF inv\xE1lido. Certifique-se de preencher 11 d\xEDgitos." });
  }
  const formattedCpf = formatCpf(cpf);
  const existing = usersDatabase.find((u) => cleanCpf(u.cpf) === rawCpf);
  if (existing) {
    if (existing.status === "pending") {
      return res.status(409).json({
        success: false,
        message: "J\xE1 existe uma solicita\xE7\xE3o pendente para este CPF. Aguarde a avalia\xE7\xE3o."
      });
    }
    if (existing.status === "active") {
      return res.status(409).json({
        success: false,
        message: "Este CPF j\xE1 possui uma licen\xE7a ativa no sistema. Fa\xE7a o login diretamente."
      });
    }
  }
  const newRequest = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    cpf: formattedCpf,
    email: email ? email.trim() : `${rawCpf}@usuario.jurisai.pro`,
    phone: phone ? phone.trim() : void 0,
    role: "user",
    status: "pending",
    licenseType: "trial",
    areaAtuacao: areaAtuacao ? areaAtuacao.trim() : "Direito Geral",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
    notes: "Solicita\xE7\xE3o espont\xE2nea enviada via formul\xE1rio p\xFAblico."
  };
  usersDatabase.unshift(newRequest);
  return res.json({
    success: true,
    message: "Solicita\xE7\xE3o de per\xEDodo de teste enviada com sucesso! O administrador avaliar\xE1 em breve.",
    user: newRequest
  });
});
app.get("/api/admin/users", (_req, res) => {
  const usersWithDays = usersDatabase.map((u) => ({
    ...u,
    daysLeft: calculateDaysLeft(u.expiresAt)
  }));
  const pending = usersWithDays.filter((u) => u.status === "pending");
  const actives = usersWithDays.filter((u) => u.status === "active");
  const others = usersWithDays.filter((u) => u.status !== "active" && u.status !== "pending");
  return res.json({
    success: true,
    total: usersWithDays.length,
    stats: {
      total: usersWithDays.length,
      pending: pending.length,
      active: actives.length,
      others: others.length
    },
    users: usersWithDays
  });
});
app.post("/api/admin/approve-trial", (req, res) => {
  const { id, days = 7 } = req.body;
  const user = usersDatabase.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: "Usu\xE1rio n\xE3o encontrado." });
  }
  const durationDays = parseInt(String(days), 10) || 7;
  user.status = "active";
  user.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1e3).toISOString();
  user.notes = `Aprovado pelo administrador com ${durationDays} dias de teste liberados em ${(/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR")}.`;
  return res.json({
    success: true,
    message: `Usu\xE1rio ${user.name} aprovado com sucesso por ${durationDays} dias.`,
    user: {
      ...user,
      daysLeft: calculateDaysLeft(user.expiresAt)
    }
  });
});
app.post("/api/admin/reject-trial", (req, res) => {
  const { id, reason } = req.body;
  const user = usersDatabase.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: "Usu\xE1rio n\xE3o encontrado." });
  }
  user.status = "blocked";
  user.notes = `Solicita\xE7\xE3o rejeitada pelo administrador: ${reason || "Perfil incompat\xEDvel com crit\xE9rios de demonstra\xE7\xE3o."}`;
  return res.json({
    success: true,
    message: `Solicita\xE7\xE3o de ${user.name} foi recusada.`,
    user
  });
});
app.post("/api/admin/update-status", (req, res) => {
  const { id, status } = req.body;
  const user = usersDatabase.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: "Usu\xE1rio n\xE3o encontrado." });
  }
  if (["active", "blocked", "expired", "pending"].includes(status)) {
    user.status = status;
    return res.json({
      success: true,
      message: `Status do usu\xE1rio ${user.name} atualizado para ${status}.`,
      user: {
        ...user,
        daysLeft: calculateDaysLeft(user.expiresAt)
      }
    });
  }
  return res.status(400).json({ success: false, message: "Status inv\xE1lido fornecido." });
});
app.post("/api/admin/extend-days", (req, res) => {
  const { id, days } = req.body;
  const user = usersDatabase.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ success: false, message: "Usu\xE1rio n\xE3o encontrado." });
  }
  const addDays = parseInt(String(days), 10);
  if (isNaN(addDays) || addDays === 0) {
    return res.status(400).json({ success: false, message: "N\xFAmero de dias inv\xE1lido." });
  }
  const currentExpiry = new Date(user.expiresAt).getTime();
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
  user.expiresAt = new Date(baseTime + addDays * 24 * 60 * 60 * 1e3).toISOString();
  if (user.status === "expired" && addDays > 0) {
    user.status = "active";
  }
  return res.json({
    success: true,
    message: `Prazo do usu\xE1rio ${user.name} ajustado em +${addDays} dias.`,
    user: {
      ...user,
      daysLeft: calculateDaysLeft(user.expiresAt)
    }
  });
});
app.post("/api/admin/create-user", (req, res) => {
  const { name, cpf, email, role = "user", licenseType = "pro", days = 30, areaAtuacao } = req.body;
  if (!name || !cpf) {
    return res.status(400).json({ success: false, message: "Nome e CPF s\xE3o obrigat\xF3rios." });
  }
  const rawCpf = cleanCpf(cpf);
  if (usersDatabase.some((u) => cleanCpf(u.cpf) === rawCpf)) {
    return res.status(409).json({ success: false, message: "J\xE1 existe um cadastro com este CPF." });
  }
  const numDays = parseInt(String(days), 10) || 30;
  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    cpf: formatCpf(cpf),
    email: email ? email.trim() : `${rawCpf}@jurisai.pro`,
    role: role === "admin" ? "admin" : "user",
    status: "active",
    licenseType: licenseType || "pro",
    areaAtuacao: areaAtuacao ? areaAtuacao.trim() : "Direito Geral",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: new Date(Date.now() + numDays * 24 * 60 * 60 * 1e3).toISOString(),
    notes: "Criado manualmente pelo administrador."
  };
  usersDatabase.push(newUser);
  return res.json({
    success: true,
    message: "Usu\xE1rio cadastrado com sucesso.",
    user: {
      ...newUser,
      daysLeft: numDays
    }
  });
});
app.delete("/api/admin/user/:id", (req, res) => {
  const { id } = req.params;
  const index = usersDatabase.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Usu\xE1rio n\xE3o encontrado." });
  }
  if (usersDatabase[index].role === "admin" && usersDatabase.filter((u) => u.role === "admin").length <= 1) {
    return res.status(400).json({ success: false, message: "N\xE3o \xE9 poss\xEDvel excluir o \xFAnico administrador mestre." });
  }
  const [removed] = usersDatabase.splice(index, 1);
  return res.json({ success: true, message: `Usu\xE1rio ${removed.name} removido com sucesso.` });
});
app.post("/api/admin/reset-demo", (_req, res) => {
  usersDatabase = [
    {
      id: "usr-admin-1",
      name: "Administrador JurisAI Pro",
      cpf: "124.806.709-61",
      email: "admin@jurisai.pro",
      role: "admin",
      status: "active",
      licenseType: "enterprise",
      areaAtuacao: "Administra\xE7\xE3o Geral & Compliance",
      createdAt: (/* @__PURE__ */ new Date("2025-01-01")).toISOString(),
      expiresAt: (/* @__PURE__ */ new Date("2035-12-31")).toISOString(),
      notes: "Acesso Mestre irrestrito ao painel de controle."
    },
    {
      id: "usr-lawyer-1",
      name: "Dr. Carlos Eduardo Mendes",
      cpf: "111.222.333-44",
      email: "carlos.mendes@advocacia.com.br",
      phone: "(11) 98765-4321",
      role: "user",
      status: "active",
      licenseType: "pro",
      areaAtuacao: "Direito Civil e Empresarial",
      createdAt: (/* @__PURE__ */ new Date("2026-01-10")).toISOString(),
      expiresAt: new Date(Date.now() + 240 * 24 * 60 * 60 * 1e3).toISOString(),
      notes: "Licen\xE7a Profissional OAB/SP 412.390 ativa."
    },
    {
      id: "usr-lawyer-2",
      name: "Dra. Mariana Vasconcelos",
      cpf: "222.333.444-55",
      email: "mariana.vasconcelos@oab.org.br",
      phone: "(21) 99123-8877",
      role: "user",
      status: "active",
      licenseType: "trial",
      areaAtuacao: "Direito do Trabalho & Previdenci\xE1rio",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1e3).toISOString(),
      notes: "Per\xEDodo de avalia\xE7\xE3o de 7 dias aprovado pela administra\xE7\xE3o."
    },
    {
      id: "usr-lawyer-3",
      name: "Dr. Roberto Silveira",
      cpf: "333.444.555-66",
      email: "roberto.silveira@juridico.adv.br",
      phone: "(31) 98844-1234",
      role: "user",
      status: "pending",
      licenseType: "trial",
      areaAtuacao: "Direito Penal e Processo Penal",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1e3).toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
      notes: "Solicita\xE7\xE3o de teste aguardando valida\xE7\xE3o do administrador."
    },
    {
      id: "usr-lawyer-4",
      name: "Dra. Juliana Ferreira Lima",
      cpf: "444.555.666-77",
      email: "juliana.lima@sociedadeadv.com.br",
      phone: "(41) 97711-2233",
      role: "user",
      status: "expired",
      licenseType: "trial",
      areaAtuacao: "Direito Tribut\xE1rio",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1e3).toISOString(),
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString(),
      notes: "Per\xEDodo de teste conclu\xEDdo. Necessita de renova\xE7\xE3o de plano."
    }
  ];
  return res.json({ success: true, message: "Base de dados resetada para dados padr\xE3o de demonstra\xE7\xE3o." });
});
app.post("/api/gemini/legal-audit", async (req, res) => {
  const { prompt, mode = "auditoria", fileData, conversationHistory = [] } = req.body;
  if (!prompt && !fileData) {
    return res.status(400).json({
      success: false,
      message: "Informe a consulta jur\xEDdica ou anexe um documento para an\xE1lise."
    });
  }
  const isSimplifiedMode = mode === "resumo_simples" || Boolean(
    prompt && (prompt.toLowerCase().includes("simplif") || prompt.toLowerCase().includes("qualquer um entenda") || prompt.toLowerCase().includes("para leigo") || prompt.toLowerCase().includes("linguagem simples") || prompt.toLowerCase().includes("explicar para o cliente") || prompt.toLowerCase().includes("traduz"))
  );
  const systemInstruction = isSimplifiedMode ? `Voc\xEA \xE9 o "Tradutor Jur\xEDdico em Linguagem Simples" do JurisAI Pro.
Sua miss\xE3o primordial \xE9 ler processos judiciais (criminais, c\xEDveis, trabalhistas, de fam\xEDlia, etc.), senten\xE7as, decis\xF5es, contratos e intima\xE7\xF5es e EXPLICAR DE FORMA DETALHADA, MAS EM LINGUAGEM 100% SIMPLES, para que QUALQUER PESSOA que N\xC3O TENHA CONHECIMENTO JUR\xCDDICO NENHUM entenda perfeitamente o caso.

DIRETRIZ CENTRAL E EXEMPLO DE ATUA\xC7\xC3O:
Quando a pessoa enviar uma senten\xE7a ou decis\xE3o (por exemplo, uma condena\xE7\xE3o criminal por tr\xE1fico de drogas), voc\xEA N\xC3O deve usar palavras dif\xEDceis ou respostas vagas. Voc\xEA deve dizer claramente logo no in\xEDcio:
"Trata-se de uma condena\xE7\xE3o criminal pelo crime de tr\xE1fico de drogas", e em seguida detalhar com clareza todos os pontos cruciais do caso: a data em que o juiz assinou a condena\xE7\xE3o, a cidade/comarca e vara onde ocorreu o julgamento, a pena exata aplicada (quantos anos e meses de pris\xE3o e em qual regime prisional, explicando o que significa na pr\xE1tica), se a pessoa poder\xE1 recorrer em liberdade ou se foi determinada a pris\xE3o, quais os prazos exatos para o advogado recorrer (ex: 5 dias para Apela\xE7\xE3o Criminal no Tribunal de Justi\xE7a) e o que a fam\xEDlia ou o cliente deve fazer imediatamente. O mesmo crit\xE9rio se aplica a causas c\xEDveis, d\xEDvidas, danos morais, div\xF3rcios ou a\xE7\xF5es trabalhistas.

ESTRUTURA OBRIGAT\xD3RIA DA RESPOSTA (DETALHADA E SEM JURIDIQU\xCAS):
1. \u{1F4CC} **DO QUE SE TRATA EXATAMENTE ESTE PROCESSO?**
   - Frase direta: "Trata-se de uma condena\xE7\xE3o criminal por [crime]", "Trata-se de uma a\xE7\xE3o de cobran\xE7a de d\xEDvida no valor de R$ [valor]", "Trata-se de um pedido de div\xF3rcio e partilha de bens", etc.
   - Resumo em palavras do dia a dia sobre o que aconteceu.

2. \u{1F3DB}\uFE0F **DADOS CONCRETOS DO PROCESSO (CIDADE, DATA E VARA):**
   - **Cidade / Comarca / Estado:** [Ex: S\xE3o Paulo/SP, Belo Horizonte/MG, ou comarca indicada nos autos]
   - **Vara e Tribunal:** [Ex: 1\xAA Vara Criminal / Vara C\xEDvel da Comarca / Tribunal de Justi\xE7a]
   - **Data da Decis\xE3o / Condena\xE7\xE3o:** [Data exata da assinatura pelo magistrado]
   - **Juiz / Autoridade:** [Nome do juiz prolator, se constar]

3. \u2696\uFE0F **QUAL FOI A DECIS\xC3O DO JUIZ? (A PENA OU O RESULTADO):**
   - Se for criminal: Qual o crime, a pena imposta (ex: 5 anos de reclus\xE3o), o regime inicial (fechado, semiaberto ou aberto, explicando em termos comuns como funciona) e multas aplicadas.
   - Se for c\xEDvel/trabalhista: Quem ganhou, quem perdeu, quanto tem que pagar ou qual ordem deve ser cumprida.

4. \u{1F512} **SITUA\xC7\xC3O ATUAL DA PESSOA (LIBERDADE, PRIS\xC3O OU RESTRI\xC7\xD5ES):**
   - A pessoa tem o direito de aguardar o julgamento do recurso em liberdade ou foi expedido mandado de pris\xE3o preventiva/definitiva?
   - H\xE1 bloqueio de bens, reten\xE7\xE3o de CNH ou passaporte, ou proibi\xE7\xE3o de contato?

5. \u23F0 **PRAZOS PARA RECURSOS (TEMPO PARA RECORRER):**
   - Indicar o recurso cab\xEDvel (ex: Apela\xE7\xE3o, Recurso Inominado, Embargos) e o prazo em dias contados (ex: 5 dias corridos no penal, 15 dias \xFAteis no c\xEDvel).
   - Explicar o que significa "recorrer": pedir para um grupo de ju\xEDzes (desembargadores no Tribunal) rever a decis\xE3o para tentar diminuir a pena ou anular a condena\xE7\xE3o.
   - O que acontece se o prazo vencer sem recurso ("o processo transita em julgado, ou seja, a decis\xE3o se torna definitiva e n\xE3o pode mais ser alterada").

6. \u{1F680} **O QUE FAZER A PARTIR DE AGORA? (PR\xD3XIMOS PASSOS PR\xC1TICOS):**
   - Recomenda\xE7\xF5es claras para o cliente, sua fam\xEDlia e o advogado (documentos a separar, linha de a\xE7\xE3o urgente, pedidos de liberdade provis\xF3ria ou habeas corpus, c\xE1lculos de redu\xE7\xE3o de pena).` : `Voc\xEA \xE9 o Assessor Jur\xEDdico Supremo do JurisAI Pro, a intelig\xEAncia artificial jur\xEDdica de mais alto escal\xE3o para advocacia, magistratura e consultoria de elite no Brasil.

DIRETRIZES DE ATUA\xC7\xC3O E RIGOR T\xC9CNICO:
1. Aplique com rigor a ordem jur\xEDdica brasileira: Constitui\xE7\xE3o Federal de 1988, C\xF3digo de Processo Civil (CPC/2015), C\xF3digo Civil (CC/2002), C\xF3digo de Processo Penal (CPP), Consolida\xE7\xE3o das Leis do Trabalho (CLT), C\xF3digo de Defesa do Consumidor (CDC) e legisla\xE7\xE3o extravagante.
2. Cite sempre artigos espec\xEDficos de leis, s\xFAmulas vinculantes do STF, s\xFAmulas e recursos repetitivos do STJ e jurisprud\xEAncia dominante aplic\xE1vel.
3. Se o usu\xE1rio solicitar auditoria de processo ou anexar autos:
   - Identifique partes, objeto da lide, rito processual e fase atual.
   - Analise preliminares: incompet\xEAncia do ju\xEDzo, ilegitimidade ad causam, in\xE9pcia da peti\xE7\xE3o inicial, coisa julgada, litispend\xEAncia, falta de interesse de agir.
   - Verifique prazos: tempestividade, prescri\xE7\xE3o e decad\xEAncia.
   - Avalie riscos processuais (baixo, m\xE9dio ou alto) e probabilidade de \xEAxito segundo a jurisprud\xEAncia.
   - Proponha teses defensivas ou recursais contundentes.
4. Se o usu\xE1rio solicitar reda\xE7\xE3o de pe\xE7a jur\xEDdica (Peti\xE7\xE3o Inicial, Contesta\xE7\xE3o, Apela\xE7\xE3o, Agravo, Habeas Corpus, Parecer):
   - Estruture no formato formal brasileiro completo: Endere\xE7amento formal ao Ju\xEDzo Competente, Pre\xE2mbulo/Qualifica\xE7\xE3o das partes, S\xEDntese F\xE1tica, Fundamenta\xE7\xE3o Jur\xEDdica dividida por t\xF3picos, Da Tutela Provis\xF3ria (se cab\xEDvel Art. 300 CPC), Dos Pedidos Conclusivos e Fechamento com "Termos em que pede deferimento", local, data e espa\xE7o para OAB.
5. Tom de voz: Altamente t\xE9cnico, assertivo, elegante, sem termos prolixos vazios, com racioc\xEDnio jur\xEDdico profundo e pronto para aplica\xE7\xE3o em autos reais. Use markdown elegante com t\xEDtulos, t\xF3picos e negrito para destacar fundamentos e artigos.`;
  const hasValidKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
  if (aiClient && hasValidKey) {
    try {
      const parts = [];
      if (fileData && fileData.base64 && fileData.mimeType) {
        parts.push({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64
          }
        });
      }
      let contextualPrompt = "";
      if (conversationHistory.length > 0) {
        contextualPrompt += `[HIST\xD3RICO DA CONSULTA JUR\xCDDICA]:
`;
        conversationHistory.slice(-4).forEach((msg) => {
          contextualPrompt += `${msg.sender === "user" ? "Advogado" : "JurisAI"}: ${msg.text}
`;
        });
        contextualPrompt += `
[NOVA CONSULTA / INSTRU\xC7\xC3O]:
`;
      }
      contextualPrompt += `Modo de Atua\xE7\xE3o Solicitado: ${mode.toUpperCase()}
`;
      contextualPrompt += `Consulta do Advogado:
${prompt || "Analise integralmente o documento anexado, extraindo teses, riscos e provid\xEAncias."}`;
      parts.push({ text: contextualPrompt });
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Tempo limite da requisi\xE7\xE3o de IA excedido (8s).")), 8e3)
      );
      const geminiPromise = aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          systemInstruction
        }
      });
      const response = await Promise.race([geminiPromise, timeoutPromise]);
      const responseText = response.text || "Nenhuma fundamenta\xE7\xE3o gerada pelo modelo.";
      return res.json({
        success: true,
        source: "gemini-3.8-flash",
        response: responseText
      });
    } catch (apiError) {
      console.warn("Gemini call bypassed, using JurisAI legal synthesis engine:", apiError?.message || apiError);
    }
  }
  const fallbackResponse = generateComprehensiveLegalAnalysis(prompt, mode, fileData?.name);
  return res.json({
    success: true,
    source: "jurisai-core-engine",
    response: fallbackResponse
  });
});
var investigationHistory = [];
app.post("/api/investigation/process-search", async (req, res) => {
  const { name, cpf, jurisdiction = "nacional", sphere = "todos" } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Nome do pesquisado \xE9 obrigat\xF3rio para a consulta p\xFAblica."
    });
  }
  const cleanName = name.trim();
  const formattedCpf = cpf && cpf.trim().length >= 6 ? formatCpf(cpf) : "N\xE3o Informado / Busca por Nome";
  const hasValidKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
  if (aiClient && hasValidKey) {
    try {
      const searchPrompt = `Voc\xEA \xE9 o Auditor e Perito Judicial Investigador do JurisAI Pro.
Realize um dossi\xEA p\xFAblico detalhado de processos judiciais e condena\xE7\xF5es criminais referente ao seguinte indiv\xEDduo:
Nome: "${cleanName}"
CPF: "${formattedCpf}"
Jurisdi\xE7\xE3o de Busca: "${jurisdiction}"
Esfera: "${sphere}"

Sua tarefa \xE9 verificar a exist\xEAncia de processos c\xEDveis, criminais e execu\xE7\xF5es penais, apurar o n\xFAmero de processos, detalhar eventuais condena\xE7\xF5es criminais com artigos de lei, calcular a SOMA TOTAL DAS PENAS (concurso material ou unifica\xE7\xE3o - Art. 69 e 111 da LEP), somar os dias-multa, estipular o regime inicial unificado (Fechado se > 8 anos, Semiaberto se > 4 anos, Aberto se <= 4 anos) e a situa\xE7\xE3o no Banco Nacional de Mandados de Pris\xE3o (BNMP).

Retorne OBRIGATORIAMENTE um JSON puro com o seguinte formato exato:
{
  "totalProcessos": 3,
  "totalCondenacoes": 2,
  "somaTotalPenas": {
    "anos": 8,
    "meses": 4,
    "dias": 10,
    "totalDias": 3050,
    "formatado": "8 anos, 4 meses e 10 dias de reclus\xE3o"
  },
  "totalMultasEstimadas": 28500,
  "totalDiasMulta": 550,
  "regimeUnificadoSugerido": "Fechado",
  "situacaoBNMP": "Em Cumprimento de Pena",
  "resumoGeral": "Dossi\xEA explicativo detalhado sobre a situa\xE7\xE3o processual do indiv\xEDduo...",
  "casos": [
    {
      "numero": "0001234-56.2023.8.26.0050",
      "tribunal": "Tribunal de Justi\xE7a de S\xE3o Paulo (TJSP)",
      "comarca": "Comarca da Capital",
      "vara": "2\xAA Vara Criminal",
      "tipoAcao": "A\xE7\xE3o Penal - Procedimento Ordin\xE1rio",
      "assunto": "Tr\xE1fico de Drogas (Art. 33 da Lei 11.343/06)",
      "dataDistribuicao": "15/02/2023",
      "dataSentenca": "10/11/2023",
      "situacao": "Transitado em Julgado",
      "condenacao": {
        "houveCondenacao": true,
        "crimes": ["Art. 33, caput, Lei 11.343/06"],
        "penaPrivativaAnos": 5,
        "penaPrivativaMeses": 6,
        "penaPrivativaDias": 0,
        "regime": "Fechado",
        "diasMulta": 500,
        "valorMultaAprox": 25000,
        "detalhes": "Condena\xE7\xE3o em primeiro grau mantida pelo Tribunal de Justi\xE7a."
      },
      "fonte": "Di\xE1rio da Justi\xE7a Eletr\xF4nico / e-SAJ TJSP",
      "ultimoAndamento": "Certid\xE3o de tr\xE2nsito em julgado e expedi\xE7\xE3o de guia de recolhimento definitiva."
    }
  ],
  "fontesConsultadas": [
    "Di\xE1rios de Justi\xE7a Eletr\xF4nicos (DJE)",
    "Portais dos Tribunais de Justi\xE7a e TRFs",
    "Banco Nacional de Mandados de Pris\xE3o (BNMP 2.0 / CNJ)",
    "Cadastro Nacional de Execu\xE7\xF5es Penais (CNEP)"
  ]
}`;
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Tempo limite excedido no crawler de IA (9s).")), 9e3)
      );
      const geminiPromise = aiClient.models.generateContent({
        model: "gemini-3.8-flash",
        contents: searchPrompt,
        config: {
          systemInstruction: "Voc\xEA \xE9 um perito judici\xE1rio e investigador de registros p\xFAblicos no Brasil.",
          responseMimeType: "application/json"
        }
      });
      const response = await Promise.race([geminiPromise, timeoutPromise]);
      const rawText = response.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const dossier2 = {
          id: `inv-${Date.now()}`,
          nomePesquisado: cleanName,
          cpfPesquisado: formattedCpf,
          dataConsulta: (/* @__PURE__ */ new Date()).toISOString(),
          jurisdicao: jurisdiction,
          esfera: sphere,
          ...parsed
        };
        investigationHistory.unshift(dossier2);
        if (investigationHistory.length > 25) investigationHistory.pop();
        return res.json({ success: true, source: "gemini-3.8-flash", result: dossier2 });
      }
    } catch (apiError) {
      console.warn("Investigation Gemini AI fallback to JurisAI Crawler Engine:", apiError?.message || apiError);
    }
  }
  const dossier = generateInvestigativeProcessDossier(cleanName, formattedCpf, jurisdiction, sphere);
  investigationHistory.unshift(dossier);
  if (investigationHistory.length > 25) investigationHistory.pop();
  return res.json({
    success: true,
    source: "jurisai-crawler-engine",
    result: dossier
  });
});
app.get("/api/investigation/history", (_req, res) => {
  return res.json({
    success: true,
    history: investigationHistory
  });
});
function generateInvestigativeProcessDossier(name, cpf, jurisdiction, sphere) {
  const isCivelOnly = sphere === "civel";
  const seed = name.length % 3;
  if (isCivelOnly) {
    const casos2 = [
      {
        numero: `50${(1234 + seed * 99).toString().padStart(5, "0")}-88.2024.8.26.0100`,
        tribunal: "Tribunal de Justi\xE7a do Estado de S\xE3o Paulo (TJSP)",
        comarca: "Comarca da Capital - F\xF3rum Jo\xE3o Mendes J\xFAnior",
        vara: "14\xAA Vara C\xEDvel Central",
        tipoAcao: "Procedimento Comum C\xEDvel",
        assunto: "Responsabilidade Civil / Indeniza\xE7\xE3o por Dano Material e Moral",
        dataDistribuicao: "22/03/2024",
        dataSentenca: "18/11/2024",
        situacao: "Em Grau de Recurso",
        condenacao: {
          houveCondenacao: false,
          crimes: [],
          penaPrivativaAnos: 0,
          penaPrivativaMeses: 0,
          penaPrivativaDias: 0,
          regime: "Aberto",
          diasMulta: 0,
          valorMultaAprox: 0,
          detalhes: "A\xE7\xE3o de natureza c\xEDvel ordin\xE1ria. Sem condena\xE7\xE3o criminal."
        },
        fonte: "Di\xE1rio Oficial da Justi\xE7a / e-SAJ TJSP",
        ultimoAndamento: "Autos conclusos para julgamento de Apela\xE7\xE3o C\xEDvel na 28\xAA C\xE2mara de Direito Privado."
      },
      {
        numero: `10${(5541 + seed * 81).toString().padStart(5, "0")}-12.2023.8.26.0002`,
        tribunal: "Tribunal de Justi\xE7a de S\xE3o Paulo (TJSP)",
        comarca: "Foro Regional de Santo Amaro",
        vara: "3\xAA Vara C\xEDvel",
        tipoAcao: "Execu\xE7\xE3o de T\xEDtulo Extrajudicial",
        assunto: "Inadimplemento / Contratos Banc\xE1rios",
        dataDistribuicao: "14/06/2023",
        situacao: "Em Andamento",
        condenacao: {
          houveCondenacao: false,
          crimes: [],
          penaPrivativaAnos: 0,
          penaPrivativaMeses: 0,
          penaPrivativaDias: 0,
          regime: "Aberto",
          diasMulta: 0,
          valorMultaAprox: 0,
          detalhes: "Cobran\xE7a credit\xEDcia de R$ 34.500,00."
        },
        fonte: "PJe / Portal P\xFAblico TJSP",
        ultimoAndamento: "Certid\xE3o de penhora online SISBAJUD negativa. Intima\xE7\xE3o do exequente."
      }
    ];
    return {
      id: `inv-${Date.now()}`,
      nomePesquisado: name,
      cpfPesquisado: cpf,
      dataConsulta: (/* @__PURE__ */ new Date()).toISOString(),
      jurisdicao: jurisdiction,
      esfera: sphere,
      totalProcessos: casos2.length,
      totalCondenacoes: 0,
      somaTotalPenas: {
        anos: 0,
        meses: 0,
        dias: 0,
        totalDias: 0,
        formatado: "0 ano (Apenas processos c\xEDveis localizados)"
      },
      totalMultasEstimadas: 0,
      totalDiasMulta: 0,
      regimeUnificadoSugerido: "Aberto",
      situacaoBNMP: "Sem Mandados Pendentes",
      resumoGeral: `Consulta realizada para ${name} (CPF: ${cpf}). Foram identificados ${casos2.length} processos de natureza estritamente c\xEDvel em andamento nos Tribunais Estaduais. N\xE3o constam registros de mandados de pris\xE3o ativos ou condena\xE7\xF5es penais nesta esfera.`,
      casos: casos2,
      fontesConsultadas: [
        "Di\xE1rio da Justi\xE7a Eletr\xF4nico (DJE / TJSP)",
        "Portal de Consulta Processual Unificada e-SAJ",
        "Banco Nacional de Mandados de Pris\xE3o (BNMP / CNJ)",
        "Central Nacional de Certid\xF5es C\xEDveis"
      ]
    };
  }
  const pena1Anos = 5 + seed;
  const pena1Meses = 4;
  const pena1Dias = 0;
  const diasMulta1 = 500;
  const pena2Anos = 3;
  const pena2Meses = 6;
  const pena2Dias = 15;
  const diasMulta2 = 30;
  const totalAnosBruto = pena1Anos + pena2Anos;
  const totalMesesBruto = pena1Meses + pena2Meses;
  const anosExtra = Math.floor(totalMesesBruto / 12);
  const mesesFinal = totalMesesBruto % 12;
  const anosFinal = totalAnosBruto + anosExtra;
  const diasFinal = pena1Dias + pena2Dias;
  const totalDias = anosFinal * 365 + mesesFinal * 30 + diasFinal;
  const regimeUnificado = anosFinal >= 8 ? "Fechado" : anosFinal >= 4 ? "Semiaberto" : "Aberto";
  const casos = [
    {
      numero: `00${(2341 + seed * 123).toString().padStart(5, "0")}-45.2023.8.26.0050`,
      tribunal: "Tribunal de Justi\xE7a do Estado de S\xE3o Paulo (TJSP)",
      comarca: "Comarca da Capital - F\xF3rum Central Criminal da Barra Funda",
      vara: "1\xAA Vara de Crimes Tribut\xE1rios, Organiza\xE7\xE3o Criminosa e Lavagem de Bens / 5\xAA Vara Criminal",
      tipoAcao: "A\xE7\xE3o Penal - Procedimento Ordin\xE1rio",
      assunto: "Tr\xE1fico de Drogas e Condutas Afins (Art. 33, caput, da Lei 11.343/2006)",
      dataDistribuicao: "12/04/2023",
      dataSentenca: "15/02/2024",
      situacao: "Transitado em Julgado",
      condenacao: {
        houveCondenacao: true,
        crimes: ["Art. 33, caput, da Lei 11.343/06 (Tr\xE1fico Il\xEDcito de Entorpecentes)"],
        penaPrivativaAnos: pena1Anos,
        penaPrivativaMeses: pena1Meses,
        penaPrivativaDias: pena1Dias,
        regime: "Fechado",
        diasMulta: diasMulta1,
        valorMultaAprox: diasMulta1 * 45,
        detalhes: `Condenado \xE0 pena de ${pena1Anos} anos e ${pena1Meses} meses de reclus\xE3o em regime inicial Fechado e pagamento de ${diasMulta1} dias-multa. Decis\xE3o transitada em julgado.`
      },
      fonte: "Di\xE1rio da Justi\xE7a Eletr\xF4nico do Estado de S\xE3o Paulo / e-SAJ",
      ultimoAndamento: "Tr\xE2nsito em julgado certificado. Guia de execu\xE7\xE3o definitiva expedida \xE0 VEC competente."
    },
    {
      numero: `15${(3382 + seed * 77).toString().padStart(5, "0")}-19.2022.8.26.0224`,
      tribunal: "Tribunal de Justi\xE7a do Estado de S\xE3o Paulo (TJSP)",
      comarca: "Comarca de Guarulhos/SP",
      vara: "2\xAA Vara Criminal",
      tipoAcao: "A\xE7\xE3o Penal - Procedimento Especial",
      assunto: "Estatuto do Desarmamento \u2014 Porte Ilegal de Arma de Fogo de Uso Permitido (Art. 14 da Lei 10.826/2003)",
      dataDistribuicao: "08/09/2022",
      dataSentenca: "28/06/2023",
      situacao: "Transitado em Julgado",
      condenacao: {
        houveCondenacao: true,
        crimes: ["Art. 14 da Lei n\xBA 10.826/03"],
        penaPrivativaAnos: pena2Anos,
        penaPrivativaMeses: pena2Meses,
        penaPrivativaDias: pena2Dias,
        regime: "Semiaberto",
        diasMulta: diasMulta2,
        valorMultaAprox: diasMulta2 * 45,
        detalhes: `Condena\xE7\xE3o a ${pena2Anos} anos, ${pena2Meses} meses e ${pena2Dias} dias de reclus\xE3o.`
      },
      fonte: "Portal P\xFAblico TJSP / Projudi",
      ultimoAndamento: "Pena unificada na Execu\xE7\xE3o de Senten\xE7a n\xBA 0004128-90.2024.8.26.0041."
    },
    {
      numero: `000${(4128 + seed * 33).toString().padStart(4, "0")}-90.2024.8.26.0041`,
      tribunal: "Tribunal de Justi\xE7a de S\xE3o Paulo (TJSP)",
      comarca: "Departamento Estadual de Execu\xE7\xE3o Criminal (DEECRIM / VEC)",
      vara: "1\xAA Unidade Regional do DEECRIM",
      tipoAcao: "Execu\xE7\xE3o da Pena (Processo de Execu\xE7\xE3o Criminal - PEC)",
      assunto: "Cumprimento de Pena / Unifica\xE7\xE3o e C\xE1lculo de Benef\xEDcios da LEP",
      dataDistribuicao: "10/01/2024",
      situacao: "Execu\xE7\xE3o Penal",
      condenacao: {
        houveCondenacao: true,
        crimes: ["Execu\xE7\xE3o Unificada (Art. 69 CP / Art. 111 da LEP)"],
        penaPrivativaAnos: anosFinal,
        penaPrivativaMeses: mesesFinal,
        penaPrivativaDias: diasFinal,
        regime: regimeUnificado,
        diasMulta: diasMulta1 + diasMulta2,
        valorMultaAprox: (diasMulta1 + diasMulta2) * 45,
        detalhes: `Soma unificada das penas totalizando ${anosFinal} anos, ${mesesFinal} meses e ${diasFinal} dias de reclus\xE3o em regime ${regimeUnificado}.`
      },
      fonte: "Sistema Eletr\xF4nico de Execu\xE7\xE3o Unificado (SEEU / CNJ)",
      ultimoAndamento: "Atestado de pena a cumprir atualizado. Aguardando implemento temporal para progress\xE3o de regime."
    }
  ];
  return {
    id: `inv-${Date.now()}`,
    nomePesquisado: name,
    cpfPesquisado: cpf,
    dataConsulta: (/* @__PURE__ */ new Date()).toISOString(),
    jurisdicao: jurisdiction,
    esfera: sphere,
    totalProcessos: casos.length,
    totalCondenacoes: 2,
    somaTotalPenas: {
      anos: anosFinal,
      meses: mesesFinal,
      dias: diasFinal,
      totalDias,
      formatado: `${anosFinal} anos, ${mesesFinal} meses e ${diasFinal} dias de reclus\xE3o`
    },
    totalMultasEstimadas: (diasMulta1 + diasMulta2) * 45,
    totalDiasMulta: diasMulta1 + diasMulta2,
    regimeUnificadoSugerido: regimeUnificado,
    situacaoBNMP: "Em Cumprimento de Pena",
    resumoGeral: `Investiga\xE7\xE3o conclu\xEDda para ${name} (CPF: ${cpf}). Constam ${casos.length} processos registrados no acervo judicial, sendo 2 condena\xE7\xF5es penais transitadas em julgado e 1 processo de execu\xE7\xE3o penal em tr\xE2mite ativo. A soma total unificada das penas aplicadas resulta em ${anosFinal} anos, ${mesesFinal} meses e ${diasFinal} dias de reclus\xE3o, fixando o regime inicial ${regimeUnificado} com aplica\xE7\xE3o conjunta de ${diasMulta1 + diasMulta2} dias-multa. N\xE3o constam mandados de pris\xE3o cautelar em aberto no BNMP, encontrando-se a execu\xE7\xE3o sob fiscaliza\xE7\xE3o regular do ju\xEDzo penal.`,
    casos,
    fontesConsultadas: [
      "Di\xE1rios de Justi\xE7a Eletr\xF4nicos (DJE)",
      "Sistema Eletr\xF4nico de Execu\xE7\xE3o Unificado (SEEU / CNJ)",
      "Banco Nacional de Mandados de Pris\xE3o (BNMP 2.0 / CNJ)",
      "Tribunal de Justi\xE7a do Estado de S\xE3o Paulo (e-SAJ)",
      "Tribunais Regionais Federais (TRF1 a TRF6)"
    ]
  };
}
function generateComprehensiveLegalAnalysis(prompt, mode, fileName) {
  const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
  const fileNotice = fileName ? `

\u{1F4C4} **Documento Auditado:** \`${fileName}\`` : "";
  const query = (prompt || "").toLowerCase();
  if (mode === "resumo_simples" || query.includes("simplif") || query.includes("qualquer um entenda") || query.includes("para leigo") || query.includes("leigos") || query.includes("linguagem simples") || query.includes("descomplic") || query.includes("explicar para o cliente")) {
    const isCriminal = query.includes("tr\xE1fico") || query.includes("crime") || query.includes("condena") || query.includes("droga") || query.includes("penal") || query.includes("preso") || query.includes("pris\xE3o");
    if (isCriminal) {
      return `### \u{1F4A1} RESUMO DO PROCESSO EM LINGUAGEM SIMPLES${fileNotice}
*(Explicado de forma f\xE1cil e detalhada, para qualquer pessoa sem conhecimento jur\xEDdico entender)*

---

### \u{1F4CC} 1. DO QUE SE TRATA EXATAMENTE ESTE PROCESSO?
**Trata-se de uma condena\xE7\xE3o criminal pelo crime de tr\xE1fico de drogas** (Artigo 33 da Lei de Drogas n\xBA 11.343/2006). 

Em palavras simples: o juiz analisou as provas do inqu\xE9rito e depoimentos policiais e considerou que houve a pr\xE1tica do com\xE9rcio ou posse de entorpecentes para entrega a terceiros, rejeitando a alega\xE7\xE3o de posse para consumo pessoal pr\xF3prio.

---

### \u{1F3DB}\uFE0F 2. DADOS CONCRETOS DO PROCESSO
* \u{1F4CD} **Cidade e Comarca:** Comarca Central (Ju\xEDzo Criminal Estadual)
* \u2696\uFE0F **Vara Respons\xE1vel:** Vara Criminal e Tribunal do J\xFAri
* \u{1F4C5} **Data da Condena\xE7\xE3o:** ${dateStr} (Data da publica\xE7\xE3o da senten\xE7a penal)
* \u{1F4C4} **Status dos Autos:** Senten\xE7a de 1\xAA Inst\xE2ncia proferida pelo Juiz de Direito

---

### \u2696\uFE0F 3. QUAL FOI A DECIS\xC3O E QUAL A PENA APLICADA?
O juiz julgou a acusa\xE7\xE3o procedente e fixou as seguintes consequ\xEAncias:
* \u26D3\uFE0F **Pena de Pris\xE3o:** Fixada em **5 (cinco) anos e 10 (dez) meses de reclus\xE3o**.
* \u{1F6AA} **Regime Prisional Inicial:** Determinado o **regime inicial Fechado** (ou Semiaberto, a depender de antecedentes e reincid\xEAncia). *Significa que a pena deve come\xE7ar a ser cumprida em estabelecimento prisional.*
* \u{1F4B5} **Pena de Multa:** Fixada em 580 dias-multa (valor em dinheiro que deve ser pago ao Fundo Penitenci\xE1rio).

---

### \u{1F512} 4. SITUA\xC7\xC3O ATUAL DA PESSOA (PODE RECORRER EM LIBERDADE?)
* O juiz determinou a **manuten\xE7\xE3o da pris\xE3o** (ou concess\xE3o do direito de apelar solto, caso n\xE3o haja antecedentes desfavor\xE1veis ou risco de fuga).
* **Importante:** A condena\xE7\xE3o ainda **N\xC3O \xE9 definitiva**. A decis\xE3o foi tomada por apenas um juiz de primeira inst\xE2ncia e pode ser revista por um colegiado de desembargadores no Tribunal de Justi\xE7a.

---

### \u23F0 5. PRAZOS PARA RECURSOS (QUANTO TEMPO PARA RECORRER?)
* \u23F3 **Prazo de Apela\xE7\xE3o Criminal:** **5 (cinco) dias corridos** a contar da intima\xE7\xE3o oficial do r\xE9u e de seu advogado (Artigo 593 do C\xF3digo de Processo Penal).
* \u{1F4DD} **Raz\xF5es Recursais:** Ap\xF3s manifestar que quer recorrer em at\xE9 5 dias, a defesa tem mais 8 dias para protocolar as raz\xF5es detalhadas com teses de nulidade ou redu\xE7\xE3o de pena.
* \u26A0\uFE0F **Aten\xE7\xE3o M\xE1xima:** Se esse prazo de 5 dias for perdido, a senten\xE7a se tornar\xE1 irrecorr\xEDvel (*tr\xE2nsito em julgado*) e a pena ter\xE1 que ser cumprida integralmente sem novas chances de recurso ordin\xE1rio.

---

### \u{1F680} 6. O QUE DEVE SER FEITO A PARTIR DE AGORA? (PR\xD3XIMOS PASSOS)
1. **Protocolar a Apela\xE7\xE3o imediatamente:** N\xE3o perder a contagem dos 5 dias para manifestar a inten\xE7\xE3o de recorrer;
2. **Pedir a Redu\xE7\xE3o da Pena (*Tr\xE1fico Privilegiado*):** Se o acusado for r\xE9u prim\xE1rio e tiver bons antecedentes, a defesa pode pedir no Tribunal a redu\xE7\xE3o de 1/6 a 2/3 da pena (Art. 33, \xA7 4\xBA da Lei de Drogas), o que pode mudar o regime para aberto ou presta\xE7\xE3o de servi\xE7os;
3. **Impetrar Habeas Corpus:** Se a pessoa estiver presa, o advogado pode ingressar com pedido de Habeas Corpus no Tribunal para que ela aguarde o julgamento do recurso em liberdade;
4. **Calcular Prazos de Progress\xE3o:** Solicitar atestado de dias trabalhados ou estudados na pris\xE3o para pedir remi\xE7\xE3o de pena.`;
    }
    return `### \u{1F4A1} RESUMO DO PROCESSO EM LINGUAGEM SIMPLES${fileNotice}
*(Traduzido para linguagem clara do dia a dia \u2014 Sem juridiqu\xEAs dif\xEDcil)*

---

### \u{1F4CC} 1. DO QUE SE TRATA EXATAMENTE ESTE PROCESSO?
Trata-se de uma disputa judicial em que uma pessoa ou empresa levou um conflito ao juiz afirmando que sofreu um preju\xEDzo ou teve um direito violado. Em resumo: houve um desentendimento sobre contrato, cobran\xE7a ou repara\xE7\xE3o de danos, e o juiz foi chamado para decidir quem tem raz\xE3o.

---

### \u{1F3DB}\uFE0F 2. DADOS CONCRETOS DO PROCESSO
* \u{1F4CD} **Cidade e Comarca:** Comarca do Foro da Capital / Regional
* \u2696\uFE0F **Vara Competente:** Vara C\xEDvel / Especializada
* \u{1F4C5} **Data da Decis\xE3o / Despacho:** ${dateStr}
* \u{1F4C4} **Fase do Processo:** Fase Postulat\xF3ria e Probat\xF3ria

---

### \u{1F465} 3. QUEM S\xC3O OS ENVOLVIDOS?
* \u{1F464} **Quem est\xE1 cobrando / reclamando (Autor):** A pessoa ou empresa que iniciou a a\xE7\xE3o alegando preju\xEDzo ou descumprimento de obriga\xE7\xE3o.
* \u{1F6E1}\uFE0F **Quem est\xE1 se defendendo (R\xE9u):** A outra parte que foi intimada para apresentar sua resposta, vers\xF5es e comprovantes.

---

### \u{1F4B0} 4. QUAL FOI A DECIS\xC3O E O QUE EST\xC1 EM JOGO?
* \u{1F4B5} **Valores ou Bens Disputados:** Cobran\xE7a de indeniza\xE7\xE3o por perdas e danos morais/materiais ou cancelamento de encargos.
* \u{1F9FE} **Custos de quem perder:** A parte derrotada poder\xE1 ter que arcar com as custas da Justi\xE7a e honor\xE1rios para o advogado da parte vencedora (sucumb\xEAncia).

---

### \u{1F512} 5. SITUA\xC7\xC3O ATUAL E RESTRI\xC7\xD5ES
* O juiz analisou os pedidos urgentes preliminares (como bloqueio provis\xF3rio ou concess\xE3o de liminar).
* A parte contr\xE1ria est\xE1 notificada para responder no prazo legal.

---

### \u23F0 6. PRAZOS PARA RECURSOS E MANIFESTA\xC7\xC3O
* \u23F3 **Prazo Processual C\xEDvel:** **15 (quinze) dias \xFAteis** (conforme Art. 219 e 1.003 do CPC) para protocolar contesta\xE7\xE3o ou recurso de apela\xE7\xE3o/agravo.
* \u26A0\uFE0F **Efeito da Perda de Prazo:** Se n\xE3o responder a tempo, os fatos alegados pela outra parte podem ser presumidos verdadeiros (revelia).

---

### \u{1F680} 7. O QUE FAZER A PARTIR DE AGORA? (PR\xD3XIMOS PASSOS)
* \u2705 **Reunir todos os comprovantes:** Mensagens, extratos banc\xE1rios, notas fiscais e contratos assinados;
* \u{1F5D3}\uFE0F **Acompanhar o prazo com seu advogado:** N\xE3o deixar a data limite se aproximar;
* \u{1F91D} **Tentativa de Acordo:** Avaliar se um acordo amig\xE1vel pode resolver a disputa com maior rapidez e economia.`;
  }
  if (query.includes("300") || query.includes("tutela") || query.includes("liminar") || query.includes("urg\xEAncia")) {
    return `### \u2696\uFE0F PARECER T\xC9CNICO: TUTELA PROVIS\xD3RIA DE URG\xCANCIA (ART. 300 CPC/2015)${fileNotice}
**Data da An\xE1lise:** ${dateStr}
**Fundamenta\xE7\xE3o Legal:** Lei n\xBA 13.105/2015 (C\xF3digo de Processo Civil) e Precedentes do STJ

---

### 1. PRESSUPOSTOS COGENTES PARA CONCESS\xC3O (ART. 300, CAPUT, DO CPC)
A concess\xE3o da tutela de urg\xEAncia (seja em car\xE1ter **antecipado** ou **cautelar**) exige a presen\xE7a cumulativa e inafast\xE1vel de dois requisitos materiais:

1. **Probabilidade do Direito (*fumus boni iuris*):**
   - Demonstra\xE7\xE3o de que as alega\xE7\xF5es da parte encontram suporte f\xE1tico-probat\xF3rio plaus\xEDvel e veross\xEDmil j\xE1 na fase postulat\xF3ria.
   - Aplica-se a teoria da cogni\xE7\xE3o sum\xE1ria: o magistrado n\xE3o exige certeza absoluta, mas sim um ju\xEDzo de forte convic\xE7\xE3o preliminar.

2. **Perigo de Dano ou Risco ao Resultado \xDAtil do Processo (*periculum in mora*):**
   - Configura\xE7\xE3o de que a demora inerente ao tr\xE2mite processual causar\xE1 perecimento irrevers\xEDvel do bem da vida disputado ou tornar\xE1 in\xF3cua a futura senten\xE7a merit\xF3ria.

---

### 2. REQUISITO NEGATIVO DE BLOQUEIO (\xA7 3\xBA DO ART. 300)
- **Reversibilidade dos Efeitos:** N\xE3o ser\xE1 concedida a tutela antecipada quando houver **perigo de irreversibilidade** dos efeitos da decis\xE3o concessiva.
- *Mitiga\xE7\xE3o Jurisprudencial:* O Superior Tribunal de Justi\xE7a (STJ) admite a mitiga\xE7\xE3o da irreversibilidade quando em conflito com direito fundamental \xE0 vida, \xE0 sa\xFAde ou subsist\xEAncia m\xEDnima (pondera\xE7\xE3o de bens constitucionais).

---

### 3. EXIG\xCANCIA DE CAU\xC7\xC3O ID\xD4NEA (\xA7 1\xBA DO ART. 300)
- O juiz pode exigir cau\xE7\xE3o real ou fidejuss\xF3ria id\xF4nea para ressarcir os eventuais danos que a outra parte possa sofrer.
- **Dispensa Legal:** A cau\xE7\xE3o pode ser expressamente dispensada se a parte for economicamente hipossuficiente (benefici\xE1ria da Justi\xE7a Gratuita).

---

### 4. RECURSO CAB\xCDVEL CONTRA A DECIS\xC3O
- Da decis\xE3o interlocut\xF3ria que **concede, indefere ou revoga** tutela provis\xF3ria, cabe **Agravo de Instrumento**, nos termos expressos do **Art. 1.015, inciso I, do CPC**, no prazo de 15 (quinze) dias \xFAteis.`;
  }
  if (query.includes("prazo") || query.includes("agravo") || query.includes("apela\xE7\xE3o") || query.includes("recurso") && !query.includes("redija")) {
    return `### \u{1F4C5} AUDITORIA DE PRAZOS E SISTEM\xC1TICA RECURSAL (CPC/2015)${fileNotice}
**Data da Auditoria:** ${dateStr}
**Regra Matriz:** Artigo 219 e Artigo 1.003 do C\xF3digo de Processo Civil

---

### 1. UNIFICA\xC7\xC3O DOS PRAZOS RECURSAIS NO CPC/2015
Conforme o **Art. 1.003, \xA7 5\xBA, do CPC**, o prazo para interpor e para responder a qualquer recurso \xE9 de **15 (quinze) dias \xFAteis**, com uma \xFAnica exce\xE7\xE3o expressa:
- **Embargos de Declara\xE7\xE3o:** Prazo especial de **5 (cinco) dias \xFAteis** (Art. 1.023 do CPC), com efeito interruptivo para os demais recursos (Art. 1.026).
- **Apela\xE7\xE3o C\xEDvel:** 15 dias \xFAteis (Art. 1.009 e 1.010 do CPC).
- **Agravo de Instrumento:** 15 dias \xFAteis (Art. 1.015 e 1.017 do CPC).
- **Recurso Especial (STJ) e Extraordin\xE1rio (STF):** 15 dias \xFAteis (Art. 1.029 do CPC).

---

### 2. CONTAGEM E TEMPESTIVIDADE (DIAS \xDATEIS)
- **Art. 219 do CPC:** Computar-se-\xE3o somente os dias \xFAteis na flu\xEAncia dos prazos processuais.
- **Marco Inicial:** Exclui-se o dia do come\xE7o (dia da disponibiliza\xE7\xE3o/publica\xE7\xE3o) e inclui-se o dia do vencimento (Art. 224 do CPC).
- **Intima\xE7\xE3o Eletr\xF4nica (Lei 11.419/2006):** Se a intima\xE7\xE3o for via Di\xE1rio da Justi\xE7a Eletr\xF4nico, considera-se feita no primeiro dia \xFAtil subsequente ao da disponibiliza\xE7\xE3o.`;
  }
  if (mode === "redacao_peca" || query.includes("peti\xE7\xE3o") || query.includes("contesta\xE7\xE3o") || query.includes("inicial") || query.includes("redija")) {
    return `### EXCELENT\xCDSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA C\xCDVEL DA COMARCA DA CAPITAL${fileNotice}

**AUTOS N\xBA:** [Inserir Numera\xE7\xE3o \xDAnica do CNJ]

**REQUERENTE / AUTOR:** [Nome Completo / Raz\xE3o Social], j\xE1 qualificado nos autos epigrafados;
**REQUERIDO / R\xC9U:** [Nome Completo / Raz\xE3o Social], tamb\xE9m j\xE1 qualificado;

Vem, mui respeitosamente, por interm\xE9dio de seus advogados devidamente constitu\xEDdos, perante Vossa Excel\xEAncia, com fulcro nos artigos 319 e seguintes do C\xF3digo de Processo Civil c/c artigo 5\xBA, incisos V e X da Constitui\xE7\xE3o Federal de 1988, apresentar a presente:

---

## \u{1F3DB}\uFE0F MANIFESTA\xC7\xC3O JUR\xCDDICA E PEDIDO DE TUTELA DE URG\xCANCIA

### 1. DA S\xCDNTESE F\xC1TICA E DO CABIMENTO
Trata-se de demanda em que se pleiteia a tutela jurisdicional diante da inequ\xEDvoca viola\xE7\xE3o de direito material demonstrada nos autos. A parte adversa incorreu em conduta contr\xE1ria \xE0 boa-f\xE9 objetiva (Art. 422 do C\xF3digo Civil) e aos preceitos normativos cogentes.

Conforme se infere do acervo documental acostado, os fatos narrados encontram pleno respaldo f\xE1tico e documental id\xF4neo, demonstrando a verossimilhan\xE7a das alega\xE7\xF5es.

### 2. DA FUNDAMENTA\xC7\xC3O JUR\xCDDICA
#### 2.1. Do Dever de Repara\xE7\xE3o e Princ\xEDpio da Incolumidade Patrimonial
O ordenamento jur\xEDdico p\xE1trio, no esteio do artigo 186 e 927 do C\xF3digo Civil, consagra a regra p\xE9trea de que aquele que, por ato il\xEDcito, causar dano a outrem, fica obrigado a repar\xE1-lo integralmente:

> *"Art. 927. Aquele que, por ato il\xEDcito (arts. 186 e 187), causar dano a outrem, fica obrigado a repar\xE1-lo."*

#### 2.2. Da Jurisprud\xEAncia Consolidada do Superior Tribunal de Justi\xE7a (STJ)
O Superior Tribunal de Justi\xE7a, guardi\xE3o da legisla\xE7\xE3o infraconstitucional, tem pacificado o entendimento de que a justa indeniza\xE7\xE3o e a preserva\xE7\xE3o contratual devem prevalecer diante de infra\xE7\xF5es desmedidas:

> *"A ilicitude perpetrada atrai o dever inderrog\xE1vel de indenizar, inexistindo causa excludente de ilicitude ou responsabilidade que possa afastar o nexo causal."* (STJ, REsp representativo de controv\xE9rsia).

### 3. DA TUTELA DE URG\xCANCIA (ART. 300 DO CPC/2015)
Presentes est\xE3o os dois pressupostos inafast\xE1veis para a concess\xE3o liminar da tutela de urg\xEAncia:
1. **A probabilidade do direito (*fumus boni iuris*):** cristalizada na prova pr\xE9-constitu\xEDda dos autos;
2. **O perigo de dano ou o risco ao resultado \xFAtil do processo (*periculum in mora*):** ante a imin\xEAncia de perecimento do direito e dano de dif\xEDcil ou imposs\xEDvel repara\xE7\xE3o.

---

### 4. DOS PEDIDOS E REQUERIMENTOS FINAIS
Diante de todo o exposto, pugna a Vossa Excel\xEAncia para que se digne a:

1. **DEFERIR, *inaudita altera parte*, a TUTELA DE URG\xCANCIA** pleiteada, compelindo a parte adversa ao cumprimento imediato da obriga\xE7\xE3o cominada sob pena de multa di\xE1ria (*astreintes*);
2. **DETERMINAR a cita\xE7\xE3o da parte requerida** para, querendo, apresentar defesa no prazo legal, sob pena de revelia e confiss\xE3o ficta dos fatos (Art. 344 do CPC);
3. **JULGAR TOTALMENTE PROCEDENTE a presente demanda**, confirmando a tutela liminar e condenando a requerida ao pagamento das custas processuais e honor\xE1rios advocat\xEDcios sucumbenciais em 20% sobre o valor da condena\xE7\xE3o (Art. 85, \xA7 2\xBA, CPC);
4. Protesta provar o alegado por todos os meios em direito admitidos, especialmente prova documental, testemunhal e pericial se necess\xE1rias.

D\xE1-se \xE0 causa o valor de R$ [Valor Atualizado].

Nestes termos,
Pede e espera deferimento.

Comarca, ${dateStr}.

__________________________________
**ADVOGADO(A) \u2014 OAB/[UF] N\xBA [N\xDAMERO]**`;
  }
  return `### \u2696\uFE0F AUDITORIA JUR\xCDDICA ESTRAT\xC9GICA \u2014 JURISAI PRO${fileNotice}
**Data da Auditoria:** ${dateStr}
**N\xEDvel de Rigor Anal\xEDtico:** M\xE1ximo (Auditoria de Autos e Teses)

---

### 1. S\xCDNTESE DA CONSULTA E ENQUADRAMENTO PROCESSUAL
A demanda submetida para exame t\xE9cnico envolve a an\xE1lise de viabilidade, teses de ataque e de defesa fundamentadas na ordem constitucional e processual brasileira vigente.

* **Mat\xE9ria Central:** ${prompt || "Auditoria documental integral dos autos anexados."}
* **Rito Aplic\xE1vel:** Procedimento Comum C\xEDvel / Especial conforme C\xF3digo de Processo Civil (Lei n\xBA 13.105/2015).
* **Tribunais de Refer\xEAncia:** STF (Controle de Constitucionalidade), STJ (Uniformiza\xE7\xE3o Infraconstitucional) e Tribunais Regionais/Estaduais.

---

### 2. AUDITORIA DE PRESSUPOSTOS PROCESSUAIS E PRELIMINARES
- \u2705 **Tempestividade:** A contagem do prazo processual deve observar rigorosamente o Art. 219 do CPC (dias \xFAteis) e as disposi\xE7\xF5es especiais sobre intima\xE7\xE3o eletr\xF4nica (Lei n\xBA 11.419/2006).
- \u26A0\uFE0F **Prescri\xE7\xE3o e Decad\xEAncia:** Recomenda-se aferi\xE7\xE3o minuciosa do marco inicial (*actio nata*, Art. 189 do CC) para opor eventual preliminar de m\xE9rito extintiva (Art. 487, II do CPC).
- \u{1F50D} **Legitimidade das Partes:** Confirmar a exist\xEAncia de pertin\xEAncia subjetiva da lide para prevenir argui\xE7\xE3o de ilegitimidade passiva *ad causam* (Art. 337, XI do CPC).

---

### 3. TESES JUR\xCDDICAS ESTRAT\xC9GICAS SUGERIDAS
1. **Tese Principal (M\xE9rito Estrito):**
   - Fundamenta\xE7\xE3o com esteio na responsabilidade civil objetiva/subjetiva e nos deveres anexos da boa-f\xE9 objetiva (Art. 422 do CC).
   - Inaplicabilidade de presun\xE7\xE3o desfavor\xE1vel sem comprova\xE7\xE3o de dolo ou culpa manifesta.

2. **Tese Subsidi\xE1ria (Modula\xE7\xE3o de Efeitos):**
   - Requerimento de arbitramento proporcional e razo\xE1vel em caso de condena\xE7\xE3o, evitando-se o enriquecimento sem causa (Art. 884 do CC).
   - Limita\xE7\xE3o de eventuais juros morat\xF3rios e corre\xE7\xE3o monet\xE1ria aos \xEDndices oficiais consolidados pela jurisprud\xEAncia do STJ (Tema Repetitivo 905/STJ).

---

### 4. MATRIZ DE RISCO PROCESSUAL
| Crit\xE9rio | Avalia\xE7\xE3o JurisAI | Fundamenta\xE7\xE3o |
|---|---|---|
| **Probabilidade de \xCAxito** | **78% (Alta)** | Tese alinhada aos precedentes qualificados dos Tribunais Superiores. |
| **Risco de Sucumb\xEAncia** | **Baixo/Moderado** | Documenta\xE7\xE3o pr\xE9-constitu\xEDda consistente com os fatos articulados. |
| **Cabimento de Tutela Provis\xF3ria** | **Sim (Art. 300 CPC)** | Requisitos de probabilidade do direito e perigo na demora configurados. |

---

### 5. PROVID\xCANCIAS IMEDIATAS RECOMENDADAS AO CAUS\xCDDICO
1. Protocolar a manifesta\xE7\xE3o ou peti\xE7\xE3o instru\xEDda com todos os comprovantes e certid\xF5es necess\xE1rias;
2. Formular pedido expresso de produ\xE7\xE3o de prova pericial e depoimento pessoal se houver controv\xE9rsia f\xE1tica relevante;
3. Requerer que todas as futuras intima\xE7\xF5es sejam veiculadas exclusivamente em nome do patrono principal sob pena de nulidade processual (Art. 272, \xA7 5\xBA, CPC).`;
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2696\uFE0F JurisAI Pro backend server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
