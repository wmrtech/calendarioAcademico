import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, deleteDoc, doc, Timestamp, query, orderBy, writeBatch, where } from "firebase/firestore"; 
import { db } from "@/lib/firebase";
import { Exam, Event, ExamStatus, ACADEMIC_PERIODS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; 
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ClipboardDocumentCheckIcon, CalendarDaysIcon, PlusIcon, 
  ArrowLeftIcon, TrashIcon, ExclamationTriangleIcon, ClockIcon,
  UsersIcon, DocumentTextIcon
} from "@heroicons/react/24/outline";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner"; 

export default function Exams() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);

  const [exams, setExams] = useState<Exam[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([]); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Event[]>([]); 
  
  const [formData, setFormData] = useState<Partial<Exam>>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    endTime: '12:00',
    type: 'Regular',
    studentCountEstimate: 50,
    status: 'draft',
    targetPeriods: ['all'],
    instructions: '' 
  });

  useEffect(() => {
    if (!user) { setLocation("/"); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const examsQ = query(collection(db, "exams"), orderBy("date", "desc"));
      const examsSnap = await getDocs(examsQ);
      setExams(examsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)));

      const eventsQ = query(collection(db, "events"));
      const eventsSnap = await getDocs(eventsQ);
      setCalendarEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));

    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && formData.date) {
        const selectedDate = parseISO(formData.date);
        
        const foundConflicts = calendarEvents.filter(evt => {
            const evtDate = parseISO(evt.date);
            if (isSameDay(evtDate, selectedDate)) return true;
            if (evt.endDate) {
                const end = parseISO(evt.endDate);
                return selectedDate >= evtDate && selectedDate <= end;
            }
            return false;
        });
        setConflicts(foundConflicts);
    }
  }, [formData.date, isModalOpen, calendarEvents]);

  const togglePeriod = (periodId: string) => {
    const current = formData.targetPeriods || [];
    if (periodId === 'all') {
        setFormData({ ...formData, targetPeriods: ['all'] });
        return;
    }
    let newPeriods = current.filter(p => p !== 'all');
    if (newPeriods.includes(periodId)) newPeriods = newPeriods.filter(p => p !== periodId);
    else newPeriods.push(periodId);
    if (newPeriods.length === 0) newPeriods = ['all'];
    setFormData({ ...formData, targetPeriods: newPeriods });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const batch = writeBatch(db);
      
      const examRef = doc(collection(db, "exams"));
      const eventRef = doc(collection(db, "events"));

      batch.set(examRef, {
        ...formData,
        id: examRef.id,
        createdAt: Timestamp.now()
      });

      batch.set(eventRef, {
        title: `Avaliação: ${formData.title}`,
        date: formData.date,
        time: formData.startTime,
        endTime: formData.endTime,
        allDay: false,
        category: 'science', 
        targetPeriods: formData.targetPeriods,
        description: `Avaliação presencial do tipo ${formData.type}. Consulte o ensalamento no dia.`,
        local: 'Consultar Coordenação',
        linkedExamId: examRef.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      await batch.commit();

      toast.success("Prova agendada e publicada no calendário!");
      setIsModalOpen(false);
      fetchData();
    } catch (err) { 
        console.error(err);
        toast.error("Erro ao agendar prova.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta prova e removê-la do calendário?")) {
        try {
            const q = query(collection(db, "events"), where("linkedExamId", "==", id));
            const snap = await getDocs(q);

            const batch = writeBatch(db);
            batch.delete(doc(db, "exams", id));
            snap.docs.forEach(docSnap => {
                batch.delete(docSnap.ref);
            });

            await batch.commit();
            toast.success("Prova e evento removidos.");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao remover.");
        }
    }
  };

  const getStatusBadge = (status: ExamStatus) => {
      switch(status) {
          case 'draft': return <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2 py-1 rounded">Rascunho</span>;
          case 'availability_open': return <span className="bg-blue-100 text-blue-600 text-[10px] uppercase font-bold px-2 py-1 rounded">Coletando Disp.</span>;
          case 'allocating': return <span className="bg-yellow-100 text-yellow-700 text-[10px] uppercase font-bold px-2 py-1 rounded">Em Alocação</span>;
          case 'closed': return <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-1 rounded">Concluída</span>;
          default: return null;
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      
      {/* HEADER FIXO E ALINHADO */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button onClick={() => setLocation("/admin/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                
                <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                
                {/* LOGO E TÍTULO */}
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Afya" className="h-8 w-auto object-contain" />
                    <h1 className="text-sm font-display font-bold text-gray-900">Gestão de Provas</h1>
                </div>
            </div>
            
            <Button 
                onClick={() => { setFormData({...formData, status: 'draft', targetPeriods: ['all'], instructions: ''}); setIsModalOpen(true); }} 
                className="neo-btn flex items-center gap-2 text-xs"
            >
                <PlusIcon className="w-4 h-4" /> Criar Prova
            </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 max-w-5xl">
        
        {exams.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-bold">Nenhuma prova agendada</h3>
                <p className="text-gray-500 text-sm">Comece criando uma nova aplicação de prova.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {exams.map(exam => (
                    <div key={exam.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg text-center min-w-[70px] border border-gray-100">
                                <span className="block text-xs font-bold text-gray-400 uppercase">{format(parseISO(exam.date), 'MMM', { locale: ptBR })}</span>
                                <span className="block text-2xl font-black text-gray-900">{format(parseISO(exam.date), 'dd')}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {getStatusBadge(exam.status)}
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{exam.type}</span>
                                    <span className="text-[9px] border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded font-medium">
                                        {exam.targetPeriods?.includes('all') ? 'Todos' : `${exam.targetPeriods?.join(', ')}º Período(s)`}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">{exam.title}</h3>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
                                    <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {exam.startTime} - {exam.endTime}</span>
                                    <span>•</span>
                                    <span>~{exam.studentCountEstimate} Alunos estimados</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                            <Button 
                                onClick={() => setLocation(`/admin/exams/${exam.id}`)} 
                                variant="outline" 
                                className="text-xs h-9 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                            >
                                Gerenciar Painel
                            </Button>
                            <button onClick={() => handleDelete(exam.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Aplicação de Prova</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-5 pt-2">
                
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Label>Nome da Prova</Label>
                        <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Prova Integrada 1º Bimestre" required className="neo-input" />
                    </div>
                    <div>
                        <Label>Tipo</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                            <SelectTrigger className="neo-input"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Regular">Regular</SelectItem><SelectItem value="Recuperação">Recuperação</SelectItem><SelectItem value="Especial">Especial</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="p-4 border border-gray-200 bg-gray-50/50 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-primary" />
                        <Label className="text-xs font-bold uppercase text-primary">Público Alvo (Aparecerá na Agenda)</Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            type="button" 
                            onClick={() => togglePeriod('all')} 
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formData.targetPeriods?.includes('all') ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                        >
                            TODOS
                        </button>
                        {ACADEMIC_PERIODS.map((period) => (
                            <button 
                                key={period.id} 
                                type="button" 
                                onClick={() => togglePeriod(period.id)} 
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formData.targetPeriods?.includes(period.id) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'}`}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                        <Label className="text-xs font-bold uppercase text-gray-500">Instruções aos Fiscais (Mural)</Label>
                    </div>
                    <Textarea 
                        value={formData.instructions} 
                        onChange={e => setFormData({...formData, instructions: e.target.value})} 
                        className="neo-input min-h-[100px] text-sm" 
                        placeholder="Ex: Chegar 30min antes; Proibido uso de celular; Recolher provas às 12:00..." 
                    />
                    <p className="text-[10px] text-gray-400">Essas informações aparecerão no Mural Público do dia da prova.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase">Definição de Data</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Data</Label>
                            <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="neo-input bg-white" />
                        </div>
                        <div>
                            <Label>Estimativa de Alunos</Label>
                            <Input type="number" value={formData.studentCountEstimate} onChange={e => setFormData({...formData, studentCountEstimate: parseInt(e.target.value)})} className="neo-input bg-white" />
                        </div>
                    </div>

                    {conflicts.length > 0 && (
                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-2">
                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-yellow-700">Atenção: Conflito no Calendário</p>
                                    <p className="text-[10px] text-yellow-600 mt-1">Já existem eventos para este dia:</p>
                                    <ul className="list-disc list-inside text-[10px] text-yellow-600 mt-1">
                                        {conflicts.map(c => (
                                            <li key={c.id} className="truncate">{c.title}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Início</Label><Input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="neo-input" /></div>
                    <div><Label>Término</Label><Input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="neo-input" /></div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="neo-btn">Agendar Prova</Button>
                </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}