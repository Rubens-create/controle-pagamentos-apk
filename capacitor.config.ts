import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.payment.management',
  appName: 'Controle de Pagamentos',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
