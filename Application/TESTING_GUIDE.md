# 📱 Elgar Mobile App - Testing Guide

## What We Have Built

✅ **Complete Android Application** that mirrors your website functionality:
- Same Supabase database connection
- Same user authentication system
- Real-time synchronization with website
- Hebrew RTL interface
- All main screens: Dashboard, Events, Action Reports, Profile

## 🚀 Step-by-Step Testing Instructions

### 1. **First, Copy Environment File**
```bash
cd "c:\Users\saharm\OneDrive - Check Point Software Technologies Ltd\Desktop\Sahar Malul\Developer\Websites\Elgar Admin Site - Test ENV\Application"
copy .env.example .env
```

### 2. **Start Your Website Server**
Make sure your website server is running:
```bash
cd "c:\Users\saharm\OneDrive - Check Point Software Technologies Ltd\Desktop\Sahar Malul\Developer\Websites\Elgar Admin Site - Test ENV\server"
node index.js
```
*This should show "Server running on port 5000"*

### 3. **Install Mobile App Dependencies**
```bash
cd "c:\Users\saharm\OneDrive - Check Point Software Technologies Ltd\Desktop\Sahar Malul\Developer\Websites\Elgar Admin Site - Test ENV\Application"
npm install
```

### 4. **Open Android Studio**
1. Open Android Studio
2. Start an Android Virtual Device (AVD):
   - Click "AVD Manager" 
   - Create/Start an Android emulator (Android 11+ recommended)
   - Wait for emulator to boot completely

### 5. **Start React Native Metro Bundler**
In the Application folder, run:
```bash
npx react-native start
```
*Keep this terminal open - it's the Metro bundler*

### 6. **Install and Run on Android Emulator**
Open a NEW terminal/PowerShell window:
```bash
cd "c:\Users\saharm\OneDrive - Check Point Software Technologies Ltd\Desktop\Sahar Malul\Developer\Websites\Elgar Admin Site - Test ENV\Application"
npx react-native run-android
```

## 🔍 What Should Happen

1. **App Builds Successfully** - You'll see build progress in terminal
2. **App Installs on Emulator** - "Elgar" app appears on Android home screen
3. **App Opens** - Shows login screen with Hebrew interface
4. **Login Works** - Use SAME username/password as website
5. **Data Syncs** - Events and reports from website appear in mobile app

## 🧪 Testing Checklist

### Authentication
- [ ] Login with existing website username/password
- [ ] Force password change works (if required)
- [ ] User profile loads correctly
- [ ] Logout works properly

### Data Synchronization
- [ ] Events from website appear in mobile app
- [ ] Action reports sync between platforms
- [ ] Real-time updates (create event on website, see in mobile)
- [ ] User data matches website

### Mobile Features
- [ ] Hebrew RTL interface displays correctly
- [ ] Navigation between screens works
- [ ] Camera works for action reports
- [ ] Photo upload to Supabase storage
- [ ] GPS location services (if enabled)

## 🔧 If Something Goes Wrong

### Metro Bundler Issues
```bash
npx react-native start --reset-cache
```

### Build Issues
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Server Connection Issues
1. Make sure server is running on `http://localhost:5000`
2. Check if website can connect to server
3. Verify no firewall blocking port 5000

### Emulator Issues
1. Restart Android emulator
2. Try different API level (Android 11, 12, 13)
3. Increase emulator RAM to 2GB+

## 📱 Testing on Physical Device

### For Physical Tablet Testing:
1. Enable Developer Options on tablet
2. Enable USB Debugging
3. Connect tablet via USB
4. Run: `adb devices` to verify connection
5. Update `SERVER_URL` in AuthContext.js to your computer's IP:
   ```javascript
   const SERVER_URL = 'http://YOUR_COMPUTER_IP:5000';
   ```
6. Run: `npx react-native run-android`

## 🌐 Is the App Connected to Website Users?

**YES! Here's how:**

### Same Database
- ✅ Mobile app uses **EXACT SAME** Supabase database
- ✅ URL: `https://smchvtbqzqssywlgshjj.supabase.co`
- ✅ Same authentication table and user records

### Same Authentication
- ✅ Mobile app connects to **SAME SERVER** (`localhost:5000`)
- ✅ Uses **SAME API endpoints** (`/api/auth/login`, `/api/auth/logout`)
- ✅ Same JWT token system
- ✅ Same username-based login (not email)

### Real-Time Sync
- ✅ Events created on website → appear instantly in mobile app
- ✅ Action reports from mobile → sync to website database
- ✅ User profile changes sync both ways
- ✅ Same role-based permissions

## 🎯 Expected Results

After successful testing, you should be able to:
1. **Login with website credentials** 
2. **See all website events** in mobile app
3. **Create action reports** from mobile that appear in website
4. **Real-time synchronization** between platforms
5. **Hebrew interface** working correctly
6. **Camera and location** features working

## 💡 Next Steps After Testing

Once basic testing works:
1. **Test all user roles** (admin, sayer, volunteer)
2. **Test real-time features** (create event on website, see in mobile)
3. **Test offline capabilities** 
4. **Configure push notifications** (Firebase)
5. **Test on physical tablet**
6. **Production deployment** setup

---

**Need Help?** If any step fails, check the terminal output for error messages and refer to the troubleshooting section above.
