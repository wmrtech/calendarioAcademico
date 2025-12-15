import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Employee, Availability, ExamStatus, Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftIcon, ClockIcon, 
  CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon,
  PlayIcon, LockClosedIcon, UserGroupIcon,
  ComputerDesktopIcon, AcademicCapIcon
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import AllocationBoard from "@/components/AllocationBoard";
import OccurrenceManager from "@/components/OccurrenceManager";

export default function ExamDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/exams/:id"); // Pega o ID da URL
  const examId = params?.id;

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  
  // Dados para cruzamento
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!user) { setLocation("/"); return; }
    if (examId) fetchData();
  }, [user, examId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!examId) return;

      // 1. Busca a Prova
      const examSnap = await getDoc(doc(db, "exams", examId));
      if (!examSnap.exists()) {
        toast.error("Prova não encontrada");
        setLocation("/admin/exams");
        return;
      }
      setExam({ id: examSnap.id, ...examSnap.data() } as Exam);

      // 2. Busca Funcionários
      const empQ = query(collection(db, "employees"));
      const empSnap = await getDocs(empQ);
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));

      // 3. Busca Disponibilidades já respondidas para ESTA prova
      const availQ = query(collection(db, "availabilities"), where("examId", "==", examId));
      const availSnap = await getDocs(availQ);
      setAvailabilities(availSnap.docs.map(d => ({ id: d.id, ...d.data() } as Availability)));

      // 4. Busca Salas (Necessário para o AllocationBoard)
      const roomQ = query(collection(db, "rooms"), orderBy("name"));
      const roomSnap = await getDocs(roomQ);
      setRooms(roomSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));

    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  // --- AÇÕES ---
  const updateStatus = async (newStatus: ExamStatus) => {
      if (!exam) return;
      try {
          await updateDoc(doc(db, "exams", exam.id), { status: newStatus });
          setExam({ ...exam, status: newStatus });
          toast.success(`Status alterado para: ${newStatus}`);
      } catch (err) {
          toast.error("Erro ao atualizar status");
      }
  };

  // --- CÁLCULOS (Dashboard Rápido) ---
  const stats = useMemo(() => {
    const available = availabilities.filter(a => a.isAvailable).length;
    const unavailable = availabilities.filter(a => !a.isAvailable).length;
    const pending = employees.length - (available + unavailable);
    return { available, unavailable, pending };
  }, [employees, availabilities]);

  // Cruzamento de Dados para a Tabela de Disponibilidade
  const roster = useMemo(() => {
      return employees.map(emp => {
          const answer = availabilities.find(a => a.employeeId === emp.id);
          return {
              ...emp,
              availabilityStatus: answer ? (answer.isAvailable ? 'yes' : 'no') : 'pending',
              responseDate: answer?.updatedAt
          };
      }).sort((a, b) => {
          // Ordena: Disponíveis primeiro, depois pendentes, depois não
          const order = { 'yes': 1, 'pending': 2, 'no': 3 };
          return order[a.availabilityStatus as 'yes'|'no'|'pending'] - order[b.availabilityStatus as 'yes'|'no'|'pending'];
      });
  }, [employees, availabilities]);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando painel...</div>;
  if (!exam) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-16 shadow-sm flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/admin/exams")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
                <h1 className="text-sm font-display font-bold text-gray-900 leading-tight">Painel da Prova</h1>
                <p className="text-[10px] text-gray-500">{exam.title}</p>
            </div>
        </div>
        
        {/* Controles de Status */}
        <div className="flex items-center gap-2">

            <Button 
                variant="outline"
                onClick={() => window.open(`/board/${exam.id}`, '_blank')} 
                className="text-xs h-9 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                title="Abrir Mural Público (Telão)"
            >
                <ComputerDesktopIcon className="w-4 h-4" /> Mural
            </Button>

            <Button 
                variant="outline"
                onClick={() => window.open(`/student-board/${exam.id}`, '_blank')} 
                className="text-xs h-9 gap-2 border-pink-200 text-pink-700 hover:bg-pink-50 ml-2"
                title="Abrir Mural dos Alunos"
            >
                <AcademicCapIcon className="w-4 h-4" /> Alunos
            </Button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div> {/* Separador visual */}

            {exam.status === 'draft' && (
                <Button onClick={() => updateStatus('availability_open')} className="neo-btn bg-blue-600 hover:bg-blue-700 flex gap-2 text-xs">
                    <PlayIcon className="w-4 h-4" /> Iniciar Coleta
                </Button>
            )}
            {exam.status === 'availability_open' && (
                <Button onClick={() => updateStatus('allocating')} className="neo-btn bg-yellow-500 hover:bg-yellow-600 flex gap-2 text-xs border-yellow-600">
                    <UserGroupIcon className="w-4 h-4" /> Fechar & Distribuir
                </Button>
            )}
            {exam.status !== 'closed' && (
                 <Button variant="outline" onClick={() => updateStatus('closed')} className="text-xs h-9 text-gray-500">
                    <LockClosedIcon className="w-4 h-4 mr-1" /> Encerrar
                </Button>
            )}
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 max-w-6xl">
        
        {/* Info Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between">
            <div className="flex gap-4">
                <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-100 min-w-[80px]">
                     <span className="block text-xs font-bold text-purple-400 uppercase">{format(parseISO(exam.date), 'MMM', { locale: ptBR })}</span>
                     <span className="block text-3xl font-black text-purple-900">{format(parseISO(exam.date), 'dd')}</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{exam.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {exam.startTime} - {exam.endTime}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{exam.type}</span>
                    </div>
                </div>
            </div>
            
            {/* Mini Dashboard de Respostas */}
            <div className="flex gap-4">
                <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                    <p className="text-[10px] uppercase font-bold text-green-400">Disponíveis</p>
                </div>
                <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-2xl font-bold text-red-600">{stats.unavailable}</p>
                    <p className="text-[10px] uppercase font-bold text-red-400">Recusas</p>
                </div>
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Pendentes</p>
                </div>
            </div>
        </div>

        {/* Lista de Acompanhamento (Só aparece se NÃO estiver alocando ou fechada, para economizar espaço visual, ou mantenha sempre se preferir) */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-700">Acompanhamento de Disponibilidade</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Funcionário</th>
                                <th className="px-6 py-3">Função</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {roster.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-3 font-medium text-gray-900">{emp.name}</td>
                                    <td className="px-6 py-3 text-gray-500 text-xs">{emp.role}</td>
                                    <td className="px-6 py-3 text-center">
                                        {emp.availabilityStatus === 'yes' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                <CheckCircleIcon className="w-4 h-4" /> Disponível
                                            </span>
                                        )}
                                        {emp.availabilityStatus === 'no' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                <XCircleIcon className="w-4 h-4" /> Indisponível
                                            </span>
                                        )}
                                        {emp.availabilityStatus === 'pending' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold opacity-70">
                                                <QuestionMarkCircleIcon className="w-4 h-4" /> Pendente
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        

        {/* --- QUADRO DE ALOCAÇÃO (Só aparece se status for allocating ou closed) --- */}
        {(exam.status === 'allocating' || exam.status === 'closed') && (
            <div className="mt-8 pt-8 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-4">
                <AllocationBoard 
                    exam={exam}
                    employees={employees}
                    rooms={rooms}
                    availabilities={availabilities}
                />
            </div>
        )}

        {/* --- NOVO: OCORRÊNCIAS (Sempre visível ou apenas ao finalizar) --- */}
        {/* Sugiro deixar sempre visível para anotar coisas durante a alocação também */}
        <div className="mt-8 pt-8 border-t border-gray-200">
            <OccurrenceManager exam={exam} employees={employees} />
        </div>

      </main>
    </div>
  );
}