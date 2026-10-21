import { loadConfig } from './config.js';
import { createApp } from './server.js';

const config = loadConfig();
if (!config.apiKey) {
  console.warn('UYARI: GEMINI_API_KEY yok (.env.example\'a bakın). Sunucu açılır ama her istek "ulaşılamadı" döner.');
}

createApp({ config }).listen(config.port, config.host, () => {
  console.log(`e-Torun yapay zekâ sunucusu: http://${config.host}:${config.port} (modeller: ${config.models.join(', ')})`);
});
