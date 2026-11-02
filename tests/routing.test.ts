import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serviceRoutes,serviceURL} from '../lib/services';

test('institutional routes target real Citizen Hub destinations',()=>{
  for(const key of ['invest','investor-relations','investor-portal','my-subscriptions']) {
    assert.equal(serviceRoutes[key].service,'hub');
    assert.equal(serviceRoutes[key].path,'/investors');
  }
  for(const key of ['board-portal','board']) assert.equal(serviceRoutes[key].path,'/board');
  assert.equal(serviceRoutes['open-account'].service,'banking');
  assert.equal(serviceRoutes['open-account'].path,'/register');
  assert.equal(serviceRoutes['internet-banking'].service,'banking');
  assert.equal(serviceRoutes['internet-banking'].path,'/login');
  assert.equal(serviceRoutes['mobile-banking'].service,'app');
  assert.equal(serviceRoutes['mobile-banking'].path,'/login');
  assert.equal(serviceRoutes.review.service,'hub');
  assert.equal(serviceRoutes.review.path,'/');
});

test('service URLs resolve account opening and app entry to the configured hosts',()=>{
  const prior={HUB_URL:process.env.HUB_URL,BANKING_URL:process.env.BANKING_URL,APP_URL:process.env.APP_URL};
  process.env.HUB_URL='https://hub.example.test';
  process.env.BANKING_URL='https://banking.example.test';
  process.env.APP_URL='https://app.example.test';
  assert.equal(serviceURL('banking','/register'),'https://banking.example.test/register');
  assert.equal(serviceURL('banking','/login'),'https://banking.example.test/login');
  assert.equal(serviceURL('app','/login'),'https://app.example.test/login');
  assert.equal(serviceURL('hub','/investors'),'https://hub.example.test/investors');
  for(const [key,value] of Object.entries(prior)) {
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});

test('service URLs require configured HTTPS origins in production',()=>{
  const previous=process.env.HUB_URL;
  const previousNodeEnv=process.env.NODE_ENV;
  process.env.NODE_ENV='production';
  process.env.HUB_URL='https://hub.example.test';
  assert.equal(serviceURL('hub','/board'),'https://hub.example.test/board');
  process.env.HUB_URL='javascript:alert(1)';
  assert.throws(()=>serviceURL('hub','/board'));
  if(previous)process.env.HUB_URL=previous;else delete process.env.HUB_URL;
  if(previousNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousNodeEnv;
});
