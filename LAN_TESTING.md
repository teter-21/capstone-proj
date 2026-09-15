# Testing Magno Dental Clinic on Other Devices

This version is prepared for LAN testing before online deployment.

## 1. Start the backend

From `back-end`:

```bash
npm install
node server.js
```

The backend listens on all network interfaces at port 3001.

## 2. Start the frontend

From `front-end`:

```bash
npm install
npm run dev
```

Vite listens on all network interfaces at port 5173.

## 3. Open from another device

Connect the phone/tablet/laptop to the same Wi-Fi as the computer running the system, then open:

`http://192.168.1.4:5173/`

The frontend automatically uses the IP address of the page to reach the backend on port 3001.

## 4. If it does not connect

- Allow Node.js through Windows Firewall on Private networks.
- Allow TCP ports 5173 and 3001 through the firewall if necessary.
- Make sure both devices are on the same Wi-Fi/LAN.
- If the computer's IP changes, use the new IP in the browser.
- If the backend CORS setting rejects the new IP, update `FRONTEND_URL` in `back-end/.env` to the new frontend address, for example `http://192.168.1.5:5173`.

## 5. Optional explicit API address

If needed, create `front-end/.env`:

```env
VITE_API_URL=http://192.168.1.4:3001
```

Then restart Vite.

> This is for local-network testing only. Do not expose port 3001 directly to the public internet when deploying online.
