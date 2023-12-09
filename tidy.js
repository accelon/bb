
import {alignParagraphLinecount, combineHeaders, toParagraphs ,
     meta_sc,meta_cs, writeChanged,nodefs, readTextLines, readTextContent} from 'ptk/nodebundle.cjs'
import {yellow} from 'ptk/cli/colors.cjs'
import {PTSParaLineCount} from '../sc/index.js'
import { cleanHTML } from './cleanhtml.js';
import {loadNotes,serializeNotes, fixNotesMarker} from './notes.js'
import { combineHTML, filesOf} from './bb-folder.js';

import {SuttaCentralify,countParaVakya} from './tosc.js';
await nodefs;
const datafolder='epub/';
const desfolder='json/';
console.log(yellow('syntax'),'node tidy [dmsa]n\\d');
const bkpf=process.argv[2]||"dn";
let sutta=meta_cs.suttaOfBook(bkpf);//.filter(it=>it.substr(0,bkpf.length)==bkpf);

if (!sutta.length) sutta=[bkpf];
const notes=loadNotes( filesOf(bkpf+'_notes', datafolder,true), bkpf );
sutta.forEach(suttaid=>{
    let files=meta_sc.sortFilenames(filesOf(suttaid,datafolder));
    const ptspar=PTSParaLineCount(suttaid);
    const [combined]=combineHTML(files.map(f=>datafolder+f));

    const s=cleanHTML(combined,suttaid);
    writeChanged('temp.txt',s)
    const combinedPN=suttaid[0]==='s'||suttaid[0]==='a';
    let out=[]
    const paras=toParagraphs(s.split('\n'));

    for (let i=0;i<paras.length;i++) {
        const id=paras[i][0];
        let paracount=ptspar[id];
        if (combinedPN) {
            paracount=countParaVakya(ptspar,id);
        }
        if (paracount) {
            out.push(... alignParagraphLinecount(paras[i][1], paracount, id ));
        } else {
            console.log(suttaid,'empty para count',id,files[files.length-1])
        }        
    }

    const outfn=desfolder+suttaid+'.json'
    out=fixNotesMarker(out,notes,bkpf);
    const outbuffer=combineHeaders(out.join('\n'));

    let segid=suttaid.replace(/^(.)/,'$1n')
    if (!combinedPN) segid+=':' //sn and an has pn before :
    writeChanged(outfn,SuttaCentralify(outbuffer, segid ,combinedPN&&ptspar ),true)
});
//save note only for single book
if (bkpf.match(/\d+$/)) {
    const notefn=desfolder+bkpf+'.notes.json';  //resolve in gen.js and save to off
    writeChanged(notefn, serializeNotes(notes));
}
