import fs from 'node:fs';

const CANONICAL_PROJECT_ID='0acd61b1-454f-422b-a768-166ee2e715e0';
const CANONICAL_SERVICE_ID='4edaf957-31b0-4998-8646-6cf7c689b1af';
const CANONICAL_DOMAIN='learnenglish.iouborama.com';

const staleRootFrontend=['app.js','index.html','styles.css'].filter(p=>fs.existsSync(p));
if(staleRootFrontend.length){
  console.error('DEPLOYMENT QA FAILED: stale root frontend duplicates exist:',staleRootFrontend.join(', '));
  console.error('Live EnglishGate is served from /public. Remove root duplicates before deploying.');
  process.exit(1);
}

for(const required of ['public/index.html','public/app.js','public/styles.css']){
  if(!fs.existsSync(required)){
    console.error('DEPLOYMENT QA FAILED: missing live frontend file',required);
    process.exit(1);
  }
}

if(process.env.RAILWAY_PROJECT_ID && process.env.RAILWAY_PROJECT_ID!==CANONICAL_PROJECT_ID){
  console.error(`DEPLOYMENT QA FAILED: wrong Railway project ${process.env.RAILWAY_PROJECT_ID}. EnglishGate production must deploy only to ${CANONICAL_PROJECT_ID}.`);
  process.exit(1);
}
if(process.env.RAILWAY_SERVICE_ID && process.env.RAILWAY_SERVICE_ID!==CANONICAL_SERVICE_ID){
  console.error(`DEPLOYMENT QA FAILED: wrong Railway service ${process.env.RAILWAY_SERVICE_ID}. EnglishGate production must deploy only to ${CANONICAL_SERVICE_ID}.`);
  process.exit(1);
}

console.log(`Deployment QA passed: canonical EnglishGate target ${CANONICAL_DOMAIN}; frontend source is /public only.`);
