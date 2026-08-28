/**
 * مساعدات طباعة الفواتير والتقارير بدون الحاجة لاتصال بالإنترنت (Offline Mode)
 * يوفر تضمين خط Cairo من الملفات المحلية مباشرة
 */

export const getPrintFontStyles = (customOrigin?: string): string => {
  const origin = customOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
  
  return `
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 300;
      font-display: swap;
      src: local('Cairo Light'), local('Cairo-Light'), url('${origin}/fonts/cairo-400.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: local('Cairo Regular'), local('Cairo-Regular'), local('Cairo'), url('${origin}/fonts/cairo-400.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: local('Cairo Medium'), local('Cairo-Medium'), url('${origin}/fonts/cairo-500.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: local('Cairo SemiBold'), local('Cairo-SemiBold'), url('${origin}/fonts/cairo-600.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: local('Cairo Bold'), local('Cairo-Bold'), url('${origin}/fonts/cairo-700.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 800;
      font-display: swap;
      src: local('Cairo ExtraBold'), local('Cairo-ExtraBold'), url('${origin}/fonts/cairo-800.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-style: normal;
      font-weight: 900;
      font-display: swap;
      src: local('Cairo Black'), local('Cairo-Black'), url('${origin}/fonts/cairo-900.ttf') format('truetype');
    }
    
    *, *::before, *::after {
      font-family: 'Cairo', 'Almarai', 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    }
  `;
};

export const getPrintBaseHead = (
  title: string,
  extraCss: string = '',
  customOrigin?: string
): string => {
  const origin = customOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
  const fontStyles = getPrintFontStyles(origin);

  return `
    <meta charset="utf-8" />
    <base href="${origin}/" />
    <title>${title}</title>
    <style>
      ${fontStyles}
      ${extraCss}
    </style>
  `;
};
