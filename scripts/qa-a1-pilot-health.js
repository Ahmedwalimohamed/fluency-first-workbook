'use strict';

const {pilotSnapshot}=require('../a1-pilot-observability-bootstrap');

pilotSnapshot().then(snapshot=>{
 const summary={status:snapshot.status,safety:snapshot.safety,blockers:snapshot.blockers,warnings:snapshot.warnings};
 console.log('A1 PILOT HEALTH PREDEPLOY '+JSON.stringify(summary));
 process.exit(snapshot.status==='BLOCK'?1:0);
}).catch(error=>{
 console.error('A1 PILOT HEALTH PREDEPLOY FAILED',error.message);
 process.exit(1);
});
