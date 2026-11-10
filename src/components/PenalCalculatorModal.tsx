import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Calculator,
  Calendar,
  Clock,
  Award,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  FileText,
  User,
  Plus,
  Trash2,
  BookOpen,
  Briefcase,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { PenalCalculation, ApenadoReview } from '../types';

interface PenalCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialApenadoName?: string;
  initialYears?: number;
  initialMonths?: number;
  initialDays?: number;
}

// Frações da Lei 13.964/2019 (Pacote Anticrime) e Tradicionais
const FRACOES_LEP = [
  { percentual: 16, rotulo: '16% (ou 1/6) — Crime comum sem violência, primário (Art. 112, I)' },
  { percentual: 20, rotulo: '20% — Crime comum sem violência, reincidente (Art. 112, II)' },
  { percentual: 25, rotulo: '25% — Crime com violência ou grave ameaça, primário (Art. 112, III)' },
  { percentual: 30, rotulo: '30% — Crime com violência ou grave ameaça, reincidente (Art. 112, IV)' },
  { percentual: 40, rotulo: '40% (ou 2/5) — Crime hediondo ou equiparado (Tráfico), primário (Art. 112, V)' },
  { percentual: 50, rotulo: '50% — Hediondo c/ resultado morte (primário) / Org. Criminosa (Art. 112, VI)' },
  { percentual: 60, rotulo: '60% (ou 3/5) — Crime hediondo ou equiparado, reincidente (Art. 112, VII)' },
  { percentual: 70, rotulo: '70% — Crime hediondo c/ resultado morte, reincidente (Art. 112, VIII)' },
  { percentual: 12.5, rotulo: '12,5% (1/8) — Mulher gestante ou mãe de menores/deficientes (Art. 112, § 3º)' },
];

export const PenalCalculatorModal: React.FC<PenalCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialApenadoName = '',
  initialYears = 5,
  initialMonths = 0,
  initialDays = 0,
}) => {
  // Dados do Apenado
  const [nomeApenado, setNomeApenado] = useState(initialApenadoName || 'Dr(a). Apenado(a)');
  const [numeroProcesso, setNumeroProcesso] = useState('0001234-56.2026.8.26.0050');
  const [comarca, setComarca] = useState('Vara de Execuções Criminais da Capital');

  // Dosimetria da Pena
  const [anosPena, setAnosPena] = useState<number>(initialYears);
  const [mesesPena, setMesesPena] = useState<number>(initialMonths);
  const [diasPena, setDiasPena] = useState<number>(initialDays);

  useEffect(() => {
    if (isOpen) {
      if (initialApenadoName) setNomeApenado(initialApenadoName);
      if (initialYears !== undefined) setAnosPena(initialYears);
      if (initialMonths !== undefined) setMesesPena(initialMonths);
      if (initialDays !== undefined) setDiasPena(initialDays);
    }
  }, [isOpen, initialApenadoName, initialYears, initialMonths, initialDays]);

  // Data-Base e Fração
  const [dataInicio, setDataInicio] = useState<string>(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [percentualProgressao, setPercentualProgressao] = useState<number>(40); // 40% default (hediondo/tráfico primário)

  // Remição de Pena (Art. 126 LEP)
  const [diasTrabalho, setDiasTrabalho] = useState<number>(90); // 90 dias / 3 = 30 dias remidos
  const [horasEstudo, setHorasEstudo] = useState<number>(120); // 120 horas / 12 = 10 dias remidos
  const [livrosLidos, setLivrosLidos] = useState<number>(3); // 3 * 4 = 12 dias remidos
  const [outrosDiasRemicao, setOutrosDiasRemicao] = useState<number>(0);

  // Avaliação e Revisões do Apenado
  const [condutaCarceraria, setCondutaCarceraria] = useState<'otima' | 'boa' | 'regular' | 'ma'>('otima');
  const [temFaltaGrave, setTemFaltaGrave] = useState<boolean>(false);
  const [dataUltimaFaltaGrave, setDataUltimaFaltaGrave] = useState<string>('');
  const [anotacoesRevisao, setAnotacoesRevisao] = useState<string>(
    'Apenado com trabalho interno ativo na unidade prisional, frequência escolar regular e bom relacionamento interpessoal. Atestado de conduta carcerária emitido sem faltas disciplinares homologadas.'
  );

  // Lista de Revisões Periódicas
  const [revisoes, setRevisoes] = useState<ApenadoReview[]>([
    {
      id: 'rev-1',
      data: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      conduta: 'otima',
      diasRemidos: 52,
      observacoes: 'Atestado de Conduta Carcerária (ACC) Excelente. Cumprimento regular de atividades na biblioteca da unidade.',
      parecerComissao: 'Favorável por unanimidade.',
      aptoProgressao: true,
    },
  ]);

  // Modal nova revisão
  const [showNovaRevisao, setShowNovaRevisao] = useState(false);
  const [novaDataRev, setNovaDataRev] = useState(new Date().toISOString().split('T')[0]);
  const [novaCondutaRev, setNovaCondutaRev] = useState<'otima' | 'boa' | 'regular' | 'ma'>('otima');
  const [novaObsRev, setNovaObsRev] = useState('');
  const [novoParecerRev, setNovoParecerRev] = useState('Parecer favorável da comissão técnica.');

  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // ==========================================
  // Cálculos da Execução Penal (LEP)
  // ==========================================
  const calculos = useMemo(() => {
    // 1. Total da Pena em Dias (1 ano = 365d, 1 mês = 30d conforme prática forense)
    const totalDiasPena = anosPena * 365 + mesesPena * 30 + diasPena;

    // 2. Dias Remidos (Art. 126 LEP)
    const remicaoTrabalho = Math.floor(Math.max(0, diasTrabalho) / 3);
    const remicaoEstudo = Math.floor(Math.max(0, horasEstudo) / 12);
    const remicaoLeitura = Math.min(48, Math.max(0, livrosLidos) * 4);
    const totalRemicao = remicaoTrabalho + remicaoEstudo + remicaoLeitura + Math.max(0, outrosDiasRemicao);

    // 3. Dias Necessários para Progressão de Regime
    const diasExigidosProgressao = Math.ceil((totalDiasPena * percentualProgressao) / 100);

    // 4. Data-Base para contagem da progressão
    // Se houve falta grave com interrupção (Súmula 534 STJ), reinicia da data da falta
    const dataMarcoBaseStr = temFaltaGrave && dataUltimaFaltaGrave ? dataUltimaFaltaGrave : dataInicio;
    const dataMarcoBase = new Date(dataMarcoBaseStr);

    // 5. Dias cumpridos desde a data-base até hoje
    const hoje = new Date();
    const diffTempoMs = hoje.getTime() - dataMarcoBase.getTime();
    const diasCumpridosEfetivos = Math.max(0, Math.floor(diffTempoMs / (1000 * 60 * 60 * 24)));

    // Total computado para progressão = cumpridos + remidos
    const totalComputadoProgressao = diasCumpridosEfetivos + totalRemicao;
    const diasRestantesProgressao = Math.max(0, diasExigidosProgressao - totalComputadoProgressao);

    // Data Prevista para Progressão
    const dataProgressao = new Date(hoje.getTime() + diasRestantesProgressao * 24 * 60 * 60 * 1000);

    // 6. Livramento Condicional (Art. 83 CP)
    // Súmula 441 do STJ: A falta grave não interrompe o prazo para livramento condicional!
    // Fração de livramento: se hediondo (40%, 60%, 70%) é 2/3 (66.6%); se comum primário é 1/3 (33.3%); se reincidente é 1/2 (50%)
    let percentualLivramento = 33.33;
    if (percentualProgressao >= 40) {
      percentualLivramento = 66.66;
    } else if (percentualProgressao === 20 || percentualProgressao === 30) {
      percentualLivramento = 50.0;
    }
    const diasExigidosLivramento = Math.ceil((totalDiasPena * percentualLivramento) / 100);
    const dataPrisaoOrigem = new Date(dataInicio);
    const diasCumpridosDesdePrisao = Math.max(0, Math.floor((hoje.getTime() - dataPrisaoOrigem.getTime()) / (1000 * 60 * 60 * 24)));
    const diasRestantesLivramento = Math.max(0, diasExigidosLivramento - (diasCumpridosDesdePrisao + totalRemicao));
    const dataLivramento = new Date(hoje.getTime() + diasRestantesLivramento * 24 * 60 * 60 * 1000);

    // 7. Término Previsto da Pena (Extinção da Punibilidade)
    const diasRestantesTermino = Math.max(0, totalDiasPena - (diasCumpridosDesdePrisao + totalRemicao));
    const dataTermino = new Date(hoje.getTime() + diasRestantesTermino * 24 * 60 * 60 * 1000);

    // Porcentagem cumprida da pena total
    const percentualCumpridoTotal = Math.min(
      100,
      Math.max(0, Math.round(((diasCumpridosDesdePrisao + totalRemicao) / (totalDiasPena || 1)) * 100))
    );

    // Aptidão subjetiva para progressão
    const aptidaoSubjetiva = condutaCarceraria === 'otima' || condutaCarceraria === 'boa';
    const atingiuRequisitoObjetivo = diasRestantesProgressao === 0;
    const podePedirProgressaoAgora = atingiuRequisitoObjetivo && aptidaoSubjetiva;

    return {
      totalDiasPena,
      remicaoTrabalho,
      remicaoEstudo,
      remicaoLeitura,
      totalRemicao,
      diasExigidosProgressao,
      diasCumpridosEfetivos,
      totalComputadoProgressao,
      diasRestantesProgressao,
      dataProgressaoFormatada: dataProgressao.toLocaleDateString('pt-BR'),
      dataLivramentoFormatada: dataLivramento.toLocaleDateString('pt-BR'),
      dataTerminoFormatada: dataTermino.toLocaleDateString('pt-BR'),
      percentualCumpridoTotal,
      aptidaoSubjetiva,
      atingiuRequisitoObjetivo,
      podePedirProgressaoAgora,
      percentualLivramento,
    };
  }, [
    anosPena,
    mesesPena,
    diasPena,
    dataInicio,
    percentualProgressao,
    diasTrabalho,
    horasEstudo,
    livrosLidos,
    outrosDiasRemicao,
    condutaCarceraria,
    temFaltaGrave,
    dataUltimaFaltaGrave,
  ]);

  if (!isOpen) return null;

  // Adicionar Nova Revisão ao Histórico
  const handleAddRevisao = (e: React.FormEvent) => {
    e.preventDefault();
    const novaRev: ApenadoReview = {
      id: `rev-${Date.now()}`,
      data: novaDataRev,
      conduta: novaCondutaRev,
      diasRemidos: calculos.totalRemicao,
      observacoes: novaObsRev || 'Revisão periódica de cumprimento e comportamento carcerário.',
      parecerComissao: novoParecerRev,
      aptoProgressao: novaCondutaRev === 'otima' || novaCondutaRev === 'boa',
    };
    setRevisoes([novaRev, ...revisoes]);
    setCondutaCarceraria(novaCondutaRev);
    setShowNovaRevisao(false);
    setNovaObsRev('');
  };

  const handleDeleteRevisao = (id: string) => {
    setRevisoes(revisoes.filter((r) => r.id !== id));
  };

  // Gerar Relatório Texto
  const gerarRelatorioTexto = () => {
    return `📊 RELATÓRIO DE CÁLCULO DE LIQUIDAÇÃO E EXECUÇÃO PENAL (LEP)
Apenado: ${nomeApenado}
Processo / PEC: ${numeroProcesso}
Comarca: ${comarca}
Data do Cálculo: ${new Date().toLocaleDateString('pt-BR')}

1. CONDENAÇÃO E DOSIMETRIA:
- Pena Total: ${anosPena} anos, ${mesesPena} meses e ${diasPena} dias (${calculos.totalDiasPena} dias totais)
- Data de Início / Prisão: ${new Date(dataInicio).toLocaleDateString('pt-BR')}
- Fração de Progressão Aplicável: ${percentualProgressao}% (${calculos.diasExigidosProgressao} dias exigidos)

2. REMIÇÃO DE PENA (ART. 126 DA LEP):
- Trabalho: ${diasTrabalho} dias trabalhados (${calculos.remicaoTrabalho} dias remidos)
- Estudo: ${horasEstudo} horas de estudo (${calculos.remicaoEstudo} dias remidos)
- Leitura: ${livrosLidos} livros resenhados (${calculos.remicaoLeitura} dias remidos)
- TOTAL DE DIAS REMIDOS: ${calculos.totalRemicao} dias abatidos

3. SITUAÇÃO DO APENADO E CONDUTA CARCERÁRIA:
- Atestado de Conduta: ${condutaCarceraria.toUpperCase()}
- Falta Grave Registrada: ${temFaltaGrave ? `SIM (Data: ${dataUltimaFaltaGrave || 'Registrada'})` : 'NÃO'}
- Observações da Defesa: ${anotacoesRevisao}

4. CRONOGRAMA DE FUTUROS BENEFÍCIOS:
- Data Prevista para Progressão de Regime: ${calculos.dataProgressaoFormatada} (${calculos.diasRestantesProgressao} dias restantes)
- Data Prevista para Livramento Condicional: ${calculos.dataLivramentoFormatada}
- Data Prevista para Término da Pena: ${calculos.dataTerminoFormatada}
- Situação Atual: ${calculos.podePedirProgressaoAgora ? 'APTO PARA PEDIDO IMEDIATO DE PROGRESSÃO DE REGIME!' : 'Em cumprimento regular de pena.'}`;
  };

  const handleCopiarRelatorio = () => {
    navigator.clipboard.writeText(gerarRelatorioTexto());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleCopiarWhatsApp = () => {
    const textoMsg = `🏛️ *JURISAI PRO — PREVISÃO DE PROGRESSÃO DE PENA*
Olá! Segue o cálculo atualizado da execução penal para *${nomeApenado}*:

⚖️ *Pena Total:* ${anosPena} anos, ${mesesPena} meses e ${diasPena} dias
🛠️ *Dias Remidos (Trabalho/Estudo):* ${calculos.totalRemicao} dias já abatidos
👮 *Conduta Carcerária:* ${condutaCarceraria.toUpperCase()}

📅 *PREVISÃO DOS PRÓXIMOS BENEFÍCIOS:*
🟢 *Progressão de Regime:* ${calculos.dataProgressaoFormatada} ${calculos.diasRestantesProgressao === 0 ? '*(JÁ ATINGIU O PRAZO!)*' : `(faltam ${calculos.diasRestantesProgressao} dias)`}
🔓 *Livramento Condicional:* ${calculos.dataLivramentoFormatada}
🏁 *Término da Pena:* ${calculos.dataTerminoFormatada}

_Qualquer dúvida sobre os documentos ou pedido nos autos, estamos à disposição!_`;
    navigator.clipboard.writeText(textoMsg);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Atestado de Pena e Previsão de Benefícios - ${nomeApenado}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; padding: 40px; color: #111; line-height: 1.6; }
            h1 { text-align: center; text-transform: uppercase; font-size: 14pt; border-bottom: 2px solid #222; padding-bottom: 8px; }
            .section { margin-top: 20px; }
            .box { background: #f9f9f9; padding: 12px; border: 1px solid #ccc; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #eee; }
          </style>
        </head>
        <body>
          <h1>Atestado de Pena a Cumprir e Previsão de Benefícios da LEP</h1>
          <pre style="font-family: 'Times New Roman', serif; white-space: pre-wrap; font-size: 12pt;">${gerarRelatorioTexto()}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="bg-[#122232] text-white p-4 sm:px-6 border-b-4 border-[#dfb76c] flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#dfb76c]/20 text-[#dfb76c] rounded-lg border border-[#dfb76c]/40">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-serif text-[#dfb76c] tracking-wide">
                Calculadora de Execução Penal & Progressão de Regime
              </h2>
              <p className="text-xs text-slate-300">
                Liquidação de penas, frações da LEP (Lei 7.210/84 & Pacote Anticrime) e gestão de revisões
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Fechar calculadora"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-6 text-xs text-slate-700">
          {/* Status Alert Banner */}
          {calculos.podePedirProgressaoAgora ? (
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-lg text-emerald-950 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-900">
                    BENEFÍCIO ATINGIDO: APTO PARA PEDIR PROGRESSÃO DE REGIME IMEDIATAMENTE!
                  </h4>
                  <p className="text-xs text-emerald-800">
                    O apenado já atingiu os requisitos temporal (objetivo) e carcerário (subjetivo: conduta {condutaCarceraria.toUpperCase()}).
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopiarWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-xs shrink-0 cursor-pointer shadow flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" /> Enviar ao Cliente
              </button>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Faltam <strong>{calculos.diasRestantesProgressao} dias</strong> para atingir o requisito objetivo de progressão (Previsão: <strong>{calculos.dataProgressaoFormatada}</strong>).
                </span>
              </div>
              <span className="font-semibold text-blue-700">{calculos.percentualCumpridoTotal}% cumprido da pena total</span>
            </div>
          )}

          {/* Section 1: Dados do Apenado e Dosimetria da Pena */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#122232] font-serif flex items-center gap-2 border-b pb-2">
              <User className="w-4 h-4 text-[#dfb76c]" /> 1. Identificação do Apenado & Dosimetria da Condenação
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Nome do Apenado</label>
                <input
                  type="text"
                  value={nomeApenado}
                  onChange={(e) => setNomeApenado(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                  placeholder="Nome do cliente ou apenado"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nº do Processo de Execução (PEC / SEEU)</label>
                <input
                  type="text"
                  value={numeroProcesso}
                  onChange={(e) => setNumeroProcesso(e.target.value)}
                  className="w-full px-3 py-1.5 font-mono border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                  placeholder="0000000-00.0000.8.00.0000"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Vara / Comarca de Execuções</label>
                <input
                  type="text"
                  value={comarca}
                  onChange={(e) => setComarca(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                  placeholder="Vara de Execuções Penais"
                />
              </div>
            </div>

            {/* Dosimetria da Pena Total Condenada */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-800 block">
                Pena Total Fixada na Condenação (Anos, Meses e Dias):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 items-center">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Anos</label>
                  <input
                    type="number"
                    min={0}
                    value={anosPena}
                    onChange={(e) => setAnosPena(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    className="w-full px-3 py-1.5 font-bold text-center border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Meses</label>
                  <input
                    type="number"
                    min={0}
                    max={11}
                    value={mesesPena}
                    onChange={(e) => setMesesPena(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    className="w-full px-3 py-1.5 font-bold text-center border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Dias</label>
                  <input
                    type="number"
                    min={0}
                    max={29}
                    value={diasPena}
                    onChange={(e) => setDiasPena(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    className="w-full px-3 py-1.5 font-bold text-center border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 text-center bg-white p-2 rounded border">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total em Dias</span>
                  <span className="font-bold text-sm text-[#122232]">{calculos.totalDiasPena} dias</span>
                </div>
              </div>
            </div>

            {/* Fração LEP e Data Início */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold mb-1">
                  Fração / Percentual de Progressão (Art. 112 da LEP & Pacote Anticrime)
                </label>
                <select
                  value={percentualProgressao}
                  onChange={(e) => setPercentualProgressao(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none font-medium"
                >
                  {FRACOES_LEP.map((f) => (
                    <option key={f.percentual} value={f.percentual}>
                      {f.rotulo}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Exige o cumprimento de <strong>{calculos.diasExigidosProgressao} dias</strong> ({percentualProgressao}% da pena).
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Data-Base / Início do Cumprimento (Data da Prisão)
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Marco inicial para contagem dos dias cumpridos.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Remição de Pena (Trabalho, Estudo, Leitura - Art. 126 LEP) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#122232] font-serif flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> 2. Remição de Pena por Trabalho e Estudo (Art. 126 LEP)
              </h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs border border-emerald-300">
                Total Remido: {calculos.totalRemicao} dias abatidos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold flex items-center gap-1 text-[11px]">
                    <Briefcase className="w-3 h-3 text-slate-500" /> Trabalho (3 por 1)
                  </span>
                  <span className="font-bold text-emerald-700">={calculos.remicaoTrabalho}d</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={diasTrabalho}
                  onChange={(e) => setDiasTrabalho(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-2 py-1 text-center font-bold border border-slate-300 rounded bg-white text-xs focus:outline-none"
                  placeholder="Dias trabalhados"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-1">1 dia a cada 3 trabalhados</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold flex items-center gap-1 text-[11px]">
                    <BookOpen className="w-3 h-3 text-slate-500" /> Estudo (12h por 1)
                  </span>
                  <span className="font-bold text-emerald-700">={calculos.remicaoEstudo}d</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={horasEstudo}
                  onChange={(e) => setHorasEstudo(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-2 py-1 text-center font-bold border border-slate-300 rounded bg-white text-xs focus:outline-none"
                  placeholder="Horas de curso/aula"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-1">1 dia a cada 12h de estudo</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold flex items-center gap-1 text-[11px]">
                    <FileText className="w-3 h-3 text-slate-500" /> Leitura (Res. 391 CNJ)
                  </span>
                  <span className="font-bold text-emerald-700">={calculos.remicaoLeitura}d</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={livrosLidos}
                  onChange={(e) => setLivrosLidos(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-2 py-1 text-center font-bold border border-slate-300 rounded bg-white text-xs focus:outline-none"
                  placeholder="Livros resenhados"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-1">4 dias por livro (máx 48d/ano)</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[11px]">Outros Dias Remidos</span>
                  <span className="font-bold text-emerald-700">={outrosDiasRemicao}d</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={outrosDiasRemicao}
                  onChange={(e) => setOutrosDiasRemicao(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-full px-2 py-1 text-center font-bold border border-slate-300 rounded bg-white text-xs focus:outline-none"
                  placeholder="Encceja / ENEM / Outros"
                />
                <span className="text-[10px] text-slate-400 block text-center mt-1">Bônus ou aprovação em exames</span>
              </div>
            </div>
          </div>

          {/* Section 3: Revisões Periódicas do Apenado & Conduta Carcerária */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#122232] font-serif flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#dfb76c]" /> 3. Revisões do Apenado & Conduta Carcerária (Requisito Subjetivo)
              </h3>
              <button
                type="button"
                onClick={() => setShowNovaRevisao(!showNovaRevisao)}
                className="bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Avaliação / Revisão
              </button>
            </div>

            {/* Configuração de Conduta e Faltas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
              <div>
                <label className="block font-semibold mb-1">Atestado de Conduta Carcerária Atual (ACC)</label>
                <select
                  value={condutaCarceraria}
                  onChange={(e) => setCondutaCarceraria(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-[#dfb76c] focus:outline-none font-semibold"
                >
                  <option value="otima">Ótima / Excelente (Apto para todos os benefícios)</option>
                  <option value="boa">Boa (Apto para progressão e livramento)</option>
                  <option value="regular">Regular (Exige cautela / reavaliação)</option>
                  <option value="ma">Má (Inapto - necessita de reabilitação carcerária)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Registro de Falta Disciplinar Grave
                  </label>
                  <input
                    type="checkbox"
                    checked={temFaltaGrave}
                    onChange={(e) => setTemFaltaGrave(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                </div>
                {temFaltaGrave && (
                  <div className="space-y-1">
                    <input
                      type="date"
                      value={dataUltimaFaltaGrave}
                      onChange={(e) => setDataUltimaFaltaGrave(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-rose-300 rounded bg-rose-50/50"
                      placeholder="Data da homologação da falta grave"
                    />
                    <span className="text-[10px] text-rose-700 block">
                      ⚠️ <strong>Súmula 534 do STJ:</strong> A falta grave reinicia a contagem para progressão a partir desta data (mas não afeta livramento condicional - Súmula 441 STJ).
                    </span>
                  </div>
                )}
                {!temFaltaGrave && (
                  <span className="text-[10px] text-emerald-700 block mt-1">
                    ✅ Nenhuma falta grave registrada. Contagem regular mantida desde o início da pena.
                  </span>
                )}
              </div>
            </div>

            {/* Formulário Nova Revisão (Expansível) */}
            {showNovaRevisao && (
              <form onSubmit={handleAddRevisao} className="bg-amber-50/80 p-3 rounded-lg border border-amber-200 space-y-2">
                <h4 className="font-bold text-xs text-[#122232] flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-amber-600" /> Registrar Nova Revisão Periódica do Apenado
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Data da Avaliação</label>
                    <input
                      type="date"
                      required
                      value={novaDataRev}
                      onChange={(e) => setNovaDataRev(e.target.value)}
                      className="w-full px-2 py-1 border rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Conduta Avaliada</label>
                    <select
                      value={novaCondutaRev}
                      onChange={(e) => setNovaCondutaRev(e.target.value as any)}
                      className="w-full px-2 py-1 border rounded bg-white text-xs"
                    >
                      <option value="otima">Ótima / Excelente</option>
                      <option value="boa">Boa</option>
                      <option value="regular">Regular</option>
                      <option value="ma">Má</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Observações da Revisão / Atestado</label>
                  <input
                    type="text"
                    required
                    value={novaObsRev}
                    onChange={(e) => setNovaObsRev(e.target.value)}
                    placeholder="Ex: Trabalho carcerário exercido com assiduidade e disciplina exemplar."
                    className="w-full px-2 py-1 border rounded bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Parecer da Comissão Técnica / Exame Criminológico</label>
                  <input
                    type="text"
                    value={novoParecerRev}
                    onChange={(e) => setNovoParecerRev(e.target.value)}
                    placeholder="Ex: Parecer favorável à progressão ao regime semiaberto."
                    className="w-full px-2 py-1 border rounded bg-white text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowNovaRevisao(false)}
                    className="px-3 py-1 border rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#122232] text-[#dfb76c] border border-[#dfb76c] font-bold rounded cursor-pointer hover:bg-[#1a3148]"
                  >
                    Salvar Revisão
                  </button>
                </div>
              </form>
            )}

            {/* Histórico de Revisões Salvas */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Histórico de Revisões Cadastradas ({revisoes.length}):
              </span>
              {revisoes.map((rev) => (
                <div
                  key={rev.id}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#122232]">
                        Revisão de {new Date(rev.data).toLocaleDateString('pt-BR')}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          rev.conduta === 'otima' || rev.conduta === 'boa'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        Conduta: {rev.conduta.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">({rev.diasRemidos} dias remidos acumulados)</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{rev.observacoes}</p>
                    {rev.parecerComissao && (
                      <p className="text-slate-500 text-[10px] italic">Parecer: {rev.parecerComissao}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteRevisao(rev.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer self-end sm:self-center"
                    title="Excluir revisão"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Cronograma e Resultados dos Futuros Benefícios */}
          <div className="bg-white p-4 rounded-lg border-2 border-[#dfb76c] shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#122232] font-serif flex items-center justify-between border-b pb-2">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#dfb76c]" /> 4. Previsão de Futuros Benefícios da Execução Penal
              </span>
              <span className="text-xs font-mono font-semibold text-slate-600">
                Pena: {anosPena}a {mesesPena}m {diasPena}d
              </span>
            </h3>

            {/* Barra de Progresso Visual da Pena */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-slate-600">Progresso Geral do Cumprimento:</span>
                <span className="text-[#122232]">{calculos.percentualCumpridoTotal}% cumprido</span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${calculos.percentualCumpridoTotal}%` }}
                />
              </div>
            </div>

            {/* Cards de Previsões Chave */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase">Progressão de Regime</span>
                  <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
                    {percentualProgressao}% LEP
                  </span>
                </div>
                <h4 className="text-base font-bold text-emerald-900">{calculos.dataProgressaoFormatada}</h4>
                <p className="text-[11px] text-emerald-800">
                  {calculos.diasRestantesProgressao === 0 ? (
                    <strong className="text-emerald-700">Requisito temporal atingido!</strong>
                  ) : (
                    <span>Faltam <strong>{calculos.diasRestantesProgressao} dias</strong></span>
                  )}
                </p>
              </div>

              <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase">Livramento Condicional</span>
                  <span className="text-[10px] bg-blue-200/70 text-blue-900 px-1.5 py-0.2 rounded font-semibold">
                    Art. 83 CP
                  </span>
                </div>
                <h4 className="text-base font-bold text-blue-900">{calculos.dataLivramentoFormatada}</h4>
                <p className="text-[11px] text-blue-800">
                  Súmula 441 STJ: falta grave não interrompe
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 uppercase">Extinção / Término</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                    Total
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900">{calculos.dataTerminoFormatada}</h4>
                <p className="text-[11px] text-slate-600">
                  Com {calculos.totalRemicao} dias de remição já deduzidos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-[#dfb76c]" />
            <span>Cálculo com respaldo no CNJ / SEEU e jurisprudência vinculante do STJ.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <button
              onClick={handleCopiarWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Copiar resumo formatado para enviar no WhatsApp do cliente ou família"
            >
              {copiedWhatsapp ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copiado p/ WhatsApp!
                </>
              ) : (
                <>
                  <MessageCircle className="w-3.5 h-3.5" /> Enviar p/ WhatsApp do Cliente
                </>
              )}
            </button>

            <button
              onClick={handleCopiarRelatorio}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar Relatório
                </>
              )}
            </button>

            <button
              onClick={handleImprimir}
              className="px-3 py-2 bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] font-bold rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Atestado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
