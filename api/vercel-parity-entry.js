'use strict';

// Match Railway's runtime preloads before the shared EnglishGate app is bootstrapped.
// These modules install live-task sharing, A1 pilot safety/observability, and
// the Vercel-first email identity/recovery layer without starting HTTP listeners.
require('../live-task-share-bootstrap.js');
require('../a1-pilot-bootstrap.js');
require('../a1-pilot-observability-bootstrap.js');
require('../email-identity-bootstrap.js');

const baseHandler = require('./vercel-entry.js');
const b1GoldLesson4 = require('../course-factory/gold/b1-lesson-04-technology-social-media.js');
const { reviewGoldenLesson } = require('../course-factory/jev-semantic-review.js');

function requestPath(req){
  try{return decodeURIComponent(String(req.url||'/').split('?')[0])}catch{return '/'}
}

module.exports = async function vercelParityEntry(req,res){
  const path=requestPath(req);
  if(path==='/__course-factory/b1-gold-l4/jev-review'){
    if(String(process.env.VERCEL_ENV||'').toLowerCase()!=='preview'){
      res.statusCode=404;
      res.setHeader('content-type','application/json; charset=utf-8');
      res.setHeader('cache-control','no-store');
      return res.end(JSON.stringify({ok:false,error:'NOT_AVAILABLE'}));
    }
    try{
      const result=await reviewGoldenLesson(b1GoldLesson4);
      res.statusCode=200;
      res.setHeader('content-type','application/json; charset=utf-8');
      res.setHeader('cache-control','no-store');
      return res.end(JSON.stringify({ok:true,result}));
    }catch(error){
      const code=String(error?.message||'COURSE_FACTORY_JEV_FAILED');
      res.statusCode=code==='JEV_NOT_CONFIGURED'?503:500;
      res.setHeader('content-type','application/json; charset=utf-8');
      res.setHeader('cache-control','no-store');
      return res.end(JSON.stringify({ok:false,error:code}));
    }
  }
  return baseHandler(req,res);
};