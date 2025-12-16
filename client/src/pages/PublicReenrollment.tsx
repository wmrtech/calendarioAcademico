import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircleIcon, UserIcon, PhoneIcon, IdentificationIcon, BookOpenIcon, ClockIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

// --- DEFINIÇÃO LOCAL PARA EVITAR CRASH (TELA BRANCA) ---
// Se a importação de @/lib/types falhar, esta constante garante que a página abra.
const ACADEMIC_PERIODS = [
    { id: '1', label: '1º Período' },
    { id: '2', label: '2º Período' },
    { id: '3', label: '3º Período' },
    { id: '4', label: '4º Período' },
    { id: '5', label: '5º Período' },
    { id: '6', label: '6º Período' },
    { id: '7', label: '7º Período' },
    { id: '8', label: '8º Período' },
    { id: '9', label: '9º Período' },
    { id: '10', label: '10º Período' },
    { id: '11', label: '11º Período' },
    { id: '12', label: '12º Período' },
];

// --- COMPONENTE DE RASTREAMENTO (Status) ---
const RequestTracker = ({ requestId, onReset }: { requestId: string, onReset: () => void }) => {
    const [requestData, setRequestData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reenrollment_requests", requestId), (doc) => {
            if (doc.exists()) {
                setRequestData(doc.data());
            } else {
                setRequestData(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [requestId]);

    if (loading) return <div className="min-h-screen bg-[#d31c5b] flex items-center justify-center text-white font-bold animate-pulse">Carregando status...</div>;
    
    // Caso o ID salvo não exista mais no banco
    if (!requestData) {
        return (
            <div className="min-h-screen bg-[#d31c5b] flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
                <p>Solicitação não encontrada.</p>
                <Button variant="secondary" onClick={onReset}>Realizar Nova Solicitação</Button>
            </div>
        );
    }

    const steps = [
        { id: 'pending', label: 'Solicitação Enviada', completed: true },
        { id: 'analise', label: 'Em Análise', completed: requestData.status === 'analise' || requestData.status === 'confeccionado' },
        { id: 'confeccionado', label: 'Finalizado', completed: requestData.status === 'confeccionado' }
    ];

    return (
        <div className="min-h-screen bg-[#d31c5b] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 font-sans">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 relative overflow-hidden">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Recebemos seu Pedido!</h1>
                    <p className="text-gray-500 text-sm mt-2">Acompanhe o status em tempo real.</p>
                </div>

                <div className="space-y-6 relative mb-8 ml-4">
                    <div className="absolute left-[15px] top-2 bottom-4 w-0.5 bg-gray-100 -z-10"></div>
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-4 group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 z-10 ${step.completed ? 'bg-green-500 border-green-500 text-white scale-110 shadow-lg shadow-green-200' : 'bg-white border-gray-200 text-gray-300'}`}>
                                {step.completed ? <CheckCircleIcon className="w-5 h-5" /> : <div className="w-2 h-2 bg-gray-200 rounded-full" />}
                            </div>
                            <div className="pt-1">
                                <h4 className={`text-sm font-bold transition-colors ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>{step.label}</h4>
                                {(requestData.status === step.id || (step.id === 'pending' && requestData.status === 'pending')) && (
                                    <p className="text-xs text-[#d31c5b] mt-1 font-medium animate-pulse flex items-center gap-1"><ClockIcon className="w-3 h-3" /> Status Atual</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6 text-center">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Protocolo</p>
                    <p className="text-sm font-mono text-gray-600 select-all font-bold">{requestId}</p>
                </div>

                <Button onClick={onReset} variant="outline" className="w-full border-dashed border-gray-300 text-gray-500 hover:text-[#d31c5b] hover:border-[#d31c5b] hover:bg-pink-50 transition-all">
                    <ArrowPathIcon className="w-4 h-4 mr-2" /> Nova Solicitação
                </Button>

                <div className="mt-6 text-center text-[10px] text-gray-400 leading-tight">
                    O retorno final com a proposta de horário será disponibilizado aqui.
                </div>
            </div>
        </div>
    );
};

// --- FORMULÁRIO PRINCIPAL ---
export default function PublicReenrollment() {
  const [loading, setLoading] = useState(false);

  // Recupera ID submetido anteriormente para não perder o status ao dar F5
  const [submittedId, setSubmittedId] = useState<string | null>(() => {
      // Verifica se estamos no navegador antes de acessar localStorage
      if (typeof window !== 'undefined') {
          return localStorage.getItem('last_reenrollment_id');
      }
      return null;
  });
  
  const [formData, setFormData] = useState({
    studentName: "",
    cpf: "",
    phone: "",
    currentPeriod: "",
    subjects: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentPeriod) {
        toast.error("Selecione seu período atual.");
        return;
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "reenrollment_requests"), {
        ...formData,
        studentName: formData.studentName.toUpperCase(),
        status: "pending",
        isFinalized: false,
        unreadMessages: true,
        messages: [],
        createdAt: Timestamp.now(),
        lastUpdate: "Agora"
      });

      const newId = docRef.id;
      localStorage.setItem('last_reenrollment_id', newId);
      setSubmittedId(newId);
      toast.success("Solicitação enviada com sucesso!");

    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
      if(window.confirm("Iniciar nova solicitação?")) {
          localStorage.removeItem('last_reenrollment_id');
          setSubmittedId(null);
          setFormData({ studentName: "", cpf: "", phone: "", currentPeriod: "", subjects: "" });
      }
  };

  if (submittedId) return <RequestTracker requestId={submittedId} onReset={handleReset} />;

  return (
    <div className="min-h-screen bg-[#d31c5b] flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        <div className="bg-gray-50 border-b border-gray-100 p-8 pb-6 text-center">
            <img src="/logo.png" alt="Afya" className="h-10 mx-auto mb-4 object-contain" onError={(e) => {e.currentTarget.style.display='none'}} />
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">Solicitação de Rematrícula</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
                Oferta Especial de Disciplinas
            </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
            
            <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Nome Completo</Label>
                <Input required className="h-11 bg-gray-50 border-gray-200 focus:border-[#d31c5b] focus:ring-0" value={formData.studentName} onChange={e => setFormData({...formData, studentName: e.target.value})} placeholder="Seu nome" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><IdentificationIcon className="w-3 h-3" /> CPF</Label>
                    <Input required className="h-11 bg-gray-50 border-gray-200 focus:border-[#d31c5b] focus:ring-0" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><PhoneIcon className="w-3 h-3" /> Telefone</Label>
                    <Input required className="h-11 bg-gray-50 border-gray-200 focus:border-[#d31c5b] focus:ring-0" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(35) 9..." />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-400">Período Atual</Label>
                <Select onValueChange={(val) => setFormData({...formData, currentPeriod: val})}>
                    <SelectTrigger className="h-11 bg-gray-50 border-gray-200 text-gray-600 focus:ring-[#d31c5b]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                        {ACADEMIC_PERIODS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1"><BookOpenIcon className="w-3 h-3" /> Disciplinas Desejadas</Label>
                <Textarea 
                    required 
                    className="min-h-[120px] bg-gray-50 border-gray-200 text-sm resize-none focus:border-[#d31c5b] focus:ring-0" 
                    placeholder="Descreva aqui quais matérias você precisa cursar (Ex: Anatomia I, Histologia II...)"
                    value={formData.subjects}
                    onChange={e => setFormData({...formData, subjects: e.target.value})}
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 bg-[#d31c5b] hover:bg-[#a01545] text-white font-bold text-base shadow-lg shadow-pink-200 rounded-xl mt-2 transition-all">
                {loading ? "Enviando..." : "Enviar Solicitação"}
            </Button>
        </form>
      </div>
    </div>
  );
}