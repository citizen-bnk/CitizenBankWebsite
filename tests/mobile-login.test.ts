import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileLoginDestination} from '../src/app/auth/mobileDestination';
test('mobile sign-in defaults to the banking app, including touch iPads',()=>{
 for(const ua of ['iPhone','Android Mobile','iPad'])assert.equal(mobileLoginDestination('/',ua),'/enter-app');
 assert.equal(mobileLoginDestination('/','Macintosh',5),'/enter-app');
 assert.equal(mobileLoginDestination('/','Windows NT'),'/');
});
test('explicit banking navigation and invitation workflows are preserved',()=>{
 for(const next of ['/enter-banking','/share-subscription?invite=record','/back-office-investors'])assert.equal(mobileLoginDestination(next,'iPhone'),next);
});
