import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Scale,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  Building2,
  Clock,
  Printer,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Calculator,
  RotateCcw,
  Sparkles,
  History,
  FileCheck,
  Briefcase,
} from 'lucide-react';
import { ProcessInvestigationResult, CourtCaseDetail } from '../types';
import { formatCpf } from '../utils/cpf';

interface ProcessSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferToPenalCalculator?: (data: {
    apenadoName: string;
    years: number;
    months: number;
    days: number;
    numeroProcesso?: string;
  }) => void;
}

export const ProcessSearchModal: React.FC<ProcessSearchModalProps> = ({
  isOpen,
  onClose,
  onTransferToPenalCalculator,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
  const [searchName, setSearchName] = useState('');
  const [searchCpf, setSearchCpf] = useState('');
  const [jurisdiction, setJurisdiction] = useState('nacional');
  const [sphere, setSphere] = useState<'todos' | 'criminal' | 'civel'>('todos');

  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [result, setResult] = useState<ProcessInvestigationResult | null>(null);
  const [historyList, setHistoryList] = useState<ProcessInvestigationResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // Fetch recent search history on modal open
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/investigation/history');
      const data = await res.json();
      if (data.success && data.history) {
        setHistoryList(data.history);
      }
    } catch {
      // Ignore
    }
  };

  const handleCpfInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setSearchCpf(formatCpf(raw));
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchName.trim()) {
      alert('Por favor, informe ao menos o Nome Completo para a consulta.');
      return;
    }

    setLoading(true);
    setResult(null);

    // Staged loading feedback for realism
    setLoadingStage('Conectando aos Diários Oficiais e Portais Públicos dos Tribunais...');
    const t1 = setTimeout(() => {
      setLoadingStage('Consultando acervos de 1ª e 2ª Instâncias e BNMP (Mandados de Prisão)...');
    }, 1800);
    const t2 = setTimeout(() => {
      setLoadingStage('Auditando condenações, dosimetrias e calculando a soma total das penas...');
    }, 3600);

    try {
      const res = await fetch('/api/investigation/process-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: searchName.trim(),
          cpf: searchCpf.trim(),
          jurisdiction,
          sphere,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setResult(data.result);
        fetchHistory();
      } else {
        alert(data.message || 'Falha ao realizar consulta processual.');
      }
    } catch {
      alert('Erro ao comunicar com o servidor de inteligência processual.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyForWhatsapp = () => {
    if (!result) return;
    const lines = [
      `🏛️ *DOSSIÊ PROCESSUAL PÚBLICO — JURISAI PRO*`,
      `👤 *Pesquisado:* ${result.nomePesquisado}`,
      `📄 *CPF:* ${result.cpfPesquisado}`,
      `📅 *Data da Consulta:* ${new Date(result.dataConsulta).toLocaleDateString('pt-BR')}`,
      `📊 *Total de Processos Localizados:* ${result.totalProcessos}`,
      `⚖️ *Condenações Penais Identificadas:* ${result.totalCondenacoes}`,
      `⏳ *SOMA TOTAL DAS PENAS (Art. 69 CP):* ${result.somaTotalPenas.formatado}`,
      `🏢 *Regime Inicial Unificado:* ${result.regimeUnificadoSugerido}`,
      `🚨 *Situação no BNMP:* ${result.situacaoBNMP}`,
      `💰 *Total de Dias-Multa:* ${result.totalDiasMulta} (aprox. R$ ${result.totalMultasEstimadas.toLocaleString('pt-BR')})`,
      ``,
      `*DETALHAMENTO DOS PROCESSOS:*`,
      ...result.casos.map(
        (c: CourtCaseDetail, idx: number) =>
          `\n${idx + 1}. *Processo:* ${c.numero}\n   *Tribunal / Vara:* ${c.tribunal} — ${c.vara}\n   *Assunto / Crime:* ${c.assunto}\n   *Situação:* ${c.situacao}${
            c.condenacao?.houveCondenacao
              ? `\n   *Pena Fixada:* ${c.condenacao.penaPrivativaAnos}a, ${c.condenacao.penaPrivativaMeses}m (${c.condenacao.regime})`
              : ''
          }\n   *Último Andamento:* ${c.ultimoAndamento}`
      ),
      ``,
      `_Dossiê informativo emitido para fins de consultoria jurídica e cálculo de benefícios da LEP._`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  const handlePrintDossier = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dossiê Processual & Condenações — ${result.nomePesquisado}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; padding: 40px; color: #111; }
            h1 { text-align: center; font-size: 16pt; margin-bottom: 4px; text-transform: uppercase; }
            h2 { text-align: center; font-size: 12pt; font-weight: normal; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 8px; }
            .header-box { border: 1px solid #777; padding: 12px; margin-bottom: 20px; background: #fafafa; }
            .grid { display: table; width: 100%; margin-bottom: 15px; }
            .row { display: table-row; }
            .cell { display: table-cell; padding: 6px; border-bottom: 1px solid #ddd; }
            .cell-title { font-weight: bold; width: 35%; }
            .case-card { border: 1px solid #999; padding: 12px; margin-bottom: 15px; page-break-inside: avoid; }
            .case-title { font-weight: bold; font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
            .badge { font-weight: bold; padding: 2px 6px; border: 1px solid #333; font-size: 9pt; }
            .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #555; border-top: 1px solid #ccc; padding-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>JURISAI PRO — RELATÓRIO DE INTELIGÊNCIA PROCESSUAL PÚBLICA</h1>
          <h2>CERTIDÃO INFORMATIVA DE PROCESSOS, CONDENAÇÕES E SOMA DE PENAS</h2>

          <div class="header-box">
            <div class="grid">
              <div class="row"><div class="cell cell-title">NOME PESQUISADO:</div><div class="cell">${result.nomePesquisado}</div></div>
              <div class="row"><div class="cell cell-title">DOCUMENTO CPF:</div><div class="cell">${result.cpfPesquisado}</div></div>
              <div class="row"><div class="cell cell-title">DATA DA EMISSÃO:</div><div class="cell">${new Date(result.dataConsulta).toLocaleDateString('pt-BR')} às ${new Date(result.dataConsulta).toLocaleTimeString('pt-BR')}</div></div>
              <div class="row"><div class="cell cell-title">TOTAL DE PROCESSOS:</div><div class="cell"><strong>${result.totalProcessos} feito(s) localizado(s)</strong></div></div>
              <div class="row"><div class="cell cell-title">CONDENAÇÕES PENAIS:</div><div class="cell"><strong>${result.totalCondenacoes} condenação(ões)</strong></div></div>
              <div class="row"><div class="cell cell-title">SOMA TOTAL DAS PENAS (ART. 69 CP):</div><div class="cell"><strong style="font-size: 12pt;">${result.somaTotalPenas.formatado}</strong></div></div>
              <div class="row"><div class="cell cell-title">REGIME UNIFICADO INICIAL:</div><div class="cell"><strong>Regime ${result.regimeUnificadoSugerido}</strong></div></div>
              <div class="row"><div class="cell cell-title">SITUAÇÃO NO BNMP:</div><div class="cell">${result.situacaoBNMP}</div></div>
              <div class="row"><div class="cell cell-title">MULTAS CUMULADAS:</div><div class="cell">${result.totalDiasMulta} dias-multa (aprox. R$ ${result.totalMultasEstimadas.toLocaleString('pt-BR')})</div></div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="text-transform: uppercase; font-size: 11pt; border-bottom: 1px solid #555; padding-bottom: 3px;">Síntese Executiva da Situação Jurídica:</h3>
            <p style="text-align: justify;">${result.resumoGeral}</p>
          </div>

          <h3 style="text-transform: uppercase; font-size: 11pt; border-bottom: 1px solid #555; padding-bottom: 3px;">Relação Individualizada dos Feitos Localizados:</h3>

          ${result.casos
            .map(
              (c: CourtCaseDetail, i: number) => `
            <div class="case-card">
              <div class="case-title">Feito nº ${i + 1}: ${c.numero} — ${c.situacao}</div>
              <div><strong>Tribunal / Foro:</strong> ${c.tribunal} — ${c.comarca}</div>
              <div><strong>Juízo / Vara:</strong> ${c.vara}</div>
              <div><strong>Classe Processual:</strong> ${c.tipoAcao}</div>
              <div><strong>Objeto / Tipificação:</strong> ${c.assunto}</div>
              ${
                c.condenacao?.houveCondenacao
                  ? `<div style="margin-top: 5px; background: #f0f0f0; padding: 6px; border-left: 3px solid #333;">
                      <strong>DISPOSITIVO DA CONDENAÇÃO:</strong><br>
                      Pena Privativa de Liberdade: <strong>${c.condenacao.penaPrivativaAnos} anos, ${c.condenacao.penaPrivativaMeses} meses e ${c.condenacao.penaPrivativaDias} dias</strong> (Regime ${c.condenacao.regime}).<br>
                      Sanção Pecuniária: ${c.condenacao.diasMulta || 0} dias-multa.<br>
                      <em>${c.condenacao.detalhes}</em>
                     </div>`
                  : ''
              }
              <div style="margin-top: 6px; font-size: 10pt;"><strong>Último Andamento Registrado:</strong> ${c.ultimoAndamento}</div>
              <div style="font-size: 9pt; color: #666; margin-top: 4px;">Fonte Oficial: ${c.fonte} | Distribuído em: ${c.dataDistribuicao}</div>
            </div>
          `
            )
            .join('')}

          <div class="footer">
            Dossiê emitido via JurisAI Pro — Sistema de Inteligência Jurídica & Auditoria Forense.<br>
            Fontes: ${result.fontesConsultadas.join(' • ')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleSendToCalculator = () => {
    if (!result || !onTransferToPenalCalculator) return;

    // Grab first execution case number or main case
    const execCase = result.casos.find((c: CourtCaseDetail) => c.situacao === 'Execução Penal') || result.casos[0];

    onTransferToPenalCalculator({
      apenadoName: result.nomePesquisado,
      years: result.somaTotalPenas.anos,
      months: result.somaTotalPenas.meses,
      days: result.somaTotalPenas.dias,
      numeroProcesso: execCase?.numero,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#122232] text-white px-5 py-3.5 border-b-4 border-[#dfb76c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#dfb76c]/20 text-[#dfb76c] rounded border border-[#dfb76c]/40">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-[#dfb76c] tracking-wide flex items-center gap-2">
                Consulta Processual & Condenações Públicas
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans font-medium">
                  Rastreamento CNJ / DJE
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Pesquisa avançada por Nome e CPF em diários oficiais, tribunais, BNMP e cálculo de soma total de penas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'search' ? 'history' : 'search')}
              className="text-xs px-2.5 py-1 rounded border border-slate-600 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ver histórico de consultas"
            >
              <History className="w-3.5 h-3.5 text-[#dfb76c]" />
              <span className="hidden sm:inline">Histórico ({historyList.length})</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 space-y-5">
          {/* Form when on search tab */}
          {activeTab === 'search' && (
            <div className="bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-sm">
              <form onSubmit={handleExecuteSearch} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  {/* Nome Completo */}
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-bold text-[#122232] uppercase tracking-wider mb-1">
                      Nome Completo do Indivíduo / Parte *
                    </label>
                    <input
                      type="text"
                      required
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo de Oliveira Santos"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#dfb76c] focus:outline-none font-medium"
                    />
                  </div>

                  {/* CPF */}
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-[#122232] uppercase tracking-wider mb-1">
                      CPF (Opcional, refina a busca)
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={searchCpf}
                      onChange={handleCpfInput}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#dfb76c] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Jurisdição */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Abrangência da Pesquisa:
                    </label>
                    <select
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                    >
                      <option value="nacional">Brasil — Todos os Tribunais (Nacional)</option>
                      <option value="TJSP">TJSP — São Paulo (Estadual & VEC)</option>
                      <option value="TJRJ">TJRJ — Rio de Janeiro</option>
                      <option value="TJMG">TJMG — Minas Gerais</option>
                      <option value="TJBA">TJBA — Bahia</option>
                      <option value="TJPR">TJPR — Paraná</option>
                      <option value="TRF">Justiça Federal (TRF1 a TRF6)</option>
                      <option value="TRT">Justiça do Trabalho (TRTs)</option>
                    </select>
                  </div>

                  {/* Esfera */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Esfera de Interesse:
                    </label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setSphere('todos')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors cursor-pointer font-medium ${
                          sphere === 'todos'
                            ? 'bg-[#122232] text-[#dfb76c] border-[#122232]'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Completa (Todas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSphere('criminal')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors cursor-pointer font-medium ${
                          sphere === 'criminal'
                            ? 'bg-red-900 text-amber-200 border-red-950 shadow'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Criminal & LEP
                      </button>
                      <button
                        type="button"
                        onClick={() => setSphere('civel')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors cursor-pointer font-medium ${
                          sphere === 'civel'
                            ? 'bg-blue-900 text-white border-blue-950 shadow'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Cível / Trabalhista
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#dfb76c]" />
                    <span>Cruza Diários Eletrônicos, e-SAJ, Projudi, SEEU e BNMP 2.0</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !searchName.trim()}
                    className="bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#dfb76c] border-t-transparent"></div>
                        <span>Pesquisando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Rastrear Processos & Somas</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#122232] border-t-[#dfb76c]"></div>
              <div>
                <h4 className="text-sm font-bold text-[#122232] font-serif">
                  Varredura de Registros Judiciais em Andamento...
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">{loadingStage}</p>
              </div>
              <div className="w-48 h-1.5 bg-slate-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-[#dfb76c] animate-pulse rounded-full w-2/3"></div>
              </div>
            </div>
          )}

          {/* Search Result Display */}
          {result && !loading && activeTab === 'search' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Executive Metrics Header Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Processos */}
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Processos
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-serif text-[#122232]">
                      {result.totalProcessos}
                    </span>
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">Acervo localizado</span>
                </div>

                {/* Condenações Penais */}
                <div className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between bg-amber-50/40">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                    Condenações Penais
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-bold font-serif text-amber-950">
                      {result.totalCondenacoes}
                    </span>
                    <Scale className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-[10px] text-amber-800 mt-1">Sentenças julgadas</span>
                </div>

                {/* SOMA TOTAL DAS PENAS */}
                <div className="bg-white p-3.5 rounded-lg border border-[#dfb76c] shadow-xs flex flex-col justify-between bg-[#122232] text-white">
                  <span className="text-[10px] font-bold text-[#dfb76c] uppercase tracking-wider">
                    Soma Total das Penas (Art. 69 CP)
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold font-serif text-[#dfb76c] leading-tight">
                      {result.somaTotalPenas.anos}a {result.somaTotalPenas.meses}m {result.somaTotalPenas.dias}d
                    </span>
                    <Clock className="w-4 h-4 text-[#dfb76c]" />
                  </div>
                  <span className="text-[10px] text-slate-300 mt-1">
                    Regime: <strong>{result.regimeUnificadoSugerido}</strong>
                  </span>
                </div>

                {/* BNMP / Mandados */}
                <div
                  className={`p-3.5 rounded-lg border shadow-xs flex flex-col justify-between ${
                    result.situacaoBNMP.includes('Ativo')
                      ? 'bg-red-50 border-red-300 text-red-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Situação BNMP
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-bold leading-snug">
                      {result.situacaoBNMP}
                    </span>
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="text-[10px] mt-1 opacity-80">
                    {result.totalDiasMulta} dias-multa
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#dfb76c]" />
                    Dossiê para: <strong>{result.nomePesquisado}</strong> ({result.cpfPesquisado})
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botão de integração direta com a calculadora penal */}
                  {result.totalCondenacoes > 0 && onTransferToPenalCalculator && (
                    <button
                      onClick={handleSendToCalculator}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                      title="Importar anos, meses e dados para a Calculadora Penal LEP"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Calcular Progressão (LEP)</span>
                    </button>
                  )}

                  <button
                    onClick={handleCopyForWhatsapp}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Enviar resumo formatado para o WhatsApp"
                  >
                    {copiedWhatsapp ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado p/ WhatsApp!</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrintDossier}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-1.5 rounded font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Imprimir ou gerar PDF timbrado"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Dossiê</span>
                  </button>
                </div>
              </div>

              {/* Panorama Geral Didático */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2">
                <h4 className="text-xs font-bold text-[#122232] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                  <Briefcase className="w-4 h-4 text-[#dfb76c]" />
                  Parecer Executivo & Resumo Geral do Indivíduo
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {result.resumoGeral}
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Fontes verificadas: <strong>{result.fontesConsultadas.join(', ')}</strong>
                  </span>
                  <span>Data da consulta: {new Date(result.dataConsulta).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Lista Detalhada de Processos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#122232] uppercase tracking-wider flex items-center gap-1.5 font-serif">
                  <Scale className="w-4 h-4 text-[#dfb76c]" />
                  Processos & Condenações Detalhadas ({result.casos.length})
                </h4>

                {result.casos.map((caso: CourtCaseDetail, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-2.5 transition-all hover:border-slate-300"
                  >
                    {/* Top Row: Numero and Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#122232] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {caso.numero}
                        </span>
                        <button
                          onClick={() => handleCopyText(caso.numero, `proc-${idx}`)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title="Copiar número do processo"
                        >
                          {copiedId === `proc-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            caso.situacao === 'Transitado em Julgado'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : caso.situacao === 'Execução Penal'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : caso.situacao === 'Em Andamento'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {caso.situacao}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Tribunal / Comarca:</span>{' '}
                        <strong className="text-slate-800">{caso.tribunal}</strong> — {caso.comarca}
                      </div>
                      <div>
                        <span className="text-slate-500">Vara Judicial:</span>{' '}
                        <strong className="text-slate-800">{caso.vara}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Classe / Rito:</span>{' '}
                        <span className="text-slate-700 font-medium">{caso.tipoAcao}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Assunto / Crime:</span>{' '}
                        <strong className="text-red-900">{caso.assunto}</strong>
                      </div>
                    </div>

                    {/* Condenação Box if present */}
                    {caso.condenacao?.houveCondenacao && (
                      <div className="p-3 bg-red-50/70 border border-red-200 rounded-md text-xs space-y-1 text-red-950">
                        <div className="flex items-center justify-between font-bold text-red-900">
                          <span className="flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-red-700" />
                            Condenação Fixada na Sentença:
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-200 text-red-900 font-mono text-[11px]">
                            {caso.condenacao.penaPrivativaAnos} anos, {caso.condenacao.penaPrivativaMeses} meses ({caso.condenacao.regime})
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-700">
                          {caso.condenacao.detalhes}
                        </p>
                        {caso.condenacao.diasMulta && (
                          <div className="text-[11px] text-red-800 pt-0.5">
                            <strong>Sanção Pecuniária:</strong> {caso.condenacao.diasMulta} dias-multa (~R$ {caso.condenacao.valorMultaAprox?.toLocaleString('pt-BR') || 0})
                          </div>
                        )}
                      </div>
                    )}

                    {/* Andamento */}
                    <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 font-semibold">Último Andamento:</span>{' '}
                      <span className="text-slate-800">{caso.ultimoAndamento}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Fonte: {caso.fonte}</span>
                      <span>Distribuído em: {caso.dataDistribuicao}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#122232] uppercase tracking-wider font-serif">
                  Histórico de Consultas Processuais Realizadas ({historyList.length})
                </h4>
                <button
                  onClick={() => setActiveTab('search')}
                  className="text-xs text-[#122232] font-bold hover:underline cursor-pointer"
                >
                  + Nova Consulta
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-slate-500 text-xs">
                  Nenhuma consulta realizada recentemente. As buscas feitas ficarão arquivadas aqui.
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-[#122232]">{item.nomePesquisado}</strong>
                        <span className="font-mono text-slate-500">({item.cpfPesquisado})</span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        <strong>{item.totalProcessos} processos</strong> •{' '}
                        <strong>{item.totalCondenacoes} condenações</strong> • Soma total:{' '}
                        <strong className="text-amber-800">{item.somaTotalPenas.formatado}</strong>
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Realizada em {new Date(item.dataConsulta).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(item.dataConsulta).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setResult(item);
                          setSearchName(item.nomePesquisado);
                          setSearchCpf(item.cpfPesquisado === 'Não Informado / Busca por Nome' ? '' : item.cpfPesquisado);
                          setActiveTab('search');
                        }}
                        className="bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] px-3 py-1.5 rounded font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Abrir Dossiê
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-[#dfb76c]" />
            <span>JurisAI Pro — Investigação Processual & Unificação de Penas (Art. 69 CP)</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};
