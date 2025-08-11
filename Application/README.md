# React Native Android Project for Elgar Car Theft Tracking System

This is the Android application for the Elgar car theft tracking system, built with React Native.

## Prerequisites

- Node.js (14+)
- React Native CLI
- Android Studio
- Java Development Kit (JDK 11)
- Android SDK

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install iOS dependencies (if running on iOS):
```bash
cd ios && pod install && cd ..
```

## Running the App

### Android
```bash
# Start Metro bundler
npm start

# Run on Android device/emulator
npm run android
```

### iOS
```bash
# Run on iOS device/simulator
npm run ios
```

## Build for Production

### Android
```bash
# Generate release APK
cd android
./gradlew assembleRelease

# Generate release AAB (for Play Store)
./gradlew bundleRelease
```

## Features

- Real-time event tracking
- Hebrew RTL interface
- Push notifications
- GPS location services
- Photo capture and upload
- Role-based access control
- Offline capability

## Architecture

- **React Native**: Cross-platform mobile framework
- **Supabase**: Backend database and authentication
- **Firebase**: Push notifications
- **React Navigation**: Navigation system
- **React Native Paper**: Material Design UI components

## Project Structure

```
src/
  ├── components/        # Reusable UI components
  ├── contexts/         # React contexts for state management
  ├── navigation/       # Navigation configuration
  ├── screens/          # Screen components
  ├── utils/           # Utility functions and constants
  └── assets/          # Images, fonts, etc.
```

## Environment Variables

Create a `.env` file in the root directory:

```
SUPABASE_URL=https://smchvtbqzqssywlgshjj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtY2h2dGJxenFzc3l3bGdzaGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTUwNTUsImV4cCI6MjA2OTQ3MTA1NX0.xxOO5fyAY3RsSKo-xK1gJiDCOgNNxvpSk5AB8eWsDhQ
API_BASE_URL=your_api_base_url
```

## Permissions

The app requires the following permissions:
- Camera (for photo capture)
- Location (for GPS tracking)
- Storage (for file access)
- Notifications (for push notifications)

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npm start -- --reset-cache`
2. **Android build issues**: Clean with `cd android && ./gradlew clean`
3. **iOS build issues**: Clean build folder in Xcode

### Debugging

- Use React Native Debugger for development
- Check logs with `npx react-native log-android` or `npx react-native log-ios`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary and confidential.
