import { createApp } from './app';
import { config } from './config';
import { ensureUploadDir } from './storage/media';

ensureUploadDir();

const app = createApp();

app.listen(config.port, () => {
  console.log(`wishlist-service listening on port ${config.port}`);
});
