import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShareIcon, ClipboardDocumentIcon, ChatBubbleLeftRightIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function SharePortalModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Link para a lista de provas (Genérico)
  const portalLink = `${window.location.origin}/portal-reprografia`;

  const handleCopy = () => {
    navigator.clipboard.writeText(portalLink);
    toast.success("Link do portal copiado!");
  };

  const handleWhatsApp = () => {
    const message = `Olá equipe da Reprografia.\nSegue o link do Portal de Ensalamento para gerenciar as salas das próximas provas:\n\n${portalLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Botão com estilo diferente para destacar na aba de Salas */}
        <Button className="bg-white border border-gray-200 text-gray-600 hover:text-[#d31c5b] hover:border-[#d31c5b] hover:bg-pink-50 gap-2 shadow-sm">
            <BuildingOfficeIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Portal Reprografia</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <BuildingOfficeIcon className="w-5 h-5 text-[#d31c5b]" />
            Acesso da Reprografia
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Este link dá acesso à lista de todas as provas futuras para ensalamento.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input readOnly value={portalLink} className="bg-gray-50 pr-10 text-xs" />
                </div>
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