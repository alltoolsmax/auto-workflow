// Tạo icon.png / icon.ico / icon.icns từ assets/logo.svg (chạy trước khi build).
// Cần: npm i --no-save sharp png2icons
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

(async () => {
  const dir = path.join(__dirname, '..', 'assets');
  const svg = fs.readFileSync(path.join(dir, 'logo.svg'));
  const png1024 = await sharp(svg, { density: 300 }).resize(1024, 1024).png().toBuffer();
  fs.writeFileSync(path.join(dir, 'icon.png'), await sharp(png1024).resize(512, 512).png().toBuffer());
  fs.writeFileSync(path.join(dir, 'icon.ico'), png2icons.createICO(png1024, png2icons.BICUBIC2, 0, false, true));
  fs.writeFileSync(path.join(dir, 'icon.icns'), png2icons.createICNS(png1024, png2icons.BICUBIC2, 0));
  console.log('Đã tạo icon.png, icon.ico, icon.icns từ logo.svg');
})().catch((e) => { console.error(e); process.exit(1); });
