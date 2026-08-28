import JsBarcode from 'jsbarcode';

export const generateBarcodeDataURL = (text: string): string => {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, text, {
    format: "CODE128",
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 18,
    fontOptions: "bold",
    margin: 0
  });
  return canvas.toDataURL('image/png');
};

export const generateRandomBarcode = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};
