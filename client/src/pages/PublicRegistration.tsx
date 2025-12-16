import { useState, useEffect } from "react";
import { useRoute } from "wouter"; 
import { collection, addDoc, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircleIcon, UserIcon, ClockIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function PublicRegistration() {
  // Tenta pegar o ID da URL
  const [, params] = useRoute("/registro-fiscal/:examId"); 
  const examId = params?.examId;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [examTitle, setExamTitle] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "", 
    availability: [] as string[],
    notes: ""
  });

  const shifts = ["Manhã", "Tarde", "Noite"];

  // Busca o nome da prova para mostrar na tela (Confirmação visual)
  useEffect(() => {
    async function checkExam() {
        if (examId) {
            try {
                const docSnap = await getDoc(doc(db, "exams", examId));
                if (docSnap.exists()) {
                    setExamTitle(docSnap.data().title);
                }
            } catch (e) {
                console.error("Erro ao validar prova", e);
            }
        }
    }
    checkExam();
  }, [examId]);

  const handleShiftToggle = (shift: string) => {
    setFormData(prev => {
        const newAvailability = prev.availability.includes(shift)
            ? prev.availability.filter(s => s !== shift)
            : [...prev.availability, shift];
        return { ...prev, availability: newAvailability };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) return; // Segurança extra

    if (formData.availability.length === 0) {
        toast.error("Selecione sua disponibilidade.");
        return;
    }

    setLoading(true);
    try {
      // 1. Cria o Funcionário (Sempre novo para garantir integridade nesta prova)
      const docRef = await addDoc(collection(db, "employees"), {
        name: formData.name.toUpperCase(),
        phone: formData.phone,
        role: formData.role.toUpperCase(),
        availability: formData.availability,
        notes: formData.notes,
        status: "active",
        createdAt: Timestamp.now()
      });
      
      const employeeId = docRef.id;

      // 2. CRIA O VÍNCULO IMEDIATO (Isso garante o STATUS VERDE)
      await addDoc(collection(db, "availabilities"), {
        examId: examId,
        employeeId: employeeId,
        isAvailable: true, // <--- OBRIGATÓRIO PARA FICAR VERDE
        updatedAt: Timestamp.now()
      });

      setSuccess(true);
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      toast.error("Erro ao confirmar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- TELA DE BLOQUEIO (Se não tiver ID) ---
  if (!examId) {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Link Incompleto</h1>
            <p className="text-gray-500 mt-2 max-w-sm">
                Este formulário é exclusivo para confirmação de presença em provas específicas. 
                <br/><br/>
                Por favor, utilize o link enviado pela coordenação (que contém o código da prova).
            </p>
        </div>
    );
  }

  // --- TELA DE SUCESSO ---
  if (success) return (
    <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
            <CheckCircleIcon className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">
            Disponibilidade Confirmada!
        </h1>
        <p className="text-gray-600 mb-8 max-w-xs mx-auto">
            Seu nome já consta na lista de disponíveis para a prova:<br/>
            <strong>{examTitle || "Seleção Atual"}</strong>.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="border-green-200 text-green-700 hover:bg-green-100">
            Cadastrar outro colega
        </Button>
    </div>
  );

  // --- FORMULÁRIO DE CONFIRMAÇÃO ---
  return (
    <div className="min-h-screen bg-[#d31c5b] flex flex-col items-center justify-center p-4 md:p-6">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Faixa Superior */}
        <div className="bg-green-50 border-b border-green-100 p-3 text-center text-xs font-bold text-green-800 uppercase tracking-wide">
            {examTitle ? `Prova: ${examTitle}` : "Confirmação de Disponibilidade"}
        </div>

        <div className="bg-white p-8 pb-4 text-center">
            <img src="/logo.png" alt="Afya" className="h-12 mx-auto mb-4 object-contain" />
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                Confirmar Presença
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
                Preencha seus dados para habilitar sua alocação nesta prova.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-5">
            <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" /> Nome e Sobrenome
                </Label>
                <Input 
                    required 
                    placeholder="Ex: Ronaldo Fenômeno" 
                    className="h-11 bg-gray-50 border-gray-200 focus:border-[#d31c5b] focus:ring-[#d31c5b]/20"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-400">WhatsApp</Label>
                    <Input 
                        required 
                        placeholder="(35) 9..." 
                        className="h-11 bg-gray-50 border-gray-200"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-gray-400">Cargo</Label>
                    <Select onValueChange={(val) => setFormData({...formData, role: val})}>
                        <SelectTrigger className="h-11 bg-gray-50 border-gray-200 text-gray-600">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Administrativo">Administrativo</SelectItem>
                            <SelectItem value="Docente">Docente</SelectItem>
                            <SelectItem value="Técnico">Técnico</SelectItem>
                            <SelectItem value="Coordenação">Coordenação</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" /> Turno de Preferência
                </Label>
                <div className="flex justify-between">
                    {shifts.map(shift => (
                        <div key={shift} className="flex items-center gap-2">
                            <Checkbox 
                                id={shift} 
                                checked={formData.availability.includes(shift)}
                                onCheckedChange={() => handleShiftToggle(shift)}
                                className="data-[state=checked]:bg-[#d31c5b] border-gray-300"
                            />
                            <label htmlFor={shift} className="text-sm font-medium text-gray-600 cursor-pointer select-none">
                                {shift}
                            </label>
                        </div>
                    ))}
                </div>
                <Input 
                    placeholder="Obs (Ex: Saio às 17h)" 
                    className="bg-white text-xs"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                />
            </div>

            <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-[#d31c5b] hover:bg-[#a01545] text-white font-bold text-base shadow-lg shadow-pink-200 rounded-xl mt-4"
            >
                {loading ? "Confirmando..." : "Confirmar Minha Presença"}
            </Button>
        </form>
      </div>
    </div>
  );
}