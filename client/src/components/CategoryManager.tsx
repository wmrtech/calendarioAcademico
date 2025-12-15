import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrashIcon, PlusIcon, PencilIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PRESET_COLORS = [
  { label: 'Azul', bg: 'bg-blue-500', border: 'border-blue-700' },
  { label: 'Vermelho', bg: 'bg-red-500', border: 'border-red-700' },
  { label: 'Verde', bg: 'bg-green-500', border: 'border-green-700' },
  { label: 'Amarelo', bg: 'bg-yellow-400', border: 'border-yellow-600' },
  { label: 'Roxo', bg: 'bg-purple-500', border: 'border-purple-700' },
  { label: 'Rosa', bg: 'bg-pink-500', border: 'border-pink-700' },
  { label: 'Laranja', bg: 'bg-orange-500', border: 'border-orange-700' },
  { label: 'Cinza', bg: 'bg-gray-500', border: 'border-gray-700' },
  { label: 'Preto', bg: 'bg-black', border: 'border-gray-800' },
  { label: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-700' },
  { label: 'Magenta', bg: 'bg-pink-600', border: 'border-pink-800' }, // Adicionado tom magenta
];

const TEXT_COLORS = [
  { label: 'Branco', class: 'text-white' },
  { label: 'Preto', class: 'text-black' },
];

export default function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [formData, setFormData] = useState({ label: '', color: 'bg-gray-500', text: 'text-white', border: 'border-gray-700' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) return;
    
    if (editingId) {
      await updateCategory(editingId, formData);
    } else {
      await addCategory(formData);
    }
    
    resetForm();
    setIsOpen(false);
  };

  const handleEdit = (category: Category) => {
    setFormData({
      label: category.label,
      color: category.color,
      text: category.text,
      border: category.border
    });
    setEditingId(category.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza? Isso pode afetar eventos existentes.")) {
      await deleteCategory(id);
    }
  };

  const resetForm = () => {
    setFormData({ label: '', color: 'bg-gray-500', text: 'text-white', border: 'border-gray-700' });
    setEditingId(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  return (
    <div className="mb-8 p-6 border border-gray-200 bg-white rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-display font-bold text-gray-900">Categorias de Eventos</h3>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-xs h-8 px-3 gap-1 rounded-full border-gray-300 hover:border-primary hover:text-primary">
              <PlusIcon className="w-3 h-3" /> Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white p-0 border border-gray-100 shadow-xl rounded-xl max-w-md font-sans">
            <DialogHeader className="p-5 border-b border-gray-100 bg-gray-50">
              <DialogTitle className="font-display font-bold text-gray-900">
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Nome</Label>
                <Input 
                  value={formData.label} 
                  onChange={e => setFormData({...formData, label: e.target.value})}
                  className="neo-input"
                  placeholder="Ex: Workshop"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Cor de Fundo</Label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.bg}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.bg, border: color.border })}
                      className={`w-full aspect-square rounded-full transition-transform hover:scale-110 ${color.bg} ${formData.color === color.bg ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Cor do Texto</Label>
                <div className="flex gap-3">
                  {TEXT_COLORS.map((textColor) => (
                    <button
                      key={textColor.class}
                      type="button"
                      onClick={() => setFormData({ ...formData, text: textColor.class })}
                      className={`flex-1 py-2 border rounded-md font-bold text-sm transition-all ${textColor.class === 'text-white' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} ${formData.text === textColor.class ? 'ring-2 ring-primary border-primary' : 'border-gray-200'}`}
                    >
                      {textColor.label}
                      {formData.text === textColor.class && <CheckIcon className="w-4 h-4 inline ml-2" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg text-center border border-dashed border-gray-300">
                <p className="text-xs text-gray-400 mb-2 font-medium">Pré-visualização</p>
                <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold shadow-sm ${formData.color} ${formData.text}`}>
                  {formData.label || 'Nome da Categoria'}
                </span>
              </div>

              <Button type="submit" className="neo-btn w-full justify-center">
                {editingId ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.values(categories).map(cat => (
          <div key={cat.id} className={`group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all hover:shadow-md ${cat.color} ${cat.text}`}>
            <span>{cat.label}</span>
            <div className="flex gap-1 ml-1 pl-2 border-l border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(cat)} className="hover:bg-white/20 rounded-full p-0.5" title="Editar">
                <PencilIcon className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(cat.id)} className="hover:bg-white/20 rounded-full p-0.5" title="Excluir">
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}