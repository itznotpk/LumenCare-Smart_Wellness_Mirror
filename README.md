# LumenCare: Smart Wellness Mirror — Caregiver App

LumenCare is a modern, React Native mobile application designed for caregivers and family members to remotely monitor the health, vitals, and emotional wellbeing of elderly patients who are using the companion Smart Wellness Mirror hardware. 

## 🚀 Key Features

*   **Realtime Vitals Dashboard:** Live synchronization with the Smart Mirror's camera-based rPPG system. Instantly view Heart Rate (BPM), Respiration Rate, and an algorithmic Wellness Score.
*   **Historical Trends Analysis:** Deep-dive into patient health using interactive, scalable line charts. Track RMSSD, SDNN, Heart Rate, and Respiratory trends across customizable timeframes natively spanning from the recorded hardware data. 
*   **Daily Drops:** A highly specialized one-way media sharing module. Caregivers can securely capture images straight from their phone or gallery and securely push them via the Supabase cloud directly onto the elderly patient's Smart Mirror to brighten their day.
*   **Patient Status Monitoring:** Instantly assesses the psychological status payload of a patient directly deriving the real-time "Stress Level" index automatically from the live HRV variables. 
*   **Modern Minimalist UI:** A fully optimized, beautifully clean Apple Health-inspired interface emphasizing bold typography, intuitive cardiovascular color charting, and uncluttered native navigation.

## 🛠 Tech Stack

*   **Frontend Framework:** [React Native](https://reactnative.dev/) alongside [Expo](https://expo.dev/)
*   **Backend Infrastructure:** [Supabase](https://supabase.com/) (PostgreSQL Database, Realtime DB, Auth, and Storage Buckets)
*   **Data Visualization:** Fluid customized tracking utilizing `react-native-gifted-charts`.

## 📦 Setup & Installation

1. **Clone the Repository & Install Dependencies**
```bash
git clone https://github.com/itznotpk/LumenCare-Smart_Wellness_Mirror.git
cd LumenCare-Smart_Wellness_Mirror
npm install
```

2. **Configure Supabase Hardware Connections**
You will need to construct an active Supabase server environment. In the root of your application, generate an `.env` file explicitly containing your remote keys:
```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Execute the database schema structural scripts internally provided within the project root consecutively inside the Supabase SQL editor:
*   `supabase_vitals_schema.sql` (baseline metrics algorithm)
*   `supabase_vitals_schema_v2.sql` (HRV hardware additions and explicit Stress Level variables)
*   `supabase_interactive_schema.sql` (Daily Drops schema linking and architectural bucket RLS policies)

Ensure you manually generate the `daily_drops` public Storage Bucket natively inside your host to allow the app to generate and deploy URL signatures flawlessly remotely.

3. **Launch the Interface**
```bash
npx expo start --clear
```
Open the Expo Go app directly on your physical mobile iOS/Android device to synchronize and operate your Caregiver dashboard structure inherently natively.
