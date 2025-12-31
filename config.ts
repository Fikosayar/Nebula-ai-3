
// Bu dosyayı kendi sunucu bilgilerinizle güncelleyin.
// Kullanıcılar giriş yaptıklarında bu ayarları otomatik kullanacaklar.

export const CLOUD_CONFIG = {
  // Baserow Ayarları (Zorunlu)
  baserowUrl: 'https://baserow.sapanca360.com',
  baserowToken: '9EWGAdQXmFjubclup10NvLxegonUM7Fc',
  baserowTableId: '754', 

  // MinIO Ayarları (Dosya Yükleme İçin - İsteğe Bağlı)
  minioEndpoint: 'https://s3.sapanca360.com',      
  minioAccessKey: 'jgjL7kzRWoFq7AtBrBeQ',
  minioSecretKey: 'O0EtBDcBeGR27olx2OQWN3o13rFy5azWoJDebp3X',
  minioBucket: 'site-demo',

  // NCA Toolkit API (Video Render vb. için)
  ncaApiUrl: 'https://nca.sapanca360.com', 
  ncaApiKey: 'Testkey123' // Docker-compose environment variable API_KEY
};