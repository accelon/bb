import { pinPos } from "pitaka/align";
import { linePN } from "pitaka/offtext";
import { stripLinesNote } from "pitaka/utils";
import { combineHTML } from "./bb-folder.js"
const html2offtag=s=>{
    s=s.replace(/\[/g,'〔').replace(/\]/g,'〕')
    .replace(/<span class="italic">(.+?)<\/span>/g,'^i[$1]')
    // .replace(/^\[[]\])
    
    .replace(/<div[^>]*>/g,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/\n+/g,'\n')
    return s;
}
const loadNotes_DN=files=>{
    let [content]=combineHTML(files); 
    const notes={};

    content=content.replace(/<\/a>\n/g,'</a>').replace(/<\/span>\n/g,'</span>')
    .replace(/<\/div><div class="calibre27"><\/div>/g,'\n<div class="clibre27">')
    .replace(/<div class="calibre27"><span class="calibre8"><a [^>]+>(\d+)<\/a>(.+?)<\/div>/g,
        (m,nid,val)=>{
            if (notes[nid]) {
                console.log('repeated note id',nid,files);
            }
            notes[nid]=[-1,0,html2offtag(val)];
    });
    return notes;
}
const loadNotes_MN=files=>{
    
}
const loadNotes_SN=files=>{
    const [out,notes]=combineHTML(files); 
}
const loadNotes_AN=files=>{
    
}
export const loadNotes=(files=[],bkpf)=>{
    bkpf=bkpf.replace(/\d+$/,'');
    const notes={dn:loadNotes_DN,sn:loadNotes_SN,mn:loadNotes_MN}[bkpf](files);
    return notes;
}

export const stripNotes=(lines,notes)=>{
    lines=stripLinesNote(lines,notes);
    for (let nid in notes) {
        const note=notes[nid];
        const [y,x]=note;
        if (y<0) continue;
        if (typeof x=='string') continue;//resolved
        const pn=linePN(lines[y]);
        if (pn && x<pn.index+pn[0].length) {
            note[1]='';
        } else {
            const pin=pinPos( lines[y], x ,{backward:true,wholeword:true});
            note[1]=pin;
        }
    }
    return lines;
}

export const serializeNotes=notes=>{
    const out=[];
    for (let id in notes) {
        const [y,pin,val]=notes[id];
        if (typeof pin!=='string') continue;
        // const val=lines.replace(/\n/g,'\\n');
        const noteobj={id,y,pin,val};
        out.push(  JSON.stringify(noteobj)   );
    }
    return '['+out.join(',\n')+']'
}