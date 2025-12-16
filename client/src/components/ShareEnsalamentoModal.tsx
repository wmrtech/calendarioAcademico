import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShareIcon, ClipboardDocumentIcon, ChatBubbleLeftRightIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface Props {
    examId: string;
    examTitle: string;
}

export default function ShareEnsalamentoModal({ examId, examTitle }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const ensalamentoLink = `${window.location.origin}/ensalamento/${examId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(ensalamentoLink);
    toast.success("Link copiado!");
  };

  const handleWhatsApp = () => {
    const message = `Olá equipe da Reprografia.\nSegue o link para realizar o ensalamento da prova: *${examTitle}*.\n\nAcesse: ${ensalamentoLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-gray-600 hover:text-[#d31c5b] hover:bg-pink-50">
            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
            Link Reprografia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <BuildingOfficeIcon className="w-5 h-5 text-[#d31c5b]" />
            Link de Ensalamento
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Envie este link para a Reprografia definir as salas e períodos.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input readOnly value={ensalamentoLink} className="bg-gray-50 pr-10 text-xs" />
                </div>
                <Button onClick={handleCopy} size="icon" variant="outline"><ClipboardDocumentIcon className="w-4 h-4" /></Button>
            </div>
            <Button onClick={handleWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-white gap-2">
                <ChatBubbleLeftRightIcon className="w-5 h-5" /> Enviar para Reprografia
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}