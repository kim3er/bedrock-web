import { Bedrock } from './bedrock';

(async () => {
  const bedrock = new Bedrock('c:\\bedrock-server');

  process.stdin.on('data', async (data: Buffer) => {
    if (data.toString().trim() === 'stop') {
      await bedrock.stop();
      process.exit();
    }
  });

  await bedrock.start();

  try {
    console.log(await bedrock.listPermissions());
  }
  catch (err) {
    console.log(err);
    await bedrock.stop();
  }
})();