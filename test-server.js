import { exec } from 'child_process';
exec('NODE_ENV=production node dist/server.cjs', (err, stdout, stderr) => {
  if (err) {
    console.error(`exec error: ${err}`);
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
