export interface ParsedCategoryItem {
  id?: string;
  originalLine: string;
  title: string;
  mainCategory: string;
  subCategories: string[];
  matchedBookId?: string;
  matchedBookTitle?: string;
}

/**
 * دالة استخراج وتفكيك نصوص التصنيف وفق القاعدة المحددة من قبل المستخدم:
 * "اسم الكتاب: (التصنيف الرئيسي) / تصنيف فرعي 1 / تصنيف فرعي 2"
 *
 * - التصنيف الذي بين قوسين هو التصنيف الرئيسي
 * - الباقي هو التصنيفات الفرعية
 */
export function parseCategorizationLine(line: string): ParsedCategoryItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // نمط 1: البحث عن التصنيف الرئيسي المحصور بين قوسين (...)
  const parenMatch = trimmed.match(/\(([^)]+)\)/);
  
  if (!parenMatch) {
    // إذا لم تكن هناك أقواس، نحاول التفكيك بالشرطة أو النقطتين
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const title = parts[0].trim();
      const rest = parts.slice(1).join(':').trim();
      const tags = rest.split(/[/,/ـ-]/).map(t => t.trim()).filter(Boolean);
      const mainCategory = tags[0] || 'عام';
      const subCategories = tags.slice(1);
      return {
        originalLine: trimmed,
        title,
        mainCategory,
        subCategories
      };
    }
    return {
      originalLine: trimmed,
      title: trimmed,
      mainCategory: 'عام',
      subCategories: []
    };
  }

  const mainCategory = parenMatch[1].trim();

  // ما قبل القوسين
  const beforeParen = trimmed.substring(0, parenMatch.index).trim();
  // ما بعد القوسين
  const afterParen = trimmed.substring((parenMatch.index || 0) + parenMatch[0].length).trim();

  // استخراج اسم الكتاب: عادة ما يكون قبل النقطتين : أو قبل القوسين
  let title = beforeParen;
  if (title.endsWith(':')) {
    title = title.slice(0, -1).trim();
  } else if (title.includes(':')) {
    const colonParts = title.split(':');
    title = colonParts[0].trim();
  }

  // استخراج التصنيفات الفرعية من النص المتبقي بعد القوسين
  let subText = afterParen;
  if (subText.startsWith('/') || subText.startsWith(':') || subText.startsWith('-') || subText.startsWith(',')) {
    subText = subText.substring(1).trim();
  }

  // تقسيم التصنيفات الفرعية بالـ / أو الفواصل أو الشُرط
  const subCategories = subText
    .split(/[\/,،\n]/)
    .map(s => s.replace(/^[-_\s]+|[-_\s]+$/g, '').trim())
    .filter(s => s.length > 0 && s !== mainCategory);

  return {
    originalLine: trimmed,
    title: title || trimmed,
    mainCategory,
    subCategories
  };
}

/**
 * تفكيك نص متعدد الأسطر
 */
export function parseCategorizationText(text: string): ParsedCategoryItem[] {
  if (!text) return [];
  const lines = text.split('\n');
  const results: ParsedCategoryItem[] = [];

  for (const line of lines) {
    const item = parseCategorizationLine(line);
    if (item && (item.title || item.mainCategory)) {
      results.push(item);
    }
  }

  return results;
}

/**
 * طلب التصنيف التلقائي من خادم الذكاء الاصطناعي (Gemini)
 */
export async function requestAICategorization(input: { text?: string; books?: string[] }): Promise<{ result: string; parsed: ParsedCategoryItem[] }> {
  try {
    const response = await fetch('/api/ai/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `خطأ في استجابة الخادم (${response.status})`);
    }

    const data = await response.json();
    const resultText = data.result || '';
    const parsed = parseCategorizationText(resultText);

    return {
      result: resultText,
      parsed
    };
  } catch (error: any) {
    console.error('AICategorization service error:', error);
    throw error;
  }
}

/**
 * تركيب سطر نصي وفق الصيغة القياسية:
 * اسم الكتاب: (التصنيف الرئيسي) / تصنيف فرعي 1 / تصنيف فرعي 2
 */
export function formatCategorizationLine(title: string, mainCategory: string, subCategories: string[] = []): string {
  const cleanTitle = title.trim();
  const cleanMain = mainCategory.trim() || 'رواية';
  const cleanSubs = subCategories.map(s => s.trim()).filter(Boolean);

  if (cleanSubs.length > 0) {
    return `${cleanTitle}: (${cleanMain}) / ${cleanSubs.join(' / ')}`;
  }
  return `${cleanTitle}: (${cleanMain})`;
}

/**
 * تطبيع النصوص العربية لغايات المقارنة والبحث المرن:
 * - إزالة التشكيل والتنوين
 * - توحيد الهمزات (أ, إ, آ, ٱ -> ا)
 * - توحيد التاء المربوطة والهاء (ة -> ه)
 * - توحيد الياء والألف المقصورة (ى -> ي)
 * - إزالة التطويل والكشيدة (ـ)
 * - إزالة علامات الترقيم والمحارف غير الضرورية
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
    .replace(/\u0640/g, '') // إزالة التطويل
    .replace(/[أإآٱ]/g, 'ا') // توحيد الألف
    .replace(/ة/g, 'ه') // توحيد التاء المربوطة
    .replace(/ى/g, 'ي') // توحيد الياء
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ') // إزالة علامات الترقيم
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * حساب مصفوفة أوزان التشابه للأخطاء البصرية الشائعة في العربية (OCR Matrix)
 */
function getArabicCharSubstitutionCost(c1: string, c2: string): number {
  if (c1 === c2) return 0;

  // الحروف المتشابهة بصرياً أو في التنقيط
  const confusionGroups = [
    ['ض', 'ص'],
    ['خ', 'ح', 'ج'],
    ['ط', 'ظ'],
    ['ع', 'غ'],
    ['ف', 'ق'],
    ['د', 'ذ'],
    ['ر', 'ز'],
    ['س', 'ش'],
    ['ب', 'ت', 'ث', 'ن', 'ي'],
    ['ا', 'ل'],
    ['ه', 'ة'],
    ['و', 'ؤ'],
  ];

  for (const group of confusionGroups) {
    if (group.includes(c1) && group.includes(c2)) {
      return 0.35; // تكلفة منخفضة جداً لاستبدال الحروف المتشابهة بصرياً بنقاط
    }
  }

  return 1;
}

/**
 * حساب مسافة ليفنشتاين المخصصة للغة العربية ومشاكل OCR
 */
export function arabicLevenshteinDistance(s1: string, s2: string): number {
  const norm1 = normalizeArabicText(s1);
  const norm2 = normalizeArabicText(s2);

  if (norm1 === norm2) return 0;
  if (!norm1.length) return norm2.length;
  if (!norm2.length) return norm1.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= norm1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= norm2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= norm1.length; i++) {
    for (let j = 1; j <= norm2.length; j++) {
      const cost = getArabicCharSubstitutionCost(norm1[i - 1], norm2[j - 1]);
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // حذف
        matrix[i][j - 1] + 1, // إدراج
        matrix[i - 1][j - 1] + cost // استبدال ذكي
      );
    }
  }

  return matrix[norm1.length][norm2.length];
}

/**
 * حساب نسبة التشابه بين عنوانين (من 0 إلى 1)
 */
export function calculateArabicSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeArabicText(s1);
  const norm2 = normalizeArabicText(s2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1;

  // تطابق الاحتواء الجزئي
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    if (minLen / maxLen >= 0.7) {
      return 0.92;
    }
  }

  const maxLen = Math.max(norm1.length, norm2.length);
  const dist = arabicLevenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * البحث عن العنوان الأقرب من عناوين المكتبة
 */
export function findClosestLibraryTitle(
  extractedTitle: string,
  libraryTitles: string[],
  minSimilarityThreshold = 0.65
): { matchedTitle: string; similarity: number } | null {
  const normExtracted = normalizeArabicText(extractedTitle);
  if (!normExtracted || libraryTitles.length === 0) return null;

  let bestMatch: string | null = null;
  let highestScore = 0;

  for (const libTitle of libraryTitles) {
    if (!libTitle || !libTitle.trim()) continue;
    const normLib = normalizeArabicText(libTitle);
    
    // تطابق تام
    if (normExtracted === normLib) {
      return { matchedTitle: libTitle.trim(), similarity: 1 };
    }

    const score = calculateArabicSimilarity(extractedTitle, libTitle);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = libTitle.trim();
    }
  }

  if (bestMatch && highestScore >= minSimilarityThreshold) {
    return { matchedTitle: bestMatch, similarity: highestScore };
  }

  return null;
}

export interface TitleCorrectionChange {
  original: string;
  corrected: string;
  lineIndex: number;
  similarity?: number;
}

/**
 * فحص وتصحيح العناوين محلياً بالخوارزميات الذكية
 */
export function checkAndCorrectTitlesLocally(
  text: string,
  libraryTitles: string[]
): { result: string; corrections: TitleCorrectionChange[]; parsed: ParsedCategoryItem[] } {
  if (!text || !libraryTitles.length) {
    const parsed = parseCategorizationText(text);
    return { result: text, corrections: [], parsed };
  }

  const lines = text.split('\n');
  const corrections: TitleCorrectionChange[] = [];
  const outputLines: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      outputLines.push(line);
      return;
    }

    const item = parseCategorizationLine(trimmed);
    if (!item || !item.title) {
      outputLines.push(line);
      return;
    }

    const closest = findClosestLibraryTitle(item.title, libraryTitles, 0.62);
    if (closest && closest.matchedTitle !== item.title) {
      // تم العثور على عنوان مطابق أقرب ومختلف
      const correctedLine = formatCategorizationLine(closest.matchedTitle, item.mainCategory, item.subCategories);
      outputLines.push(correctedLine);
      corrections.push({
        original: item.title,
        corrected: closest.matchedTitle,
        lineIndex: idx,
        similarity: Math.round(closest.similarity * 100)
      });
    } else {
      outputLines.push(line);
    }
  });

  const result = outputLines.join('\n');
  const parsed = parseCategorizationText(result);

  return {
    result,
    corrections,
    parsed
  };
}

/**
 * طلب فحص وتصحيح العناوين عبر الذكاء الاصطناعي (Gemini) مع التدعيم المحلي
 */
export async function requestAICheckTitles(input: {
  text: string;
  libraryTitles: string[];
}): Promise<{ result: string; corrections: TitleCorrectionChange[]; parsed: ParsedCategoryItem[] }> {
  try {
    const response = await fetch('/api/ai/check-titles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (response.ok) {
      const data = await response.json();
      const aiResultText = data.result || input.text;
      
      // استخراج الفروقات بين النص الأصلي والنص المصحح
      const originalParsed = parseCategorizationText(input.text);
      const newParsed = parseCategorizationText(aiResultText);
      const corrections: TitleCorrectionChange[] = [];

      originalParsed.forEach((orig, idx) => {
        const matchingNew = newParsed[idx];
        if (matchingNew && matchingNew.title !== orig.title) {
          corrections.push({
            original: orig.title,
            corrected: matchingNew.title,
            lineIndex: idx,
          });
        }
      });

      return {
        result: aiResultText,
        corrections,
        parsed: newParsed
      };
    } else {
      // في حالة عدم توفر السيرفر أو المفتاح، نعتمد الفحص الخوارزمي المحلي فائق الدقة
      console.warn('AI Server fallback to local smart matcher');
      return checkAndCorrectTitlesLocally(input.text, input.libraryTitles);
    }
  } catch (error) {
    console.warn('Network error, fallback to local matcher:', error);
    return checkAndCorrectTitlesLocally(input.text, input.libraryTitles);
  }
}

export interface CategoryMergeProposal {
  id: string;
  type: 'main' | 'sub';
  chosenName: string;
  duplicateNames: string[];
  reason?: string;
  affectedBooksCount?: number;
  selected?: boolean;
}

export interface DeduplicationAnalysisResult {
  proposals: CategoryMergeProposal[];
  totalDuplicates: number;
}

/**
 * تجريد اللواحق والسوابق الشائعة للمقارنة الدلالية الصرفية
 */
function getStemmedCategoryKey(name: string): string {
  let norm = normalizeArabicText(name).toLowerCase();
  // إزالة الكلمات الزائدة
  norm = norm.replace(/^(كتب|كتاب|قسم|تصنيف|مجال|علم)\s+/g, '');
  norm = norm.replace(/\s+(كتب|عام|حديث|قديم)$/g, '');
  // إزالة أل التعريف
  norm = norm.replace(/^ال/g, '');
  // إزالة اللواحق الجمع والنسب: ات، ون، ين، ي، يه، ه
  norm = norm.replace(/(يات|ات|يون|ين|ون|يه|ية|ي|ه)$/g, '');
  return norm.trim();
}

/**
 * اكتشاف التصنيفات المكررة محلياً
 */
export function detectDuplicateCategoriesLocally(
  mainCategories: string[],
  subCategories: string[]
): DeduplicationAnalysisResult {
  const proposals: CategoryMergeProposal[] = [];

  // 1. معالجة التصنيفات الرئيسية
  const processGroup = (items: string[], type: 'main' | 'sub') => {
    const uniqueItems = Array.from(new Set(items.map(s => s.trim()).filter(Boolean)));
    const visited = new Set<string>();

    for (let i = 0; i < uniqueItems.length; i++) {
      const current = uniqueItems[i];
      if (visited.has(current)) continue;

      const cluster: string[] = [current];
      const currentStem = getStemmedCategoryKey(current);
      const currentNorm = normalizeArabicText(current);

      for (let j = i + 1; j < uniqueItems.length; j++) {
        const candidate = uniqueItems[j];
        if (visited.has(candidate)) continue;

        const candidateStem = getStemmedCategoryKey(candidate);
        const candidateNorm = normalizeArabicText(candidate);

        // تطابق التطبيع الإملائي المباشر (مثل: إسلامي و اسلامي)
        const exactNormMatch = currentNorm === candidateNorm;

        // تطابق الجذع مع حد أدنى لطول الكلمة (مثل: إسلامي و إسلاميات)
        const stemMatch = currentStem && candidateStem && currentStem.length >= 3 && currentStem === candidateStem;

        // تشابه صوتي/إملائي عالي جداً
        const sim = calculateArabicSimilarity(currentNorm, candidateNorm);
        const highSimilarity = sim >= 0.85;

        // احتواء نصي وثيق (مثل: "رواية" و "روايات" أو "تطوير ذات" و "تطوير الذات")
        const substringMatch = (
          (currentNorm.includes(candidateNorm) || candidateNorm.includes(currentNorm)) &&
          Math.abs(currentNorm.length - candidateNorm.length) <= 5 &&
          Math.min(currentNorm.length, candidateNorm.length) >= 4
        );

        if (exactNormMatch || stemMatch || (highSimilarity && sim >= 0.88) || substringMatch) {
          cluster.push(candidate);
          visited.add(candidate);
        }
      }

      if (cluster.length > 1) {
        visited.add(current);

        // اختيار الاسم الأنسب:
        // نفضل الأسماء ذات الهمزات والتاء المربوطة الصحيحة، وصيغ الجمع القياسية أو الأوسع
        cluster.sort((a, b) => {
          // تفضيل الصيغ التي تحتوي همزات سليمة
          const aHasHamza = /[أإآ]/.test(a) ? 2 : 0;
          const bHasHamza = /[أإآ]/.test(b) ? 2 : 0;
          // تفضيل الجمع (ينتهي بـ ات أو جمع تكسير معروف)
          const aIsPlural = /(ات|يات)$/.test(a) ? 3 : 0;
          const bIsPlural = /(ات|يات)$/.test(b) ? 3 : 0;
          return (bHasHamza + bIsPlural + b.length) - (aHasHamza + aIsPlural + a.length);
        });

        const chosenName = cluster[0];
        const duplicates = cluster.slice(1);

        proposals.push({
          id: crypto.randomUUID(),
          type,
          chosenName,
          duplicateNames: duplicates,
          reason: 'توحيد الصيغ اللغوية والمفرد والجمع وحذف التكرار المترادف',
          selected: true
        });
      }
    }
  };

  processGroup(mainCategories, 'main');
  processGroup(subCategories, 'sub');

  const totalDuplicates = proposals.reduce((sum, p) => sum + p.duplicateNames.length, 0);

  return {
    proposals,
    totalDuplicates
  };
}

/**
 * طلب اكتشاف التصنيفات المكررة بالذكاء الاصطناعي مع دعم الدمج الذكي
 */
export async function requestAIDeduplicateCategories(
  mainCategories: string[],
  subCategories: string[]
): Promise<DeduplicationAnalysisResult> {
  const localResult = detectDuplicateCategoriesLocally(mainCategories, subCategories);

  try {
    const response = await fetch('/api/ai/deduplicate-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mainCategories: Array.from(new Set(mainCategories.map(s => s.trim()).filter(Boolean))),
        subCategories: Array.from(new Set(subCategories.map(s => s.trim()).filter(Boolean)))
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.merges) && data.merges.length > 0) {
        const aiProposals: CategoryMergeProposal[] = data.merges
          .filter((m: any) => m.chosenName && Array.isArray(m.duplicateNames) && m.duplicateNames.length > 0)
          .map((m: any) => ({
            id: crypto.randomUUID(),
            type: m.type === 'sub' ? 'sub' : 'main',
            chosenName: m.chosenName.trim(),
            duplicateNames: m.duplicateNames.map((d: string) => d.trim()).filter(Boolean),
            reason: m.reason || 'توحيد التصنيف المكرر بالذكاء الاصطناعي',
            selected: true
          }));

        // دمج نتائج AI مع أي نتائج محلية لم يلتقطها AI
        const allProposals = [...aiProposals];
        for (const lp of localResult.proposals) {
          const alreadyCovered = allProposals.some(ap => 
            ap.chosenName === lp.chosenName ||
            lp.duplicateNames.some(d => ap.duplicateNames.includes(d) || ap.chosenName === d)
          );
          if (!alreadyCovered) {
            allProposals.push(lp);
          }
        }

        return {
          proposals: allProposals,
          totalDuplicates: allProposals.reduce((sum, p) => sum + p.duplicateNames.length, 0)
        };
      }
    }
  } catch (err) {
    console.warn('AI deduplication API failed, using smart local clustering:', err);
  }

  return localResult;
}

