async function main() {
    const pngToIco = (await import('png-to-ico')).default;
    const fs = require('fs');
    const path = require('path');

    const inputPath = path.join(__dirname, 'icon.png');
    const outputPath = path.join(__dirname, 'icon.ico');

    const buf = await pngToIco(inputPath);
    fs.writeFileSync(outputPath, buf);
    console.log('icon.ico を生成しました');
}
main().catch(err => console.error('ICO変換エラー:', err));
