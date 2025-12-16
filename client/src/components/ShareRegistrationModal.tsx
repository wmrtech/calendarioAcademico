import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShareIcon, ClipboardDocumentIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

export default function ShareRegistrationModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Gera o link dinamicamente baseado no endereço atual do site
  const registrationLink = `${window.location.origin}/registro-fiscal`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationLink);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleWhatsApp = () => {
    const message = `Olá! Estamos atualizando nosso banco de fiscais para as próximas provas da Afya. Por favor, cadastre sua disponibilidade no link abaixo:\n\n${registrationLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-[#d31c5b] border-[#d31c5b] hover:bg-pink-50">
            <ShareIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Link de Cadastro</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-800">
            <ShareIcon className="w-5 h-5 text-[#d31c5b]" />
            Coleta de Disponibilidade
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Envie este link para os colaboradores cadastrarem seus horários.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
            {/* Campo do Link */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Input 
                        readOnly 
                        value={registrationLink} 
                        className="bg-gray-50 pr-10 text-xs md:text-sm" 
                    />
                </div>
                <Button onClick={handleCopy} size="icon" variant="outline" title="Copiar">
                    <ClipboardDocumentIcon className="w-4 h-4" />
                </Button>
            </div>

            {/* Botão WhatsApp */}
            <Button 
                onClick={handleWhatsApp} 
                className="w-full bg-green-500 hover:bg-green-600 text-white gap-2"
            >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                Enviar via WhatsApp
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}