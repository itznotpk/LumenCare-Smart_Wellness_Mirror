# LumenCare: Smart Wellness Mirror — Caregiver App

LumenCare is a modern, React Native mobile application designed for caregivers and family members to remotely monitor the health, vitals, and emotional wellbeing of elderly patients who are using the companion Smart Wellness Mirror hardware. 

## 🚀 Key Features

*   **Realtime Vitals Dashboard:** Live synchronization with the Smart Mirror's camera-based rPPG system. Instantly view Heart Rate (BPM), Respiration Rate, and an algorithmic Wellness Score.
*   **Historical Trends Analysis:** Deep-dive into patient health using interactive, scalable line charts. Track RMSSD, SDNN, Heart Rate, and Respiratory trends across customizable timeframes natively spanning from the recorded hardware data. 
*   **Daily Drops:** A highly specialized one-way media sharing module. Caregivers can securely capture images straight from their phone or gallery and securely push them via the Supabase cloud directly onto the elderly patient's Smart Mirror to brighten their day.
*   **Patient Status Monitoring:** Instantly assesses the psychological status payload of a patient directly deriving the real-time "Stress Level" index automatically from the live HRV variables. 
*   **Modern Minimalist UI:** A fully optimized, beautifully clean Apple Health-inspired interface emphasizing bold typography, intuitive cardiovascular color charting, and uncluttered native navigation.

## 🛠 Tech Stack & Core Dependencies

This project relies on the following core environments to natively bridge the Caregiver App to the Smart Mirror hardware:
*   **React Native / Expo** (`expo ^54.0.0`)
*   **Supabase Client** (`@supabase/supabase-js ^2.100.1`) — Manages backend database logic & storage
*   **State Management** (`zustand ^5.0.12`) — Global UI and session tracking
*   **UI & Graphs** (`react-native-gifted-charts`, `nativewind`, `lucide-react-native`/`expo-vector-icons`)
*   **Routing** (`@react-navigation/native`, `@react-navigation/bottom-tabs`)
*   **Hardware APIs** (`expo-image-picker`, `expo-haptics`, `expo-secure-store`)

*(For the exhaustive dependency tree, please refer physically to `package.json`)*

## 📦 Setup & Installation

**1. Clone the Repository**
```bash
git clone https://github.com/itznotpk/LumenCare-Smart_Wellness_Mirror.git
cd LumenCare-Smart_Wellness_Mirror
```

**2. Install Node Dependencies**
```bash
npm install
```

**3. Configure Supabase Server Architecture**
You will need to construct an active Supabase server environment. In the root of your application, generate an `.env` file explicitly containing your remote keys:
```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Execute the database schema structural scripts internally provided within the project root consecutively inside the Supabase SQL editor:
*   `supabase_vitals_schema.sql` (baseline metrics algorithm)
*   `supabase_vitals_schema_v2.sql` (HRV hardware additions and explicit Stress Level variables)
*   `supabase_interactive_schema.sql` (Daily Drops schema linking and architectural bucket RLS policies)

*Ensure you manually generate the `daily_drops` public Storage Bucket natively inside your host to allow the app to generate and deploy URL signatures flawlessly remotely.*

## 🚀 How to Start the App

Once your configuration and dependencies are strictly installed, boot the Expo bundler:

```bash
# Standard boot
npx expo start

# If you encounter Metro caching issues, forcefully clear the cache
npx expo start --clear
```

1. **Download Expo Go** on your physical iOS or Android device.
2. Scan the **QR Code** generated natively inside your terminal footprint. 
3. The app will remotely compile and deploy directly onto your mobile architecture!
