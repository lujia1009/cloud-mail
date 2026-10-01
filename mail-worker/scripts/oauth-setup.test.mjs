import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const url = s => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const jwtUrl = url(await readFile(new URL('../src/utils/jwt-utils.js', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../src/service/oauth-service.js', import.meta.url), 'utf8')).replace(/^import .*;?\r?$/gm, '');
const mocks = `
import jwtUtils from '${jwtUrl}';
class BizError extends Error {}
const t = x => x;
const oauth = {oauthId:'oauthId',oauthUserId:'oauthUserId',platform:'platform'};
const eq = (key,value) => row => row[key] === value;
const and = (...tests) => row => tests.every(test=>test(row));
const inArray = () => () => false;
export const state = {row:{oauthId:1,oauthUserId:'google-sub',platform:'google',userId:0},user:null,registers:0,enabled:0};
const orm = () => ({select:()=>({from:()=>({where:predicate=>({get:async()=>predicate(state.row)?state.row:null})})}),update:()=>({set:values=>({where:()=>({run:async()=>Object.assign(state.row,values)})})})});
const userService = {selectByIdIncludeDel:async id=>state.user,selectByEmail:async()=>state.user};
const loginService = {register:async(c,{email})=>{state.registers++;state.user={userId:7,email}},login:async()=> 'mail-session'};
const cryptoUtils = {genRandomPwd:()=> 'test-password'};
const settingService = {query:async()=>({googleSwitch:state.enabled})};
`;
const {default:service,state} = await import(url(mocks+source));
const {default:jwt} = await import(jwtUrl);
const context = {env:{jwt_secret:'test-only-oauth-secret'}};
service.saveUser = async()=>state.row;

test('new OAuth identity gets a scoped expiring setup proof, not a mail session', async()=>{
 const result=await service.saveAndLogin(context,{});
 assert.equal(result.token,null);
 const proof=await jwt.verifyToken(context,result.setupToken);
 assert.equal(proof.purpose,'oauth-setup');assert.equal(proof.subject,'google-sub');assert.ok(proof.exp-proof.iat===900);
});
test('binding rejects IDs alone, forged/expired/wrong-purpose proofs before registration',async()=>{
 const proofs=[undefined,'forged',await jwt.generateToken(context,{purpose:'oauth-setup',oauthId:1,platform:'google',subject:'google-sub'},-1),await jwt.generateToken(context,{purpose:'login',oauthId:1},900)];
 for(const setupToken of proofs) await assert.rejects(service.bindUser(context,{oauthUserId:'google-sub',email:'test@example.test',setupToken}));
 assert.equal(state.registers,0);
});
test('valid proof initializes once; replay and already-bound setup are rejected',async()=>{
 const first=await service.saveAndLogin(context,{});
 const result=await service.bindUser(context,{email:'test@example.test',setupToken:first.setupToken});
 assert.equal(result.token,'mail-session');assert.equal(state.row.userId,7);assert.equal(state.registers,1);
 await assert.rejects(service.bindUser(context,{email:'second@example.test',setupToken:first.setupToken}));assert.equal(state.registers,1);
});
test('existing account skips setup and receives its login session',async()=>{
 const result=await service.saveAndLogin(context,{});assert.equal(result.token,'mail-session');assert.equal(result.setupToken,undefined);
});
test('provider and identity mismatch cannot complete setup',async()=>{
 state.user=null;state.row.userId=0;
 const proof=await jwt.generateToken(context,{purpose:'oauth-setup',oauthId:1,platform:'github',subject:'google-sub'},900);
 await assert.rejects(service.bindUser(context,{email:'test@example.test',setupToken:proof}));assert.equal(state.registers,1);
});

test('Google code exchange uses the callback URI and verified provider identity', async()=>{
 const originalFetch=globalThis.fetch;const originalSave=service.saveUser;let calls=0;
 state.user=null;
 service.saveUser=async(c,info)=>{assert.equal(info.platform,'google');assert.equal(info.oauthUserId,'verified-google-sub');return {...state.row,oauthUserId:info.oauthUserId}};
 globalThis.fetch=async(url,options)=>{calls++;if(url==='https://oauth2.googleapis.com/token'){const form=new URLSearchParams(options.body);assert.equal(form.get('redirect_uri'),'https://mail.test/auth/google/callback');assert.equal(form.get('code'),'test-code');return Response.json({access_token:'provider-token'});}assert.equal(options.headers.Authorization,'Bearer provider-token');return Response.json({sub:'verified-google-sub',email:'verified@example.test',name:'Test'});};
 try {const result=await service.googleLogin(context,{code:'test-code',redirectUri:'https://mail.test/auth/google/callback'});assert.equal(result.token,null);assert.ok(result.setupToken);assert.equal(calls,2);}finally{globalThis.fetch=originalFetch;service.saveUser=originalSave;}
});
test('disabled Google login and failed provider exchange never issue a setup proof', async()=>{
 state.enabled=1;await assert.rejects(service.googleLogin(context,{code:'test',redirectUri:'https://mail.test/auth/google/callback'}));state.enabled=0;
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:400,statusText:'invalid_grant'});
 try {await assert.rejects(service.googleLogin(context,{code:'test',redirectUri:'https://mail.test/auth/google/callback'}));}finally{globalThis.fetch=originalFetch;}
});
