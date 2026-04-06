import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

export async function generateDoctorReport(profile, caregiverProfile) {
  if (!profile) {
    throw new Error('No active profile provided.');
  }

  // 1. Fetch recent vitals (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: vitals, error: vitalsError } = await supabase
    .from('vitals')
    .select('*')
    .eq('elderly_id', profile.id)
    .gte('recorded_at', thirtyDaysAgo.toISOString())
    .order('recorded_at', { ascending: false });

  if (vitalsError) {
    console.error('Error fetching vitals for report:', vitalsError);
    throw new Error('Failed to fetch patient data.');
  }

  // 2. Fetch latest AI Insights
  const { data: insight } = await supabase
    .from('health_insights')
    .select('*')
    .eq('elderly_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Compute Averages
  let avgHR = '—', avgRR = '—', avgSDNN = '—', avgRMSSD = '—', avgScore = '—';
  let hrData = [], rrData = [], sdnnData = [], rmssdData = [], labels = [];
  
  if (vitals && vitals.length > 0) {
    const validHR = vitals.filter((v) => v.heart_rate != null);
    const validRR = vitals.filter((v) => v.respiratory_rate != null);
    const validSDNN = vitals.filter((v) => v.hrv_sdnn != null);
    const validRMSSD = vitals.filter((v) => v.hrv_rmssd != null);
    const validScore = vitals.filter((v) => v.wellness_score != null);

    if (validHR.length > 0) avgHR = Math.round(validHR.reduce((sum, v) => sum + v.heart_rate, 0) / validHR.length);
    if (validRR.length > 0) avgRR = Math.round(validRR.reduce((sum, v) => sum + v.respiratory_rate, 0) / validRR.length);
    if (validSDNN.length > 0) avgSDNN = Math.round(validSDNN.reduce((sum, v) => sum + v.hrv_sdnn, 0) / validSDNN.length);
    if (validRMSSD.length > 0) avgRMSSD = Math.round(validRMSSD.reduce((sum, v) => sum + v.hrv_rmssd, 0) / validRMSSD.length);
    if (validScore.length > 0) avgScore = Math.round(validScore.reduce((sum, v) => sum + v.wellness_score, 0) / validScore.length);

    // Prepare chart data (take max 14 data points from the last 30 days to avoid clutter)
    // Reverse to display oldest -> newest
    const chartVitals = vitals.slice(0, 10).reverse();
    hrData = chartVitals.map(v => Math.round(v.heart_rate || 0));
    rrData = chartVitals.map(v => Math.round(v.respiratory_rate || 0));
    sdnnData = chartVitals.map(v => Math.round(v.hrv_sdnn || 0));
    rmssdData = chartVitals.map(v => Math.round(v.hrv_rmssd || 0));
    labels = chartVitals.map(v => new Date(v.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }));
  }

  // 4. Generate URL for remote QuickChart renderer (ideal for PDFs)
  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Heart Rate', data: hrData, borderColor: 'rgb(239, 68, 68)', backgroundColor: 'transparent', borderWidth: 2 },
        { label: 'Respiration', data: rrData, borderColor: 'rgb(14, 116, 144)', backgroundColor: 'transparent', borderWidth: 2 },
        { label: 'HRV(SDNN)', data: sdnnData, borderColor: 'rgb(139, 92, 246)', backgroundColor: 'transparent', borderWidth: 2 },
        { label: 'HRV(RMSSD)', data: rmssdData, borderColor: 'rgb(16, 185, 129)', backgroundColor: 'transparent', borderWidth: 2 }
      ]
    },
    options: {
      legend: { position: 'bottom' },
      title: { display: false }
    }
  };
  
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=250&f=png`;

  // 5. Structure AI format
  const formatAIString = (text) => {
    if (!text) return null;
    return text.split('\n')
      .map(line => line.replace(/^[\s•\-\*]+/, '').trim())
      .filter(line => line.length > 0)
      .map(line => `<li>${line}</li>`)
      .join('');
  };

  const insightsHtml = formatAIString(insight?.insights) || '<li>No recent clinical insights available.</li>';
  const suggestionsHtml = formatAIString(insight?.suggestions) || '<li>No actionable recommendations available.</li>';

  const patientName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : (profile.name || 'Unknown');
  const generatedDate = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  // 6. Build the HTML Document
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Health Summary Report</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1E293B; margin: 40px; background-color: #FAFAF9; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #E2E8F0; }
        .logo { font-size: 28px; font-weight: 800; color: #0891B2; letter-spacing: -0.5px; }
        .title { font-size: 20px; color: #475569; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; }
        
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; background: #FFFFFF; padding: 25px; border-radius: 12px; border: 1px solid #E2E8F0; }
        .info-col h3 { font-size: 11px; color: #94A3B8; text-transform: uppercase; margin: 0 0 5px 0; }
        .info-col p { font-size: 16px; font-weight: 600; margin: 0; color: #0F172A; }
        
        .section-title { font-size: 14px; font-weight: 700; color: #64748B; text-transform: uppercase; border-bottom: 2px solid #0891B2; padding-bottom: 8px; margin-bottom: 20px; display: inline-block; }
        
        .vitals-grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 40px; }
        .vital-card { flex: 1; min-width: 120px; background: #FFFFFF; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center; }
        .vital-card .label { font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; }
        .vital-card .value { font-size: 32px; font-weight: 800; color: #0F172A; margin: 0; }
        .vital-card .unit { font-size: 12px; color: #94A3B8; font-weight: 600; }
        
        .chart-container { background: #FFFFFF; padding: 20px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 40px; text-align: center; }
        .chart-img { max-width: 100%; height: auto; }
        
        .ai-section { background: #F8FAFC; padding: 25px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 40px; }
        .ai-section h4 { color: #0891B2; margin-top: 0; font-size: 16px; }
        .ai-section ul { padding-left: 20px; margin-bottom: 20px; }
        .ai-section li { margin-bottom: 8px; line-height: 1.5; font-size: 14px; color: #334155; }
        
        .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 20px; }
      </style>
    </head>
    <body>
    
      <div class="header">
        <div class="logo">CardioMira</div>
        <div class="title">Clinical Wellness Report</div>
      </div>
      
      <div class="info-grid">
        <div class="info-col">
          <h3>Patient Name</h3>
          <p>${patientName}</p>
        </div>
        <div class="info-col">
          <h3>Date of Birth</h3>
          <p>${profile.date_of_birth || 'Not Specified'}</p>
        </div>
        <div class="info-col">
          <h3>Gender</h3>
          <p>${profile.gender || 'Not Specified'}</p>
        </div>
        <div class="info-col">
          <h3>Report Date</h3>
          <p>${generatedDate}</p>
        </div>
      </div>
      
      <div>
        <h2 class="section-title">30-Day Averages</h2>
        <div class="vitals-grid">
          <div class="vital-card">
            <div class="label">Heart Rate</div>
            <p class="value" style="color: #EF4444;">${avgHR} <span class="unit">BPM</span></p>
          </div>
          <div class="vital-card">
            <div class="label">Respiration</div>
            <p class="value" style="color: #0EA5E9;">${avgRR} <span class="unit">BR/MIN</span></p>
          </div>
          <div class="vital-card">
            <div class="label">HRV (SDNN)</div>
            <p class="value" style="color: #8B5CF6;">${avgSDNN} <span class="unit">ms</span></p>
          </div>
          <div class="vital-card">
            <div class="label">HRV (RMSSD)</div>
            <p class="value" style="color: #10B981;">${avgRMSSD} <span class="unit">ms</span></p>
          </div>
          <div class="vital-card">
            <div class="label">Wellness Score</div>
            <p class="value" style="color: #F59E0B;">${avgScore} <span class="unit">/ 100</span></p>
          </div>
        </div>
      </div>
      
      <div class="chart-container">
        <h2 class="section-title">Recent Metric Trends</h2>
        <img class="chart-img" src="${chartUrl}" alt="Vitals Trend Chart" />
      </div>
      
      <div class="ai-section">
        <h2 class="section-title">Cardio CareGuide Insights</h2>
        <h4>Current Status Summary</h4>
        <ul>
          ${insightsHtml}
        </ul>
        
        <h4>Actionable Recommendations</h4>
        <ul>
          ${suggestionsHtml}
        </ul>
      </div>
      
      <div class="info-grid" style="margin-top: 40px; background: transparent; border: none; padding: 0;">
        <div class="info-col">
          <h3>Medical Notes / Known Conditions</h3>
          <p style="font-weight: 400; max-width: 600px;">${profile.medical_notes || (profile.conditions || []).join(', ') || 'No specific notes recorded in CardioMira.'}</p>
        </div>
      </div>
      
      <div class="footer">
        Automatically generated by CardioMira Smart Mirror &bull; Requested by Caregiver: ${caregiverProfile?.full_name || 'Caregiver'}
        <br/><br/>
        Disclaimer: This report provides physiological estimates for wellness and informational purposes only. It is not intended to substitute professional medical advice, diagnosis, or treatment.
      </div>
      
    </body>
    </html>
  `;

  // 7. Render PDF based on Platform
  if (Platform.OS === 'web') {
    // expo-print printAsync on web ignores the 'html' parameter and just prints the current screen.
    // Instead, we open a new browser window, write the HTML, and trigger the native print dialog.
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Delay slightly so the external QuickChart image can load before the print dialog freezes the page
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      console.error('Popup blocked. Cannot open print window.');
    }
    return;
  }

  // 8. On Mobile, Generate physical PDF file and open Share Sheet
  const { uri } = await Print.printToFileAsync({
    html: htmlContent,
    base64: false
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Patient Report',
      UTI: 'com.adobe.pdf' 
    });
  } else {
    console.log('Sharing unavailable for this generated file uri:', uri);
    return uri;
  }
}
