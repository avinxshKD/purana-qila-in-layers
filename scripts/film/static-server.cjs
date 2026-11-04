'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
// Serve the frozen build directly, with no live Vite transforms/dependency scan.
async function servePinned({folder,port=5188,middleware}){
  folder=path.resolve(folder);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.json':'application/json'};
  const server=http.createServer((req,res)=>{
    function serveFile(){
      let absolute;try{absolute=path.resolve(folder,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));}catch{res.writeHead(400).end();return;}
      if(absolute!==folder&&!absolute.startsWith(folder+path.sep)){res.writeHead(403).end();return;}
      const stream=fs.createReadStream(absolute);stream.on('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();});
      stream.once('open',()=>{res.setHeader('Content-Type',types[path.extname(absolute)]||'application/octet-stream');stream.pipe(res);});
    }
    if(middleware)middleware(req,res,serveFile);else serveFile();
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();})};
}
module.exports={servePinned};
