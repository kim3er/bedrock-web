import { Bedrock } from './bedrock';
import express from 'express';
import sassMiddleware from 'node-sass-middleware';
import * as path from 'path';

const app = express();

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hbs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sassMiddleware({
  src: path.join(__dirname, '../public'),
  dest: path.join(__dirname, '../public'),
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, '../public')));

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

  await bedrock.start();

  app.get('/', async (req, res) => {
    res.render('index', {
      title: 'Express',
      message: req.query.backup ? `${req.query.backup} restored` : null,
      backups: await bedrock.listBackups()
    });
  });

  app.post('/restore/:backup', async (req, res) => {
    const backupName = req.params.backup;
    if (typeof backupName !== 'string' || !backupName.length) {
      console.log(backupName, typeof backupName !== 'string');
      throw new Error('Backup name not recognised');
    }
    
    await bedrock.restore(backupName);
    res.redirect(`/?backup=${req.params.backup}`);
  });

  app.listen(3000, async () => {
    console.log(`The Borg are listening at http://localhost:3000`);
  });
})();