# Swap Frontend

Frontend applications for Swap Neobank - a modern financial platform built with React Native and web technologies.

## 🏗️ Project Structure

```
swap-frontend/
├── swap/           # React Native mobile app
├── swap-web/       # Web application
├── ui/             # Design references & inspiration
└── README.md       # This file
```

## 📱 Applications

### Mobile App (`swap/`)
- **Framework**: React Native with Expo
- **Features**: Multi-currency wallet, P2P payments, real-time messaging
- **Platforms**: iOS & Android

### Web App (`swap-web/`)
- **Framework**: HTML/CSS/JavaScript
- **Purpose**: Web version of core banking features
- **Deployment**: Static web hosting

### UI Design (`ui/`)
- **Purpose**: Design references, mockups, and inspiration
- **Usage**: Visual guides for UI/UX development
- **Note**: Not shared code components, just design assets

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (for mobile development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/KEKPA/swap-frontend.git
   cd swap-frontend
   ```

2. **Install dependencies**:
   ```bash
   # For mobile app
   cd swap
   npm install
   
   # For web app
   cd ../swap-web
   npm install
   ```

3. **Start development**:
   ```bash
   # Mobile app
   cd swap
   npm start
   
   # Web app
   cd ../swap-web
   # Open index.html in browser
   ```

## 🛠️ Development

### Mobile Development
- Uses Expo for easier React Native development
- Local SQLite database for offline-first architecture
- Real-time features with WebSocket connections

### Web Development
- Static HTML/CSS/JavaScript application
- Responsive design for desktop and mobile browsers

### Design References
- UI folder contains design mockups and inspiration
- Use these as visual guides for implementing features

## 🔗 Related Repositories

- [swap-devops](https://github.com/KEKPA/swap-devops) - DevOps configuration and scripts
- [financial-service](https://github.com/KEKPA/financial-service) - Backend financial services
- [messages-service](https://github.com/KEKPA/messages-service) - Real-time messaging backend

---

**Note**: This repository is part of the Swap Neobank multi-repository architecture. See the [DevOps repository](https://github.com/KEKPA/swap-devops) for complete setup instructions.
