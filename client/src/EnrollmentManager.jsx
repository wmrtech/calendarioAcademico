import React, { useState } from 'react';
import { 
  MessageCircle, 
  Paperclip, 
  Send, 
  CheckCircle, 
  Clock, 
  FileText, 
  AlertCircle, 
  MoreVertical,
  ExternalLink,
  XCircle
} from 'lucide-react';

// --- MOCK DATA ---
const initialRequests = [
  {
    id: 1,
    studentName: "João da Silva",
    ra: "123456",
    status: "pendente", // pendente, analise, confeccionado
    lastUpdate: "10 min atrás",
    unreadMessages: true,
    isFinalized: false,
    messages: [
      { id: 1, sender: 'student', text: 'Gostaria de solicitar a quebra de pré-requisito de Patologia.', time: '10:00', type: 'text' }
    ]
  },
  {
    id: 2,
    studentName: "Maria Oliveira",
    ra: "789012",
    status: "analise",
    lastUpdate: "1 hora atrás",
    unreadMessages: false,
    isFinalized: false,
    messages: [
      { id: 1, sender: 'student', text: 'Solicito revisão da minha grade para o 5º período.', time: '09:00', type: 'text' },
      { id: 2, sender: 'coordinator', text: 'Olá Maria, recebemos sua solicitação. Estou analisando.', time: '09:15', type: 'text' }
    ]
  },
  {
    id: 3,
    studentName: "Carlos Souza",
    ra: "345678",
    status: "confeccionado",
    lastUpdate: "1 dia atrás",
    unreadMessages: false,
    isFinalized: true,
    messages: [
      { id: 1, sender: 'student', text: 'Grade aceita. Obrigado.', time: 'Ontem', type: 'text' },
      { id: 2, sender: 'coordinator', text: 'Proposta Finalizada. Matrícula realizada.', time: 'Ontem', type: 'system' }
    ]
  }
];

// Componente Principal
export default function EnrollmentManager() {
  const [requests, setRequests] = useState(initialRequests);
  const [activeChatId, setActiveChatId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [studentViewId, setStudentViewId] = useState(null); // Para simular a visão do aluno

  // Funções de Manipulação
  const changeStatus = (id, newStatus) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: newStatus } : req
    ));
  };

  const sendMessage = (reqId, text, sender = 'coordinator', type = 'text') => {
    if (!text && type === 'text') return;

    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        const newMsg = {
          id: Date.now(),
          sender,
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type
        };
        return { 
          ...req, 
          messages: [...req.messages, newMsg],
          unreadMessages: sender === 'student', // Se aluno manda, fica não lido para coord
          lastUpdate: 'Agora'
        };
      }
      return req;
    }));
    setInputText("");
  };

  const toggleFinalProposal = (reqId) => {
    sendMessage(reqId, "Esta é a PROPOSTA FINAL. Não há mais margem para alterações.", 'coordinator', 'system');
    setRequests(prev => prev.map(req => 
      req.id === reqId ? { ...req, isFinalized: true, status: 'confeccionado' } : req
    ));
  };

  const markAsRead = (reqId) => {
    setRequests(prev => prev.map(req => 
      req.id === reqId ? { ...req, unreadMessages: false } : req
    ));
  };

  // --- COMPONENTES INTERNOS ---

  // 1. O Chat Expansível
  const ChatInterface = ({ request }) => {
    if (activeChatId !== request.id) return null;

    return (
      <div className="mt-4 border-t pt-4 bg-gray-50 rounded-b-lg -mx-4 px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
        
        {/* Área de Mensagens */}
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {request.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'coordinator' || msg.type === 'system' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm relative
                  ${msg.type === 'system' ? 'bg-red-100 text-red-800 border border-red-200 w-full text-center font-bold' : 
                    msg.sender === 'coordinator' ? 'bg-blue-100 text-blue-900 rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                  }`}
              >
                {msg.type === 'file' && (
                  <div className="flex items-center gap-2 mb-1 font-semibold text-blue-700">
                    <FileText size={16} /> Análise Curricular.pdf
                  </div>
                )}
                <p>{msg.text}</p>
                <span className="text-[10px] opacity-60 block text-right mt-1">{msg.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Área de Input (Só aparece se não finalizado) */}
        {!request.isFinalized ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button 
                title="Anexar Análise Curricular"
                onClick={() => sendMessage(request.id, "Análise Curricular enviada.", 'coordinator', 'file')}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite a proposta ou resposta..." 
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(request.id, inputText)}
              />
              <button 
                onClick={() => sendMessage(request.id, inputText)}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition"
              >
                <Send size={18} />
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-2 border-t border-gray-200 pt-2">
              <button 
                onClick={() => toggleFinalProposal(request.id)}
                className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 px-3 py-1 rounded border border-red-200"
              >
                <AlertCircle size={12} /> PROPOSTA FINAL
              </button>

              {/* SIMULADOR DE RESPOSTA DO ALUNO (DEV ONLY) */}
              <button 
                onClick={() => sendMessage(request.id, "Não concordo, preciso de mais aulas.", 'student')}
                className="text-[10px] text-gray-400 hover:text-green-600 border border-dashed border-gray-300 px-2 rounded"
              >
                (Simular resposta Aluno)
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm italic py-2 bg-gray-100 rounded">
            Negociação encerrada.
          </div>
        )}
      </div>
    );
  };

  // 2. O Cartão do Kanban
  const RequestCard = ({ request }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3 transition-all hover:shadow-md ${request.unreadMessages ? 'border-l-4 border-l-green-500' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-gray-800">{request.studentName}</h4>
          <p className="text-xs text-gray-500">RA: {request.ra}</p>
        </div>
        <div className="flex items-center gap-2">
           {/* Botão para ver link do aluno */}
           <button 
            onClick={() => setStudentViewId(request.id)}
            className="text-gray-400 hover:text-blue-600" 
            title="Ver Link do Aluno"
          >
            <ExternalLink size={16} />
          </button>
          
          {/* Botão de Chat */}
          <button 
            onClick={() => {
              if (activeChatId === request.id) {
                setActiveChatId(null);
              } else {
                setActiveChatId(request.id);
                markAsRead(request.id);
              }
            }}
            className={`relative p-2 rounded-full transition ${activeChatId === request.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <MessageCircle size={18} />
            {request.unreadMessages && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} /> {request.lastUpdate}
        </span>
        
        {/* Dropdown Simples de Status */}
        <select 
          value={request.status}
          onChange={(e) => changeStatus(request.id, e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="pendente">Pendente</option>
          <option value="analise">Em Análise</option>
          <option value="confeccionado">Confeccionado</option>
        </select>
      </div>

      <ChatInterface request={request} />
    </div>
  );

  // 3. Coluna do Kanban
  const KanbanColumn = ({ title, status, color }) => (
    <div className="flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 h-full flex flex-col">
      <div className={`flex items-center gap-2 mb-4 pb-2 border-b-2 ${color}`}>
        <h3 className="font-bold text-gray-700">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
          {requests.filter(r => r.status === status).length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {requests.filter(r => r.status === status).map(req => (
          <RequestCard key={req.id} request={req} />
        ))}
      </div>
    </div>
  );

  // 4. Modal de Visualização do Aluno (Simulação)
  const StudentTrackingModal = () => {
    if (!studentViewId) return null;
    const req = requests.find(r => r.id === studentViewId);
    
    // Passos do Progresso
    const steps = [
      { id: 'pendente', label: 'Solicitação Enviada', completed: true },
      { id: 'analise', label: 'Em Análise pela Coordenação', completed: req.status === 'analise' || req.status === 'confeccionado' },
      { id: 'confeccionado', label: 'Confeccionado / Finalizado', completed: req.status === 'confeccionado' }
    ];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full m-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-gray-800">Acompanhamento de Solicitação</h3>
            <button onClick={() => setStudentViewId(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
          </div>
          
          <div className="space-y-6 relative">
             {/* Linha vertical de conexão visual */}
            <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-200 -z-10"></div>

            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${step.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-300'}`}>
                  {step.completed ? <CheckCircle size={16} /> : <div className="w-2 h-2 bg-gray-300 rounded-full"></div>}
                </div>
                <div>
                  <h4 className={`font-medium ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</h4>
                  {step.id === req.status && (
                    <p className="text-xs text-blue-600 mt-1 font-semibold animate-pulse">Status Atual</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t text-center">
            <p className="text-sm text-gray-500">Última atualização: {req.lastUpdate}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen font-sans">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Rematrícula - Medicina</h1>
        <p className="text-gray-500 text-sm">Painel da Coordenação</p>
      </header>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-150px)]">
        <KanbanColumn title="Pendentes" status="pendente" color="border-yellow-400" />
        <KanbanColumn title="Em Análise" status="analise" color="border-blue-500" />
        <KanbanColumn title="Confeccionado" status="confeccionado" color="border-green-500" />
      </div>

      <StudentTrackingModal />
    </div>
  );
}