'use strict';

const express=require('express');
const {Pool}=require('pg');

// EnglishGate A1 Beginner production activation v1.0.
const A1_BOOK_ID='speakup-a1-gold';
const LEGACY_A1_BOOK_ID='speakup-a1';
const B2_BOOK_ID='speakup-b2';
const pool=new Pool({connectionString:process.env.DATABASE_URL});
let activating=null;

function enabled(){return process.env.A1_BEGINNER_PRODUCTION_MODE==='1'}

async function activateA1Beginner(){
  if(!enabled())return;
  if(activating)return activating;
  activating=(async()=>{
    if(process.env.A1_GOLD_PILOT_MODE==='1'){
      throw new Error('A1 production activation cannot run while A1_GOLD_PILOT_MODE=1.');
    }

    const client=await pool.connect();
    try{
      await client.query('begin');
      const existing=await client.query('select id,title,status from books where id=any($1::text[]) for update',[[B2_BOOK_ID,A1_BOOK_ID,LEGACY_A1_BOOK_ID]]);
      const byId=Object.fromEntries(existing.rows.map(row=>[row.id,row]));
      if(!byId[B2_BOOK_ID])throw new Error('B2 book is missing; refusing to change production course state.');
      if(!byId[A1_BOOK_ID])throw new Error('A1 Beginner Gold book is missing; refusing activation.');

      // Preserve the current B2 course and learner history. Activate the quality-gated
      // A1 Beginner book only; keep the older duplicate A1 seed inactive so admins see
      // one authoritative A1 option.
      await client.query("update books set status='ready' where id=any($1::text[])",[[B2_BOOK_ID,A1_BOOK_ID]]);
      if(byId[LEGACY_A1_BOOK_ID])await client.query("update books set status='inactive' where id=$1",[LEGACY_A1_BOOK_ID]);
      await client.query('commit');
    }catch(error){
      await client.query('rollback');
      throw error;
    }finally{
      client.release();
    }

    const verify=await pool.query('select id,status from books where id=any($1::text[])',[[B2_BOOK_ID,A1_BOOK_ID,LEGACY_A1_BOOK_ID]]);
    const state=Object.fromEntries(verify.rows.map(row=>[row.id,row.status]));
    const ok=state[B2_BOOK_ID]==='ready'&&state[A1_BOOK_ID]==='ready'&&(!state[LEGACY_A1_BOOK_ID]||state[LEGACY_A1_BOOK_ID]==='inactive');
    if(!ok)throw new Error(`A1 production self-check failed b2=${state[B2_BOOK_ID]||'missing'} a1=${state[A1_BOOK_ID]||'missing'} legacy=${state[LEGACY_A1_BOOK_ID]||'missing'}`);
    console.log(`A1 BEGINNER PRODUCTION ACTIVE b2=${state[B2_BOOK_ID]} a1=${state[A1_BOOK_ID]} legacy=${state[LEGACY_A1_BOOK_ID]||'missing'} enrollments=preserved`);
  })();
  try{return await activating}finally{activating=null}
}

const nativeListen=express.application.listen;
express.application.listen=function a1BeginnerProductionListen(...args){
  if(!enabled())return nativeListen.apply(this,args);
  const app=this;
  activateA1Beginner()
    .then(()=>nativeListen.apply(app,args))
    .catch(error=>{
      console.error('A1 Beginner production activation failed:',error.message);
      process.exitCode=1;
      setTimeout(()=>process.exit(1),25);
    });
  return app;
};

module.exports={activateA1Beginner,A1_BOOK_ID,B2_BOOK_ID};
