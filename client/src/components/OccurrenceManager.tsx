import { useState, useEffect } from "react";
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Employee, Occurrence, OccurrenceType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ExclamationTriangleIcon, HandThumbUpIcon, HandThumbDownIcon, 
  ChatBubbleLeftIcon, TrashIcon, PlusIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  exam: Exam;
  employees: Employee[];
}

export default function OccurrenceManager({ exam, employees }: Props) {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [form, setForm] = useState<Partial<Occurrence>>({
    type: 'neutral',
    title: '',
    description: '',
    employeeId: 'none'
  });

  useEffect(() => {
    const q = query(collection(db, "occurrences"), where("examId", "==", exam.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setOccurrences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Occurrence)));
    });
    return () => unsubscribe();
  }, [exam.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedEmp = employees.find(emp => emp.id === form.employeeId);
      
      await addDoc(collection(db, "occurrences"), {
        examId: exam.id,
        type: form.type,
        title: form.title,
        description: form.description,
        employeeId: form.employeeId === 'none' ? null : form.employeeId,
        employeeName: selectedEmp ? selectedEmp.name : null,
        createdAt: Timestamp.now()
      });
      
      toast.success("Ocorrência registrada.");
      setIsModalOpen(false);
      setForm({ type: 'neutral', title: '', description: '', employeeId: 'none' });
    } catch (err) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remover este registro?")) {
        await deleteDoc(doc(db, "occurrences", id));
    }
  };

  const getTypeStyle = (type: OccurrenceType) => {
      switch(type) {
          case 'positive': return 'bg-green-50 border-green-200 text-green-700';
          case 'negative': return 'bg-red-50 border-red-200 text-red-700';
          default: return 'bg-gray-50 border-gray-200 text-gray-700';
      }
  };

  const getTypeIcon = (type: OccurrenceType) => {
      switch(type) {
          case 'positive': return <HandThumbUpIcon className="w-5 h-5" />;
          case 'negative': return <HandThumbDownIcon className="w-5 h-5" />;
          default: return <ChatBubbleLeftIcon className="w-5 h-5" />;
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />
            Livro de Ocorrências
        </h3>
        <Button onClick={() => setIsModalOpen(true)} variant="outline" size="sm" className="text-xs">
            <PlusIcon className="w-4 h-4 mr-1" /> Registrar Ocorrência
        </Button>
      </div>

      {occurrences.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm">Nenhuma ocorrência registrada para esta prova.</p>
          </div>
      ) : (
          <div className="space-y-3">
              {occurrences.map(occ => (
                  <div key={occ.id} className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${getTypeStyle(occ.type)}`}>
                      <div className="flex items-start gap-3">
                          <div className="mt-1 shrink-0 opacity-70">
                              {getTypeIcon(occ.type)}
                          </div>
                          <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm">{occ.title}</h4>
                                {occ.employeeName && (
                                    <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded font-bold uppercase border border-current/20">
                                        {occ.employeeName}
                                    </span>
                                )}
                              </div>
                              <p className="text-sm opacity-90 mt-1">{occ.description}</p>
                              {occ.createdAt && (
                                <p className="text-[10px] opacity-60 mt-2">
                                    Registrado em {format(occ.createdAt.toDate(), "dd/MM 'às' HH:mm")}
                                </p>
                              )}
                          </div>
                      </div>
                      <button onClick={() => handleDelete(occ.id)} className="text-current opacity-40 hover:opacity-100">
                          <TrashIcon className="w-4 h-4" />
                      </button>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white">
            <DialogHeader><DialogTitle>Nova Ocorrência</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                        <Select value={form.type} onValueChange={(v: any) => setForm({...form, type: v})}>
                            <SelectTrigger className="neo-input"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="neutral">Neutro / Observação</SelectItem>
                                <SelectItem value="positive">Elogio / Positivo</SelectItem>
                                <SelectItem value="negative">Incidente / Negativo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Vincular a Alguém?</label>
                        <Select value={form.employeeId} onValueChange={(v) => setForm({...form, employeeId: v})}>
                            <SelectTrigger className="neo-input"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Geral (Sem vínculo)</SelectItem>
                                {employees.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Título Resumido</label>
                    <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Atraso na chegada" className="neo-input" required />
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Descrição Detalhada</label>
                    <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descreva o que houve..." className="neo-input" required />
                </div>

                <Button type="submit" className="w-full neo-btn mt-2">Registrar</Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}