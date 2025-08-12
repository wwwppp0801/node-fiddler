# Node-Fiddler

[![npm version](https://badge.fury.io/js/node-fiddler.svg)](https://badge.fury.io/js/node-fiddler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful HTTP proxy server written in Node.js, providing similar functionality to Fiddler with auto-responder capabilities and request interception features.

## Features

- 🔄 **HTTP Proxy Server**: Pure Node.js implementation based on sockets
- ⚡ **Keep-Alive Support**: Full support for HTTP keep-alive and chunked transfer encoding
- 🎯 **Auto Responder**: Redirect specific requests to local files (similar to Fiddler's auto-responder)
- 🌐 **Hosts Override**: Implement hosts file-like functionality for domain redirection
- 🔐 **HTTPS Proxy**: Reverse proxy and content interception for HTTPS (with self-signed certificates)
- 🔌 **HTTP CONNECT**: Full implementation of HTTP CONNECT method for tunneling
- 🎨 **Web UI**: Simple web interface for monitoring and configuration
- 📁 **File Upload**: Support for multipart/form-data file uploads
- 🔄 **Hot Reload**: Configuration changes take effect without restart

## Installation

### Global Installation
```bash
npm install -g node-fiddler
```

### Local Installation
```bash
npm install node-fiddler
```

### From Source
```bash
git clone https://github.com/wwwppp0801/node-fiddler.git
cd node-fiddler
npm install
```

## Quick Start

### Basic Usage
```bash
# Using global installation
node-fiddler

# Using local installation
node httpproxy.js

# Custom configuration
node httpproxy.js --config custom-config.json
```

### Default Settings
- **Listen Host**: 127.0.0.1
- **Listen Port**: 8083
- **Max Connections**: 1000
- **Web UI**: Available at http://127.0.0.1:8083

## Configuration

The proxy can be configured using the `config.json` file. Changes to this file are automatically applied without restarting the server.

### Configuration Structure

```javascript
({
    'listen_host': '127.0.0.1',      // Proxy server listen address
    'listen_port': '8083',           // Proxy server listen port
    'max_connections': 1000,         // Maximum concurrent connections
    'hosts': [
        // Host redirection rules (similar to hosts file)
        // ['www.example.com', '127.0.0.1'],
    ],
    'auto_responder': [
        // Auto responder rules
        ['http://www.example.com/', 'file:local-response.html'],
        
        // Regex-based rules
        [/^http:\/\/www\.example\.com\/search/, 'file:search-results.html'],
        
        // Dynamic file replacement using capture groups
        [/^http:\/\/api\.example\.com\/users\/(\w+)/, 'file:user-{1}.json'],
        
        // URL modification
        [/^http:\/\/www\.example\.com\/search/, '{_}?q=modified'],
        
        // Advanced callback function
        ["http://cdn.example.com/app.js", "{_}", function(code) {
            code += ";console.log('Injected by node-fiddler');";
            return code;
        }],
    ],
})
```

### Auto Responder Rules

The auto responder supports several types of rules:

#### 1. Simple URL to File Mapping
```javascript
['http://www.example.com/api/data', 'file:mock-data.json']
```

#### 2. Regular Expression Rules
```javascript
[/^http:\/\/api\.example\.com\/users\/(\d+)/, 'file:user-{1}.json']
```

#### 3. URL Modification
```javascript
[/^http:\/\/www\.example\.com\/search/, '{_}?modified=true']
```
- `{_}` represents the original URL
- `{1}`, `{2}`, etc. represent regex capture groups

#### 4. Dynamic Content Modification
```javascript
["http://example.com/script.js", "{_}", function(originalContent) {
    // Modify and return the content
    return originalContent + "\n// Modified by proxy";
}]
```

### Host Redirection

Redirect domains to different IP addresses:

```javascript
'hosts': [
    ['www.example.com', '127.0.0.1'],      // Redirect to localhost
    ['api.example.com', '192.168.1.100'],  // Redirect to local server
]
```

## Usage Examples

### Mock API Responses
```javascript
// In config.json
'auto_responder': [
    // Return local JSON for API calls
    ['http://api.example.com/users', 'file:mock-users.json'],
    
    // Return different responses based on URL parameters
    [/^http:\/\/api\.example\.com\/user\/(\d+)/, 'file:user-{1}.json'],
]
```

### Development Environment Setup
```javascript
// Redirect production APIs to local development server
'hosts': [
    ['api.production.com', '127.0.0.1:3000'],
]
```

### Content Injection
```javascript
// Inject custom JavaScript into web pages
["http://example.com/app.js", "{_}", function(code) {
    return code + "\n" + require('fs').readFileSync('debug-tools.js', 'utf8');
}]
```

## Browser Configuration

Configure your browser to use the proxy:

1. **Chrome/Chromium**:
   ```bash
   chrome --proxy-server=127.0.0.1:8083
   ```

2. **Firefox**: 
   - Go to Settings → Network Settings → Manual proxy configuration
   - HTTP Proxy: 127.0.0.1, Port: 8083

3. **System Proxy** (macOS/Linux):
   ```bash
   export http_proxy=http://127.0.0.1:8083
   export https_proxy=http://127.0.0.1:8083
   ```

## HTTPS Support

Node-Fiddler supports HTTPS proxying with content interception. Note that it uses self-signed certificates by default.

### Custom Certificates

Replace the default certificates with your own:
- `server-cert.pem`: Your SSL certificate
- `server-key.pem`: Your private key
- `server-csr.pem`: Certificate signing request

## Web Interface

Access the web interface at `http://127.0.0.1:8083` to:
- Monitor active connections
- View request/response logs
- Modify configuration in real-time
- Test auto responder rules

## API

### Programmatic Usage

```javascript
const NodeFiddler = require('node-fiddler');

const proxy = new NodeFiddler({
    listen_host: '127.0.0.1',
    listen_port: 8083,
    auto_responder: [
        ['http://example.com/api', 'file:mock-response.json']
    ]
});

proxy.start();
```

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Find process using the port
   lsof -i :8083
   # Kill the process or change the port in config.json
   ```

2. **Certificate warnings**: 
   - Expected for HTTPS interception with self-signed certificates
   - Install custom certificates or accept warnings in browser

3. **Connection refused**:
   - Check firewall settings
   - Ensure the proxy is running on the correct host/port

### Debug Mode

Enable debug logging:
```bash
DEBUG=node-fiddler node httpproxy.js
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Wang Peng** - [wwwppp0801@qq.com](mailto:wwwppp0801@qq.com)

## Changelog

### v1.0.5
- Added multipart/form-data support
- Improved HTTPS proxy functionality
- Enhanced web UI
- Bug fixes and performance improvements

## Related Projects

- [Fiddler](https://www.telerik.com/fiddler) - The original HTTP debugging proxy
- [mitmproxy](https://mitmproxy.org/) - Interactive HTTPS proxy
- [Charles Proxy](https://www.charlesproxy.com/) - HTTP proxy for development

---

⭐ If you find this project helpful, please give it a star on GitHub!