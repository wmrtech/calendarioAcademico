import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PhoneIcon, EnvelopeIcon, MapPinIcon, GlobeAltIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* [&>button]:hidden remove o botão de fechar padrão do shadcn/ui para usarmos personalizado */}
      <DialogContent className="max-w-md bg-white p-0 border border-gray-100 shadow-2xl rounded-2xl overflow-hidden font-sans outline-none [&>button]:hidden">

        {/* Cabeçalho Magenta da Afya */}
        <div className="bg-primary px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>

          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold tracking-tight text-white">
              Central de Ajuda
            </DialogTitle>
            <DialogDescription className="text-blue-50/90 mt-1 font-medium">
              Canais oficiais e respostas rápidas.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-white">
          {/* Grid de Contatos Rápidos */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href="mailto:secretaria.itajuba@afya.com.br"
              className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all hover:-translate-y-0.5 group"
            >
              <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <EnvelopeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Secretaria</span>
            </a>

            <a
              href="tel:+553536295700"
              className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 border border-green-100 rounded-xl transition-all hover:-translate-y-0.5 group"
            >
              <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <PhoneIcon className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-bold text-green-900 uppercase tracking-wide">Central (35)</span>
            </a>

            <a
              href="https://aluno.afya.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all hover:-translate-y-0.5 group"
            >
              <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <GlobeAltIcon className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">Portal</span>
            </a>

            <a
              href="https://goo.gl/maps/xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-xl transition-all hover:-translate-y-0.5 group"
            >
              <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                <MapPinIcon className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-xs font-bold text-orange-900 uppercase tracking-wide">Localização</span>
            </a>
          </div>

          {/* FAQ Accordion */}
          <div>
            <h4 className="font-display font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              Perguntas Frequentes
            </h4>

            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="item-1" className="border border-gray-100 rounded-lg px-3 bg-gray-50/50">
                <AccordionTrigger className="text-sm font-semibold text-gray-700 hover:text-primary hover:no-underline py-3">
                  Como renovar minha matrícula?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-500 leading-relaxed pb-3">
                  A renovação deve ser feita exclusivamente pelo <strong>Portal do Aluno</strong>. Fique atento às datas de "Rematrícula" destacadas em vermelho no calendário.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border border-gray-100 rounded-lg px-3 bg-gray-50/50">
                <AccordionTrigger className="text-sm font-semibold text-gray-700 hover:text-primary hover:no-underline py-3">
                  Onde encontro minhas notas?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-500 leading-relaxed pb-3">
                  As notas parciais são lançadas no Canvas. As notas finais oficiais ficam disponíveis no histórico do Portal do Aluno.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border border-gray-100 rounded-lg px-3 bg-gray-50/50">
                <AccordionTrigger className="text-sm font-semibold text-gray-700 hover:text-primary hover:no-underline py-3">
                  Como solicito declaração?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-500 leading-relaxed pb-3">
                  Acesse: Portal do Aluno &gt; Secretaria Digital &gt; Solicitações. O documento sai na hora em PDF.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Footer discreto */}
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Afya Itajubá - Suporte ao Aluno</p>
        </div>

      </DialogContent>
    </Dialog>
  );
}