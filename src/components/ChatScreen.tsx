import React, { useState, useRef, useEffect } from 'react';
import {
  Scale,
  Paperclip,
  Send,
  LogOut,
  Settings,
  Copy,
  Check,
  Printer,
  FileText,
  Trash2,
  Sparkles,
  BookOpen,
  ShieldAlert,
  Gavel,
  Briefcase,
  X,
  FileCheck,
  Lightbulb,
  MessageCircle,
  Share2,
  Calculator,
  Search,
} from 'lucide-react';
import { JurisUser, ChatMessage, AttachedFile } from '../types';
import { PenalCalculatorModal } from './PenalCalculatorModal';
import { ProcessSearchModal } from './ProcessSearchModal';

interface ChatScreenProps {
  currentUser: JurisUser;
  isAdmin: boolean;
  onLogout: () => void;
  onNavigateToAdmin: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  currentUser,
  isAdmin,
  onLogout,
  onNavigateToAdmin,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'ai',
      text: `Validação concluída com êxito para **${currentUser.name}**.\n\nSou o seu **Assessor Jurídico Supremo de Elite**. Estou pronto para:\n\n• 💡 **Resumo Descomplicado em Linguagem Simples**: Analisar autos e documentos para explicar o caso de forma que qualquer pessoa leiga entenda;\n• 🔍 **Auditar autos e petições** apontando preliminares, vícios e nulidades;\n• ⏳ **Verificar tempestividade, decadência e prescrição** processual;\n• 📝 **Redigir minutas jurídicas completas** (Iniciais, Contestações, Agravos, Apelações, Embargos);\n• 🏛️ **Pesquisar precedentes e súmulas vinculantes** do STF, STJ e TST.\n\nEnvie os arquivos do processo ou formule sua consulta para iniciarmos.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [selectedMode, setSelectedMode] = useState<'resumo_simples' | 'auditoria' | 'redacao_peca' | 'jurisprudencia' | 'riscos'>('resumo_simples');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWhatsappId, setCopiedWhatsappId] = useState<string | null>(null);
  const [isPenalCalcOpen, setIsPenalCalcOpen] = useState(false);
  const [isProcessSearchOpen, setIsProcessSearchOpen] = useState(false);
  const [calcInitialData, setCalcInitialData] = useState<{
    name: string;
    years: number;
    months: number;
    days: number;
    numeroProcesso?: string;
  }>({
    name: currentUser.name,
    years: 5,
    months: 0,
    days: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle file selection and base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('O arquivo selecionado excede o limite máximo recomendado de 20MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract pure base64 without data URI prefix
      const base64Data = result.split(',')[1] || result;
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        base64: base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyForClient = (text: string, id: string) => {
    const formattedForWhatsApp = `📌 *RESUMO INFORMATIVO DO SEU PROCESSO*\n\n${text.replace(/### /g, '\n*').replace(/## /g, '\n*')}\n\n_Qualquer dúvida sobre os desdobramentos ou próximos passos, estamos à sua inteira disposição!_`;
    navigator.clipboard.writeText(formattedForWhatsApp);
    setCopiedWhatsappId(id);
    setTimeout(() => setCopiedWhatsappId(null), 2500);
  };

  const handleSendMessage = async (
    promptOverride?: string,
    modeOverride?: 'resumo_simples' | 'auditoria' | 'redacao_peca' | 'jurisprudencia' | 'riscos'
  ) => {
    const activeText = (promptOverride !== undefined ? promptOverride : inputPrompt).trim();
    const activeMode = modeOverride || selectedMode;

    if (!activeText && !attachedFile) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: activeText || `[Documento enviado para análise: ${attachedFile?.name}]`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      fileName: attachedFile ? attachedFile.name : undefined,
      fileType: attachedFile ? attachedFile.type : undefined,
      mode: activeMode,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setLoading(true);

    const currentFile = attachedFile;
    // Clear attachment after queueing
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const response = await fetch('/api/gemini/legal-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeText,
          mode: activeMode,
          fileData: currentFile
            ? {
                name: currentFile.name,
                mimeType: currentFile.type,
                base64: currentFile.base64,
              }
            : undefined,
          conversationHistory: messages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Falha ao processar consulta jurídica.');
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        mode: activeMode,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **Aviso do Sistema Jurídico:** Ocorreu uma intercorrência temporária no processamento da consulta (${err.message || 'Erro de comunicação'}). Por favor, reenvie a solicitação.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrint = (text: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>JurisAI Pro — Minuta Jurídica</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; padding: 40px; color: #000; }
            h1, h2, h3 { text-align: center; font-family: 'Times New Roman', serif; text-transform: uppercase; }
            blockquote { margin: 15px 30px; font-style: italic; border-left: 2px solid #555; padding-left: 15px; }
            pre { font-family: 'Times New Roman', serif; white-space: pre-wrap; font-size: 12pt; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div style="text-align:center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
            <strong style="font-size: 14pt;">JURISAI PRO — ASSESSORIA JURÍDICA SUPREMA</strong><br>
            <span style="font-size: 10pt;">DOCUMENTO PRODUZIDO EM: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
          <pre>${text.replace(/[#*`_]/g, '')}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="w-full max-w-5xl h-[92vh] bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="bg-[#122232] text-white px-5 py-3.5 border-b-4 border-[#dfb76c] flex items-center justify-between shadow-md relative z-10">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="bg-[#dfb76c] hover:bg-[#c99f52] text-[#122232] font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition-all cursor-pointer"
              title="Acessar Painel de Licenças e Usuários"
            >
              <Settings className="w-3.5 h-3.5" />
              Painel de Gestão
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#dfb76c]/20 text-[#dfb76c] rounded border border-[#dfb76c]/40">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif text-[#dfb76c] tracking-wide">
                  JurisAI Pro — Terminal Ativo
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-1">
                <span>{currentUser.name}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-[10px] text-slate-300">CPF: {currentUser.cpf}</span>
                {currentUser.daysLeft !== undefined && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span
                      className={`font-semibold ${
                        currentUser.daysLeft > 10 ? 'text-[#dfb76c]' : 'text-amber-300'
                      }`}
                    >
                      {currentUser.daysLeft > 900 ? 'Licença Permanente' : `${currentUser.daysLeft} dias restantes`}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProcessSearchOpen(true)}
            className="bg-[#1a3148] hover:bg-[#254668] text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition-all cursor-pointer border border-[#dfb76c]/40"
            title="Consultar processos, condenações e somas de penas por Nome e CPF"
          >
            <Search className="w-3.5 h-3.5 text-[#dfb76c]" />
            <span className="hidden sm:inline">Buscar Processos / CPF</span>
            <span className="sm:hidden">Busca CPF</span>
          </button>

          <button
            onClick={() => setIsPenalCalcOpen(true)}
            className="bg-[#dfb76c] hover:bg-[#c99f52] text-[#122232] font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition-all cursor-pointer"
            title="Calculadora de Cumprimento de Pena, Dosimetria, Frações LEP e Revisões de Apenado"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calculadora Penal (LEP)</span>
            <span className="sm:hidden">Calc LEP</span>
          </button>

          <button
            onClick={onLogout}
            className="text-slate-300 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4 text-[#dfb76c]" />
            <span className="hidden sm:inline font-medium">Sair</span>
          </button>
        </div>
      </header>

      {/* Quick Action Presets Bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#dfb76c]" /> Atalhos:
        </span>
        <button
          onClick={() => setIsProcessSearchOpen(true)}
          className="px-3 py-1 rounded border bg-blue-900 text-white hover:bg-blue-950 border-blue-950 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-bold shadow-xs"
          title="Consultar processos, condenações e somas de penas por Nome e CPF"
        >
          <Search className="w-3.5 h-3.5 text-amber-300" />
          <span>🔍 Consulta por Nome/CPF & Somas</span>
        </button>
        <button
          onClick={() => setIsPenalCalcOpen(true)}
          className="px-3 py-1 rounded border bg-[#122232] text-[#dfb76c] hover:bg-[#1a3148] border-[#dfb76c] transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-bold shadow-sm"
          title="Calculadora de Cumprimento de Pena, Dosimetria, Frações LEP e Revisões do Apenado para Futuros Benefícios"
        >
          <Calculator className="w-3.5 h-3.5 text-[#dfb76c]" />
          <span>⚖️ Calculadora Penal & Benefícios</span>
        </button>
        <button
          onClick={() => {
            setSelectedMode('resumo_simples');
            setInputPrompt('Analise este processo ou documento e explique de forma detalhada, porém em linguagem simples para quem não tem conhecimento jurídico. Diga: 1) Do que se trata exatamente (ex: se é condenação, por qual crime/motivo); 2) Qual foi a decisão tomada (pena fixada, valores ou obrigações); 3) A data da condenação/decisão e a cidade/vara; 4) A situação atual da pessoa (se responde em liberdade ou não); 5) Os prazos exatos para recursos; 6) O que fazer a partir de agora.');
          }}
          className={`px-3 py-1 rounded border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-bold ${
            selectedMode === 'resumo_simples'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300'
          }`}
          title="Resumo sem juridiquês: crime/assunto, pena, cidade, data, prazos para recursos e próximos passos"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
          Resumo Simples (Para Leigos)
        </button>
        <button
          onClick={() => {
            setSelectedMode('auditoria');
            setInputPrompt('Por favor, faça uma auditoria integral dos autos. Identifique as partes, o valor da causa, preliminares de mérito aplicáveis, tempestividade e aponte os maiores riscos processuais.');
          }}
          className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            selectedMode === 'auditoria'
              ? 'bg-[#122232] text-[#dfb76c] border-[#122232] font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
          }`}
        >
          <Gavel className="w-3 h-3" />
          Auditoria de Autos
        </button>
        <button
          onClick={() => {
            setSelectedMode('redacao_peca');
            setInputPrompt('Redija uma peça de Contestação com fulcro no Art. 335 do CPC, arguindo preliminar de ilegitimidade passiva e incompetência relativa, impugnando os danos morais pleiteados pela parte autora.');
          }}
          className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            selectedMode === 'redacao_peca'
              ? 'bg-[#122232] text-[#dfb76c] border-[#122232] font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
          }`}
        >
          <FileText className="w-3 h-3" />
          Redação de Peça Processual
        </button>
        <button
          onClick={() => {
            setSelectedMode('jurisprudencia');
            setInputPrompt('Quais são as teses fixadas pelo STF e STJ em recursos repetitivos e súmulas vinculantes sobre a matéria em discussão? Liste precedentes recentes e aplicáveis.');
          }}
          className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            selectedMode === 'jurisprudencia'
              ? 'bg-[#122232] text-[#dfb76c] border-[#122232] font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          Teses & Súmulas STF/STJ
        </button>
        <button
          onClick={() => {
            setSelectedMode('riscos');
            setInputPrompt('Faça uma matriz de probabilidade de êxito e cálculo de contingência jurídica para este caso. Vale a pena formular proposta de acordo judicial agora?');
          }}
          className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            selectedMode === 'riscos'
              ? 'bg-[#122232] text-[#dfb76c] border-[#122232] font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          Matriz de Riscos & Acordo
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-5 overflow-y-auto bg-[#fafafa] space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
            >
              <div
                className={`rounded-lg px-5 py-4 max-w-[92%] shadow-sm transition-all ${
                  isUser
                    ? 'bg-[#e2eaf0] text-[#1a2e40] border-l-4 border-[#1a2e40]'
                    : 'bg-white text-slate-800 border border-slate-200 border-l-4 border-l-[#dfb76c]'
                }`}
              >
                {/* Header of message */}
                <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-black/5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 font-semibold">
                    {isUser ? (
                      <>
                        <Briefcase className="w-3.5 h-3.5 text-[#1a2e40]" />
                        <span>Você (Advogado)</span>
                      </>
                    ) : (
                      <>
                        <Scale className="w-3.5 h-3.5 text-[#dfb76c]" />
                        <span className="text-[#122232] font-serif font-bold">JurisAI Pro — Assessor Supremo</span>
                        {msg.mode === 'resumo_simples' && (
                          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-emerald-700" />
                            Linguagem Simples
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{msg.timestamp}</span>
                </div>

                {/* Attached File indicator in message */}
                {msg.fileName && (
                  <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs">
                    <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Documento Auditado: <strong>{msg.fileName}</strong></span>
                  </div>
                )}

                {/* Message Body with markdown simulation */}
                <div className="text-sm leading-relaxed whitespace-pre-line text-slate-800 break-words font-sans space-y-2">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    // Render headers
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3 key={pIdx} className="text-base font-bold text-[#122232] mt-3 mb-1 font-serif">
                          {paragraph.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('## ')) {
                      return (
                        <h2 key={pIdx} className="text-lg font-bold text-[#122232] mt-4 mb-2 font-serif border-b pb-1">
                          {paragraph.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (paragraph.startsWith('> ')) {
                      return (
                        <blockquote key={pIdx} className="p-3 my-2 bg-slate-50 border-l-4 border-slate-400 italic text-slate-700 text-xs">
                          {paragraph.replace('> ', '')}
                        </blockquote>
                      );
                    }
                    return <p key={pIdx}>{paragraph}</p>;
                  })}
                </div>

                {/* Action Toolbar on AI message */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs flex-wrap">
                    <button
                      onClick={() => handleCopyForClient(msg.text, msg.id)}
                      className="px-2.5 py-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-300 rounded flex items-center gap-1 transition-colors cursor-pointer font-medium"
                      title="Copiar resumo formatado para enviar pelo WhatsApp do cliente"
                    >
                      {copiedWhatsappId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-800 font-semibold">Copiado p/ Cliente!</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Enviar ao Cliente (WhatsApp)</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="px-2.5 py-1 text-slate-600 hover:text-[#122232] hover:bg-slate-100 rounded flex items-center gap-1 transition-colors cursor-pointer font-medium"
                      title="Copiar texto integral"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Minuta</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handlePrint(msg.text)}
                      className="px-2.5 py-1 text-slate-600 hover:text-[#122232] hover:bg-slate-100 rounded flex items-center gap-1 transition-colors cursor-pointer font-medium"
                      title="Imprimir ou gerar PDF formal"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-start max-w-full">
            <div className="bg-white rounded-lg px-5 py-4 border border-slate-200 border-l-4 border-l-[#dfb76c] shadow-sm flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#122232] border-t-[#dfb76c]"></div>
              <div>
                <p className="text-xs font-semibold text-[#122232] font-serif">
                  JurisAI Pro está auditando os autos e fundamentando teses...
                </p>
                <p className="text-[11px] text-slate-500">
                  Cruzando CPC/2015, súmulas dos tribunais superiores e matrizes de risco.
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Control Area */}
      <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-2 shadow-inner">
        {/* Active Mode Selector Bar */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
              Modo Ativo:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMode('resumo_simples')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedMode === 'resumo_simples'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Resumo didático para o cliente ou leigos"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              Linguagem Simples (Leigos)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('auditoria')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedMode === 'auditoria'
                  ? 'bg-[#122232] text-[#dfb76c] shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Gavel className="w-3 h-3" />
              Auditoria de Autos
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('redacao_peca')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedMode === 'redacao_peca'
                  ? 'bg-[#122232] text-[#dfb76c] shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3 h-3" />
              Redação de Peça
            </button>
            <button
              type="button"
              onClick={() => setSelectedMode('riscos')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                selectedMode === 'riscos'
                  ? 'bg-[#122232] text-[#dfb76c] shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              Riscos & Acordo
            </button>
          </div>
          {selectedMode === 'resumo_simples' && (
            <span className="hidden sm:inline-block text-[11px] text-emerald-700 font-medium">
              ✨ Tradução sem juridiquês
            </span>
          )}
        </div>

        {/* File status banner if file is attached */}
        {attachedFile && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 animate-fadeIn">
            <div className="flex items-center gap-2 truncate">
              <Paperclip className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">{attachedFile.name}</span>
              <span className="text-[11px] text-amber-700 shrink-0">
                ({(attachedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={removeAttachedFile}
              className="text-amber-700 hover:text-red-700 p-1 rounded hover:bg-amber-100 cursor-pointer"
              title="Remover anexo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* File Upload Button */}
          <label className="bg-[#f0f2f5] hover:bg-[#e4e7eb] text-[#1a2e40] border border-slate-300 px-4 py-2.5 rounded-lg cursor-pointer font-medium text-xs flex items-center justify-center gap-2 transition-colors shrink-0">
            <Paperclip className="w-4 h-4 text-[#dfb76c]" />
            <span>Anexar Processo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf, image/*, text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Prompt Text Input */}
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedMode === 'resumo_simples'
                  ? 'Anexe o processo ou digite sua dúvida para receber um resumo simples que qualquer um entenda...'
                  : 'O que o assessor supremo deve analisar ou redigir? (Shift+Enter para pular linha)'
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#dfb76c] focus:outline-none resize-none font-sans"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || (!inputPrompt.trim() && !attachedFile)}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide uppercase transition-all shadow flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-40 ${
              selectedMode === 'resumo_simples'
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800'
                : 'bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c]'
            }`}
          >
            {selectedMode === 'resumo_simples' ? (
              <>
                <Lightbulb className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Descomplicar</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Auditar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Consulta Processual Pública, Condenações e Somas */}
      <ProcessSearchModal
        isOpen={isProcessSearchOpen}
        onClose={() => setIsProcessSearchOpen(false)}
        onTransferToPenalCalculator={(data) => {
          setCalcInitialData({
            name: data.apenadoName,
            years: data.years,
            months: data.months,
            days: data.days,
            numeroProcesso: data.numeroProcesso,
          });
          setIsPenalCalcOpen(true);
        }}
      />

      {/* Modal da Calculadora Penal, Frações LEP e Revisões do Apenado */}
      <PenalCalculatorModal
        isOpen={isPenalCalcOpen}
        onClose={() => setIsPenalCalcOpen(false)}
        initialApenadoName={calcInitialData.name}
        initialYears={calcInitialData.years}
        initialMonths={calcInitialData.months}
        initialDays={calcInitialData.days}
      />
    </div>
  );
};
