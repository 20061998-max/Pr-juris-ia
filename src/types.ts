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
  expiresAt: string;
  daysLeft?: number;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  fileName?: string;
  fileType?: string;
  mode?: string;
}

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  base64?: string;
}

export interface ApenadoReview {
  id: string;
  data: string;
  conduta: 'otima' | 'boa' | 'regular' | 'ma';
  diasRemidos: number;
  observacoes: string;
  parecerComissao?: string;
  aptoProgressao: boolean;
}

export interface PenalCalculation {
  id: string;
  nomeApenado: string;
  numeroProcesso?: string;
  comarca?: string;
  anosPena: number;
  mesesPena: number;
  diasPena: number;
  dataInicio: string; // YYYY-MM-DD
  percentualProgressao: number; // e.g. 16, 20, 25, 30, 40, 50, 60, 70
  rotuloFração: string; // ex: "16% (Crime comum sem violência - Primário)"
  diasTrabalho: number;
  horasEstudo: number;
  livrosLidos: number;
  diasRemicaoTotal: number;
  condutaCarceraria: 'otima' | 'boa' | 'regular' | 'ma';
  temFaltaGrave: boolean;
  dataUltimaFaltaGrave?: string;
  anotacoesRevisao: string;
  historicoRevisoes: ApenadoReview[];
  dataCalculo: string;
}

export interface CourtCaseDetail {
  numero: string;
  tribunal: string;
  comarca: string;
  vara: string;
  tipoAcao: string;
  assunto: string;
  dataDistribuicao: string;
  dataSentenca?: string;
  situacao: 'Em Andamento' | 'Transitado em Julgado' | 'Em Grau de Recurso' | 'Execução Penal' | 'Arquivado';
  condenacao?: {
    houveCondenacao: boolean;
    crimes: string[];
    penaPrivativaAnos: number;
    penaPrivativaMeses: number;
    penaPrivativaDias: number;
    regime: 'Fechado' | 'Semiaberto' | 'Aberto' | 'Restritiva de Direitos' | 'Multa';
    diasMulta?: number;
    valorMultaAprox?: number;
    detalhes: string;
  };
  fonte: string;
  linkPublico?: string;
  ultimoAndamento: string;
}

export interface ProcessInvestigationResult {
  id: string;
  nomePesquisado: string;
  cpfPesquisado: string;
  dataConsulta: string;
  jurisdicao: string;
  esfera: string;
  totalProcessos: number;
  totalCondenacoes: number;
  somaTotalPenas: {
    anos: number;
    meses: number;
    dias: number;
    totalDias: number;
    formatado: string;
  };
  totalMultasEstimadas: number;
  totalDiasMulta: number;
  regimeUnificadoSugerido: 'Fechado' | 'Semiaberto' | 'Aberto';
  situacaoBNMP: 'Sem Mandados Pendentes' | 'Mandado de Prisão Ativo (Alerta)' | 'Em Cumprimento de Pena' | 'Alvará de Soltura Expedido';
  resumoGeral: string;
  casos: CourtCaseDetail[];
  fontesConsultadas: string[];
}

