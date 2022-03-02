
import {kluer, writeChanged,nodefs, readTextLines, readTextContent} from 'pitaka/cli'
import { sc,cs } from 'pitaka/meta';
import {PTSParaLineCount} from '../sc/index.js'
import { cleanHTML } from './cleanhtml.js';
import { combineHTML, filesOf} from './bb-folder.js';
import {  alignParagraphLinecount, combineHeaders, toParagraphs,SuttaCentralify } from 'pitaka/align';
await nodefs;
const datafolder='epub/';
const desfolder='json/';

const {yellow} =kluer;
console.log(yellow('syntax'),'node tidy-note');
