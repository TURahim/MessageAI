# MessageAI

A messaging application built with React Native (Expo) and Firebase.

## Project Structure

This is a pnpm monorepo with the following structure:

```
MessageAI/
├── app/                    # React Native (Expo) mobile application
│   ├── src/               # Application source code
│   ├── assets/            # Images and static assets
│   ├── App.tsx            # Main app component
│   └── package.json       # App dependencies
├── docs/                  # Project documentation
│   └── MVP_PRD            # MVP Product Requirements Document
├── firebase.json          # Firebase project configuration
├── firestore.rules        # Firestore security rules
├── storage.rules          # Firebase Storage security rules
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── .gitignore             # Git ignore rules
```

## Getting Started

### Prerequisites

- Node.js (LTS version)
- pnpm (`npm install -g pnpm`)
- Expo CLI
- Firebase project

### Installation

```bash
# Install dependencies for all workspace packages
pnpm install

# Start the Expo development server
cd app
pnpm start
```

## Development

### Mobile App

The mobile app is located in the `app/` directory and built with:
- React Native via Expo
- Firebase (Auth, Firestore, Storage)
- React Navigation

### Firebase

Firebase configuration files are at the root:
- `firestore.rules` - Database security rules
- `storage.rules` - File storage security rules
- `firebase.json` - Firebase project configuration

## Scripts

From the `app/` directory:
- `pnpm start` - Start Expo development server
- `pnpm ios` - Run on iOS simulator
- `pnpm android` - Run on Android emulator
- `pnpm web` - Run in web browser

# MessageAI
