import {mkdirSync, writeFileSync} from 'node:fs';
mkdirSync('dist', {recursive:true});
writeFileSync('dist/index.html', '<!doctype html><html lang="en"><meta charset="utf-8"><title>Citizen Bank</title><a href="https://citizenbank.co.ls">Open Citizen Bank</a></html>');
