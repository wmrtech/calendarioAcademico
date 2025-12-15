import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ACADEMIC_PERIODS } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  onComplete: (periodId: string) => void;
}

export default function StudentOnboarding({ onComplete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("student_period");
    if (!saved) {
      setIsOpen(true);
    } else {
      onComplete(saved);
    }
  }, []);

  const handleSave = () => {
    if (!selectedPeriod) return;
    try {
      localStorage.setItem("student_period", selectedPeriod);
      onComplete(selectedPeriod);
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      onComplete(selectedPeriod);
      setIsOpen(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !localStorage.getItem("student_period")) {
      return; 
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-md bg-white p-8 border border-gray-100 shadow-2xl rounded-2xl outline-none"
        onInteractOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <DialogTitle className="text-2xl font-display font-bold text-gray-900 text-center mb-2">
            Bem-vindo à Afya
          </DialogTitle>
          <DialogDescription className="text-center text-gray-500 text-base">
            Para personalizarmos seu calendário acadêmico, precisamos saber em qual período você está matriculado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <Select onValueChange={setSelectedPeriod} value={selectedPeriod}>
            <SelectTrigger className="neo-input w-full h-12 text-lg bg-white">
              <SelectValue placeholder="Selecione seu período..." />
            </SelectTrigger>
            {/* CORREÇÃO: Adicionado bg-white explicitamente aqui */}
            <SelectContent className="max-h-[300px] bg-white border border-gray-200 shadow-xl z-[60]">
              {ACADEMIC_PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="cursor-pointer py-3 text-base hover:bg-gray-50 focus:bg-gray-50">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
            <Button 
            onClick={handleSave} 
            disabled={!selectedPeriod}
            className="neo-btn w-full h-12 text-lg font-bold tracking-wide shadow-lg shadow-primary/20"
            >
            Confirmar e Acessar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}