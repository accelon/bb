
import {kluer, writeChanged,nodefs, readTextLines, readTextContent} from 'pitaka/cli'
import { sc,cs } from 'pitaka/meta';
import {PTSParaLineCount} from '../sc/index.js'
import { cleanHTML } from './cleanhtml.js';
import { combineHTML, filesOf} from './bb-folder.js';
import {  alignParagraphLinecount, combineHeaders, toParagraphs } from 'pitaka/align';
import {SuttaCentralify,countParaVakya} from './tosc.js';
await nodefs;
const datafolder='epub/';
const desfolder='json/';
const {yellow} =kluer;
console.log(yellow('syntax'),'node tidy [dmsa]');
const bkpf=process.argv[2]||"dn";
const sutta=cs.suttaOfBookPrefix(bkpf).filter(it=>it.substr(0,bkpf.length)==bkpf);

const pseudopara=(para,pseudoid)=>{
    let newpara=['^n'+pseudoid+' '];
    if (para[1].length) {
        newpara=para[1].join('\n').split('\n');
        newpara[0]="^n"+pseudoid+newpara[0];
        para[1].length=0; //consumed
    }
    return newpara;
}

sutta.forEach(suttaid=>{
    let files=sc.sortFilenames(filesOf(suttaid,datafolder));
    const ptspar=PTSParaLineCount(suttaid);
    const [combined,notes]=combineHTML(files.map(f=>datafolder+f));
    const s=cleanHTML(combined,suttaid);

    const combinedPN=suttaid[0]==='s'||suttaid[0]==='a';
    const out=[]
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
            // console.log(paras.map(it=>it[0]).join(','))
            // console.log(files)
            // console.log(paras)
            console.log(suttaid,'empty para count',id,files[files.length-1])
        }
    }
    const outfn=desfolder+suttaid+'.json'
    const outbuffer=combineHeaders(out.join('\n'));

    let segid=suttaid.replace(/^(.)/,'$1n')
    if (!combinedPN) segid+=':' //sn and an has pn before :
    if (writeChanged(outfn,SuttaCentralify(outbuffer, segid ,combinedPN&&ptspar ))) {
        console.log('written',outfn)
    }
});
