import { Bedrock } from './bedrock';

(async () => {
  const bedrock = new Bedrock('c:\\bedrock-server');

  await bedrock.start();

  try {
    console.log(await bedrock.listPermissions());

    await bedrock.backup();
  }
  catch (err) {
    console.log(err);
  }
  finally {
    await bedrock.stop();
  }
})();