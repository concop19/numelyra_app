const fs = require('fs');
const path = require('path');

const imageDir = path.join(__dirname, '..', 'image');
const targetFile = path.join(__dirname, '..', 'src', 'config', 'calendarImages.ts');

const seasons = [
  { key: 'spring', exportName: 'SPRING_IMAGES', folder: 'spring' },
  { key: 'summer', exportName: 'SUMMER_IMAGES', folder: 'summer' },
  { key: 'autom', exportName: 'AUTUMN_IMAGES', folder: 'autom' },
  { key: 'winter', exportName: 'WINTER_IMAGES', folder: 'winter' }
];

let fileContent = `/**
 * calendarImages.ts - Bảng kê tĩnh kho tranh 4 Mùa dân gian Việt Nam
 * Tự động tạo từ kho ảnh mobile_app/image/
 * Tổng số ảnh: 297 bức tranh đồ họa mộc bản dân gian tích hợp linh vật Lửa
 */

`;

seasons.forEach(({ exportName, folder }) => {
  const dirPath = path.join(imageDir, folder);
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'))
    .sort();

  fileContent += `export const ${exportName}: any[] = [\n`;
  files.forEach(f => {
    // Relative path from src/config/calendarImages.ts to image/...
    const relPath = `../../image/${folder}/${f}`;
    fileContent += `  require(${JSON.stringify(relPath)}),\n`;
  });
  fileContent += `];\n\n`;
});

fileContent += `export const CALENDAR_SEASONS = {
  SPRING: SPRING_IMAGES,
  SUMMER: SUMMER_IMAGES,
  AUTUMN: AUTUMN_IMAGES,
  WINTER: WINTER_IMAGES,
};
`;

fs.writeFileSync(targetFile, fileContent, 'utf-8');
console.log('Successfully generated calendarImages.ts at:', targetFile);
