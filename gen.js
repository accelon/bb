/* generate aligned offtext with sc template, */
import {kluer, writeChanged,nodefs, readTextLines, readTextContent} from 'pitaka/cli'
import { cs, sc } from 'pitaka/meta';
// import { combineJSON, filesOf } from './bilara-folder.js';
import {fillTemplate} from '../sc/src/filltemplate.js'
const {yellow,red} =kluer;
await nodefs
const srcfolder='json/';
const template_folder='../sc/template/';
console.log(yellow('syntax'),'node gen [bkid/bkpf]');
const bkid=process.argv[2]||'dn';
const suttas=cs.suttaOfBook(bkid);
console.log(sc.booksOf(bkid))
console.log(suttas)
