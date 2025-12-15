import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category, DEFAULT_CATEGORIES } from '@/lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Record<string, Category>>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      if (!querySnapshot.empty) {
        const fetchedCategories: Record<string, Category> = {};
        querySnapshot.forEach((doc) => {
          fetchedCategories[doc.id] = { id: doc.id, ...doc.data() } as Category;
        });
        setCategories(fetchedCategories);
      } else {
        // Se não houver categorias no banco, usa as padrão
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'categories'), category);
      const newCategory = { ...category, id: docRef.id };
      setCategories(prev => ({ ...prev, [docRef.id]: newCategory }));
      return newCategory;
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      // Usamos setDoc com merge: true para garantir que o documento seja criado se não existir
      // Isso corrige o erro ao tentar editar categorias padrão (fallback) que ainda não estão no banco
      await setDoc(doc(db, 'categories', id), data, { merge: true });
      setCategories(prev => ({
        ...prev,
        [id]: { ...prev[id], ...data }
      }));
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(prev => {
        const newCategories = { ...prev };
        delete newCategories[id];
        return newCategories;
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  };

  return { categories, loading, addCategory, updateCategory, deleteCategory, refreshCategories: fetchCategories };
}
