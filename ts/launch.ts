import { spawn } from 'child_process';

const minecraft = spawn('c:\\bedrock-server\\bedrock_server.exe');

minecraft.stdout.on('end', () => {
    console.log('end');
});

minecraft.stdout.pipe(process.stdout);

minecraft.stdin.write('permission list\n');
minecraft.stdin.write('stop\n');
minecraft.stdin.end();