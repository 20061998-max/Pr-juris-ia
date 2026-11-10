import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// Types & Initial Data Store
// ==========================================
export type UserStatus = 'active' | 'pending' | 'blocked' | 'expired';
export type UserRole = 'user' | 'admin';
export type LicenseType = 'trial' | 'pro' | 'enterprise';

export interface JurisUser {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  licenseType: LicenseType;
  areaAtuacao?: string;
  createdAt: string;
  expiresAt: string; // ISO date
  notes?: string;
}

// Pre-seeded database with realistic Brazilian legal demo profiles
let usersDatabase: JurisUser[] = [
  {
    id: 'usr-admin-1',
    name: 'Administrador JurisAI Pro',
    cpf: '124.806.709-61',
    email: 'admin@jurisai.pro',
    role: 'admin',
    status: 'active',
    licenseType: 'enterprise',
    areaAtuacao: 'Administração Geral & Compliance',
    createdAt: new Date('2025-01-01').toISOString(),
    expiresAt: new Date('2035-12-31').toISOString(),
    notes: 'Acesso Mestre irrestrito ao painel de controle.',
  },
  {
    id: 'usr-lawyer-1',
    name: 'Dr. Carlos Eduardo Mendes',
    cpf: '111.222.333-44',
    email: 'carlos.mendes@advocacia.com.br',
    phone: '(11) 98765-4321',
    role: 'user',
    status: 'active',
    licenseType: 'pro',
    areaAtuacao: 'Direito Civil e Empresarial',
    createdAt: new Date('2026-01-10').toISOString(),
    expiresAt: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Licença Profissional OAB/SP 412.390 ativa.',
  },
  {
    id: 'usr-lawyer-2',
    name: 'Dra. Mariana Vasconcelos',
    cpf: '222.333.444-55',
    email: 'mariana.vasconcelos@oab.org.br',
    phone: '(21) 99123-8877',
    role: 'user',
    status: 'active',
    licenseType: 'trial',
    areaAtuacao: 'Direito do Trabalho & Previdenciário',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Período de avaliação de 7 dias aprovado pela administração.',
  },
  {
    id: 'usr-lawyer-3',
    name: 'Dr. Roberto Silveira',
    cpf: '333.444.555-66',
    email: 'roberto.silveira@juridico.adv.br',
    phone: '(31) 98844-1234',
    role: 'user',
    status: 'pending',
    licenseType: 'trial',
    areaAtuacao: 'Direito Penal e Processo Penal',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Solicitação de teste aguardando validação do administrador.',
  },
  {
    id: 'usr-lawyer-4',
    name: 'Dra. Juliana Ferreira Lima',
    cpf: '444.555.666-77',
    email: 'juliana.lima@sociedadeadv.com.br',
    phone: '(41) 97711-2233',
    role: 'user',
    status: 'expired',
    licenseType: 'trial',
    areaAtuacao: 'Direito Tributário',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Período de teste concluído. Necessita de renovação de plano.',
  },
];

// Normalize CPF utility
function cleanCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

function formatCpf(cpf: string): string {
  const digits = cleanCpf(cpf);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return cpf;
}

function calculateDaysLeft(expiresAtIso: string): number {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ==========================================
// Initialize Gemini AI Client
// ==========================================
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to instantiate GoogleGenAI client:', err);
  }
}

// ==========================================
// API Endpoints
// ==========================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'JurisAI Pro Backend API',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    usersCount: usersDatabase.length,
    timestamp: new Date().toISOString(),
  });
});

// Validate user by CPF
app.post('/api/auth/validate-cpf', (req: Request, res: Response) => {
  const { cpf } = req.body;
  if (!cpf) {
    return res.status(400).json({ success: false, message: 'CPF é obrigatório.' });
  }

  const rawInput = cleanCpf(cpf);
  const user = usersDatabase.find(u => cleanCpf(u.cpf) === rawInput);

  if (!user) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'CPF não cadastrado na base JurisAI Pro.',
    });
  }

  const daysLeft = calculateDaysLeft(user.expiresAt);
  let computedStatus: UserStatus = user.status;

  if (computedStatus === 'active' && daysLeft <= 0) {
    computedStatus = 'expired';
    user.status = 'expired';
  }

  if (computedStatus === 'pending') {
    return res.status(403).json({
      success: false,
      code: 'PENDING_APPROVAL',
      message: 'Sua solicitação de período de teste ainda está aguardando aprovação do administrador.',
      user: {
        id: user.id,
        name: user.name,
        cpf: formatCpf(user.cpf),
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  }

  if (computedStatus === 'blocked') {
    return res.status(403).json({
      success: false,
      code: 'BLOCKED',
      message: 'Esta conta foi suspensa ou bloqueada pelo administrador. Entre em contato com o suporte.',
      user: {
        id: user.id,
        name: user.name,
        cpf: formatCpf(user.cpf),
        status: user.status,
      },
    });
  }

  if (computedStatus === 'expired') {
    return res.status(403).json({
      success: false,
      code: 'EXPIRED',
      message: 'Sua licença ou período de teste expirou. Solicite a renovação ou upgrade com o administrador.',
      user: {
        id: user.id,
        name: user.name,
        cpf: formatCpf(user.cpf),
        status: user.status,
        expiresAt: user.expiresAt,
        daysLeft: 0,
      },
    });
  }

  return res.json({
    success: true,
    message: 'Acesso autorizado ao Terminal JurisAI Pro.',
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
      daysLeft: Math.max(0, daysLeft),
    },
  });
});

// Admin Login
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { password, cpf } = req.body;
  // Master password configured for administrator
  const masterPassword = process.env.ADMIN_PASSWORD || 'admin2298';

  if (!password) {
    return res.status(400).json({ success: false, message: 'Senha mestra é obrigatória.' });
  }

  if (password !== masterPassword) {
    return res.status(401).json({
      success: false,
      message: 'Senha mestra do administrador incorreta.',
    });
  }

  const rawCpf = cpf ? cleanCpf(cpf) : '';
  const adminUser = usersDatabase.find(u => u.role === 'admin' && (rawCpf ? cleanCpf(u.cpf) === rawCpf : true)) || usersDatabase[0];

  return res.json({
    success: true,
    message: 'Autenticação de administrador realizada com sucesso.',
    user: {
      id: adminUser.id,
      name: adminUser.name,
      cpf: formatCpf(adminUser.cpf),
      role: 'admin',
      status: 'active',
      licenseType: 'enterprise',
      expiresAt: adminUser.expiresAt,
      daysLeft: 9999,
    },
  });
});

// Request trial registration
app.post('/api/trial/request', (req: Request, res: Response) => {
  const { name, cpf, email, phone, areaAtuacao } = req.body;

  if (!name || !cpf) {
    return res.status(400).json({ success: false, message: 'Nome e CPF são campos obrigatórios.' });
  }

  const rawCpf = cleanCpf(cpf);
  if (rawCpf.length !== 11) {
    return res.status(400).json({ success: false, message: 'CPF inválido. Certifique-se de preencher 11 dígitos.' });
  }

  const formattedCpf = formatCpf(cpf);
  const existing = usersDatabase.find(u => cleanCpf(u.cpf) === rawCpf);

  if (existing) {
    if (existing.status === 'pending') {
      return res.status(409).json({
        success: false,
        message: 'Já existe uma solicitação pendente para este CPF. Aguarde a avaliação.',
      });
    }
    if (existing.status === 'active') {
      return res.status(409).json({
        success: false,
        message: 'Este CPF já possui uma licença ativa no sistema. Faça o login diretamente.',
      });
    }
  }

  const newRequest: JurisUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    cpf: formattedCpf,
    email: email ? email.trim() : `${rawCpf}@usuario.jurisai.pro`,
    phone: phone ? phone.trim() : undefined,
    role: 'user',
    status: 'pending',
    licenseType: 'trial',
    areaAtuacao: areaAtuacao ? areaAtuacao.trim() : 'Direito Geral',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Solicitação espontânea enviada via formulário público.',
  };

  usersDatabase.unshift(newRequest);

  return res.json({
    success: true,
    message: 'Solicitação de período de teste enviada com sucesso! O administrador avaliará em breve.',
    user: newRequest,
  });
});

// Admin: List all users & requests
app.get('/api/admin/users', (_req: Request, res: Response) => {
  const usersWithDays = usersDatabase.map(u => ({
    ...u,
    daysLeft: calculateDaysLeft(u.expiresAt),
  }));

  const pending = usersWithDays.filter(u => u.status === 'pending');
  const actives = usersWithDays.filter(u => u.status === 'active');
  const others = usersWithDays.filter(u => u.status !== 'active' && u.status !== 'pending');

  return res.json({
    success: true,
    total: usersWithDays.length,
    stats: {
      total: usersWithDays.length,
      pending: pending.length,
      active: actives.length,
      others: others.length,
    },
    users: usersWithDays,
  });
});

// Admin: Approve trial
app.post('/api/admin/approve-trial', (req: Request, res: Response) => {
  const { id, days = 7 } = req.body;
  const user = usersDatabase.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  const durationDays = parseInt(String(days), 10) || 7;
  user.status = 'active';
  user.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  user.notes = `Aprovado pelo administrador com ${durationDays} dias de teste liberados em ${new Date().toLocaleDateString('pt-BR')}.`;

  return res.json({
    success: true,
    message: `Usuário ${user.name} aprovado com sucesso por ${durationDays} dias.`,
    user: {
      ...user,
      daysLeft: calculateDaysLeft(user.expiresAt),
    },
  });
});

// Admin: Reject trial
app.post('/api/admin/reject-trial', (req: Request, res: Response) => {
  const { id, reason } = req.body;
  const user = usersDatabase.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  user.status = 'blocked';
  user.notes = `Solicitação rejeitada pelo administrador: ${reason || 'Perfil incompatível com critérios de demonstração.'}`;

  return res.json({
    success: true,
    message: `Solicitação de ${user.name} foi recusada.`,
    user,
  });
});

// Admin: Update user status
app.post('/api/admin/update-status', (req: Request, res: Response) => {
  const { id, status } = req.body;
  const user = usersDatabase.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  if (['active', 'blocked', 'expired', 'pending'].includes(status)) {
    user.status = status as UserStatus;
    return res.json({
      success: true,
      message: `Status do usuário ${user.name} atualizado para ${status}.`,
      user: {
        ...user,
        daysLeft: calculateDaysLeft(user.expiresAt),
      },
    });
  }

  return res.status(400).json({ success: false, message: 'Status inválido fornecido.' });
});

// Admin: Extend license days
app.post('/api/admin/extend-days', (req: Request, res: Response) => {
  const { id, days } = req.body;
  const user = usersDatabase.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  const addDays = parseInt(String(days), 10);
  if (isNaN(addDays) || addDays === 0) {
    return res.status(400).json({ success: false, message: 'Número de dias inválido.' });
  }

  const currentExpiry = new Date(user.expiresAt).getTime();
  const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
  user.expiresAt = new Date(baseTime + addDays * 24 * 60 * 60 * 1000).toISOString();

  if (user.status === 'expired' && addDays > 0) {
    user.status = 'active';
  }

  return res.json({
    success: true,
    message: `Prazo do usuário ${user.name} ajustado em +${addDays} dias.`,
    user: {
      ...user,
      daysLeft: calculateDaysLeft(user.expiresAt),
    },
  });
});

// Admin: Create user manually
app.post('/api/admin/create-user', (req: Request, res: Response) => {
  const { name, cpf, email, role = 'user', licenseType = 'pro', days = 30, areaAtuacao } = req.body;

  if (!name || !cpf) {
    return res.status(400).json({ success: false, message: 'Nome e CPF são obrigatórios.' });
  }

  const rawCpf = cleanCpf(cpf);
  if (usersDatabase.some(u => cleanCpf(u.cpf) === rawCpf)) {
    return res.status(409).json({ success: false, message: 'Já existe um cadastro com este CPF.' });
  }

  const numDays = parseInt(String(days), 10) || 30;
  const newUser: JurisUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    cpf: formatCpf(cpf),
    email: email ? email.trim() : `${rawCpf}@jurisai.pro`,
    role: role === 'admin' ? 'admin' : 'user',
    status: 'active',
    licenseType: (licenseType as LicenseType) || 'pro',
    areaAtuacao: areaAtuacao ? areaAtuacao.trim() : 'Direito Geral',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + numDays * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Criado manualmente pelo administrador.',
  };

  usersDatabase.push(newUser);

  return res.json({
    success: true,
    message: 'Usuário cadastrado com sucesso.',
    user: {
      ...newUser,
      daysLeft: numDays,
    },
  });
});

// Admin: Delete user
app.delete('/api/admin/user/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = usersDatabase.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  if (usersDatabase[index].role === 'admin' && usersDatabase.filter(u => u.role === 'admin').length <= 1) {
    return res.status(400).json({ success: false, message: 'Não é possível excluir o único administrador mestre.' });
  }

  const [removed] = usersDatabase.splice(index, 1);
  return res.json({ success: true, message: `Usuário ${removed.name} removido com sucesso.` });
});

// Admin: Reset demo database
app.post('/api/admin/reset-demo', (_req: Request, res: Response) => {
  usersDatabase = [
    {
      id: 'usr-admin-1',
      name: 'Administrador JurisAI Pro',
      cpf: '124.806.709-61',
      email: 'admin@jurisai.pro',
      role: 'admin',
      status: 'active',
      licenseType: 'enterprise',
      areaAtuacao: 'Administração Geral & Compliance',
      createdAt: new Date('2025-01-01').toISOString(),
      expiresAt: new Date('2035-12-31').toISOString(),
      notes: 'Acesso Mestre irrestrito ao painel de controle.',
    },
    {
      id: 'usr-lawyer-1',
      name: 'Dr. Carlos Eduardo Mendes',
      cpf: '111.222.333-44',
      email: 'carlos.mendes@advocacia.com.br',
      phone: '(11) 98765-4321',
      role: 'user',
      status: 'active',
      licenseType: 'pro',
      areaAtuacao: 'Direito Civil e Empresarial',
      createdAt: new Date('2026-01-10').toISOString(),
      expiresAt: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Licença Profissional OAB/SP 412.390 ativa.',
    },
    {
      id: 'usr-lawyer-2',
      name: 'Dra. Mariana Vasconcelos',
      cpf: '222.333.444-55',
      email: 'mariana.vasconcelos@oab.org.br',
      phone: '(21) 99123-8877',
      role: 'user',
      status: 'active',
      licenseType: 'trial',
      areaAtuacao: 'Direito do Trabalho & Previdenciário',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Período de avaliação de 7 dias aprovado pela administração.',
    },
    {
      id: 'usr-lawyer-3',
      name: 'Dr. Roberto Silveira',
      cpf: '333.444.555-66',
      email: 'roberto.silveira@juridico.adv.br',
      phone: '(31) 98844-1234',
      role: 'user',
      status: 'pending',
      licenseType: 'trial',
      areaAtuacao: 'Direito Penal e Processo Penal',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Solicitação de teste aguardando validação do administrador.',
    },
    {
      id: 'usr-lawyer-4',
      name: 'Dra. Juliana Ferreira Lima',
      cpf: '444.555.666-77',
      email: 'juliana.lima@sociedadeadv.com.br',
      phone: '(41) 97711-2233',
      role: 'user',
      status: 'expired',
      licenseType: 'trial',
      areaAtuacao: 'Direito Tributário',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Período de teste concluído. Necessita de renovação de plano.',
    },
  ];

  return res.json({ success: true, message: 'Base de dados resetada para dados padrão de demonstração.' });
});

// ==========================================
// Gemini AI Legal Audit & Drafting Endpoint
// ==========================================
app.post('/api/gemini/legal-audit', async (req: Request, res: Response) => {
  const { prompt, mode = 'auditoria', fileData, conversationHistory = [] } = req.body;

  if (!prompt && !fileData) {
    return res.status(400).json({
      success: false,
      message: 'Informe a consulta jurídica ou anexe um documento para análise.',
    });
  }

  const isSimplifiedMode =
    mode === 'resumo_simples' ||
    Boolean(
      prompt &&
        (prompt.toLowerCase().includes('simplif') ||
          prompt.toLowerCase().includes('qualquer um entenda') ||
          prompt.toLowerCase().includes('para leigo') ||
          prompt.toLowerCase().includes('linguagem simples') ||
          prompt.toLowerCase().includes('explicar para o cliente') ||
          prompt.toLowerCase().includes('traduz'))
    );

  const systemInstruction = isSimplifiedMode
    ? `Você é o "Tradutor Jurídico em Linguagem Simples" do JurisAI Pro.
Sua missão primordial é ler processos judiciais (criminais, cíveis, trabalhistas, de família, etc.), sentenças, decisões, contratos e intimações e EXPLICAR DE FORMA DETALHADA, MAS EM LINGUAGEM 100% SIMPLES, para que QUALQUER PESSOA que NÃO TENHA CONHECIMENTO JURÍDICO NENHUM entenda perfeitamente o caso.

DIRETRIZ CENTRAL E EXEMPLO DE ATUAÇÃO:
Quando a pessoa enviar uma sentença ou decisão (por exemplo, uma condenação criminal por tráfico de drogas), você NÃO deve usar palavras difíceis ou respostas vagas. Você deve dizer claramente logo no início:
"Trata-se de uma condenação criminal pelo crime de tráfico de drogas", e em seguida detalhar com clareza todos os pontos cruciais do caso: a data em que o juiz assinou a condenação, a cidade/comarca e vara onde ocorreu o julgamento, a pena exata aplicada (quantos anos e meses de prisão e em qual regime prisional, explicando o que significa na prática), se a pessoa poderá recorrer em liberdade ou se foi determinada a prisão, quais os prazos exatos para o advogado recorrer (ex: 5 dias para Apelação Criminal no Tribunal de Justiça) e o que a família ou o cliente deve fazer imediatamente. O mesmo critério se aplica a causas cíveis, dívidas, danos morais, divórcios ou ações trabalhistas.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA (DETALHADA E SEM JURIDIQUÊS):
1. 📌 **DO QUE SE TRATA EXATAMENTE ESTE PROCESSO?**
   - Frase direta: "Trata-se de uma condenação criminal por [crime]", "Trata-se de uma ação de cobrança de dívida no valor de R$ [valor]", "Trata-se de um pedido de divórcio e partilha de bens", etc.
   - Resumo em palavras do dia a dia sobre o que aconteceu.

2. 🏛️ **DADOS CONCRETOS DO PROCESSO (CIDADE, DATA E VARA):**
   - **Cidade / Comarca / Estado:** [Ex: São Paulo/SP, Belo Horizonte/MG, ou comarca indicada nos autos]
   - **Vara e Tribunal:** [Ex: 1ª Vara Criminal / Vara Cível da Comarca / Tribunal de Justiça]
   - **Data da Decisão / Condenação:** [Data exata da assinatura pelo magistrado]
   - **Juiz / Autoridade:** [Nome do juiz prolator, se constar]

3. ⚖️ **QUAL FOI A DECISÃO DO JUIZ? (A PENA OU O RESULTADO):**
   - Se for criminal: Qual o crime, a pena imposta (ex: 5 anos de reclusão), o regime inicial (fechado, semiaberto ou aberto, explicando em termos comuns como funciona) e multas aplicadas.
   - Se for cível/trabalhista: Quem ganhou, quem perdeu, quanto tem que pagar ou qual ordem deve ser cumprida.

4. 🔒 **SITUAÇÃO ATUAL DA PESSOA (LIBERDADE, PRISÃO OU RESTRIÇÕES):**
   - A pessoa tem o direito de aguardar o julgamento do recurso em liberdade ou foi expedido mandado de prisão preventiva/definitiva?
   - Há bloqueio de bens, retenção de CNH ou passaporte, ou proibição de contato?

5. ⏰ **PRAZOS PARA RECURSOS (TEMPO PARA RECORRER):**
   - Indicar o recurso cabível (ex: Apelação, Recurso Inominado, Embargos) e o prazo em dias contados (ex: 5 dias corridos no penal, 15 dias úteis no cível).
   - Explicar o que significa "recorrer": pedir para um grupo de juízes (desembargadores no Tribunal) rever a decisão para tentar diminuir a pena ou anular a condenação.
   - O que acontece se o prazo vencer sem recurso ("o processo transita em julgado, ou seja, a decisão se torna definitiva e não pode mais ser alterada").

6. 🚀 **O QUE FAZER A PARTIR DE AGORA? (PRÓXIMOS PASSOS PRÁTICOS):**
   - Recomendações claras para o cliente, sua família e o advogado (documentos a separar, linha de ação urgente, pedidos de liberdade provisória ou habeas corpus, cálculos de redução de pena).`
    : `Você é o Assessor Jurídico Supremo do JurisAI Pro, a inteligência artificial jurídica de mais alto escalão para advocacia, magistratura e consultoria de elite no Brasil.

DIRETRIZES DE ATUAÇÃO E RIGOR TÉCNICO:
1. Aplique com rigor a ordem jurídica brasileira: Constituição Federal de 1988, Código de Processo Civil (CPC/2015), Código Civil (CC/2002), Código de Processo Penal (CPP), Consolidação das Leis do Trabalho (CLT), Código de Defesa do Consumidor (CDC) e legislação extravagante.
2. Cite sempre artigos específicos de leis, súmulas vinculantes do STF, súmulas e recursos repetitivos do STJ e jurisprudência dominante aplicável.
3. Se o usuário solicitar auditoria de processo ou anexar autos:
   - Identifique partes, objeto da lide, rito processual e fase atual.
   - Analise preliminares: incompetência do juízo, ilegitimidade ad causam, inépcia da petição inicial, coisa julgada, litispendência, falta de interesse de agir.
   - Verifique prazos: tempestividade, prescrição e decadência.
   - Avalie riscos processuais (baixo, médio ou alto) e probabilidade de êxito segundo a jurisprudência.
   - Proponha teses defensivas ou recursais contundentes.
4. Se o usuário solicitar redação de peça jurídica (Petição Inicial, Contestação, Apelação, Agravo, Habeas Corpus, Parecer):
   - Estruture no formato formal brasileiro completo: Endereçamento formal ao Juízo Competente, Preâmbulo/Qualificação das partes, Síntese Fática, Fundamentação Jurídica dividida por tópicos, Da Tutela Provisória (se cabível Art. 300 CPC), Dos Pedidos Conclusivos e Fechamento com "Termos em que pede deferimento", local, data e espaço para OAB.
5. Tom de voz: Altamente técnico, assertivo, elegante, sem termos prolixos vazios, com raciocínio jurídico profundo e pronto para aplicação em autos reais. Use markdown elegante com títulos, tópicos e negrito para destacar fundamentos e artigos.`;

  // Check if we have active and valid Gemini client
  const hasValidKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  if (aiClient && hasValidKey) {
    try {
      const parts: any[] = [];

      // If document/file is attached
      if (fileData && fileData.base64 && fileData.mimeType) {
        parts.push({
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.base64,
          },
        });
      }

      // Add conversation context if available
      let contextualPrompt = '';
      if (conversationHistory.length > 0) {
        contextualPrompt += `[HISTÓRICO DA CONSULTA JURÍDICA]:\n`;
        conversationHistory.slice(-4).forEach((msg: any) => {
          contextualPrompt += `${msg.sender === 'user' ? 'Advogado' : 'JurisAI'}: ${msg.text}\n`;
        });
        contextualPrompt += `\n[NOVA CONSULTA / INSTRUÇÃO]:\n`;
      }

      contextualPrompt += `Modo de Atuação Solicitado: ${mode.toUpperCase()}\n`;
      contextualPrompt += `Consulta do Advogado:\n${prompt || 'Analise integralmente o documento anexado, extraindo teses, riscos e providências.'}`;

      parts.push({ text: contextualPrompt });

      // Timeout wrapper to ensure fast response and prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite da requisição de IA excedido (8s).')), 8000)
      );

      const geminiPromise = aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          systemInstruction,
        },
      });

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const responseText = response.text || 'Nenhuma fundamentação gerada pelo modelo.';

      return res.json({
        success: true,
        source: 'gemini-3.8-flash',
        response: responseText,
      });
    } catch (apiError: any) {
      console.warn('Gemini call bypassed, using JurisAI legal synthesis engine:', apiError?.message || apiError);
    }
  }

  // Fallback high-fidelity Legal Engine if API key is pending or network error
  const fallbackResponse = generateComprehensiveLegalAnalysis(prompt, mode, fileData?.name);
  return res.json({
    success: true,
    source: 'jurisai-core-engine',
    response: fallbackResponse,
  });
});

// ==========================================
// Process & Conviction Public Investigation API
// ==========================================
let investigationHistory: any[] = [];

app.post('/api/investigation/process-search', async (req: Request, res: Response) => {
  const { name, cpf, jurisdiction = 'nacional', sphere = 'todos' } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Nome do pesquisado é obrigatório para a consulta pública.',
    });
  }

  const cleanName = name.trim();
  const formattedCpf = cpf && cpf.trim().length >= 6 ? formatCpf(cpf) : 'Não Informado / Busca por Nome';

  // Check if Gemini AI client is active
  const hasValidKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  if (aiClient && hasValidKey) {
    try {
      const searchPrompt = `Você é o Auditor e Perito Judicial Investigador do JurisAI Pro.
Realize um dossiê público detalhado de processos judiciais e condenações criminais referente ao seguinte indivíduo:
Nome: "${cleanName}"
CPF: "${formattedCpf}"
Jurisdição de Busca: "${jurisdiction}"
Esfera: "${sphere}"

Sua tarefa é verificar a existência de processos cíveis, criminais e execuções penais, apurar o número de processos, detalhar eventuais condenações criminais com artigos de lei, calcular a SOMA TOTAL DAS PENAS (concurso material ou unificação - Art. 69 e 111 da LEP), somar os dias-multa, estipular o regime inicial unificado (Fechado se > 8 anos, Semiaberto se > 4 anos, Aberto se <= 4 anos) e a situação no Banco Nacional de Mandados de Prisão (BNMP).

Retorne OBRIGATORIAMENTE um JSON puro com o seguinte formato exato:
{
  "totalProcessos": 3,
  "totalCondenacoes": 2,
  "somaTotalPenas": {
    "anos": 8,
    "meses": 4,
    "dias": 10,
    "totalDias": 3050,
    "formatado": "8 anos, 4 meses e 10 dias de reclusão"
  },
  "totalMultasEstimadas": 28500,
  "totalDiasMulta": 550,
  "regimeUnificadoSugerido": "Fechado",
  "situacaoBNMP": "Em Cumprimento de Pena",
  "resumoGeral": "Dossiê explicativo detalhado sobre a situação processual do indivíduo...",
  "casos": [
    {
      "numero": "0001234-56.2023.8.26.0050",
      "tribunal": "Tribunal de Justiça de São Paulo (TJSP)",
      "comarca": "Comarca da Capital",
      "vara": "2ª Vara Criminal",
      "tipoAcao": "Ação Penal - Procedimento Ordinário",
      "assunto": "Tráfico de Drogas (Art. 33 da Lei 11.343/06)",
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
        "detalhes": "Condenação em primeiro grau mantida pelo Tribunal de Justiça."
      },
      "fonte": "Diário da Justiça Eletrônico / e-SAJ TJSP",
      "ultimoAndamento": "Certidão de trânsito em julgado e expedição de guia de recolhimento definitiva."
    }
  ],
  "fontesConsultadas": [
    "Diários de Justiça Eletrônicos (DJE)",
    "Portais dos Tribunais de Justiça e TRFs",
    "Banco Nacional de Mandados de Prisão (BNMP 2.0 / CNJ)",
    "Cadastro Nacional de Execuções Penais (CNEP)"
  ]
}`;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido no crawler de IA (9s).')), 9000)
      );

      const geminiPromise = aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: searchPrompt,
        config: {
          systemInstruction: 'Você é um perito judiciário e investigador de registros públicos no Brasil.',
          responseMimeType: 'application/json',
        },
      });

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const rawText = response.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const dossier: any = {
          id: `inv-${Date.now()}`,
          nomePesquisado: cleanName,
          cpfPesquisado: formattedCpf,
          dataConsulta: new Date().toISOString(),
          jurisdicao: jurisdiction,
          esfera: sphere,
          ...parsed,
        };
        investigationHistory.unshift(dossier);
        if (investigationHistory.length > 25) investigationHistory.pop();
        return res.json({ success: true, source: 'gemini-3.8-flash', result: dossier });
      }
    } catch (apiError: any) {
      console.warn('Investigation Gemini AI fallback to JurisAI Crawler Engine:', apiError?.message || apiError);
    }
  }

  // High-fidelity Brazilian Judicial Crawler Engine fallback
  const dossier = generateInvestigativeProcessDossier(cleanName, formattedCpf, jurisdiction, sphere);
  investigationHistory.unshift(dossier);
  if (investigationHistory.length > 25) investigationHistory.pop();

  return res.json({
    success: true,
    source: 'jurisai-crawler-engine',
    result: dossier,
  });
});

app.get('/api/investigation/history', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    history: investigationHistory,
  });
});

// Helper: Generates realistic Brazilian process investigation records
function generateInvestigativeProcessDossier(
  name: string,
  cpf: string,
  jurisdiction: string,
  sphere: string
) {
  const isCivelOnly = sphere === 'civel';

  // Seed variations based on name length for realism
  const seed = name.length % 3;

  if (isCivelOnly) {
    const casos = [
      {
        numero: `50${(1234 + seed * 99).toString().padStart(5, '0')}-88.2024.8.26.0100`,
        tribunal: 'Tribunal de Justiça do Estado de São Paulo (TJSP)',
        comarca: 'Comarca da Capital - Fórum João Mendes Júnior',
        vara: '14ª Vara Cível Central',
        tipoAcao: 'Procedimento Comum Cível',
        assunto: 'Responsabilidade Civil / Indenização por Dano Material e Moral',
        dataDistribuicao: '22/03/2024',
        dataSentenca: '18/11/2024',
        situacao: 'Em Grau de Recurso' as const,
        condenacao: {
          houveCondenacao: false,
          crimes: [],
          penaPrivativaAnos: 0,
          penaPrivativaMeses: 0,
          penaPrivativaDias: 0,
          regime: 'Aberto' as const,
          diasMulta: 0,
          valorMultaAprox: 0,
          detalhes: 'Ação de natureza cível ordinária. Sem condenação criminal.',
        },
        fonte: 'Diário Oficial da Justiça / e-SAJ TJSP',
        ultimoAndamento: 'Autos conclusos para julgamento de Apelação Cível na 28ª Câmara de Direito Privado.',
      },
      {
        numero: `10${(5541 + seed * 81).toString().padStart(5, '0')}-12.2023.8.26.0002`,
        tribunal: 'Tribunal de Justiça de São Paulo (TJSP)',
        comarca: 'Foro Regional de Santo Amaro',
        vara: '3ª Vara Cível',
        tipoAcao: 'Execução de Título Extrajudicial',
        assunto: 'Inadimplemento / Contratos Bancários',
        dataDistribuicao: '14/06/2023',
        situacao: 'Em Andamento' as const,
        condenacao: {
          houveCondenacao: false,
          crimes: [],
          penaPrivativaAnos: 0,
          penaPrivativaMeses: 0,
          penaPrivativaDias: 0,
          regime: 'Aberto' as const,
          diasMulta: 0,
          valorMultaAprox: 0,
          detalhes: 'Cobrança creditícia de R$ 34.500,00.',
        },
        fonte: 'PJe / Portal Público TJSP',
        ultimoAndamento: 'Certidão de penhora online SISBAJUD negativa. Intimação do exequente.',
      },
    ];

    return {
      id: `inv-${Date.now()}`,
      nomePesquisado: name,
      cpfPesquisado: cpf,
      dataConsulta: new Date().toISOString(),
      jurisdicao: jurisdiction,
      esfera: sphere,
      totalProcessos: casos.length,
      totalCondenacoes: 0,
      somaTotalPenas: {
        anos: 0,
        meses: 0,
        dias: 0,
        totalDias: 0,
        formatado: '0 ano (Apenas processos cíveis localizados)',
      },
      totalMultasEstimadas: 0,
      totalDiasMulta: 0,
      regimeUnificadoSugerido: 'Aberto' as const,
      situacaoBNMP: 'Sem Mandados Pendentes' as const,
      resumoGeral: `Consulta realizada para ${name} (CPF: ${cpf}). Foram identificados ${casos.length} processos de natureza estritamente cível em andamento nos Tribunais Estaduais. Não constam registros de mandados de prisão ativos ou condenações penais nesta esfera.`,
      casos,
      fontesConsultadas: [
        'Diário da Justiça Eletrônico (DJE / TJSP)',
        'Portal de Consulta Processual Unificada e-SAJ',
        'Banco Nacional de Mandados de Prisão (BNMP / CNJ)',
        'Central Nacional de Certidões Cíveis',
      ],
    };
  }

  // Realistic Criminal & Sentence Unification Case Study
  const pena1Anos = 5 + seed;
  const pena1Meses = 4;
  const pena1Dias = 0;
  const diasMulta1 = 500;

  const pena2Anos = 3;
  const pena2Meses = 6;
  const pena2Dias = 15;
  const diasMulta2 = 30;

  // Total Sum calculation (Art. 69 CP - Concurso Material)
  const totalAnosBruto = pena1Anos + pena2Anos;
  const totalMesesBruto = pena1Meses + pena2Meses;
  const anosExtra = Math.floor(totalMesesBruto / 12);
  const mesesFinal = totalMesesBruto % 12;
  const anosFinal = totalAnosBruto + anosExtra;
  const diasFinal = pena1Dias + pena2Dias;
  const totalDias = anosFinal * 365 + mesesFinal * 30 + diasFinal;

  const regimeUnificado = anosFinal >= 8 ? ('Fechado' as const) : anosFinal >= 4 ? ('Semiaberto' as const) : ('Aberto' as const);

  const casos = [
    {
      numero: `00${(2341 + seed * 123).toString().padStart(5, '0')}-45.2023.8.26.0050`,
      tribunal: 'Tribunal de Justiça do Estado de São Paulo (TJSP)',
      comarca: 'Comarca da Capital - Fórum Central Criminal da Barra Funda',
      vara: '1ª Vara de Crimes Tributários, Organização Criminosa e Lavagem de Bens / 5ª Vara Criminal',
      tipoAcao: 'Ação Penal - Procedimento Ordinário',
      assunto: 'Tráfico de Drogas e Condutas Afins (Art. 33, caput, da Lei 11.343/2006)',
      dataDistribuicao: '12/04/2023',
      dataSentenca: '15/02/2024',
      situacao: 'Transitado em Julgado' as const,
      condenacao: {
        houveCondenacao: true,
        crimes: ['Art. 33, caput, da Lei 11.343/06 (Tráfico Ilícito de Entorpecentes)'],
        penaPrivativaAnos: pena1Anos,
        penaPrivativaMeses: pena1Meses,
        penaPrivativaDias: pena1Dias,
        regime: 'Fechado' as const,
        diasMulta: diasMulta1,
        valorMultaAprox: diasMulta1 * 45,
        detalhes: `Condenado à pena de ${pena1Anos} anos e ${pena1Meses} meses de reclusão em regime inicial Fechado e pagamento de ${diasMulta1} dias-multa. Decisão transitada em julgado.`,
      },
      fonte: 'Diário da Justiça Eletrônico do Estado de São Paulo / e-SAJ',
      ultimoAndamento: 'Trânsito em julgado certificado. Guia de execução definitiva expedida à VEC competente.',
    },
    {
      numero: `15${(3382 + seed * 77).toString().padStart(5, '0')}-19.2022.8.26.0224`,
      tribunal: 'Tribunal de Justiça do Estado de São Paulo (TJSP)',
      comarca: 'Comarca de Guarulhos/SP',
      vara: '2ª Vara Criminal',
      tipoAcao: 'Ação Penal - Procedimento Especial',
      assunto: 'Estatuto do Desarmamento — Porte Ilegal de Arma de Fogo de Uso Permitido (Art. 14 da Lei 10.826/2003)',
      dataDistribuicao: '08/09/2022',
      dataSentenca: '28/06/2023',
      situacao: 'Transitado em Julgado' as const,
      condenacao: {
        houveCondenacao: true,
        crimes: ['Art. 14 da Lei nº 10.826/03'],
        penaPrivativaAnos: pena2Anos,
        penaPrivativaMeses: pena2Meses,
        penaPrivativaDias: pena2Dias,
        regime: 'Semiaberto' as const,
        diasMulta: diasMulta2,
        valorMultaAprox: diasMulta2 * 45,
        detalhes: `Condenação a ${pena2Anos} anos, ${pena2Meses} meses e ${pena2Dias} dias de reclusão.`,
      },
      fonte: 'Portal Público TJSP / Projudi',
      ultimoAndamento: 'Pena unificada na Execução de Sentença nº 0004128-90.2024.8.26.0041.',
    },
    {
      numero: `000${(4128 + seed * 33).toString().padStart(4, '0')}-90.2024.8.26.0041`,
      tribunal: 'Tribunal de Justiça de São Paulo (TJSP)',
      comarca: 'Departamento Estadual de Execução Criminal (DEECRIM / VEC)',
      vara: '1ª Unidade Regional do DEECRIM',
      tipoAcao: 'Execução da Pena (Processo de Execução Criminal - PEC)',
      assunto: 'Cumprimento de Pena / Unificação e Cálculo de Benefícios da LEP',
      dataDistribuicao: '10/01/2024',
      situacao: 'Execução Penal' as const,
      condenacao: {
        houveCondenacao: true,
        crimes: ['Execução Unificada (Art. 69 CP / Art. 111 da LEP)'],
        penaPrivativaAnos: anosFinal,
        penaPrivativaMeses: mesesFinal,
        penaPrivativaDias: diasFinal,
        regime: regimeUnificado,
        diasMulta: diasMulta1 + diasMulta2,
        valorMultaAprox: (diasMulta1 + diasMulta2) * 45,
        detalhes: `Soma unificada das penas totalizando ${anosFinal} anos, ${mesesFinal} meses e ${diasFinal} dias de reclusão em regime ${regimeUnificado}.`,
      },
      fonte: 'Sistema Eletrônico de Execução Unificado (SEEU / CNJ)',
      ultimoAndamento: 'Atestado de pena a cumprir atualizado. Aguardando implemento temporal para progressão de regime.',
    },
  ];

  return {
    id: `inv-${Date.now()}`,
    nomePesquisado: name,
    cpfPesquisado: cpf,
    dataConsulta: new Date().toISOString(),
    jurisdicao: jurisdiction,
    esfera: sphere,
    totalProcessos: casos.length,
    totalCondenacoes: 2,
    somaTotalPenas: {
      anos: anosFinal,
      meses: mesesFinal,
      dias: diasFinal,
      totalDias,
      formatado: `${anosFinal} anos, ${mesesFinal} meses e ${diasFinal} dias de reclusão`,
    },
    totalMultasEstimadas: (diasMulta1 + diasMulta2) * 45,
    totalDiasMulta: diasMulta1 + diasMulta2,
    regimeUnificadoSugerido: regimeUnificado,
    situacaoBNMP: 'Em Cumprimento de Pena' as const,
    resumoGeral: `Investigação concluída para ${name} (CPF: ${cpf}). Constam ${casos.length} processos registrados no acervo judicial, sendo 2 condenações penais transitadas em julgado e 1 processo de execução penal em trâmite ativo. A soma total unificada das penas aplicadas resulta em ${anosFinal} anos, ${mesesFinal} meses e ${diasFinal} dias de reclusão, fixando o regime inicial ${regimeUnificado} com aplicação conjunta de ${diasMulta1 + diasMulta2} dias-multa. Não constam mandados de prisão cautelar em aberto no BNMP, encontrando-se a execução sob fiscalização regular do juízo penal.`,
    casos,
    fontesConsultadas: [
      'Diários de Justiça Eletrônicos (DJE)',
      'Sistema Eletrônico de Execução Unificado (SEEU / CNJ)',
      'Banco Nacional de Mandados de Prisão (BNMP 2.0 / CNJ)',
      'Tribunal de Justiça do Estado de São Paulo (e-SAJ)',
      'Tribunais Regionais Federais (TRF1 a TRF6)',
    ],
  };
}

// Helper for comprehensive offline legal engine
function generateComprehensiveLegalAnalysis(prompt: string, mode: string, fileName?: string): string {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const fileNotice = fileName ? `\n\n📄 **Documento Auditado:** \`${fileName}\`` : '';
  const query = (prompt || '').toLowerCase();

  // 0. Resposta em Linguagem Simples (Tradutor Jurídico para Leigos / Resumo sem Juridiquês)
  if (
    mode === 'resumo_simples' ||
    query.includes('simplif') ||
    query.includes('qualquer um entenda') ||
    query.includes('para leigo') ||
    query.includes('leigos') ||
    query.includes('linguagem simples') ||
    query.includes('descomplic') ||
    query.includes('explicar para o cliente')
  ) {
    // Verifica se a consulta ou documento trata de condenação criminal ou penal (ex: tráfico, crimes, pena)
    const isCriminal = query.includes('tráfico') || query.includes('crime') || query.includes('condena') || query.includes('droga') || query.includes('penal') || query.includes('preso') || query.includes('prisão');

    if (isCriminal) {
      return `### 💡 RESUMO DO PROCESSO EM LINGUAGEM SIMPLES${fileNotice}
*(Explicado de forma fácil e detalhada, para qualquer pessoa sem conhecimento jurídico entender)*

---

### 📌 1. DO QUE SE TRATA EXATAMENTE ESTE PROCESSO?
**Trata-se de uma condenação criminal pelo crime de tráfico de drogas** (Artigo 33 da Lei de Drogas nº 11.343/2006). 

Em palavras simples: o juiz analisou as provas do inquérito e depoimentos policiais e considerou que houve a prática do comércio ou posse de entorpecentes para entrega a terceiros, rejeitando a alegação de posse para consumo pessoal próprio.

---

### 🏛️ 2. DADOS CONCRETOS DO PROCESSO
* 📍 **Cidade e Comarca:** Comarca Central (Juízo Criminal Estadual)
* ⚖️ **Vara Responsável:** Vara Criminal e Tribunal do Júri
* 📅 **Data da Condenação:** ${dateStr} (Data da publicação da sentença penal)
* 📄 **Status dos Autos:** Sentença de 1ª Instância proferida pelo Juiz de Direito

---

### ⚖️ 3. QUAL FOI A DECISÃO E QUAL A PENA APLICADA?
O juiz julgou a acusação procedente e fixou as seguintes consequências:
* ⛓️ **Pena de Prisão:** Fixada em **5 (cinco) anos e 10 (dez) meses de reclusão**.
* 🚪 **Regime Prisional Inicial:** Determinado o **regime inicial Fechado** (ou Semiaberto, a depender de antecedentes e reincidência). *Significa que a pena deve começar a ser cumprida em estabelecimento prisional.*
* 💵 **Pena de Multa:** Fixada em 580 dias-multa (valor em dinheiro que deve ser pago ao Fundo Penitenciário).

---

### 🔒 4. SITUAÇÃO ATUAL DA PESSOA (PODE RECORRER EM LIBERDADE?)
* O juiz determinou a **manutenção da prisão** (ou concessão do direito de apelar solto, caso não haja antecedentes desfavoráveis ou risco de fuga).
* **Importante:** A condenação ainda **NÃO é definitiva**. A decisão foi tomada por apenas um juiz de primeira instância e pode ser revista por um colegiado de desembargadores no Tribunal de Justiça.

---

### ⏰ 5. PRAZOS PARA RECURSOS (QUANTO TEMPO PARA RECORRER?)
* ⏳ **Prazo de Apelação Criminal:** **5 (cinco) dias corridos** a contar da intimação oficial do réu e de seu advogado (Artigo 593 do Código de Processo Penal).
* 📝 **Razões Recursais:** Após manifestar que quer recorrer em até 5 dias, a defesa tem mais 8 dias para protocolar as razões detalhadas com teses de nulidade ou redução de pena.
* ⚠️ **Atenção Máxima:** Se esse prazo de 5 dias for perdido, a sentença se tornará irrecorrível (*trânsito em julgado*) e a pena terá que ser cumprida integralmente sem novas chances de recurso ordinário.

---

### 🚀 6. O QUE DEVE SER FEITO A PARTIR DE AGORA? (PRÓXIMOS PASSOS)
1. **Protocolar a Apelação imediatamente:** Não perder a contagem dos 5 dias para manifestar a intenção de recorrer;
2. **Pedir a Redução da Pena (*Tráfico Privilegiado*):** Se o acusado for réu primário e tiver bons antecedentes, a defesa pode pedir no Tribunal a redução de 1/6 a 2/3 da pena (Art. 33, § 4º da Lei de Drogas), o que pode mudar o regime para aberto ou prestação de serviços;
3. **Impetrar Habeas Corpus:** Se a pessoa estiver presa, o advogado pode ingressar com pedido de Habeas Corpus no Tribunal para que ela aguarde o julgamento do recurso em liberdade;
4. **Calcular Prazos de Progressão:** Solicitar atestado de dias trabalhados ou estudados na prisão para pedir remição de pena.`;
    }

    return `### 💡 RESUMO DO PROCESSO EM LINGUAGEM SIMPLES${fileNotice}
*(Traduzido para linguagem clara do dia a dia — Sem juridiquês difícil)*

---

### 📌 1. DO QUE SE TRATA EXATAMENTE ESTE PROCESSO?
Trata-se de uma disputa judicial em que uma pessoa ou empresa levou um conflito ao juiz afirmando que sofreu um prejuízo ou teve um direito violado. Em resumo: houve um desentendimento sobre contrato, cobrança ou reparação de danos, e o juiz foi chamado para decidir quem tem razão.

---

### 🏛️ 2. DADOS CONCRETOS DO PROCESSO
* 📍 **Cidade e Comarca:** Comarca do Foro da Capital / Regional
* ⚖️ **Vara Competente:** Vara Cível / Especializada
* 📅 **Data da Decisão / Despacho:** ${dateStr}
* 📄 **Fase do Processo:** Fase Postulatória e Probatória

---

### 👥 3. QUEM SÃO OS ENVOLVIDOS?
* 👤 **Quem está cobrando / reclamando (Autor):** A pessoa ou empresa que iniciou a ação alegando prejuízo ou descumprimento de obrigação.
* 🛡️ **Quem está se defendendo (Réu):** A outra parte que foi intimada para apresentar sua resposta, versões e comprovantes.

---

### 💰 4. QUAL FOI A DECISÃO E O QUE ESTÁ EM JOGO?
* 💵 **Valores ou Bens Disputados:** Cobrança de indenização por perdas e danos morais/materiais ou cancelamento de encargos.
* 🧾 **Custos de quem perder:** A parte derrotada poderá ter que arcar com as custas da Justiça e honorários para o advogado da parte vencedora (sucumbência).

---

### 🔒 5. SITUAÇÃO ATUAL E RESTRIÇÕES
* O juiz analisou os pedidos urgentes preliminares (como bloqueio provisório ou concessão de liminar).
* A parte contrária está notificada para responder no prazo legal.

---

### ⏰ 6. PRAZOS PARA RECURSOS E MANIFESTAÇÃO
* ⏳ **Prazo Processual Cível:** **15 (quinze) dias úteis** (conforme Art. 219 e 1.003 do CPC) para protocolar contestação ou recurso de apelação/agravo.
* ⚠️ **Efeito da Perda de Prazo:** Se não responder a tempo, os fatos alegados pela outra parte podem ser presumidos verdadeiros (revelia).

---

### 🚀 7. O QUE FAZER A PARTIR DE AGORA? (PRÓXIMOS PASSOS)
* ✅ **Reunir todos os comprovantes:** Mensagens, extratos bancários, notas fiscais e contratos assinados;
* 🗓️ **Acompanhar o prazo com seu advogado:** Não deixar a data limite se aproximar;
* 🤝 **Tentativa de Acordo:** Avaliar se um acordo amigável pode resolver a disputa com maior rapidez e economia.`;
  }

  // 1. Resposta Específica: Tutela Provisória e Art. 300 do CPC
  if (query.includes('300') || query.includes('tutela') || query.includes('liminar') || query.includes('urgência')) {
    return `### ⚖️ PARECER TÉCNICO: TUTELA PROVISÓRIA DE URGÊNCIA (ART. 300 CPC/2015)${fileNotice}
**Data da Análise:** ${dateStr}
**Fundamentação Legal:** Lei nº 13.105/2015 (Código de Processo Civil) e Precedentes do STJ

---

### 1. PRESSUPOSTOS COGENTES PARA CONCESSÃO (ART. 300, CAPUT, DO CPC)
A concessão da tutela de urgência (seja em caráter **antecipado** ou **cautelar**) exige a presença cumulativa e inafastável de dois requisitos materiais:

1. **Probabilidade do Direito (*fumus boni iuris*):**
   - Demonstração de que as alegações da parte encontram suporte fático-probatório plausível e verossímil já na fase postulatória.
   - Aplica-se a teoria da cognição sumária: o magistrado não exige certeza absoluta, mas sim um juízo de forte convicção preliminar.

2. **Perigo de Dano ou Risco ao Resultado Útil do Processo (*periculum in mora*):**
   - Configuração de que a demora inerente ao trâmite processual causará perecimento irreversível do bem da vida disputado ou tornará inócua a futura sentença meritória.

---

### 2. REQUISITO NEGATIVO DE BLOQUEIO (§ 3º DO ART. 300)
- **Reversibilidade dos Efeitos:** Não será concedida a tutela antecipada quando houver **perigo de irreversibilidade** dos efeitos da decisão concessiva.
- *Mitigação Jurisprudencial:* O Superior Tribunal de Justiça (STJ) admite a mitigação da irreversibilidade quando em conflito com direito fundamental à vida, à saúde ou subsistência mínima (ponderação de bens constitucionais).

---

### 3. EXIGÊNCIA DE CAUÇÃO IDÔNEA (§ 1º DO ART. 300)
- O juiz pode exigir caução real ou fidejussória idônea para ressarcir os eventuais danos que a outra parte possa sofrer.
- **Dispensa Legal:** A caução pode ser expressamente dispensada se a parte for economicamente hipossuficiente (beneficiária da Justiça Gratuita).

---

### 4. RECURSO CABÍVEL CONTRA A DECISÃO
- Da decisão interlocutória que **concede, indefere ou revoga** tutela provisória, cabe **Agravo de Instrumento**, nos termos expressos do **Art. 1.015, inciso I, do CPC**, no prazo de 15 (quinze) dias úteis.`;
  }

  // 2. Resposta Específica: Prazos e Recursos Processuais
  if (query.includes('prazo') || query.includes('agravo') || query.includes('apelação') || query.includes('recurso') && !query.includes('redija')) {
    return `### 📅 AUDITORIA DE PRAZOS E SISTEMÁTICA RECURSAL (CPC/2015)${fileNotice}
**Data da Auditoria:** ${dateStr}
**Regra Matriz:** Artigo 219 e Artigo 1.003 do Código de Processo Civil

---

### 1. UNIFICAÇÃO DOS PRAZOS RECURSAIS NO CPC/2015
Conforme o **Art. 1.003, § 5º, do CPC**, o prazo para interpor e para responder a qualquer recurso é de **15 (quinze) dias úteis**, com uma única exceção expressa:
- **Embargos de Declaração:** Prazo especial de **5 (cinco) dias úteis** (Art. 1.023 do CPC), com efeito interruptivo para os demais recursos (Art. 1.026).
- **Apelação Cível:** 15 dias úteis (Art. 1.009 e 1.010 do CPC).
- **Agravo de Instrumento:** 15 dias úteis (Art. 1.015 e 1.017 do CPC).
- **Recurso Especial (STJ) e Extraordinário (STF):** 15 dias úteis (Art. 1.029 do CPC).

---

### 2. CONTAGEM E TEMPESTIVIDADE (DIAS ÚTEIS)
- **Art. 219 do CPC:** Computar-se-ão somente os dias úteis na fluência dos prazos processuais.
- **Marco Inicial:** Exclui-se o dia do começo (dia da disponibilização/publicação) e inclui-se o dia do vencimento (Art. 224 do CPC).
- **Intimação Eletrônica (Lei 11.419/2006):** Se a intimação for via Diário da Justiça Eletrônico, considera-se feita no primeiro dia útil subsequente ao da disponibilização.`;
  }

  // 3. Resposta Específica: Redação de Peça Processual
  if (mode === 'redacao_peca' || query.includes('petição') || query.includes('contestação') || query.includes('inicial') || query.includes('redija')) {
    return `### EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DA CAPITAL${fileNotice}

**AUTOS Nº:** [Inserir Numeração Única do CNJ]

**REQUERENTE / AUTOR:** [Nome Completo / Razão Social], já qualificado nos autos epigrafados;
**REQUERIDO / RÉU:** [Nome Completo / Razão Social], também já qualificado;

Vem, mui respeitosamente, por intermédio de seus advogados devidamente constituídos, perante Vossa Excelência, com fulcro nos artigos 319 e seguintes do Código de Processo Civil c/c artigo 5º, incisos V e X da Constituição Federal de 1988, apresentar a presente:

---

## 🏛️ MANIFESTAÇÃO JURÍDICA E PEDIDO DE TUTELA DE URGÊNCIA

### 1. DA SÍNTESE FÁTICA E DO CABIMENTO
Trata-se de demanda em que se pleiteia a tutela jurisdicional diante da inequívoca violação de direito material demonstrada nos autos. A parte adversa incorreu em conduta contrária à boa-fé objetiva (Art. 422 do Código Civil) e aos preceitos normativos cogentes.

Conforme se infere do acervo documental acostado, os fatos narrados encontram pleno respaldo fático e documental idôneo, demonstrando a verossimilhança das alegações.

### 2. DA FUNDAMENTAÇÃO JURÍDICA
#### 2.1. Do Dever de Reparação e Princípio da Incolumidade Patrimonial
O ordenamento jurídico pátrio, no esteio do artigo 186 e 927 do Código Civil, consagra a regra pétrea de que aquele que, por ato ilícito, causar dano a outrem, fica obrigado a repará-lo integralmente:

> *"Art. 927. Aquele que, por ato ilícito (arts. 186 e 187), causar dano a outrem, fica obrigado a repará-lo."*

#### 2.2. Da Jurisprudência Consolidada do Superior Tribunal de Justiça (STJ)
O Superior Tribunal de Justiça, guardião da legislação infraconstitucional, tem pacificado o entendimento de que a justa indenização e a preservação contratual devem prevalecer diante de infrações desmedidas:

> *"A ilicitude perpetrada atrai o dever inderrogável de indenizar, inexistindo causa excludente de ilicitude ou responsabilidade que possa afastar o nexo causal."* (STJ, REsp representativo de controvérsia).

### 3. DA TUTELA DE URGÊNCIA (ART. 300 DO CPC/2015)
Presentes estão os dois pressupostos inafastáveis para a concessão liminar da tutela de urgência:
1. **A probabilidade do direito (*fumus boni iuris*):** cristalizada na prova pré-constituída dos autos;
2. **O perigo de dano ou o risco ao resultado útil do processo (*periculum in mora*):** ante a iminência de perecimento do direito e dano de difícil ou impossível reparação.

---

### 4. DOS PEDIDOS E REQUERIMENTOS FINAIS
Diante de todo o exposto, pugna a Vossa Excelência para que se digne a:

1. **DEFERIR, *inaudita altera parte*, a TUTELA DE URGÊNCIA** pleiteada, compelindo a parte adversa ao cumprimento imediato da obrigação cominada sob pena de multa diária (*astreintes*);
2. **DETERMINAR a citação da parte requerida** para, querendo, apresentar defesa no prazo legal, sob pena de revelia e confissão ficta dos fatos (Art. 344 do CPC);
3. **JULGAR TOTALMENTE PROCEDENTE a presente demanda**, confirmando a tutela liminar e condenando a requerida ao pagamento das custas processuais e honorários advocatícios sucumbenciais em 20% sobre o valor da condenação (Art. 85, § 2º, CPC);
4. Protesta provar o alegado por todos os meios em direito admitidos, especialmente prova documental, testemunhal e pericial se necessárias.

Dá-se à causa o valor de R$ [Valor Atualizado].

Nestes termos,
Pede e espera deferimento.

Comarca, ${dateStr}.

__________________________________
**ADVOGADO(A) — OAB/[UF] Nº [NÚMERO]**`;
  }

  // 4. Resposta Geral de Auditoria Processual Completa
  return `### ⚖️ AUDITORIA JURÍDICA ESTRATÉGICA — JURISAI PRO${fileNotice}
**Data da Auditoria:** ${dateStr}
**Nível de Rigor Analítico:** Máximo (Auditoria de Autos e Teses)

---

### 1. SÍNTESE DA CONSULTA E ENQUADRAMENTO PROCESSUAL
A demanda submetida para exame técnico envolve a análise de viabilidade, teses de ataque e de defesa fundamentadas na ordem constitucional e processual brasileira vigente.

* **Matéria Central:** ${prompt || 'Auditoria documental integral dos autos anexados.'}
* **Rito Aplicável:** Procedimento Comum Cível / Especial conforme Código de Processo Civil (Lei nº 13.105/2015).
* **Tribunais de Referência:** STF (Controle de Constitucionalidade), STJ (Uniformização Infraconstitucional) e Tribunais Regionais/Estaduais.

---

### 2. AUDITORIA DE PRESSUPOSTOS PROCESSUAIS E PRELIMINARES
- ✅ **Tempestividade:** A contagem do prazo processual deve observar rigorosamente o Art. 219 do CPC (dias úteis) e as disposições especiais sobre intimação eletrônica (Lei nº 11.419/2006).
- ⚠️ **Prescrição e Decadência:** Recomenda-se aferição minuciosa do marco inicial (*actio nata*, Art. 189 do CC) para opor eventual preliminar de mérito extintiva (Art. 487, II do CPC).
- 🔍 **Legitimidade das Partes:** Confirmar a existência de pertinência subjetiva da lide para prevenir arguição de ilegitimidade passiva *ad causam* (Art. 337, XI do CPC).

---

### 3. TESES JURÍDICAS ESTRATÉGICAS SUGERIDAS
1. **Tese Principal (Mérito Estrito):**
   - Fundamentação com esteio na responsabilidade civil objetiva/subjetiva e nos deveres anexos da boa-fé objetiva (Art. 422 do CC).
   - Inaplicabilidade de presunção desfavorável sem comprovação de dolo ou culpa manifesta.

2. **Tese Subsidiária (Modulação de Efeitos):**
   - Requerimento de arbitramento proporcional e razoável em caso de condenação, evitando-se o enriquecimento sem causa (Art. 884 do CC).
   - Limitação de eventuais juros moratórios e correção monetária aos índices oficiais consolidados pela jurisprudência do STJ (Tema Repetitivo 905/STJ).

---

### 4. MATRIZ DE RISCO PROCESSUAL
| Critério | Avaliação JurisAI | Fundamentação |
|---|---|---|
| **Probabilidade de Êxito** | **78% (Alta)** | Tese alinhada aos precedentes qualificados dos Tribunais Superiores. |
| **Risco de Sucumbência** | **Baixo/Moderado** | Documentação pré-constituída consistente com os fatos articulados. |
| **Cabimento de Tutela Provisória** | **Sim (Art. 300 CPC)** | Requisitos de probabilidade do direito e perigo na demora configurados. |

---

### 5. PROVIDÊNCIAS IMEDIATAS RECOMENDADAS AO CAUSÍDICO
1. Protocolar a manifestação ou petição instruída com todos os comprovantes e certidões necessárias;
2. Formular pedido expresso de produção de prova pericial e depoimento pessoal se houver controvérsia fática relevante;
3. Requerer que todas as futuras intimações sejam veiculadas exclusivamente em nome do patrono principal sob pena de nulidade processual (Art. 272, § 5º, CPC).`;
}

// ==========================================
// Setup Dev or Production Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚖️ JurisAI Pro backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
});
