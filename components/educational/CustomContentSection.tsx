import React, { useState } from 'react';
import { 
  Code, Plus, Search, Copy, Check, ExternalLink, 
  Trash2, Edit3, X, Terminal, FileCode, Tag, Sparkles, 
  Layers, BookOpen, AlertCircle, FileText, ChevronDown
} from 'lucide-react';
import { CustomContentCategory, CustomContentItem } from '../../types';

interface CustomContentSectionProps {
  category: CustomContentCategory;
  items?: CustomContentItem[];
  courseId?: string;
  onUpdateItems: (updatedItems: CustomContentItem[]) => void;
  isDarkMode?: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PROGRAMMING_LANGUAGES = [
  'javascript', 'typescript', 'python', 'cpp', 'c', 
  'java', 'csharp', 'php', 'ruby', 'rust', 'go', 
  'sql', 'html', 'css', 'bash', 'json', 'yaml', 'markdown'
];

export const CustomContentSection: React.FC<CustomContentSectionProps> = ({
  category,
  items = [],
  courseId,
  onUpdateItems,
  isDarkMode,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'code' | 'link' | 'text'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomContentItem | null>(null);

  // Form State
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemContentType, setItemContentType] = useState<'code' | 'snippet' | 'link' | 'text' | 'file'>('code');
  const [itemCodeSnippet, setItemCodeSnippet] = useState('');
  const [itemCodeLanguage, setItemCodeLanguage] = useState('python');
  const [itemExternalUrl, setItemExternalUrl] = useState('');
  const [itemAuthor, setItemAuthor] = useState('');
  const [itemTags, setItemTags] = useState('');

  // Delete Confirm Modal State
  const [itemToDelete, setItemToDelete] = useState<CustomContentItem | null>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.codeLanguage && item.codeLanguage.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesType = selectedTypeFilter === 'all' || 
      (selectedTypeFilter === 'code' && (item.contentType === 'code' || item.contentType === 'snippet')) ||
      (selectedTypeFilter === 'link' && item.contentType === 'link') ||
      (selectedTypeFilter === 'text' && (item.contentType === 'text' || item.contentType === 'file'));

    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemTitle('');
    setItemDescription('');
    setItemContentType('code');
    setItemCodeSnippet('');
    setItemCodeLanguage('python');
    setItemExternalUrl('');
    setItemAuthor('');
    setItemTags('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CustomContentItem) => {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemDescription(item.description || '');
    setItemContentType(item.contentType);
    setItemCodeSnippet(item.codeSnippet || '');
    setItemCodeLanguage(item.codeLanguage || 'python');
    setItemExternalUrl(item.externalUrl || '');
    setItemAuthor(item.author || '');
    setItemTags(item.tags ? item.tags.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) return;

    const parsedTags = itemTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (editingItem) {
      const updated = items.map(it => it.id === editingItem.id ? {
        ...it,
        title: itemTitle.trim(),
        description: itemDescription.trim() || undefined,
        contentType: itemContentType,
        codeSnippet: itemCodeSnippet || undefined,
        codeLanguage: itemContentType === 'code' || itemContentType === 'snippet' ? itemCodeLanguage : undefined,
        externalUrl: itemContentType === 'link' ? itemExternalUrl.trim() : undefined,
        author: itemAuthor.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined
      } : it);
      onUpdateItems(updated);
      onShowToast?.('تم تعديل عنصر المحتوى بنجاح');
    } else {
      const newItem: CustomContentItem = {
        id: `custom_item_${Date.now()}`,
        title: itemTitle.trim(),
        description: itemDescription.trim() || undefined,
        contentType: itemContentType,
        codeSnippet: itemCodeSnippet || undefined,
        codeLanguage: itemContentType === 'code' || itemContentType === 'snippet' ? itemCodeLanguage : undefined,
        externalUrl: itemContentType === 'link' ? itemExternalUrl.trim() : undefined,
        author: itemAuthor.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        folderId: category.id,
        courseId: category.courseId,
        addedAt: Date.now()
      };
      onUpdateItems([newItem, ...items]);
      onShowToast?.('تم إضافة عنصر المحتوى بنجاح');
    }

    setIsModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    onUpdateItems(items.filter(i => i.id !== id));
    setItemToDelete(null);
    onShowToast?.('تم حذف العنصر بنجاح');
  };

  const handleCopyCode = (id: string, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    onShowToast?.('تم نسخ الكود إلى الحافظة');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className={`p-6 rounded-3xl border flex items-center justify-between flex-wrap gap-4 ${
        isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-xs'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.colorGrad} flex items-center justify-center text-white font-bold shadow-md`}>
            <Code size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-800 dark:text-gray-200">
                {category.name}
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500">
                قسم مخصص
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-1">
              {category.description || 'إدارة ومشاركة الشيفرات البرمجية والمراجع والتطبيقات العملية لهذا المقرر.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>إضافة عنصر / كود جديد</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الوصف، لغة البرمجة، أو الوسوم..."
            className={`w-full pr-10 pl-4 py-2.5 rounded-2xl border text-xs font-bold outline-none transition-all ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800 focus:border-cyan-500' : 'bg-white border-gray-200 focus:border-cyan-500 shadow-xs'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['all', 'code', 'link', 'text'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                selectedTypeFilter === type
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : isDarkMode ? 'bg-zinc-800 text-gray-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' && 'الكل'}
              {type === 'code' && 'أكواد وشيفرات'}
              {type === 'link' && 'روابط ومراجع'}
              {type === 'text' && 'ملاحظات وشروحات'}
            </button>
          ))}
        </div>
      </div>

      {/* Items List / Cards */}
      {filteredItems.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${
          isDarkMode ? 'bg-zinc-900/40 border-zinc-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
        }`}>
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Code size={32} />
          </div>
          <h3 className="text-sm font-black mb-1">لا توجد عناصر مضافة في هذا القسم حتى الآن</h3>
          <p className="text-xs font-bold text-gray-400 max-w-sm mx-auto mb-4">
            قم بإضافة أول شيفرة برمجية، رابط مشروع، أو مقتطف لتسهيل وصول الطلاب إليه.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black inline-flex items-center gap-2"
          >
            <Plus size={15} />
            <span>إضافة عنصر الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition-all duration-200 ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-gray-100 hover:border-gray-200 shadow-xs'
              }`}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-black text-gray-800 dark:text-gray-200">
                      {item.title}
                    </h3>
                    {item.codeLanguage && (
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500 text-white text-[10px] font-black uppercase tracking-wider">
                        {item.codeLanguage}
                      </span>
                    )}
                    {item.author && (
                      <span className="text-[11px] text-gray-400 font-bold">
                        إعداد: {item.author}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className={`p-2 rounded-xl text-gray-400 hover:text-cyan-500 transition-colors ${
                      isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                    }`}
                    title="تعديل العنصر"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => setItemToDelete(item)}
                    className={`p-2 rounded-xl text-gray-400 hover:text-rose-500 transition-colors ${
                      isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                    }`}
                    title="حذف العنصر"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Code Snippet Box */}
              {(item.contentType === 'code' || item.contentType === 'snippet') && item.codeSnippet && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 shadow-inner">
                  <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      </div>
                      <span className="text-[11px] font-mono">{item.codeLanguage || 'code'}</span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(item.id, item.codeSnippet)}
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>نسخ الكود</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed text-slate-200 direction-ltr text-left selection:bg-cyan-500/30">
                    <code>{item.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* External Link Box */}
              {item.contentType === 'link' && item.externalUrl && (
                <div className="mt-3">
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold transition-all group ${
                      isDarkMode ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400 hover:bg-cyan-950/40' : 'bg-cyan-50 border-cyan-100 text-cyan-700 hover:bg-cyan-100'
                    }`}
                  >
                    <span className="truncate direction-ltr text-left">{item.externalUrl}</span>
                    <ExternalLink size={15} className="shrink-0 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <Tag size={12} className="text-gray-400" />
                  {item.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-800'
            }`}
            dir="rtl"
          >
            <div className={`p-6 border-b flex items-center justify-between ${
              isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-100 bg-gray-50/70'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                  <Code size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {editingItem ? 'تعديل عنصر المحتوى' : 'إضافة عنصر محتوى جديد (كود / مشروع)'}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold">
                    قسم: {category.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-xl text-gray-400 hover:text-gray-600 transition-colors ${
                  isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  نوع المحتوى:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'code', label: 'كود ومقتطف برمجي', icon: <Terminal size={14} /> },
                    { id: 'link', label: 'رابط مشروع ومستودع', icon: <ExternalLink size={14} /> },
                    { id: 'text', label: 'شرح وملاحظة نصية', icon: <FileText size={14} /> }
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setItemContentType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        itemContentType === t.id
                          ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500'
                          : isDarkMode ? 'bg-zinc-800/40 border-zinc-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  عنوان العنصر: *
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="مثال: خوارزمية البحث الثنائي Binary Search بالـ Python"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                    المؤلف / المحاضر:
                  </label>
                  <input
                    type="text"
                    value={itemAuthor}
                    onChange={(e) => setItemAuthor(e.target.value)}
                    placeholder="مثال: د. مروان بالعيد"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                    الوسوم (مفصولة بفواصل):
                  </label>
                  <input
                    type="text"
                    value={itemTags}
                    onChange={(e) => setItemTags(e.target.value)}
                    placeholder="algorithms, python, sorting"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                  الوصف والملاحظات التوضيحية:
                </label>
                <textarea
                  rows={2}
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="شرح مبسط لطريقة عمل الكود أو الغرض من الرابط..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all resize-none ${
                    isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                  }`}
                />
              </div>

              {/* Code Snippet input */}
              {(itemContentType === 'code' || itemContentType === 'snippet') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-gray-700 dark:text-gray-300 block">
                      الشيفرة البرمجية (Source Code):
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-bold">اللغة:</span>
                      <select
                        value={itemCodeLanguage}
                        onChange={(e) => setItemCodeLanguage(e.target.value)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold outline-none uppercase ${
                          isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-100 border-gray-200'
                        }`}
                      >
                        {PROGRAMMING_LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    value={itemCodeSnippet}
                    onChange={(e) => setItemCodeSnippet(e.target.value)}
                    placeholder="# اكتب أو الصق الكود البرمجي هنا..."
                    className="w-full p-4 rounded-xl font-mono text-xs outline-none bg-slate-950 text-slate-100 border border-slate-800 direction-ltr text-left"
                  />
                </div>
              )}

              {/* Link input */}
              {itemContentType === 'link' && (
                <div>
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 block mb-1">
                    رابط المستودع أو المشروع الخارجي (URL):
                  </label>
                  <input
                    type="url"
                    value={itemExternalUrl}
                    onChange={(e) => setItemExternalUrl(e.target.value)}
                    placeholder="https://github.com/example/repo"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all direction-ltr text-left ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700 focus:border-cyan-500' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'
                    }`}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    isDarkMode ? 'bg-zinc-800 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!itemTitle.trim()}
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>{editingItem ? 'حفظ التعديلات' : 'إضافة العنصر'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border p-6 text-right ${
            isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-100 text-gray-800'
          }`} dir="rtl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-black mb-2">تأكيد حذف عنصر المحتوى</h3>
            <p className="text-xs text-gray-400 font-bold mb-6">
              هل أنت متأكد من حذف «{itemToDelete.title}»؟ لن تتمكن من استرجاعه بعد الحذف.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setItemToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDarkMode ? 'bg-zinc-800 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteItem(itemToDelete.id)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
