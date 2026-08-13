import { createApp } from './app';
import { config } from './config';

function main(): void {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`api-gateway listening on port ${config.port}`);
  });
}

main();
