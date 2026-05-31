# 🔒 CryptoTransfer

> **Client-Side Cryptographic System & Secure WebRTC File Transfer**

CryptoTransfer is a robust, purely client-side web application designed to safely encrypt, decrypt, and transfer files securely between devices. Because all cryptography is performed directly within the browser, **no plaintext data or encryption keys are ever sent to a server**, ensuring true zero-knowledge privacy.

##  Key Features

###  Core Cryptography
*   **AES-256-GCM Encryption**: Highly secure symmetric encryption providing both confidentiality and authenticated data integrity.
*   **PBKDF2 Key Derivation**: Derives strong keys from standard passwords by applying HMAC-SHA256 over 100,000 times with a unique random salt, mitigating brute-force and dictionary attacks.
*   **Tamper-Proof Verification**: Utilizing Galois/Counter Mode (GCM), an authentication tag is calculated during encryption. If even a single bit of the file is modified in transit, decryption will explicitly fail.
*   **Zero-Knowledge Architecture**: The server *never* sees your unencrypted files or your passwords. Everything happens locally via the Web Crypto API.

### Secure P2P Transfer (WebRTC)
*   **Peer-to-Peer Simulator**: Transfer files globally directly from sender to receiver.
*   **Double Encryption**: Files are encrypted with AES-256-GCM *before* they enter the WebRTC DataChannel (which is already DTLS-encrypted). The AES key is shared over this secure DTLS tunnel, completely bypassing the signaling server.
*   **No Central Server Storage**: Uses PeerJS for lightweight connection signaling only. Files stream directly between peers.

###  Premium UI/UX
*   **iOS-Style Interactions**: Features smooth "glider" pill navigation, micro-animations, and fluid touch-swipe gestures for mobile devices.
*   **Responsive Design**: A sleek, dark-mode-first aesthetic with glassmorphism components that looks stunning on desktops, tablets, and phones.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rajatava06/CryptoTransfer.git
   cd CryptoTransfer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the port provided in your terminal) in your browser.

4. **Build for production**
   ```bash
   npm run build
   ```
   This will output the highly optimized static files into the `dist` directory, ready to be deployed to any static host (Vercel, Netlify, GitHub Pages, etc.).

---

##  Technology Stack

*   **Frontend Framework**: React 18 & Vite
*   **Styling**: Pure CSS with CSS Variables, Flexbox, and CSS Grid (Zero external CSS frameworks for maximum control)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Cryptography**: Native Browser Web Crypto API
*   **P2P Networking**: [PeerJS](https://peerjs.com/) (WebRTC abstraction)

---

##  How it Works (P2P Transfer)

1.  **Receiver** opens the app, generates a random 7-character Code, and shares it with the Sender.
2.  **Sender** inputs the code and establishes a direct WebRTC connection.
3.  **Sender** selects a file. The browser locally encrypts it using AES-256-GCM and sends the encrypted binary chunks alongside the encryption keys securely over the DTLS-encrypted WebRTC DataChannel.
4.  **Receiver** accepts the file, and their browser locally decrypts the binary chunks using the received keys, allowing them to save the original file.

---

##  License

This project is open-source and done under guidance of my professor.

---
*Developed with modern web security standards(U.S standards).*
