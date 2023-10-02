/* generate aligned offtext with sc template, */
import {writeChanged,nodefs, readTextContent, meta_cs,meta_sc,pinNotes} from 'ptk/nodebundle.cjs'
import {yellow} from 'ptk/cli/colors.cjs'
// import { combineJSON, filesOf } from './bilara-folder.js';
import {fillTemplate} from '../sc/src/filltemplate.js'
import {combineJSON} from '../sc/src/bilara-folder.js'

await nodefs
const srcfolder='json/';
const desfolder='off/';
const template_folder='../sc/template/';
console.log(yellow('syntax'),'node gen [bkid/bkpf]');
const bkid=process.argv[2]||'dn';
const books=meta_sc.booksOf(bkid);


books.forEach(book=>{
    const notejson= JSON.parse(readTextContent(srcfolder+book+'.notes.json'));
    const suttas=meta_cs.suttaOfBook(book);
    const bookjson=combineJSON(suttas.map(s=>srcfolder+s+'.json'));

    const template=readTextContent(template_folder+book+'.off');
    const offtext=fillTemplate(template,bookjson,'bb',{extraHeader:true});
    let lines=offtext.split('\n');
    for (let i=0;i<lines.length;i++) { //只有空白的行去除，否則aligner 無法enter
        if (lines[i].trim()=='') lines[i]='';
    }
    const linecount=lines.length;
    const keepmarker=true; //true to use ^f , otherwise use pin
    const notes=pinNotes(lines,notejson,{keepmarker}); //lines will be updated
    if (writeChanged(desfolder+book+'.bb'+'.ori.off',lines.join('\n'))) {
        console.log('written',book,'line count',linecount)
    } else {
        console.log('same',book,'line count',linecount)
    }
    if (keepmarker) {
        writeChanged(desfolder+book+'.notes.tsv',notes.join('\n'),true)
    } else {
        const noteout='['+notes.map( ([y,pin,val,id]) =>JSON.stringify({y,id,pin,val})).join(",\n")+']';
        writeChanged(desfolder+book+'.notes.json',noteout,true)    
    }
})
