const express=require('express');

const nativeGet=express.application.get;
const installedApps=new WeakSet();

function installBuildRoute(app){
  if(installedApps.has(app))return;
  installedApps.add(app);
  nativeGet.call(app,'/api/build',(req,res)=>{
    res.set('Cache-Control','no-store');
    res.json({
      environment:process.env.RAILWAY_ENVIRONMENT_NAME||process.env.NODE_ENV||'production',
      commit:String(process.env.RAILWAY_GIT_COMMIT_SHA||process.env.GIT_COMMIT_SHA||'local').slice(0,7),
      commitFull:String(process.env.RAILWAY_GIT_COMMIT_SHA||process.env.GIT_COMMIT_SHA||'local'),
      deploymentId:process.env.RAILWAY_DEPLOYMENT_ID||'',
      service:process.env.RAILWAY_SERVICE_NAME||'',
      project:process.env.RAILWAY_PROJECT_NAME||''
    });
  });
}

express.application.get=function englishGateBuildAwareGet(route,...handlers){
  installBuildRoute(this);
  return nativeGet.call(this,route,...handlers);
};

require('./school-platform-bootstrap.js');
