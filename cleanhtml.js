import { combineHeaders } from "ptk/nodebundle.cjs";

const replacePN=m1=>{
    let s='\n^n'+m1.replace(/[\-—–]+/,'-').replace(/ +/g,'').replace(/\.$/,'').replace(/(\d)\.\-/,'$1-')+' '
    if (s=='\n^n ') s='';    //empty pn , e.g removed by errata m17:11-14 
    return s;
}
const replaceItalic=m1=>(m1=="."||m1==","||m1=='‘'||m1=='”'||m1=='’'||m1=='“'||parseInt(m1))?m1:'^i['+m1+']';

const replaceHeader=m1=>{
    return '^h['+m1.replace(/<\/?[^>]+>/g,'')+']';//not styling inside header
}
const replaceDN=(s,id)=>{
    return s.replace(/<span class="bold"><span class="italic">/g,'<span class="bold">') //prevent ^i inside ^h
    .replace(/<div class="calibre15"><span class="calibre18"><span class="bold"> ?(\d+) <span class="italic">([^<]+)<\/span><\/span>/g,'^z1[$2]')
    .replace(/<a [^>]+><sup class="calibre\d+">(\d+)<\/sup><\/a>/g,"⚓$1")
      .replace(/\n?〔?<span class="italic">([^<]+)<\/span>〕?/g,(m,m1)=>replaceItalic(m1))
    //   .replace(/<div class="calibre27"><blockquote class="calibre28"><span class="calibre8"><div class="calibre16"><span class="calibre8">/g,"\n^sz ")
      .replace(/<div class="calibre15"><span class="calibre4"><span class="bold">([^<]+)<\/span>/g,(m,m1)=>replaceHeader(m1))
      .replace(/〔?<span class="italic1">([^<]+)〕?<\/span>〕?/g,"^z1[$1]")
      .replace(/<\/?[^>]+>/g,'')
      .replace(/\n\u00a0*(\d[\.\d —\-]+)/g,(m,m1)=>replacePN(m1))
      .replace(/\n\^n +/g,'')
}
const replaceMN=(s,id)=>{
    s=s.replace(/<div class="calibre14"><span class="calibre7"><span class="bold"> ?([A-Z].+?)<\/span><\/span><\/div><div class="calibre4"> <\/div>/g,(m,m1)=>{
        return "^z1["+m1.replace(/<[^>]+>/,'')+"]" //might have <br> inside
     });
     s=s.replace(/<h2.+?\n<span class="bold1"><span class="italic1">(.+?)<\/span><\/span>\n<\/span><\/span><\/h2><div class="calibre9"> <\/div>\n/g,"^h[$1]")//pali sutta name
     s=s.replace(/<h2.+?\n<span class="bold1">(.+?)<\/span>\n<\/span><\/h2><div class="calibre9"> <\/div>/g,"^z2[$1]")//section
     s=s.replace(/<div class="calibre1[67]"><span class="calibre7">[ \u00a0]*([\.\d —–\-]+)/g,(m,m1)=>replacePN(m1))
     .replace(/<a [^>]+><sup class="calibre\d+">([\d]+)<\/sup><\/a>/g,"⚓$1")
     .replace(/<div class="calibre1[67]"><span class="calibre7">/g,'')
     .replace(/<br[^>]*>/g,'\n')
     .replace(/\n?〔?<span class="italic">([^<]+)<\/span>〕?/g,(m,m1)=>replaceItalic(m1))
     .replace(/<\/?[^>]+>/g,'')
     .replace(/\n\u00a0+\n/g,'')
     .replace(/\n+/g,'\n')
     return s;
}

const replaceSN=(s,id)=>{
    s=s.replace(/&lt;[\d+]+&gt;/g,(m,m1)=>'')//remove pagenumber of new PTS 1998 version
    //s22 <div class="tx1"><i>4 (4)-10 (10) To Be Fully Understood, Etc.</i>
    .replace(/<div class="tx1"><i>/g,'<i>') //prevent messup with subpara
    .replace(/<i> ?([\d\-]+) \(([\d\-]+)\)[–-]([\d\-]+) \(([\d\-]+)\) (.+?)<\/i>/g, (m,pn,pn2,pnend,pnend2,title)=>{
        // console.log("RANGE",pn,pnend)
        const snpn=pn+'-'+pnend;
        return '^z1['+title+']^n'+snpn+' ';
    })
    .replace(/<i> ?([\d\-]+) \(([\d\-]+)\) (.+?)<\/i>/g, (m,pn,pn2,title)=>{
        return '^z1['+title+']^n'+pn+' ';
    })
    .replace(/<i> ?([\d\-]+) ?[–-]([\d\-]+) (.+?)<\/i>/g, (m,pn,pnend,title)=>{
        const snpn=pn+'-'+pnend;
        return '^z1['+title+']^n'+snpn+' ';
    })
    .replace(/<i> ?([\d\-]+) (.+?)<\/i>/g, (m,pn,title)=>{
        return '^z1['+title+']^n'+pn+' ';
    })
    // .replace(/<div class="tx1">([^<])/g,'^n0_0 $1')   //有時 經號被 tx1 包住
    // .replace(/<div class="tx">/g,'^n0_0 ')
    .replace(/<a [^>]+><sup>(\d+)<\/sup><\/a>/g,'⚓$1')
    .replace(/<\/?[^>]+>/g,'')
    .replace(/\n\u00a0+\n/g,'')
    .replace(/\n+/g,'\n')


    return s;
}
const replaceAN=(s,id)=>{
    s=s.replace(/<p class="calibre1"><a id="p\d+"><\/a>.+?<\/p>\n/g,'')
    .replace(/<p class="calibre1"><i class="calibre3">(\d+) \(\d+\) ?[–\-] ?(\d+) \(\d+\)/g,(m,pn,pnend)=>{
        return '^n'+pn+'-'+pnend+' ';
    }).replace(/<p class="calibre1"><i class="calibre3">(\d+) \(\d+\)/g,(m,pn)=>{
        return '^n'+pn+' ';
    }).replace(/<p class="calibre1"><a id="p\d+"><\/a>\d+ *<i class="calibre3"> *The Book of the [a-zA-Z]+<\/i> ?[IV]+ \d+<\/p>\n/g,'')
    // .replace(//)
    .replace(/<a [^>]+><sup>(\d+)<\/sup><\/a>/g,'⚓$1')
    .replace(/<p class="calibre1"><i class="calibre3"> ?Sutta \d+        <\/i> \d+<\/p>\n/g,'')
    .replace(/<\/?[^>]+>/g,'')
    return s;
}
const replacePTS=s=>{
    s=s.replace(/\[(\d[\d —-]*)\] ?/g,(m,m1)=>'')//'^pts'+m1.replace('—','-').replace(/ +/g,''))

    return s;
}
export const cleanDiacritic=(s,book)=>{
    s=s.replace(/a\u0304/g,'ā')
       .replace(/u\u0304/g,'ū')
       .replace(/i\u0304/g,'ī')
       .replace(/A\u0304/g,'Ā')
       .replace(/U\u0304/g,'Ū')
       .replace(/I\u0304/g,'Ī')
       .replace(/([bcdhjklmnopqrstuvwyḍṭṇñṅḷ])\u0304/g,'$1ā')
       .replace(/([BCDHJKLMNOPQRSTUVWYḌṬṆÑṄḶ])\u0304/g,'$1Ā')
    return s;
}
export const cleanHTML=(s,book)=>{
    const bkpf=book.match(/([a-z]+)/)[1];
    s=cleanDiacritic(s,book);
    s=replacePTS(s,book);
    s=s.replace(/\[/g,'〔').replace(/\]/g,'〕')

    if (bkpf[0]==='d') s=replaceDN(s);
    else if (bkpf[0]==='m') s=replaceMN(s,book); //no sutta id in html
    else if (bkpf[0]==='s') s=replaceSN(s,book);
    else  if (bkpf[0]==='a') s=replaceAN(s,book);
    s=combineHeaders(s.trim());
    return s;
}