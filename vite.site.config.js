// Production build of the public site only: site.html becomes dist/index.html, served under the GitHub Pages
// project path. Dev pages (index.html, film.html, features.html, harnesses) are not inputs, and public/ is pruned to
// what the site fetches at runtime.
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {appendFileSync,existsSync,readdirSync,readFileSync,renameSync,rmSync} from 'node:fs';
import {defineConfig} from 'vite';

const root=dirname(fileURLToPath(import.meta.url));
export const SITE_BASE='/purana-qila-in-layers/';
export const LICENSE_FILE='THIRD-PARTY-LICENSES.md';
// Top-level entries kept besides index.html and assets/: the public/ entries the site needs, and the bundled
// dependencies' licence file. The film-emphasis* field sets are film-pipeline only; the site ships the cropped
// 8-bit site-pools-m2b set built from film-emphasis-m2b.
export const PUBLIC_ALLOW=['favicon.svg','og-image.jpg','fonts','film','site-pools-m2b','site-tier','site-poster',LICENSE_FILE];

// Vite's runtime helpers (module preload) ship in the bundle, but Vite is not a dependency, so build.license leaves
// it out. Its MIT text is copied from the installed package, without the licences of Vite's own Node-side bundle.
function viteLicence(){
  const dir=resolve(root,'node_modules/vite'),text=readFileSync(resolve(dir,'LICENSE.md'),'utf8').replace(/\r\n/g,'\n');
  const start=text.indexOf('MIT License'),end=text.indexOf('\n# Licenses of bundled dependencies');
  if(start<0||end<start)throw new Error('Unexpected node_modules/vite/LICENSE.md layout');
  const {version}=JSON.parse(readFileSync(resolve(dir,'package.json'),'utf8'));
  return `\n## vite - ${version} (MIT)\n\nRuntime helpers (module preload) bundled into the site.\n\n${text.slice(start,end).trimEnd()}\n`;
}

function siteOnly(){
  let outDir;
  return {
    name:'strata-site-only',
    apply:'build',
    configResolved(config){outDir=resolve(config.root,config.build.outDir);},
    closeBundle(){
      // The absolute base keeps every URL in the page valid after the rename.
      const page=resolve(outDir,'site.html');if(!existsSync(page))throw new Error('site.html missing from build');
      renameSync(page,resolve(outDir,'index.html'));
      const licences=resolve(outDir,LICENSE_FILE);if(!existsSync(licences))throw new Error(LICENSE_FILE+' missing from build');
      appendFileSync(licences,viteLicence());
      for(const entry of readdirSync(outDir,{withFileTypes:true})){
        if(entry.name==='index.html'||entry.name==='assets'||PUBLIC_ALLOW.includes(entry.name))continue;
        rmSync(resolve(outDir,entry.name),{recursive:true,force:true});
      }
    }
  };
}

export default defineConfig({
  base:SITE_BASE,
  plugins:[siteOnly()],
  // three.js alone puts the scene chunk near 1 MB; it is loaded after first paint.
  build:{outDir:'dist',emptyOutDir:true,chunkSizeWarningLimit:1200,license:{fileName:LICENSE_FILE},rollupOptions:{input:{index:resolve(root,'site.html')}}},
  worker:{format:'es'}
});
