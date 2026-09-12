const express=require('express');
const path=require('path');

const nativeGet=express.application.get;
const installed=new WeakSet();

function installPublicAssets(app){
  if(installed.has(app))return;
  installed.add(app);
  app.use(express.static(path.join(__dirname,'public'),{
    index:false,
    setHeaders(res){
      res.set('Cache-Control','no-store, no-cache, must-revalidate');
      res.set('X-Content-Type-Options','nosniff');
    }
  }));
}

express.application.get=function englishGatePublicAssetGet(route,...handlers){
  installPublicAssets(this);
  return nativeGet.call(this,route,...handlers);
};

require('./ai-content-editor-bootstrap.js');
