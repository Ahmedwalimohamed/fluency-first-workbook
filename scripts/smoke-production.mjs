const base=(process.env.ENGLISHGATE_BASE_URL||'https://learnenglish.iouborama.com').replace(/\/$/,'');

async function check(path,expectedStatus,validate){
  const response=await fetch(base+path,{redirect:'manual',headers:{'user-agent':'EnglishGate-Deployment-Smoke/1.0'}});
  const body=await response.text();
  if(response.status!==expectedStatus)throw new Error(`${path}: expected ${expectedStatus}, got ${response.status}`);
  if(validate&&!validate(body,response))throw new Error(`${path}: response validation failed`);
  console.log(`PASS ${path} -> ${response.status}`);
}

await check('/',200,(body)=>/EnglishGate|Digital Workbook/i.test(body));
await check('/health',200,(body)=>{try{return JSON.parse(body).ok===true}catch{return false}});
await check('/api/build',200,(body)=>{try{return Boolean(JSON.parse(body).commit)}catch{return false}});
await check('/.env',404);
await check('/.git/HEAD',404);
await check('/backup.sql',404);
console.log('EnglishGate production smoke test passed.');
