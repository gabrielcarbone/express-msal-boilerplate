### Requirements

- node 18 (my version is v18.14.0)

### Talk to Sy for secrets

```bash
export AAD_TENANT_ID=""
export AAD_CLIENT_ID=""
export AAD_CLIENT_SECRET=""
```

### Getting Started

#### Run the proxy in https

Create a cert, refer to Sy's instruction here https://github.com/synle/self-signed-certificate-notes
Start a proxy with self signed cert

```bash
npx local-ssl-proxy --key ~/server.key --cert ~/server.crt --source 3001 --target 3000
```

#### Run the development server:

```bash
npm install && npm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Help?

- Talk to Sy
