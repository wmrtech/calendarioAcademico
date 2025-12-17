import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from "wouter";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { 
  CheckCircle, Clock, FileText, AlertCircle, ExternalLink, 
  XCircle, ArrowLeft, Share2, Copy, Check, Trash2, User, 
  UploadCloud, Save, MessageCircle, History, Download, Printer
} from 'lucide-react';
import { toast } from "sonner";

// --- TIPAGEM GERAL ---
interface FeedbackLog {
  id: number;
  date: string;
  text: string;
  author: 'Coordenação' | 'Aluno'; 
}

interface Request {
  id: string;
  studentName: string;
  cpf: string;
  phone: string;
  subjects: string;
  
  status: string; 
  lastUpdate: string;
  createdAt: any;

  analysisFile?: string; 
  coordinatorProposal?: string; 
  
  feedbackLog?: FeedbackLog[];
}

// --- MODAL DE DETALHES ---
const RequestDetailModal = ({ 
  request, 
  isOpen, 
  onClose, 
  onUpdate 
}: { 
  request: Request | null, 
  isOpen: boolean, 
  onClose: () => void,
  onUpdate: (id: string, data: Partial<Request>) => void
}) => {
  const [proposalText, setProposalText] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (request) {
      setProposalText(request.coordinatorProposal || "");
      setFeedbackText("");
    }
  }, [request]);

  if (!isOpen || !request) return null;

  // --- HANDLERS ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpdate(request.id, { analysisFile: file.name });
      toast.success("Análise curricular anexada!");
    }
  };

  const handleDownloadFile = () => {
    if(!request.analysisFile) return;
    toast.info(`Baixando arquivo: ${request.analysisFile}...`);
  };

  const handleSaveProposal = () => {
    if (!proposalText.trim()) return toast.error("Escreva uma proposta antes de salvar.");

    const newEntry: FeedbackLog = {
      id: Date.now(),
      date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      text: `PROPOSTA REGISTRADA: ${proposalText}`,
      author: 'Coordenação'
    };

    const currentLog = request.feedbackLog || [];
    
    onUpdate(request.id, { 
      coordinatorProposal: proposalText,
      feedbackLog: [newEntry, ...currentLog] 
    });
    
    toast.success("Proposta salva e registrada no histórico!");
  };

  const handleAddStudentFeedback = () => {
    if (!feedbackText.trim()) return;

    const newEntry: FeedbackLog = {
      id: Date.now(),
      date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      text: feedbackText,
      author: 'Aluno'
    };

    const currentLog = request.feedbackLog || [];
    onUpdate(request.id, { feedbackLog: [newEntry, ...currentLog] });
    setFeedbackText("");
    toast.success("Retorno do aluno registrado.");
  };

  const handleSendToWhatsApp = () => {
    if (!request.phone) return toast.error("Telefone não informado");
    const message = `Olá ${request.studentName}, referente à sua solicitação de rematrícula:\n\n*Proposta da Coordenação:*\n${proposalText}\n\nSegue em anexo a análise curricular (se houver). Aguardamos seu de acordo.`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${request.phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  // --- FUNÇÃO GERADORA DE COMPROVANTE (PDF/PRINT) ---
  const generateReceipt = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    // Obtém a URL base atual para garantir que a imagem carregue
    const baseUrl = window.location.origin;

    const logsHtml = request.feedbackLog?.map(log => `
      <div style="margin-bottom: 10px; padding: 10px; border-bottom: 1px solid #eee;">
        <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">
          ${log.date} - ${log.author}
        </div>
        <div style="font-size: 12px; color: #333; white-space: pre-wrap;">${log.text}</div>
      </div>
    `).join('') || '<p style="font-style: italic; color: #999;">Sem histórico registrado.</p>';

    const htmlContent = `
      <html>
        <head>
          <title>Comprovante - ${request.studentName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #d31c5b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { height: 50px; object-fit: contain; }
            .title { font-size: 24px; font-weight: bold; color: #d31c5b; text-transform: uppercase; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; color: #d31c5b; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
            .field { margin-bottom: 8px; font-size: 12px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #000; }
            .box { background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee; font-size: 12px; }
            .footer { margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
            
            @media print {
              body { padding: 0; }
              .box { border: 1px solid #ccc; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Comprovante de Atendimento</div>
              <div style="font-size: 12px; color: #666;">Processo de Rematrícula Especial</div>
            </div>
            <img src="${baseUrl}/logo.png" alt="Afya" class="logo" onerror="this.style.display='none'" />
          </div>

          <div class="section">
            <div class="section-title">Dados do Aluno</div>
            <div class="field"><span class="label">Nome:</span> <span class="value">${request.studentName}</span></div>
            <div class="field"><span class="label">CPF:</span> <span class="value">${request.cpf}</span></div>
            <div class="field"><span class="label">Telefone:</span> <span class="value">${request.phone}</span></div>
            <div class="field"><span class="label">Protocolo:</span> <span class="value">${request.id}</span></div>
          </div>

          <div class="section">
            <div class="section-title">Solicitação Original</div>
            <div class="box">${request.subjects || 'Não informado.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Acordo / Proposta Final da Coordenação</div>
            <div class="box" style="background: #f0f7ff; border-color: #cce5ff;">
              ${request.coordinatorProposal || 'Nenhuma proposta registrada.'}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Histórico de Negociação</div>
            <div>${logsHtml}</div>
          </div>

          <div class="footer">
            Documento gerado em ${new Date().toLocaleString()} pelo sistema de gestão acadêmica.<br/>
            Este comprovante registra o histórico de tratativas e o acordo final (se houver).
          </div>

          <script>
            // Pequeno delay para garantir que a logo carregue antes de abrir o print
            window.onload = function() { setTimeout(() => window.print(), 500); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{request.studentName}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><User size={14} /> {request.cpf}</span>
              <span className="flex items-center gap-1"><MessageCircle size={14} /> {request.phone}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><XCircle className="text-gray-500" /></button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            
            {/* ESQUERDA: Solicitação + Área de Trabalho */}
            <div className="space-y-6 flex flex-col">
              
              {/* Solicitação Original */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                  <FileText size={14} /> Solicitação do Aluno
                </h3>
                <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                  "{request.subjects}"
                </p>
              </div>

              {/* Área de Trabalho da Coordenação */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-blue-600 uppercase mb-4 flex items-center gap-2">
                  <CheckCircle size={16} /> Análise & Proposta
                </h3>
                
                {/* Botão de Anexo */}
                <div className="mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <label className="block text-xs font-bold text-blue-800 mb-2">1. Análise Curricular (PDF)</label>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-bold transition border border-gray-300 shadow-sm"
                    >
                      <UploadCloud size={14} /> {request.analysisFile ? 'Substituir Arquivo' : 'Carregar PDF'}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
                    
                    {/* VISUALIZAÇÃO DO ARQUIVO (LINK/BOTÃO) */}
                    {request.analysisFile && (
                      <button 
                        onClick={handleDownloadFile}
                        className="flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline cursor-pointer bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 transition-colors"
                        title="Clique para baixar"
                      >
                        <Download size={14} /> {request.analysisFile}
                      </button>
                    )}
                  </div>
                </div>

                {/* Campo de Proposta */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs font-bold text-blue-800 mb-2">2. Redigir Proposta</label>
                  <textarea 
                    className="flex-1 w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Escreva aqui a proposta de matérias e horários..."
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-3">
                     <span className="text-[10px] text-gray-400">Ao salvar, a proposta vai para o histórico (Verde).</span>
                     <button onClick={handleSaveProposal} className="flex items-center gap-2 text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
                      <Save size={14} /> Salvar & Registrar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* DIREITA: Comunicação e Histórico */}
            <div className="space-y-6 flex flex-col h-full">
              
              {/* Botão WhatsApp */}
              <div className="bg-[#25D366]/10 p-4 rounded-xl border border-[#25D366]/20">
                <button 
                  onClick={handleSendToWhatsApp}
                  disabled={!proposalText}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <MessageCircle size={18} /> Enviar Proposta (WhatsApp)
                </button>
              </div>

              {/* Histórico de Negociação (Timeline) */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col min-h-[400px]">
                <h3 className="text-sm font-bold text-gray-600 uppercase mb-3 flex items-center gap-2">
                  <History size={16} /> Histórico de Negociação
                </h3>
                
                {/* Lista de Logs */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  {(!request.feedbackLog || request.feedbackLog.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <History size={32} className="mb-2 opacity-50" />
                        <p className="text-xs italic">Nenhum registro ainda.</p>
                    </div>
                  )}
                  
                  {request.feedbackLog?.map(log => (
                    <div 
                        key={log.id} 
                        className={`p-3 rounded-lg border text-sm shadow-sm relative ${
                            log.author === 'Coordenação' 
                                ? 'bg-green-50 border-green-200 ml-4' 
                                : 'bg-blue-50 border-blue-200 mr-4'
                        }`}
                    >
                      <p className={`whitespace-pre-wrap ${log.author === 'Coordenação' ? 'text-green-900' : 'text-blue-900'}`}>
                        {log.text}
                      </p>
                      
                      {/* Badge do Autor */}
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            log.author === 'Coordenação' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'
                        }`}>
                            {log.author}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{log.date}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input de Retorno do Aluno */}
                <div className="pt-3 border-t border-gray-100">
                  <label className="text-xs font-bold text-blue-800 mb-2 block">Registrar Resposta do Aluno (Histórico Azul)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Ex: Aluno aceitou; Pediu pra mudar terça..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddStudentFeedback()}
                    />
                    <button 
                        onClick={handleAddStudentFeedback} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition shadow-sm"
                        title="Adicionar retorno"
                    >
                      <ArrowLeft size={18} className="rotate-180" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="bg-white border-t p-4 flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase">Status:</span>
                <select 
                    value={request.status} 
                    onChange={(e) => onUpdate(request.id, { status: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-gray-50 font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-white transition-colors"
                >
                    <option value="pendente">🟠 Pendente</option>
                    <option value="analise">🔵 Em Análise</option>
                    <option value="confeccionado">🟢 Concluído</option>
                </select>
                
                {/* BOTÃO GERAR COMPROVANTE */}
                <button 
                    onClick={generateReceipt}
                    className="ml-4 flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                    title="Imprimir ou Salvar PDF"
                >
                    <Printer size={16} /> Gerar Comprovante
                </button>
            </div>
            
            <button onClick={onClose} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition">
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function ReenrollmentManager() {
  const [_, setLocation] = useLocation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareLink = `${window.location.origin}/solicitacao-rematricula`;

  useEffect(() => {
    const q = query(collection(db, "reenrollment_requests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          studentName: data.studentName,
          cpf: data.cpf || "S/ CPF",
          phone: data.phone,
          subjects: data.subjects,
          status: data.status === 'pending' ? 'pendente' : data.status,
          lastUpdate: data.lastUpdate || "Recente",
          createdAt: data.createdAt,
          analysisFile: data.analysisFile,
          coordinatorProposal: data.coordinatorProposal,
          feedbackLog: data.feedbackLog || []
        } as Request;
      });
      setRequests(firebaseData);
      
      if (selectedRequest) {
        const updated = firebaseData.find(r => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedRequest?.id]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja EXCLUIR esta solicitação?")) {
      try {
        await deleteDoc(doc(db, "reenrollment_requests", id));
        if (selectedRequest?.id === id) setSelectedRequest(null);
      } catch (error) {
        toast.error("Erro ao deletar.");
      }
    }
  };

  const handleUpdateRequest = async (id: string, data: Partial<Request>) => {
    const reqRef = doc(db, "reenrollment_requests", id);
    await updateDoc(reqRef, { 
      ...data,
      lastUpdate: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast.success("Link copiado!");
  };

  const RequestCard = ({ req }: { req: Request }) => (
    <div 
        onClick={() => setSelectedRequest(req)}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group relative"
    >
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-gray-800 line-clamp-1">{req.studentName}</h4>
                <p className="text-xs text-gray-500">{req.cpf}</p>
            </div>
            {req.analysisFile && <FileText size={16} className="text-blue-500" title="Possui anexo" />}
        </div>
        
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-2 italic">
            "{req.subjects}"
        </div>

        <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock size={10} /> {req.lastUpdate}
            </span>
            <button 
                onClick={(e) => handleDelete(e, req.id)} 
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                title="Excluir"
            >
                <Trash2 size={14} />
            </button>
        </div>
    </div>
  );

  const KanbanColumn = ({ title, status, color }: { title: string, status: string, color: string }) => {
    const columnRequests = requests.filter(r => r.status === status);
    return (
      <div className="flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 h-full flex flex-col shadow-inner border border-gray-100">
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${color}`}>
          <h3 className="font-bold text-gray-700">{title}</h3>
          <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
            {columnRequests.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {columnRequests.length === 0 ? (
            <div className="h-20 flex items-center justify-center text-gray-400 text-xs italic">Vazio</div>
          ) : (
            columnRequests.map(req => <RequestCard key={req.id} req={req} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans flex flex-col">
      {/* Header com Logo */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="w-full max-w-7xl mx-auto px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => setLocation("/admin/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition"><ArrowLeft size={20} /></button>
            <div className="h-8 w-[1px] bg-gray-300 mx-2 hidden md:block"></div>
            
            {/* LOGO RESTAURADA */}
            <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Afya" className="h-8 w-auto object-contain" onError={(e) => {e.currentTarget.style.display='none'}} />
                <div>
                    <h1 className="text-lg font-bold text-gray-800 leading-tight">Gestão de Rematrícula</h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Fluxo de Análise</p>
                </div>
            </div>
          </div>
          
          <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d31c5b] text-white text-sm font-bold hover:bg-[#a01545] transition shadow-lg shadow-pink-200">
            <Share2 size={16} /> Link para Alunos
          </button>
        </div>
      </header>

      {/* Main Kanban */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)]">
          <KanbanColumn title="Novas Solicitações" status="pendente" color="border-yellow-400" />
          <KanbanColumn title="Em Análise / Negociação" status="analise" color="border-blue-500" />
          <KanbanColumn title="Finalizado / Confeccionado" status="confeccionado" color="border-green-500" />
        </div>
      </main>

      {/* Modal de Detalhes */}
      <RequestDetailModal 
        request={selectedRequest} 
        isOpen={!!selectedRequest} 
        onClose={() => setSelectedRequest(null)}
        onUpdate={handleUpdateRequest}
      />

      {/* Modal de Share Link */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full m-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div><h3 className="text-lg font-bold text-gray-800">Link para Alunos</h3><p className="text-sm text-gray-500">Envie este link para iniciar o processo.</p></div>
              <button onClick={() => setIsShareModalOpen(false)}><XCircle size={24} className="text-gray-400 hover:text-red-500" /></button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2 mb-6">
              <input type="text" readOnly value={shareLink} className="bg-transparent flex-1 text-sm text-gray-600 outline-none" />
              <button onClick={handleCopyLink} className="text-gray-500 hover:text-blue-600 transition">
                {linkCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}