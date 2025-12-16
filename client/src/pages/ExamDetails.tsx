import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Employee, Availability, ExamStatus, Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftIcon, ClockIcon, 
  CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon,
  PlayIcon, LockClosedIcon, UserGroupIcon,
  ComputerDesktopIcon, AcademicCapIcon,
  ShareIcon, TrashIcon
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import AllocationBoard from "@/components/AllocationBoard";
import OccurrenceManager from "@/components/OccurrenceManager";

export default function ExamDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/exams/:id");
  const examId = params?.id;

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  
  // Dados
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

      const examSnap = await getDoc(doc(db, "exams", examId));
      if (!examSnap.exists()) {
        toast.error("Prova não encontrada");
        setLocation("/admin/exams");
        return;
      }
      setExam({ id: examSnap.id, ...examSnap.data() } as Exam);

      const empQ = query(collection(db, "employees"));
      const empSnap = await getDocs(empQ);
      const allEmployees = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));

      const availQ = query(collection(db, "availabilities"), where("examId", "==", examId));
      const availSnap = await getDocs(availQ);
      const currentAvailabilities = availSnap.docs.map(d => ({ id: d.id, ...d.data() } as Availability));
      
      setAvailabilities(currentAvailabilities);

      const involvedEmployeeIds = new Set(currentAvailabilities.map(a => a.employeeId));
      const filteredEmployees = allEmployees.filter(e => involvedEmployeeIds.has(e.id));
      
      setEmployees(filteredEmployees);

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

  // --- FUNÇÃO DE LIMPEZA (FAXINA) ---
  const wipeExamData = async (deleteExamDoc: boolean = false) => {
    if (!examId) return;
    
    try {
        const batch = writeBatch(db);
        const availQ = query(collection(db, "availabilities"), where("examId", "==", examId));
        const availSnap = await getDocs(availQ);
        const employeeIdsToDelete: string[] = [];
        
        availSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.employeeId) employeeIdsToDelete.push(data.employeeId);
            batch.delete(docSnap.ref); 
        });

        employeeIdsToDelete.forEach((empId) => {
            const empRef = doc(db, "employees", empId);
            batch.delete(empRef);
        });

        if (deleteExamDoc) {
            const examRef = doc(db, "exams", examId);
            batch.delete(examRef);
        } else {
            const examRef = doc(db, "exams", examId);
            batch.update(examRef, { status: 'closed' });
        }

        await batch.commit();
        return true;
    } catch (error) {
        console.error("Erro na limpeza:", error);
        toast.error("Erro ao limpar dados da equipe.");
        return false;
    }
  };

  // --- AÇÕES ---
  const updateStatus = async (newStatus: ExamStatus) => {
      if (!exam) return;

      if (newStatus === 'closed') {
          if (confirm("ATENÇÃO: Ao encerrar a prova, a lista de fiscais será APAGADA. Deseja continuar?")) {
              const success = await wipeExamData(false);
              if (success) {
                  toast.success("Prova encerrada.");
                  setExam({ ...exam, status: 'closed' });
                  setEmployees([]);
                  setAvailabilities([]);
              }
          }
          return;
      }

      try {
          await updateDoc(doc(db, "exams", exam.id), { status: newStatus });
          setExam({ ...exam, status: newStatus });
          toast.success(`Status alterado para: ${newStatus}`);
      } catch (err) {
          toast.error("Erro ao atualizar status");
      }
  };

  const handleDeleteExam = async () => {
    if (confirm("TEM CERTEZA? Isso apagará a prova e TODOS os fiscais vinculados.")) {
        const success = await wipeExamData(true);
        if (success) {
            toast.success("Prova excluída.");
            setLocation("/admin/exams");
        }
    }
  };

  const handleCopyLink = () => {
    if (!exam) return;
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/registro-fiscal/${exam.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  // --- CÁLCULOS ---
  const stats = useMemo(() => {
    if (!exam) return { available: 0, unavailable: 0, pending: 0, required: 0, isDeficit: false };

    const available = availabilities.filter(a => a.isAvailable).length;
    const unavailable = availabilities.filter(a => !a.isAvailable).length;
    const pending = employees.length - (available + unavailable);
    const savedRequired = (exam as any).requiredStaff;
    const students = (exam as any).totalStudents;
    const required = savedRequired ? savedRequired : (students ? Math.ceil(students / 30) : 0);
    const isDeficit = available < required;

    return { available, unavailable, pending, required, isDeficit };
  }, [employees, availabilities, exam]);

  const roster = useMemo(() => {
      return employees.map(emp => {
          const answer = availabilities.find(a => a.employeeId === emp.id);
          return {
              ...emp,
              availabilityStatus: answer ? (answer.isAvailable ? 'yes' : 'no') : 'pending',
              responseDate: answer?.updatedAt
          };
      }).sort((a, b) => {
          const order = { 'yes': 1, 'pending': 2, 'no': 3 };
          return order[a.availabilityStatus as 'yes'|'no'|'pending'] - order[b.availabilityStatus as 'yes'|'no'|'pending'];
      });
  }, [employees, availabilities]);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando painel...</div>;
  if (!exam) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      
      {/* HEADER FIXO - Com Container alinhado */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
            {/* Esquerda: Voltar + Logo + Título */}
            <div className="flex items-center gap-4">
                <button onClick={() => setLocation("/admin/exams")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                
                <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                    <div>
                        <h1 className="text-sm font-display font-bold text-gray-900 leading-tight max-w-[200px] md:max-w-md truncate">
                            {exam.title}
                        </h1>
                        {exam.status === 'closed' && (
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">ENCERRADA</span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Direita: Botões */}
            <div className="flex items-center gap-2">
                
                {exam.status !== 'closed' && (
                    <Button 
                        variant="outline"
                        onClick={handleCopyLink}
                        className="text-xs h-9 gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hidden md:flex"
                    >
                        <ShareIcon className="w-4 h-4" /> <span className="hidden lg:inline">Link Convite</span>
                    </Button>
                )}

                <Button 
                    variant="outline"
                    onClick={() => window.open(`/board/${exam.id}`, '_blank')} 
                    className="text-xs h-9 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    title="Mural de Salas"
                >
                    <ComputerDesktopIcon className="w-4 h-4" /> <span className="hidden lg:inline">Mural</span>
                </Button>

                <Button 
                    variant="outline"
                    onClick={() => window.open(`/student-board/${exam.id}`, '_blank')} 
                    className="text-xs h-9 gap-2 border-pink-200 text-pink-700 hover:bg-pink-50 ml-1"
                    title="Lista de Alunos"
                >
                    <AcademicCapIcon className="w-4 h-4" /> <span className="hidden lg:inline">Alunos</span>
                </Button>

                <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

                {exam.status === 'draft' && (
                    <Button onClick={() => updateStatus('availability_open')} className="neo-btn bg-blue-600 hover:bg-blue-700 flex gap-2 text-xs">
                        <PlayIcon className="w-4 h-4" /> <span className="hidden sm:inline">Iniciar</span>
                    </Button>
                )}
                {exam.status === 'availability_open' && (
                    <Button onClick={() => updateStatus('allocating')} className="neo-btn bg-yellow-500 hover:bg-yellow-600 flex gap-2 text-xs border-yellow-600">
                        <UserGroupIcon className="w-4 h-4" /> <span className="hidden sm:inline">Distribuir</span>
                    </Button>
                )}
                
                {exam.status !== 'closed' && (
                     <Button variant="outline" onClick={() => updateStatus('closed')} className="text-xs h-9 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Encerrar Prova">
                        <LockClosedIcon className="w-4 h-4" />
                    </Button>
                )}

                 <Button 
                    variant="ghost" 
                    onClick={handleDeleteExam} 
                    className="text-xs h-9 w-9 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 ml-1 rounded-full"
                    title="Excluir Prova"
                >
                    <TrashIcon className="w-5 h-5" />
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 max-w-6xl">
        
        {/* Info Card - Agora só com Data/Hora e Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between items-center">
            
            {/* Data e Hora */}
            <div className="flex gap-4 w-full md:w-auto">
                <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-100 min-w-[80px] h-fit">
                     <span className="block text-xs font-bold text-purple-400 uppercase">{format(parseISO(exam.date), 'MMM', { locale: ptBR })}</span>
                     <span className="block text-3xl font-black text-purple-900">{format(parseISO(exam.date), 'dd')}</span>
                </div>
                <div className="flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Informações Gerais</h2>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {exam.startTime} - {exam.endTime}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{exam.type}</span>
                    </div>
                </div>
            </div>
            
            {/* Dashboard de Status Simplificado */}
            <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
                <div className="flex flex-col items-center justify-center px-6 py-2 bg-green-50 rounded-lg border border-green-100 min-w-[100px]">
                    <span className="text-2xl font-black text-green-600">{stats.available}</span>
                    <span className="text-[10px] uppercase font-bold text-green-400 tracking-wide">Confirmados</span>
                </div>
                <div className="flex flex-col items-center justify-center px-6 py-2 bg-red-50 rounded-lg border border-red-100 min-w-[100px]">
                    <span className="text-2xl font-black text-red-600">{stats.unavailable}</span>
                    <span className="text-[10px] uppercase font-bold text-red-400 tracking-wide">Recusas</span>
                </div>
                <div className="flex flex-col items-center justify-center px-6 py-2 bg-gray-50 rounded-lg border border-gray-100 min-w-[100px]">
                    <span className="text-2xl font-black text-gray-600">{stats.pending}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">Pendentes</span>
                </div>
            </div>
        </div>

        {/* Listagem da Equipe */}
        {exam.status === 'closed' ? (
             <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-400 animate-in fade-in">
                <LockClosedIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-500">Prova Encerrada</h3>
                <p className="text-sm">A equipe foi desvinculada para limpeza do banco de dados.</p>
             </div>
        ) : (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Acompanhamento de Disponibilidade</h3>
                    {stats.isDeficit && stats.pending > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium animate-pulse">
                            Atenção: Necessário cobrar pendentes
                        </span>
                    )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {roster.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Nenhum fiscal na lista. Envie o link de convite.
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        )}

        {/* Boards e Ocorrências */}
        {exam.status !== 'draft' && exam.status !== 'closed' && (
            <>
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <AllocationBoard exam={exam} employees={employees} rooms={rooms} availabilities={availabilities} />
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200">
                    <OccurrenceManager exam={exam} employees={employees} />
                </div>
            </>
        )}

      </main>
    </div>
  );
}