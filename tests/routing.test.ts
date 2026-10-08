import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serviceRoutes,serviceURL} from '../lib/services';
test('website sends institutional work to Hub and customer work to banking',()=>{for(const key of ['invest','board-portal','profile','admin','documents','login'])assert.equal(serviceRoutes[key].service,'hub');assert.equal(serviceRoutes['open-account'].service,'banking');assert.equal(serviceRoutes['mobile-banking'].service,'app');});
test('service URLs require configured HTTPS origins in production',()=>{const previous=process.env.HUB_URL;process.env.HUB_URL='https://hub.example.test';assert.equal(serviceURL('hub','/board'),'https://hub.example.test/board');process.env.HUB_URL='javascript:alert(1)';assert.throws(()=>serviceURL('hub','/board'));if(previous)process.env.HUB_URL=previous;else delete process.env.HUB_URL;});
