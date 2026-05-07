import fetch from 'node-fetch';
try {
  await fetch('https://invalid.com-does-not-exist.org');
} catch (e) {
  console.log(e.name, e.message);
}
