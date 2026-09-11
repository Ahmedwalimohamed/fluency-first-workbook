const express=require('express');

const nativeGet=express.application.get;
const installedApps=new WeakSet();

const SENSITIVE_PATH=/(^|\/)(?:\.env(?:\..*)?|\.git(?:\/|$)|\.svn(?:\/|$)|\.ssh(?:\/|$)|\.vscode(?:\/|$)|wp-admin(?:\/|$)|wp-config\.php$|phpinfo\.php$|storage\/logs(?:\/|$)|actuator(?:\/|$)|_vti_pvt(?:\/|$)|server\.key$|secrets?\.json$|user_secrets\.ya?ml$|docker-compose\.ya?ml$|\.npmrc$|\.bash_history$|(?:backup|database|database_backup|dump)(?:\.[a-z0-9._-]+)?$)/i;
const SENSITIVE_EXTENSION=/\.(?:sql|bak|old|orig|save|zip|tar|tgz|gz|7z|key|pem|log|sqlite|sqlite3|db|php|conf|ini|ya?ml)$/i;

function securityHeaders(req,res,next){
  res.set({
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'SAMEORIGIN',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), geolocation=(), microphone=(self)'
  });
  if(SENSITIVE_PATH.test(req.path)||SENSITIVE_EXTENSION.test(req.path)){
    res.set('Cache-Control','no-store');
    return res.status(404).type('text/plain').send('Not found');
  }
  next();
}

function installBuildRoute(app){
  if(installedApps.has(app))return;
  installedApps.add(app);
  app.use(securityHeaders);
  nativeGet.call(app,'/health',(req,res)=>{
    res.set('Cache-Control','no-store');
    res.status(200).json({ok:true,service:'englishgate'});
  });
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
