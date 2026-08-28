/**
 * دالة تطبيع وبحث النصوص العربية المرنة:
 * - إزالة حركات التشكيل والتنوين (فتحة، ضمة، كسرة، تنوين، سكون، شدة، إلخ)
 * - توحيد جميع أشكال الهمزات (أ، إ، آ، ٱ -> ا)
 * - توحيد التاء المربوطة والهاء (ة -> ه)
 * - توحيد الياء والألف المقصورة (ى -> ي)
 * - توحيد الهمزة على الواو والياء (ؤ -> و، ئ -> ي)
 * - إزالة التطويل والكشيدة (ـ)
 * - تحويل الأحرف اللاتينية إلى حروف صغيرة
 */
export function normalizeSearchArabic(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/[\u064B-\u065F\u0670\u0651\u0652]/g, '') // إزالة كافة الحركات والتشكيل والشدة
    .replace(/\u0640/g, '') // إزالة الكشيدة / التطويل
    .replace(/[أإآٱ]/g, 'ا') // توحيد الألف بكافة أشكال الهمزة
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/ى/g, 'ي') // توحيد الألف المقصورة والياء
    .replace(/ؤ/g, 'و') // توحيد الهمزة على واو
    .replace(/ئ/g, 'ي') // توحيد الهمزة على نبرة/ياء
    .replace(/[\u060C\u061B\u061F\u06D4]/g, ' ') // علامات الترقيم العربية
    .toLowerCase()
    .trim();
}

/**
 * فحص ما إذا كان النص المستهدف يحتوي على عبارة البحث مع تجاهل التشكيل والهمزات والحركات
 */
export function fuzzyIncludesArabic(target: string | null | undefined, query: string | null | undefined): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;
  
  const normTarget = normalizeSearchArabic(target);
  const normQuery = normalizeSearchArabic(query);
  
  if (!normQuery) return true;
  
  // فحص الاحتواء المباشر
  if (normTarget.includes(normQuery)) return true;

  // فحص الكلمات المتفرقة إن وجدت
  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1) {
    return queryWords.every(word => normTarget.includes(word));
  }

  return false;
}
