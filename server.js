const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.zkey': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    
    if (filePath === './') {
        filePath = './index.html';
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    console.log(`${req.method} ${req.url} -> ${filePath}`);
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found: ' + filePath);
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'Cross-Origin-Opener-Policy': 'same-origin'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log('🚀 MiniChain server running at http://localhost:' + port);
    console.log('📁 Serving files from:', __dirname);
    console.log('🔑 ZK proof files available at:');
    console.log('   - build/transfer_js/transfer.wasm');
    console.log('   - build/transfer_final.zkey');
    console.log('   - build/verification_key.json');
    console.log('\n✨ Ready to test zero-knowledge proofs!');
});