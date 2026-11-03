import {mkdirSync,writeFileSync} from 'node:fs';

mkdirSync('dist',{recursive:true});
writeFileSync('dist/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><title>Citizen website API</title><body>Citizen website API service</body></html>');
