import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from "wouter";
import { db } from "@/lib/firebase"; 
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { 
  MessageCircle, Paperclip, Send, CheckCircle, Clock, FileText, 
  AlertCircle, ExternalLink, XCircle, ArrowLeft, Share2, Copy, Check, Trash2, User, RefreshCw
} from 'lucide-react';

// --- TIPAGEM GERAL ---
interface Message {
  id: number;
  sender: 'student' | 'coordinator';
  text: string;
  time: string;
  type: 'text' | 'system' | 'file';
}

interface Request {
  id: string;
  studentName: string;
  ra: string;
  status: string; 
  lastUpdate: string;
  unreadMessages: boolean;
  isFinalized: boolean;
  messages: Message[];
  cpf?: string;
  phone?: string;
  subjects?: string;
}

// --- SUB-COMPONENTES ---

const ChatInterface = ({ 
  request, 
  isActive, 
  onSendMessage, 
  onToggleFinal 
}: { 
  request: Request; 
  isActive: boolean; 
  // CORREÇÃO AQUI: Adicionado 'system'
  onSendMessage: (id: string, text: string, sender: 'coordinator' | 'student', type?: 'text'|'system'|'file') => void;
  onToggleFinal: (id: string) => void;
}) => {
  const [inputText, setInputText] = useState("");
  const [senderMode, setSenderMode] = useState<'coordinator' | 'student'>('coordinator');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isActive) return null;

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(request.id, inputText, senderMode, 'text');
    setInputText("");
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendMessage(request.id, `Arquivo: ${file.name}`, senderMode, 'file');
    }
  };

  return (
    <div className="mt-4 border-t pt-4 bg-gray-50 rounded-b-lg -mx-4 px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
      
      <div className="bg-yellow-50 p-3 rounded mb-3 text-xs text-yellow-800 border border-yellow-200">
        <span className="font-bold block mb-1">Disciplinas Solicitadas:</span>
        {request.subjects || "Não informado."}
      </div>

      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {request.messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 italic py-2">Inicie a conversa ou transcreva a resposta do aluno...</p>
        )}
        {request.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'coordinator' || msg.type === 'system' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm relative ${
              msg.type === 'system' ? 'bg-red-100 text-red-800 border border-red-200 w-full text-center font-bold' : 
              msg.sender === 'coordinator' ? 'bg-blue-100 text-blue-900 rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
            }`}>
              {msg.sender === 'student' && msg.type !== 'system' && <p className="text-[10px] font-bold text-gray-500 mb-1">Aluno disse:</p>}
              
              {msg.type === 'file' && <div className="flex items-center gap-2 mb-1 font-semibold text-blue-700"><FileText size={16} /> {msg.text.replace('Arquivo: ', '')}</div>}
              {msg.type !== 'file' && <p>{msg.text}</p>}
              
              <span className="text-[10px] opacity-60 block text-right mt-1">{msg.time}</span>
            </div>
          </div>
        ))}
      </div>

      {!request.isFinalized ? (
        <div className="flex flex-col gap-2">
          
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-200 w-fit px-2 py-1 rounded-full self-end">
            <span>Escrever como:</span>
            <button 
              onClick={() => setSenderMode('coordinator')}
              className={`px-2 py-0.5 rounded-full transition ${senderMode === 'coordinator' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300'}`}
            >
              Eu (Coord)
            </button>
            <button 
              onClick={() => setSenderMode('student')}
              className={`px-2 py-0.5 rounded-full transition ${senderMode === 'student' ? 'bg-green-600 text-white shadow' : 'hover:bg-gray-300'}`}
            >
              Aluno
            </button>
          </div>

          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />
            
            <button 
              title="Anexar Arquivo" 
              onClick={handleFileClick} 
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
            >
              <Paperclip size={20} />
            </button>
            
            <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              placeholder={senderMode === 'coordinator' ? "Digite a proposta..." : "Transcreva a resposta do aluno..."}
              className={`flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 transition
                ${senderMode === 'coordinator' ? 'border-gray-300 focus:ring-blue-500' : 'border-green-300 focus:ring-green-500 bg-green-50'}`} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            />
            
            <button 
              onClick={handleSend} 
              className={`p-2 rounded-full text-white transition ${senderMode === 'coordinator' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <Send size={18} />
            </button>
          </div>
          
          <div className="flex justify-between items-center mt-2 border-t border-gray-200 pt-2">
            <button onClick={() => onToggleFinal(request.id)} className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 px-3 py-1 rounded border border-red-200">
              <AlertCircle size={12} /> PROPOSTA FINAL
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 text-sm italic py-2 bg-gray-100 rounded">Negociação encerrada.</div>
      )}
    </div>
  );
};

const RequestCard = ({ 
  request, 
  activeChatId, 
  onToggleChat, 
  onChangeStatus,
  onDelete,
  onSendMessage,
  onToggleFinal,
  onViewStudentLink
}: { 
  request: Request; 
  activeChatId: string | null; 
  onToggleChat: (id: string) => void; 
  onChangeStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  // CORREÇÃO AQUI: Adicionado 'system'
  onSendMessage: (id: string, text: string, sender: 'coordinator' | 'student', type?: 'text'|'system'|'file') => void;
  onToggleFinal: (id: string) => void;
  onViewStudentLink: (id: string) => void;
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3 transition-all hover:shadow-md ${request.unreadMessages ? 'border-l-4 border-l-green-500' : ''}`}>
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-bold text-gray-800">{request.studentName}</h4>
        <p className="text-xs text-gray-500">CPF: {request.ra}</p>
        <p className="text-xs text-gray-400 mt-1">{request.phone}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onViewStudentLink(request.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded" title="Ver Link do Aluno"><ExternalLink size={16} /></button>
        <button onClick={() => onDelete(request.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Excluir Solicitação"><Trash2 size={16} /></button>
        
        <button onClick={() => onToggleChat(request.id)} className={`relative p-2 rounded-full transition ml-1 ${activeChatId === request.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <MessageCircle size={18} />
          {request.unreadMessages && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>
      </div>
    </div>
    <div className="mt-3 flex items-center justify-between">
      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> {request.lastUpdate}</span>
      <select value={request.status} onChange={(e) => onChangeStatus(request.id, e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
        <option value="pendente">Pendente</option>
        <option value="analise">Em Análise</option>
        <option value="confeccionado">Confeccionado</option>
      </select>
    </div>
    
    <ChatInterface 
      request={request} 
      isActive={activeChatId === request.id} 
      onSendMessage={onSendMessage} 
      onToggleFinal={onToggleFinal} 
    />
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function ReenrollmentManager() {
  const [_, setLocation] = useLocation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [studentViewId, setStudentViewId] = useState<string | null>(null);
  
  // Modais
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareLink = `${window.location.origin}/solicitacao-rematricula`;

  // --- CONEXÃO FIREBASE ---
  useEffect(() => {
    const q = query(collection(db, "reenrollment_requests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          studentName: data.studentName,
          ra: data.cpf || "S/ CPF",
          status: data.status === 'pending' ? 'pendente' : data.status,
          lastUpdate: data.lastUpdate || "Recente",
          unreadMessages: data.unreadMessages || false,
          isFinalized: data.isFinalized || false,
          messages: data.messages || [],
          phone: data.phone,
          subjects: data.subjects
        } as Request;
      });
      setRequests(firebaseData);
    });
    return () => unsubscribe();
  }, []);

  // --- FUNÇÕES DE AÇÃO ---

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja EXCLUIR esta solicitação? Essa ação não pode ser desfeita.")) {
      try {
        await deleteDoc(doc(db, "reenrollment_requests", id));
      } catch (error) {
        console.error("Erro ao deletar", error);
        alert("Erro ao deletar solicitação.");
      }
    }
  };

  const handleToggleChat = async (id: string) => {
    if (activeChatId === id) {
      setActiveChatId(null);
    } else {
      setActiveChatId(id);
      const reqRef = doc(db, "reenrollment_requests", id);
      await updateDoc(reqRef, { unreadMessages: false });
    }
  };

  const handleChangeStatus = async (id: string, newStatus: string) => {
    const reqRef = doc(db, "reenrollment_requests", id);
    await updateDoc(reqRef, { 
      status: newStatus,
      lastUpdate: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
    });
  };

  // CORREÇÃO AQUI: Adicionado 'system'
  const handleSendMessage = async (reqId: string, text: string, sender: 'coordinator' | 'student', type: 'text'|'system'|'file' = 'text') => {
    const request = requests.find(r => r.id === reqId);
    if (!request) return;

    const newMsg: Message = {
      id: Date.now(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type
    };

    const updatedMessages = [...request.messages, newMsg];
    const reqRef = doc(db, "reenrollment_requests", reqId);
    
    await updateDoc(reqRef, {
      messages: updatedMessages,
      unreadMessages: sender === 'student', 
      lastUpdate: 'Agora'
    });
  };

  const handleToggleFinal = async (reqId: string) => {
    await handleSendMessage(reqId, "Esta é a PROPOSTA FINAL. Não há mais margem para alterações.", 'coordinator', 'system');
    const reqRef = doc(db, "reenrollment_requests", reqId);
    await updateDoc(reqRef, { isFinalized: true, status: 'confeccionado' });
  };

  // --- UTILS ---
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const handleWhatsAppShare = () => {
    const message = `Olá! Acesse o link para realizar sua solicitação de rematrícula: ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- MODAIS ---
  const ShareModal = () => isShareModalOpen ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full m-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4">
          <div><h3 className="text-lg font-bold text-gray-800">Compartilhar Link</h3><p className="text-sm text-gray-500">Envie para os alunos.</p></div>
          <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2 mb-6">
          <input type="text" readOnly value={shareLink} className="bg-transparent flex-1 text-sm text-gray-600 outline-none" />
          <button onClick={handleCopyLink} className="text-gray-500 hover:text-blue-600 transition">{linkCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}</button>
        </div>
        <button onClick={handleWhatsAppShare} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><MessageCircle size={20} /> Enviar via WhatsApp</button>
      </div>
    </div>
  ) : null;

  const StudentTrackingModal = () => {
    if (!studentViewId) return null;
    const req = requests.find(r => r.id === studentViewId);
    if (!req) return null;
    const steps = [
      { id: 'pendente', label: 'Solicitação Enviada', completed: true },
      { id: 'analise', label: 'Em Análise', completed: req.status === 'analise' || req.status === 'confeccionado' },
      { id: 'confeccionado', label: 'Finalizado', completed: req.status === 'confeccionado' }
    ];
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full m-4">
          <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-gray-800">Status</h3><button onClick={() => setStudentViewId(null)}><XCircle size={24} className="text-gray-400" /></button></div>
          <div className="space-y-6 relative">
            <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-200 -z-10"></div>
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${step.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-300'}`}>{step.completed ? <CheckCircle size={16} /> : <div className="w-2 h-2 bg-gray-300 rounded-full"></div>}</div>
                <div><h4 className={`font-medium ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</h4>{step.id === req.status || (step.id === 'pendente' && req.status === 'pending') ? <p className="text-xs text-blue-600 mt-1 font-semibold animate-pulse">Status Atual</p> : null}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const KanbanColumn = ({ title, status, color }: { title: string, status: string, color: string }) => {
    const columnRequests = requests.filter(r => {
      if (status === 'pendente') return r.status === 'pendente' || r.status === 'pending';
      return r.status === status;
    });

    return (
      <div className="flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 h-full flex flex-col shadow-inner">
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${color}`}>
          <h3 className="font-bold text-gray-700">{title}</h3>
          <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{columnRequests.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[200px]">
          {columnRequests.length === 0 ? <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm italic">Vazio</div> : columnRequests.map(req => (
            <RequestCard 
              key={req.id} 
              request={req} 
              activeChatId={activeChatId}
              onToggleChat={handleToggleChat}
              onChangeStatus={handleChangeStatus}
              onDelete={handleDelete}
              onSendMessage={handleSendMessage}
              onToggleFinal={handleToggleFinal}
              onViewStudentLink={setStudentViewId}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans flex flex-col">
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={() => setLocation("/admin/dashboard")} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition"><ArrowLeft size={20} /></button>
            <div className="h-10 w-auto">
              <img src="/logo.png" alt="Logo Afya" className="h-full w-auto object-contain" onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement?.classList.add('bg-gray-200', 'flex', 'items-center', 'justify-center', 'rounded'); e.currentTarget.parentElement!.innerText='LOGO';}} />
            </div>
            <div className="h-8 w-[1px] bg-gray-300 mx-2 hidden md:block"></div>
            <div><h1 className="text-xl font-bold text-gray-800 leading-tight">Gestão de Rematrícula</h1><p className="text-xs text-gray-500">Fluxo de análise de solicitações</p></div>
          </div>
          <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm hover:shadow"><Share2 size={16} /> Compartilhar Link</button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
          <KanbanColumn title="Pendentes" status="pendente" color="border-yellow-400" />
          <KanbanColumn title="Em Análise" status="analise" color="border-blue-500" />
          <KanbanColumn title="Confeccionado" status="confeccionado" color="border-green-500" />
        </div>
      </main>
      <ShareModal />
      <StudentTrackingModal />
    </div>
  );
}