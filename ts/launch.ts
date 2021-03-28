import { Bedrock } from './bedrock';

(async () => {
  const bedrock = new Bedrock('c:\\bedrock-server');

  process.stdin.on('data', async (data: Buffer) => {
    const message = data.toString().trim();
    if (message === 'stop') {
      await bedrock.stop();
      process.exit();
    }
    else if (message === 'list backups') {
      await bedrock.listBackups();
    }
    else if (message.startsWith('restore')) {
      await bedrock.restore(message.replace('restore ', '').trim());
    }
  });

  //await bedrock.listBackups();

  await bedrock.start();

  // try {
  //   console.log(await bedrock.listPermissions());
  // }
  // catch (err) {
  //   console.log(err);
  //   await bedrock.stop();
  // }
})();