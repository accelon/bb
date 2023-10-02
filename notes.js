
import { stripLinesNote } from "ptk/nodebundle.cjs";
import { combineHTML } from "./bb-folder.js"
const html2offtag=s=>{
    s=s.replace(/\[/g,'〔').replace(/\]/g,'〕')
    .replace(/<span class="italic">(.+?)<\/span>/g,'^i[$1]')
    // .replace(/^\[[]\])
    
    .replace(/<div[^>]*>/g,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/\n+/g,'\n')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&amp;/g,'&')
    return s;
}
const extractNote=(content,files)=>{
    const notes={};
    let prev=0,previd='';
    content=content.replace(/\n⚓(\d+)/g,(m,nid,off)=>{
        const val=content.substring(prev,off);
        if (previd) {
            if (notes[previd]) console.log('repeated note id',previd,files);
            notes[previd]=[-1,-1,html2offtag(val.trim())];
        }
        previd=nid;
        prev=off+m.length;
    })
    notes[previd]=[-1,0,html2offtag(content.substring(prev).trim())];
    return notes;
}

const loadNotes_DNMN=(files,bkpf)=>{
    let [content]=combineHTML(files); 
    content=content.replace(/<\/a>\n/g,'</a>').replace(/<\/span>\n/g,'</span>')
    .replace(/<span class="calibre[78]"><a [^>]+>(\d+)/g,(m,nid)=>'\n⚓'+nid+' ')
    .replace(/<[^>]+>/g,'')
    const notes=extractNote(content,files);
    return notes;
}

const loadNotes_SN=files=>{
    let [out,rawnotes]=combineHTML(files); 
    rawnotes=rawnotes.replace(/<div class="end"><a[^>]+>(\d+)/g,(m,nid)=>'\n⚓'+nid+' ')
    .replace(/<[^>]+>/g,'')
    const notes=extractNote(rawnotes,files);
    return notes;
}
const loadNotes_AN=(files,bkpf)=>{
    let [content]=combineHTML(files);
    if (bkpf=='an11') {
        const at=content.indexOf('Appendix 1: Expanded Parallels</p>');
        content=content.substring(0,at);
    } else if (bkpf=='an7') {
        content=content.replace('<p class="calibre1"> 1600','<p class="calibre1">1600');
        content=content.replace(' 1605  I follow','<p class="calibre1">1605 I follow');
    }

    content=content.replace(/<p class="calibre1"><a id="p\d+"><\/a>\d.+?<\/i> */g,'<p class="calibre1">')
    .replace(/<p class="calibre1"><a id="p\d+"><\/a> +<\/p>\n/g,'')
    .replace(/<p class="calibre1"><i class="calibre3">Notes to the .+\n/g,'')
    .replace(/<a[^>]+> *<\/a>\d+ <i class="calibre3">        The Aṅguttara Nikāya<\/i> */g,'')
    .replace(/<\/a>\n/g,'</a>').replace(/<\/span>\n/g,'</span>')
    .replace(/<p class="calibre1">(\d+) /g,(m,nid)=>'\n⚓'+nid+' ')
    .replace(/<[^>]+>/g,'')
   
    const notes=extractNote(content,files);
    return notes;

}
export const loadNotes=(files=[],bkpf)=>{
    const notes={dn:loadNotes_DNMN,mn:loadNotes_DNMN,sn:loadNotes_SN,an:loadNotes_AN}[bkpf.substr(0,2)](files,bkpf);
    return notes;
}
const firstNoteId={an1:17,an2:216,an3:339,an4:618,an5:974,an6:1251,an7:1455,an8:1615,an9:1821,an10:1964,an11:2199}
export const addNoteMarker_AN=(lines,bkpf)=>{
    let nextid=firstNoteId[bkpf];
    for (let i=0;i<lines.length;i++) {
        let line=lines[i];
        const nline=line.replace(/(\d+)/g,(m,id,off)=>{
            const lead=line[off-2]+line[off-1];
            if (parseInt(id)==nextid && lead!=='^n') {
                nextid++;
                return '⚓'+id+' ';
            } else {
                return m;
            }
        })
        if (nline!==line) {
            lines[i]=nline;
        }
    }
    return lines;
}
export const fixNotesMarker=(lines,notes,bkpf)=>{
    if (bkpf.replace(/\d+$/,'')=='an') lines=addNoteMarker_AN(lines,bkpf);
    //只填y ，以產生該冊的注釋 json, 注標不動，在gen.js 時才pin
    let buf=lines.join('\n');
    buf=buf.replace(/\n( ?⚓\d+)/g,'$1\n');
    lines=buf.split('\n')
    stripLinesNote(lines,notes); 
    return lines;
}

export const serializeNotes=notes=>{
    const out=[];
    for (let id in notes) {
        const [y,pin,val]=notes[id];
        if (y===-1) continue;
        // const val=lines.replace(/\n/g,'\\n');
        const noteobj={id,pin,val}; //use id to locate
        out.push(  JSON.stringify(noteobj)   );
    }
    return '['+out.join(',\n')+']'
}
/* resolve in gen.js */
