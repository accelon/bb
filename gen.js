/* generate aligned offtext with sc template, */
import {kluer, writeChanged,nodefs, readTextContent} from 'pitaka/cli'
import { cs, sc } from 'pitaka/meta';
// import { combineJSON, filesOf } from './bilara-folder.js';
import {fillTemplate} from '../sc/src/filltemplate.js'
import {combineJSON} from '../sc/src/bilara-folder.js'
import {pinNotes} from 'pitaka/align';
const {yellow,red} =kluer;
await nodefs
const srcfolder='json/';
const desfolder='off/';
const template_folder='../sc/template/';
console.log(yellow('syntax'),'node gen [bkid/bkpf]');
const bkid=process.argv[2]||'dn';
const books=sc.booksOf(bkid);


books.forEach(book=>{
    const notejson= JSON.parse(readTextContent(srcfolder+book+'.notes.json'));
    const suttas=cs.suttaOfBook(book);
    const bookjson=combineJSON(suttas.map(s=>srcfolder+s+'.json'));

    const template=readTextContent(template_folder+book+'.off');
    const offtext=fillTemplate(template,bookjson,'bb',{extraHeader:true});
    let lines=offtext.split('\n');
    const linecount=lines.length;
    
    const notes=pinNotes(lines,notejson); //lines will be updated
    if (writeChanged(desfolder+book+'.bb'+'.off',lines.join('\n'))) {
        console.log('written',book,'line count',linecount)
    } else {
        console.log('same',book,'line count',linecount)
    }
    const noteout='['+notes.map( ([y,pin,val,id]) =>JSON.stringify({y,id,pin,val})).join(",\n")+']';
    if (writeChanged(desfolder+book+'.notes.json',noteout)){
        //written note
    }
})
