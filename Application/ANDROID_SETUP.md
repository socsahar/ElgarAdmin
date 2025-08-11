# Elgar Mobile App - Android Setup Guide

## Prerequisites

Before setting up the mobile application, ensure you have the following:

### Software Requirements
- **Node.js** (16.0 or higher) - [Download](https://nodejs.org/)
- **Java Development Kit (JDK)** 11 or 17 - [Download](https://adoptopenjdk.net/)
- **Android Studio** - [Download](https://developer.android.com/studio)
- **React Native CLI** - Install with `npm install -g react-native-cli`

### Android Development Environment
1. Install Android Studio
2. Install Android SDK (API Level 33 or higher)
3. Set up Android environment variables:
   ```
   ANDROID_HOME=C:\Users\[username]\AppData\Local\Android\Sdk
   PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools
   ```

## Installation Steps

### 1. Clone and Setup
```bash
# Navigate to the Application folder
cd "Application"

# Install dependencies
npm install

# For iOS (if planning to support iOS later)
cd ios && pod install && cd ..
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtY2h2dGJxenFzc3l3bGdzaGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4OTUwNTUsImV4cCI6MjA2OTQ3MTA1NX0.xxOO5fyAY3RsSKo-xK1gJiDCOgNNxvpSk5AB8eWsDhQ
API_BASE_URL=https://your-server-domain.com
```

### 3. Firebase Setup (for push notifications)
1. Create a Firebase project: [Firebase Console](https://console.firebase.google.com/)
2. Add Android app with package name: `com.checkpoint.elgarmobile`
3. Download `google-services.json`
4. Place it in: `android/app/google-services.json`

### 4. Android Build Setup
```bash
# Navigate to android folder
cd android

# Clean build (if needed)
./gradlew clean

# Generate debug APK
./gradlew assembleDebug

# Generate release APK
./gradlew assembleRelease
```

## Running the Application

### Development Mode
```bash
# Start Metro bundler
npm start

# Run on Android device/emulator (in another terminal)
npm run android

# Or manually:
npx react-native run-android
```

### Production Build
```bash
# Generate signed APK for release
cd android
./gradlew assembleRelease

# APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Physical Tablet Testing

### 1. Enable Developer Options
1. Go to **Settings > About Tablet**
2. Tap **Build Number** 7 times
3. Go back to **Settings > Developer Options**
4. Enable **USB Debugging**

### 2. Connect Tablet
```bash
# Check connected devices
adb devices

# If device appears, install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or run directly
npm run android
```

### 3. Testing Checklist
- [ ] App installs successfully
- [ ] Hebrew RTL interface displays correctly
- [ ] Login with username/password works
- [ ] Real-time events sync from Supabase
- [ ] GPS location services work
- [ ] Camera/photo capture functions
- [ ] Push notifications receive (if Firebase configured)
- [ ] App works in landscape/portrait modes
- [ ] Performance is acceptable on tablet hardware

## Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear Metro cache
npm start -- --reset-cache

# Clear React Native cache
npx react-native start --reset-cache
```

#### Android Build Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

#### USB Debugging Not Working
1. Ensure USB debugging is enabled
2. Try different USB cable/port
3. Install proper device drivers
4. Check `adb devices` output

#### App Crashes on Start
1. Check Metro bundler is running
2. Verify environment variables in `.env`
3. Check Android logs: `npx react-native log-android`
4. Ensure all permissions are granted

### Debug Commands
```bash
# View Android logs
npx react-native log-android

# View app logs
adb logcat | grep -i "elgar"

# Clear app data
adb shell pm clear com.checkpoint.elgarmobile

# Uninstall app
adb uninstall com.checkpoint.elgarmobile
```

## Deployment Configuration

### Release Signing (Production)
1. Generate a release keystore:
```bash
keytool -genkey -v -keystore elgar-release-key.keystore -alias elgar-key -keyalg RSA -keysize 2048 -validity 10000
```

2. Edit `android/gradle.properties`:
```
ELGAR_RELEASE_STORE_FILE=elgar-release-key.keystore
ELGAR_RELEASE_KEY_ALIAS=elgar-key
ELGAR_RELEASE_STORE_PASSWORD=***
ELGAR_RELEASE_KEY_PASSWORD=***
```

3. Update `android/app/build.gradle` signing config

### App Store Deployment
1. Generate signed AAB for Google Play Store:
```bash
cd android
./gradlew bundleRelease
```

2. Upload to Google Play Console
3. Configure app listing, screenshots, descriptions
4. Set up internal testing track first

## Performance Optimization

### Recommended Settings
- Enable Hermes JavaScript engine (already configured)
- Use ProGuard for release builds (configured)
- Optimize images and assets
- Implement proper loading states
- Use FlatList for large data sets

### Memory Management
- Monitor memory usage during testing
- Implement proper image caching
- Clean up subscriptions and listeners
- Use React.memo for expensive components

## Security Considerations

### API Security
- All API calls use HTTPS
- JWT tokens for authentication
- Supabase RLS (Row Level Security) enabled
- No sensitive data stored in AsyncStorage

### App Security
- Enable ProGuard for code obfuscation
- Validate all user inputs
- Secure file storage permissions
- Regular dependency updates

## Maintenance

### Regular Tasks
- Update React Native and dependencies monthly
- Test on latest Android versions
- Monitor crash reports
- Update security patches
- Backup keystore files securely

### Monitoring
- Set up crash reporting (Crashlytics)
- Monitor app performance
- Track user analytics
- Log critical errors

## Support

For technical issues or questions:
1. Check this documentation first
2. Review React Native troubleshooting guides
3. Check Supabase documentation for backend issues
4. Contact development team

---

**Note**: This mobile application is designed to work seamlessly with the existing Elgar web application, sharing the same database and API endpoints for real-time synchronization.
