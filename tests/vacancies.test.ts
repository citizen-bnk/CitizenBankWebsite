import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatVacancyDeadline,openVacancies,vacancies} from '../lib/vacancies';

test('only vacancies whose published deadline has not passed are shown',()=>{
  const titles=openVacancies(new Date('2026-10-23T12:00:00Z')).map(v=>v.title);
  assert.deepEqual(titles,[
    'Chief Internal Auditor',
    'Compliance Officer & MLRO',
    'Board Chair',
    'Board Members'
  ]);
});

test('a vacancy remains open through its deadline in South African time',()=>{
  assert.ok(openVacancies(new Date('2026-10-25T20:00:00Z')).some(v=>v.title==='Chief Internal Auditor'));
  assert.ok(!openVacancies(new Date('2026-10-25T22:00:00Z')).some(v=>v.title==='Chief Internal Auditor'));
});

test('every published vacancy has a role brief, deadline and contact address',()=>{
  assert.equal(vacancies.length,8);
  for(const vacancy of vacancies) {
    assert.match(vacancy.source_link,/^https:\/\/drive\.google\.com\/file\/d\//);
    assert.match(vacancy.deadline,/^\d{4}-\d{2}-\d{2}$/);
    assert.match(vacancy.email,/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    assert.ok(formatVacancyDeadline(vacancy.deadline).length>8);
  }
});
