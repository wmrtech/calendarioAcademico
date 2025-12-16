import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShareIcon, ClipboardDocumentIcon, ChatBubbleLeftRightIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function ShareReenrollmentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const link = `${window.location.origin}/solicitacao-rematricula`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleWhatsApp = () => {
    const message = `Olá acadêmico(a)!\n\nO período de solicitação de rematrícula/oferta especial está aberto. Caso necessite, preencha o formulário no link abaixo:\n\n${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#d31c5b] hover:bg-[#a01545] text-white gap-2 shadow-lg shadow-pink-200">
            <ShareIcon className="w-4 h-4" /> Enviar para Alunos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <AcademicCapIcon className="w-5 h-5 text-[#d31c5b]" />
            Link de Solicitação
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1"><Input readOnly value={link} className="bg-gray-50 pr-10 text-xs" /></div>
                <Button onClick={handleCopy} size="icon" variant="outline"><ClipboardDocumentIcon className="w-4 h-4" /></Button>
            </div>
            <Button onClick={handleWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-white gap-2">
                <ChatBubbleLeftRightIcon className="w-5 h-5" /> Enviar no WhatsApp
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}