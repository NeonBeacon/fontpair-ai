import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const OUTPUT_FILE = 'fontpair_codebase.txt';
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.sql', '.json', '.md'];
const IGNORED_DIRS = ['node_modules', 'dist', '.git', '.claude', 'build', 'coverage'];
const IGNORED_FILES = ['package-lock.json', 'yarn.lock', 'bundle-for-gemini.js'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        results = results.concat(getFiles(filePath));
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext) && !IGNORED_FILES.includes(file)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function bundle() {
  const files = getFiles(__dirname);
  let output = `Project: FontPair AI\nGenerated: ${new Date().toISOString()}\n\n`;

  console.log(`Found ${files.length} files. Bundling...`);

  files.forEach(filePath => {
    const relativePath = path.relative(__dirname, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // This separator helps Gemini understand where files start/end
    output += `\n================================================================================\n`;
    output += `FILE PATH: ${relativePath}\n`;
    output += `================================================================================\n`;
    output += `${content}\n`;
  });

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Done! Created ${OUTPUT_FILE}`);
}

bundle();
