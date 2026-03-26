# P2P File Sharing Application

A full-stack peer-to-peer file and text sharing web application similar to AirDrop/Snapdrop.

## Features

- 🔗 **Direct P2P Connection**: Uses WebRTC DataChannel for direct device-to-device transfer
- 📱 **Cross-Device**: Works across different devices (PC, mobile, tablet)
- 📦 **Multi-File Support**: Send multiple files at once with progress tracking
- ✅ **Receiver Confirmation**: Receiver must accept before files transfer
- 🚀 **High Performance**: 64KB chunk-based transfer with backpressure handling
- 🎨 **Modern UI**: Clean, responsive interface with TailwindCSS

## Architecture

### Backend (Signaling Server)
- **Node.js** + **Express** for HTTP server
- **Socket.IO** for real-time WebSocket signaling
- In-memory device registry organized by rooms
- Minimal server overhead - only handles signaling, not file relay

### Frontend (Client Application)
- **React** (Vite) for fast development
- **Zustand** for state management
- **Socket.IO Client** for signaling
- **WebRTC APIs** for P2P connections
- **TailwindCSS** for styling

### P2P Transfer
1. Client connects to signaling server via WebSocket
2. Server broadcasts available devices in the same room
3. Sender selects target device and initiates WebRTC connection
4. Offer/Answer/ICE candidates exchanged through Socket.IO
5. Once connected, files transferred directly via RTCDataChannel
6. Files are chunked (64KB) and sent with backpressure handling

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd p2p-file-sharing

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### Running Locally

```bash
# Terminal 1: Start backend (port 5000)
cd server
npm run dev

# Terminal 2: Start frontend (port 3000)
cd client
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Testing on Multiple Devices

1. Find your local IP: `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows)
2. Update frontend proxy in `client/vite.config.js` to your backend IP
3. Open `http://<your-ip>:3000` on different devices
4. Join the same room and test transfers

## Usage

1. **Set Device Name**: Enter a name for your device (e.g., "My Laptop")
2. **Join Room**: Set room ID (defaults to "default-room"). Devices in same room can see each other
3. **Select Target Device**: Click on another device to send files
4. **Select Files**: Use file picker or drag-drop to select files
5. **Send Files**: Click "Send Files" and wait for receiver to accept
6. **Receiver**: Accept/Reject dialog appears on receiver's device
7. **Track Progress**: Transfer progress shown in bottom-right corner

## Technical Details

### File Transfer Protocol

**Control Messages (JSON over DataChannel):**
```json
{ "type": "file-meta", "files": [{ "name": "file.txt", "size": 1024, "type": "text/plain" }] }
{ "type": "accept" }
{ "type": "reject" }
{ "type": "file-end", "name": "file.txt" }
```

**Binary Messages:** Raw file chunks (64KB max)

### Chunking Strategy
- Chunk size: 64KB
- Backpressure handling: Pauses sending if `bufferedAmount > 1MB`
- Sequential file transfer
- Automatic download trigger on receiver side

### WebRTC Configuration
- STUN Server: `stun:stun.l.google.com:19302`
- DataChannel bufferedAmountLowThreshold: 65536 bytes

## Limits & Constraints

- Max file size: Limited by browser memory and available RAM
- Max concurrent transfers: 1 per DataChannel (can extend with multiple channels)
- Room-based discovery: Uses in-memory device registry

## Performance Considerations

- Uses `bufferedAmount` to implement backpressure
- Implements `onbufferedamountlow` callback for flow control
- Efficient blob handling to prevent memory leaks
- Chunk-based reading with FileReader API

## Browser Support

- Chrome/Chromium: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 15+)
- Edge: ✅ Full support

## Deployment

### Heroku / Cloud Platform

```bash
# Build frontend
cd client && npm run build

# Server expects static files at ./public
cp -r dist ../server/public

# Deploy server with static file serving
```

Add to `server.js`:
```javascript
app.use(express.static('public'));
```

## Troubleshooting

**Devices not discovering each other:**
- Check both devices are on same WiFi
- Ensure both joined same room ID
- Check browser console for WebSocket connection errors

**Files not transferring:**
- Verify DataChannel opened: Check browser console
- Check firewall isn't blocking WebRTC
- Ensure receiver accepted the request

**Slow transfer speed:**
- Normal for cross-WiFi: Depends on network
- Check WiFi signal strength
- Large files may take time depending on bandwidth

## Future Enhancements

- [ ] QR-based room pairing
- [ ] Clipboard sharing
- [ ] Text messaging
- [ ] Folder transfer
- [ ] Resume interrupted transfers
- [ ] E2E encryption layer
- [ ] PWA support for offline capability
- [ ] Transfer history
- [ ] Compression support

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit PRs.
