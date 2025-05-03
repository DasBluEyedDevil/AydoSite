const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

// Create directory for certs if it doesn't exist
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)){
    fs.mkdirSync(certDir, { recursive: true });
}

// Generate certificates
const attrs = [{ name: 'commonName', value: 'beckon.vineyard.haus' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// Save certificate files
fs.writeFileSync(path.join(certDir, 'privkey.pem'), pems.private);
fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(certDir, 'chain.pem'), pems.cert); // For self-signed, chain is same as cert

console.log('Self-signed certificates generated successfully in ./certs directory');