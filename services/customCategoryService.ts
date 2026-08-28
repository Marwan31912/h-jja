import { Book, CustomGroupedCategory } from '../types';

const STORAGE_KEY = 'aladdin_custom_grouped_categories';
const EVENT_NAME = 'aladdin_custom_categories_updated';

// جلب جميع التصنيفات المخصصة المحفوظة
export const getCustomCategories = (): CustomGroupedCategory[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading custom categories:', e);
    return [];
  }
};

// حفظ أو تحديث تصنيف مخصص
export const saveCustomCategory = (category: CustomGroupedCategory): void => {
  try {
    const existing = getCustomCategories();
    const index = existing.findIndex(c => c.id === category.id);
    let updated: CustomGroupedCategory[];
    if (index >= 0) {
      updated = existing.map(c => c.id === category.id ? category : c);
    } else {
      updated = [...existing, category];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (e) {
    console.error('Error saving custom category:', e);
  }
};

// حذف تصنيف مخصص
export const deleteCustomCategory = (id: string): void => {
  try {
    const existing = getCustomCategories();
    const updated = existing.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (e) {
    console.error('Error deleting custom category:', e);
  }
};

// فحص ما إذا كان الكتاب يندرج تحت التصنيف المخصص
export const isBookInCustomCategory = (book: Book, customCat: CustomGroupedCategory): boolean => {
  const hasMain = customCat.mainCategories && customCat.mainCategories.length > 0;
  const hasSub = customCat.subCategories && customCat.subCategories.length > 0;

  // إذا لم يتم تحديد أي تصنيف رئيسي أو فرعي
  if (!hasMain && !hasSub) return false;

  const matchesMain = hasMain && customCat.mainCategories.includes(book.category);
  
  const matchesSub = hasSub && Boolean(
    book.subCategory && customCat.subCategories.some(sub => 
      book.subCategory!.toLowerCase().includes(sub.toLowerCase())
    )
  );

  return matchesMain || matchesSub;
};

// فلترة الكتب وفق تصنيف مخصص
export const filterBooksByCustomCategory = (books: Book[], customCat: CustomGroupedCategory): Book[] => {
  return books.filter(b => isBookInCustomCategory(b, customCat));
};
