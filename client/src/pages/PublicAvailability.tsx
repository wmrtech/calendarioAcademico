import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { collection, getDocs, doc, getDoc, setDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Employee, Exam, Availability } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, CalendarDaysIcon, ClockIcon, UserIcon } from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function PublicAvailability() {
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [openExams, setOpenExams] = useState<Exam[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({}); // examId -> true/false

  // Pega o UID da URL (ex: ?uid=xyz)
  const getUidFromUrl = () => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return params.get("uid");
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const uid = getUidFromUrl();
    if (!uid) { setLoading(false); return; }

    try {
      // 1. Busca Funcionário
      const empRef = doc(db, "employees", uid);
      const empSnap = await getDoc(empRef);
      
      if (empSnap.exists()) {
        const empData = { id: empSnap.id, ...empSnap.data() } as Employee;
        setEmployee(empData);

        // 2. Busca Provas Abertas para Disponibilidade
        const examsQ = query(
            collection(db, "exams"), 
            where("status", "==", "availability_open")
        );
        const examsSnap = await getDocs(examsQ);
        const examsList = examsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
        setOpenExams(examsList);

        // 3. Busca Respostas Já Dadas (para preencher a tela)
        const availQ = query(collection(db, "availabilities"), where("employeeId", "==", uid));
        const availSnap = await getDocs(availQ);
        const currentAnswers: Record<string, boolean> = {};
        availSnap.docs.forEach(d => {
            const data = d.data() as Availability;
            currentAnswers[data.examId] = data.isAvailable;
        });
        setAnswers(currentAnswers);

      }
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (examId: string, isAvailable: boolean) => {
    if (!employee) return;

    // Atualiza visualmente na hora (Optimistic UI)
    setAnswers(prev => ({ ...prev, [examId]: isAvailable }));

    try {
        // ID único composto para evitar duplicidade (examId_employeeId)
        const docId = `${examId}_${employee.id}`;
        await setDoc(doc(db, "availabilities", docId), {
            examId,
            employeeId: employee.id,
            employeeName: employee.name,
            isAvailable,
            updatedAt: Timestamp.now()
        });
        toast.success("Resposta salva!");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar resposta.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500 animate-pulse">Carregando...</p></div>;

  if (!employee) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4"><XCircleIcon className="w-10 h-10 text-red-500" /></div>
        <h1 className="text-xl font-bold text-gray-900">Link Inválido</h1>
        <p className="text-gray-500 mt-2">Não identificamos seu cadastro. Solicite o link novamente à coordenação.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header Mobile */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm sticky top-0 z-20">
        <div className="container mx-auto max-w-lg flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full"><UserIcon className="w-6 h-6 text-primary" /></div>
            <div>
                <p className="text-xs text-gray-500 font-medium">Olá, colaborador(a)</p>
                <h1 className="text-lg font-bold text-gray-900 leading-none">{employee.name.split(' ')[0]}</h1>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-lg mt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h2 className="text-blue-800 font-bold text-sm mb-1">Informe sua disponibilidade</h2>
            <p className="text-xs text-blue-600">Abaixo estão as próximas provas. Toque em <strong>Sim</strong> ou <strong>Não</strong> para confirmar se poderá atuar.</p>
        </div>

        {openExams.length === 0 ? (
            <div className="text-center py-12 opacity-60">
                <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Nenhuma prova aberta para disponibilidade no momento.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {openExams.map(exam => {
                    const myAnswer = answers[exam.id];
                    return (
                        <div key={exam.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                            <div className="p-4 border-b border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{exam.type}</span>
                                    <span className="text-xs font-bold text-gray-400">{format(parseISO(exam.date), "dd/MM", { locale: ptBR })}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>{exam.startTime} às {exam.endTime}</span>
                                </div>
                            </div>
                            
                            {/* Botões de Ação Grandes */}
                            <div className="grid grid-cols-2 divide-x divide-gray-100">
                                <button 
                                    onClick={() => handleToggle(exam.id, false)}
                                    className={`p-4 flex flex-col items-center justify-center gap-1 transition-colors ${myAnswer === false ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50 text-gray-400'}`}
                                >
                                    <XCircleIcon className={`w-6 h-6 ${myAnswer === false ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-bold uppercase">Não Posso</span>
                                </button>
                                
                                <button 
                                    onClick={() => handleToggle(exam.id, true)}
                                    className={`p-4 flex flex-col items-center justify-center gap-1 transition-colors ${myAnswer === true ? 'bg-green-50 text-green-600' : 'hover:bg-gray-50 text-gray-400'}`}
                                >
                                    <CheckCircleIcon className={`w-6 h-6 ${myAnswer === true ? 'fill-current' : ''}`} />
                                    <span className="text-xs font-bold uppercase">Disponível</span>
                                </button>
                            </div>
                            
                            {/* Barra de Status Visual */}
                            {myAnswer !== undefined && (
                                <div className={`h-1 w-full ${myAnswer ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </main>
    </div>
  );
}