import fs from 'fs';
import path from 'path';

const files = [
  'node_modules/html2canvas/dist/html2canvas.js',
  'node_modules/html2canvas/dist/html2canvas.esm.js',
  'node_modules/html2canvas/dist/npm/index.js',
  'node_modules/html2canvas/dist/npm/css/types/color.js',
  'node_modules/.vite/deps/html2canvas.js'
];

files.forEach(p => {
  if (fs.existsSync(p)) {
    try {
      let content = fs.readFileSync(p, 'utf8');
      const reg = /if\s*\(\s*typeof\s+colorFunction\s*===\s*["']undefined["']\s*\)\s*(?:\{\s*throw\s+new\s+Error\([^)]+\);\s*\}|throw\s+new\s+Error\([^)]+\);)/g;
      if (reg.test(content)) {
        content = content.replace(reg, 'if (typeof colorFunction === "undefined") return 0x00000000;');
        fs.writeFileSync(p, content, 'utf8');
      }
    } catch (e) {
      // ignore
    }
  }
});
