import { Service } from 'node-windows';
import { join } from 'path';

// Create a new service object
const svc = new Service({
  name: 'Minecraft Service 2',
  script: join(__dirname, '../js', 'launch.js')
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();