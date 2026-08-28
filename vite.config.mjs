import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const fontDir = path.resolve(process.cwd(), 'public', 'fonts');

const fontsToDownload = [
  {
    name: 'cairo-400.ttf',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf'
  },
  {
    name: 'cairo-500.ttf',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hNI-W1Q.ttf'
  },
  {
    name: 'cairo-600.ttf',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hD45W1Q.ttf'
  },
  {
    name: 'cairo-700.ttf',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf'
  },
  {
    name: 'cairo-800.ttf',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hGA5W1Q.ttf'
  },
  {
    name: 'cairo-900.ttf',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hEk5W1Q.ttf'
  }
];

function downloadFont(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectionResponse) => {
          redirectionResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

if (!fs.existsSync(fontDir)) {
  fs.mkdirSync(fontDir, { recursive: true });
}

for (const font of fontsToDownload) {
  const filePath = path.join(fontDir, font.name);
  if (!fs.existsSync(filePath)) {
    console.log(`[Font Downloader] Offline Cairo Font: Downloading ${font.name}...`);
    try {
      await downloadFont(font.url, filePath);
      console.log(`[Font Downloader] Offline Cairo Font: Loaded ${font.name} successfully!`);
    } catch (e) {
      console.error(`[Font Downloader] Failed to fetch ${font.name}:`, e);
    }
  }
}

function aiCategorizePlugin() {
  return {
    name: 'ai-categorize-middleware',
    configureServer(server) {
      // 1. مسار التصنيف التلقائي
      server.middlewares.use('/api/ai/categorize', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { text, books } = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: 'مفتاح GEMINI_API_KEY غير مهيأ في الخادم.',
                apiKeyMissing: true 
              }));
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            const systemPrompt = `أنت مساعد خبير ومحترف في تصنيف الكتب والمكتبات العربية.
المطلوب منك تحليل وتصنيف الكتب وفق القاعدة التالية بدقة:
الصيغة الإلزامية لكل كتاب في سطر مستقل:
اسم الكتاب: (التصنيف الرئيسي) / تصنيف فرعي 1 / تصنيف فرعي 2

قواعد حاسمة:
1. التصنيف الموجود بين القوسين ( ) هو التصنيف الرئيسي المباشر فقط (مثل: رواية، فكر وفلسفة، تاريخ، أدب عربي، علوم دينية، تنمية بشرية، شعر، سياسة، طب، اقتصاد، أطفال).
2. باقي البنود المفصولة بالشرطة المائلة / هي التصنيفات الفرعية (مثل: رعب / بوليسي / تاريخي / أدب أندلسي).
3. لا تضف أي مقدمة أو خاتمة أو رموز نقطية (*)، فقط أسطر الكتب بالتنسيق المطلوب مباشرة.

أمثلة واضحة:
الهول: (رواية) / رعب / أدب عربي
ثلاثية غرناطة: (رواية) / تاريخي / أدب أندلسي
مقدمة ابن خلدون: (تاريخ) / علم اجتماع / فلسفة إسلامية
سيرة ابن هشام: (علوم دينية) / سيرة نبوية / تاريخ إسلامي`;

            const userPrompt = text 
              ? `قم بتصنيف قائمة الكتب التالية حسب الصيغة المحددة بدقة:\n${text}`
              : `قم بتصنيف قائمة الكتب التالية حسب الصيغة المحددة بدقة:\n${(books || []).join('\n')}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: `${systemPrompt}\n\n${userPrompt}`,
            });

            const resultText = response.text || '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ result: resultText }));
          } catch (err) {
            console.error('AI Categorization Server Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'فشل معالجة التصنيف بالذكاء الاصطناعي' }));
          }
        });
      });

      // 2. مسار فحص وتدقيق ومطابقة العناوين
      server.middlewares.use('/api/ai/check-titles', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { text, libraryTitles } = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: 'مفتاح GEMINI_API_KEY غير مهيأ في الخادم.',
                apiKeyMissing: true 
              }));
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            const systemPrompt = `أنت مدقق لغوي ومفهرس كتب عربي فائق الدقة ومتخصص في تصحيح أخطاء الاستخراج الآلي (OCR / AI Misrecognitions).
المهمة:
لدينا قائمة بنصوص تصنيف كتب تم استخراج أسمائها آلياً، وقد يحتوي اسم الكتاب على أخطاء إملائية أو بصرية أو تشابه حروف (مثل النقاط والحروف المتشابهة: ض/ص، خ/ح/ج، ة/ه، أخطاء كتابية).
ولدينا أيضاً قائمة بالعناوين الحقيقية المسجلة فعلياً في مكتبة المستخدم.

قائمة عناوين المكتبة الحقيقية المرجعية:
${(libraryTitles || []).slice(0, 500).map(t => `- ${t}`).join('\n')}

القواعد الإلزامية:
1. افحص كل سطر في النص المدخل، واستخرج اسم الكتاب (الجزء الواقع قبل النقطتين : أو قبل القوسين).
2. قارن اسم الكتاب بقائمة عناوين المكتبة الحقيقية.
3. إذا وجدت عنواناً في المكتبة قريباً جداً من اسم الكتاب وواضح أنه هو المقصود ولكنه مكتوب بخطأ استخراج (مثل: "تفضخين مخبأ البرق" ➔ "تفضحين مخبأ البرق")، قم باستبدال اسم الكتاب بالعنوان الحقيقي الصحيح تماماً.
4. احتفظ ببقية السطر كما هو تماماً دون أي تغيير (مثل التصنيف الرئيسي بين القوسين والتصنيفات الفرعية بعد الشرطة).
5. إذا لم تجد له عنواناً قريباً في المكتبة، اتركه كما هو دون تغيير.
6. أخرج النص الناتج بالكامل سطراً بسطر بنفس التنسيق وبدون أي مقدمات أو شروحات إضافية.`;

            const userPrompt = `يرجى فحص وتصحيح العناوين في النص التالي ومطابقتها مع عناوين المكتبة:\n${text}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: `${systemPrompt}\n\n${userPrompt}`,
            });

            const resultText = response.text || '';
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ result: resultText }));
          } catch (err) {
            console.error('AI Check Titles Server Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'فشل فحص العناوين بالذكاء الاصطناعي' }));
          }
        });
      });

      // 3. مسار اكتشاف ودمج التصنيفات المكررة بالذكاء الاصطناعي
      server.middlewares.use('/api/ai/deduplicate-categories', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { mainCategories = [], subCategories = [] } = JSON.parse(body || '{}');
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                error: 'مفتاح GEMINI_API_KEY غير مهيأ في الخادم.',
                apiKeyMissing: true 
              }));
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            const systemPrompt = `أنت خبير مفهرس ولغوي عربي متخصص في تصنيف وتنظيم المكتبات وإزالة التكرارات.
المهمة:
تحليل قوائم التصنيفات المدخلة (التصنيفات الرئيسية والتصنيفات الفرعية)، واكتشاف أي تصنيفات مكررة أو مترادفة أو تحمل نفس المعنى بصيغ مختلفة (مثل: "إسلامي" و "إسلاميات" و "كتب إسلامية"، "رواية" و "روايات"، "تاريخ" و "تاريخي"، "تطوير ذات" و "تطوير الذات" و "تنمية بشرية"، "شعر" و "أشعار" و "دواوين شعر"، إلخ).

القواعد الإلزامية:
1. لكل مجموعة تصنيفات مكررة أو متقاربة بالمعنى:
   - حدد نوع التصنيف: "main" (رئيسي) أو "sub" (فرعي).
   - اختر الاسم الأنسب والأفصح والأنسب كمعيار موحد (chosenName).
   - ضع الأسماء الأخرى المكررة التي يجب حذفها ودمجها في مصفوفة (duplicateNames).
   - اذكر سبب الدمج والاختيار باختصار (reason) مثل: "توحيد صيغ المفرد والجمع وحذف التكرار اللغوي".
2. لا تدمج أبداً تصنيفات متباينة في المعنى الحقيقي (مثال: لا تدمج "تاريخ" مع "جغرافيا"، ولا تدمج "شعر" مع "رواية").
3. أرجع النتيجة بصيغة JSON حصراً مطابقة للنموذج التالي بدون أي نصوص أو markdown إضافية:
{
  "merges": [
    {
      "type": "main",
      "chosenName": "إسلاميات",
      "duplicateNames": ["اسلامي", "كتب اسلامية"],
      "reason": "توحيد مصطلح التصنيف الديني وإزالة التكرارات النحوية"
    }
  ]
}`;

            const userPrompt = `التصنيفات الرئيسية المدخلة:\n${JSON.stringify(mainCategories, null, 2)}\n\nالتصنيفات الفرعية المدخلة:\n${JSON.stringify(subCategories, null, 2)}`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.7-flash',
              contents: `${systemPrompt}\n\n${userPrompt}`,
              config: {
                responseMimeType: 'application/json'
              }
            });

            const resultText = response.text || '{}';
            let parsedResult = { merges: [] };
            try {
              parsedResult = JSON.parse(resultText);
            } catch (e) {
              const jsonMatch = resultText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                parsedResult = JSON.parse(jsonMatch[0]);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(parsedResult));
          } catch (err) {
            console.error('AI Deduplicate Categories Server Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'فشل اكتشاف التكرارات بالذكاء الاصطناعي' }));
          }
        });
      });
    }
  };
}

// ----------------- Mobile & Video Streaming Backend Dev Host Plugin -----------------
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { handleMobileRequest } = require('./services/mobileBackend.cjs');

function hojjaMobileBackendPlugin() {
  return {
    name: 'hojja-mobile-backend-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/mobile') || req.url.startsWith('/api/educational'))) {
          try {
            const handled = await handleMobileRequest(req, res, {
              storageRoot: process.cwd(),
              videosDir: path.resolve(process.cwd(), 'server_videos'),
              coversDir: path.resolve(process.cwd(), 'server_covers'),
              pdfsDir: path.resolve(process.cwd(), 'server_pdfs'),
              dataFile: path.resolve(process.cwd(), 'server_data.json'),
              tokenSecret: process.env.HOJJA_STREAM_SECRET || 'hojja-educational-secure-stream-key-2026'
            });
            if (handled) return;
          } catch (err) {
            console.error('[Hojja Dev Backend Middleware Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'خطأ داخلي في معالجة طلب الموبايل والمنصة' }));
            return;
          }
        }
        next();
      });
    }
  };
}

const isElectron = !!process.env.ELECTRON;

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    aiCategorizePlugin(),
    hojjaMobileBackendPlugin(),
    isElectron
      ? electron([

          {
            // العملية الرئيسية للمتصفح
            entry: 'electron/main.js',
            vite: {
              build: {
                rollupOptions: {
                  output: {
                    format: 'cjs',
                    entryFileNames: '[name].js',
                  },
                },
              },
            },
          },
          {
            // تعريف ملف الـ Preload لضمان بنائه وتحويله إلى JS
            entry: 'electron/preload.js',
            onstart(options) {
              options.reload();
            },
            vite: {
              build: {
                rollupOptions: {
                  output: {
                    format: 'cjs',
                    entryFileNames: '[name].js',
                  },
                },
              },
            },
          },
        ])
      : null,
    isElectron ? renderer() : null,
  ].filter(Boolean),
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
