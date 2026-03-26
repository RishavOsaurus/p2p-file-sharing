# Quick Start Guide

Get the P2P File Sharing app running in 5 minutes!

## 1. Clone the Repository

```bash
git clone https://github.com/RishavOsaurus/p2p-file-sharing.git
cd p2p-file-sharing
```

## 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd ../client
npm install
```

## 3. Start the Application

**Terminal 1 - Backend Server (required first):**
```bash
cd server
npm run dev
# Server will start on http://localhost:5000
```

**Terminal 2 - Frontend Application:**
```bash
cd client
npm run dev
# Frontend will start on http://localhost:3000
```

## 4. Open in Browser

- Open `http://localhost:3000` in your browser
- You should see the P2P File Sharing login screen

## 5. Test with Multiple Devices

**Same Device (Two Browser Tabs):**
1. Open `http://localhost:3000` in Tab 1
2. Enter Device Name: "Phone", Room: "test-room"
3. Click "Join"
4. Open `http://localhost:3000` in Tab 2 in a new window
5. Enter Device Name: "Laptop", Room: "test-room"
6. Click "Join"
7. You should see each other's devices

**Different Devices on Same Network:**
1. Find your computer's IP: 
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac: `ifconfig en0 | grep inet`
2. Update `client/vite.config.js` proxy target to your IP
3. On other device, open `http://<your-ip>:3000`
4. Join same room to start transferring files

## 6. Transfer Files

1. Click on a device from the list
2. Drag and drop files or click to select
3. Click "Send Files"
4. Other device receives a request modal
5. Accept or reject the transfer
6. Watch the progress in the bottom-right corner
7. Files automatically download on receiver's device

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| Devices not appearing | Make sure both joined same room |
| WebSocket connection fails | Check backend is running on port 5000 |
| Files not transferring | Check DevTools console for errors, verify DataChannel opened |
| Slow transfer | Network dependent, try smaller files first |
| CORS errors | Backend already has CORS enabled |

## 8. Production Deployment

### Build Frontend
```bash
cd client
npm run build
# Creates dist/ folder
```

### Deploy Backend
- Deploy `server/server.js` to cloud platform (Heroku, Railway, Vercel)
- Serve frontend from `client/dist` directory
- Update CORS and proxy settings as needed

## 9. Environment Variables

Create `.env` in `server/` if needed:
```
PORT=5000
NODE_ENV=development
```

Create `.env.local` in `client/` for custom backend:
```
VITE_SOCKET_URL=http://your-backend-url:5000
```

## 10. Additional Features

### Run with File Size Limit
Modify `server/server.js` to add max file size validation

### Enable Encryption
Add WebCrypto encryption in `client/src/services/webrtc.js`

### Add More Rooms
Implement room creation UI in `App.jsx`

---

**Done!** 🎉 You now have a working P2P file sharing application.

For detailed documentation, see [README.md](README.md).
