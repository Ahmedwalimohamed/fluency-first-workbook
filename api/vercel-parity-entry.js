'use strict';

// Match Railway's runtime preloads before the shared EnglishGate app is bootstrapped.
// These modules install live-task sharing, A1 pilot safety/observability, and
// the Vercel-first email identity/recovery layer without starting HTTP listeners.
require('../live-task-share-bootstrap.js');
require('../a1-pilot-bootstrap.js');
require('../a1-pilot-observability-bootstrap.js');
require('../email-identity-bootstrap.js');

const baseHandler = require('./vercel-entry.js');
const b1GoldLesson4 = require('../course-factory/gold/b1-lesson-04-quality-patch.js');
const { reviewGoldenLesson } = require('../course-factory/jev-semantic-review.js');

function requestPath(req){
  try{return decodeURIComponent(String(req.url||'/').split('?')[0])}catch{return '/'}
}
function isPreview(){return String(process.env.VERCEL_ENV||'').toLowerCase()==='preview'}
function json(res,status,payload){
  res.statusCode=status;
  res.setHeader('content-type','application/json; charset=utf-8');
  res.setHeader('cache-control','no-store');
  res.setHeader('x-robots-tag','noindex');
  return res.end(JSON.stringify(payload));
}

module.exports = async function vercelParityEntry(req,res){
  const path=requestPath(req);
  if(path==='/__course-factory/b1-gold-l4/preview-data'){
    if(!isPreview())return json(res,404,{ok:false,error:'NOT_AVAILABLE'});
    return json(res,200,{ok:true,lesson:b1GoldLesson4});
  }
  if(path==='/__course-factory/b1-gold-l4/jev-review'){
    if(!isPreview())return json(res,404,{ok:false,error:'NOT_AVAILABLE'});
    try{
      const result=await reviewGoldenLesson(b1GoldLesson4);
      return json(res,200,{ok:true,result});
    }catch(error){
      const code=String(error?.message||'COURSE_FACTORY_JEV_FAILED');
      return json(res,code==='JEV_NOT_CONFIGURED'?503:500,{ok:false,error:code});
    }
  }
  return baseHandler(req,res);
};