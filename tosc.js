import {linePN} from 'pitaka/offtext'


export const SuttaCentralify=(lines,prefix,ptspar)=>{
    if (typeof lines==='string') lines=lines.split('\n');
    let pn='',paravakya,vakya=0;
    const out={};
    for (let i=0;i<lines.length;i++) {
        let l=lines[i]||'';
        const m=linePN(l);
        if (m) { //a new PN
            const headers=(m.index>2?l.substr(0, m.index):'');
            pn=m[1].trim();
            l= l.substr(m.index+m[1].length+2);//2 is "^n".length
            if (ptspar) { //guided by sn subpara
                vakya=0;
                paravakya=listParaVakya(ptspar,pn);
                let subpara=paravakya[vakya];
                if (headers ) {
                    if (subpara&&subpara.indexOf('.1')>0) {
                        out[prefix+'.'+subpara.replace('.1','.0')]=headers;
                    } else l=headers+l;//put back
                }
                out[prefix+'.'+ subpara ]=l;
            } else {
                if (headers) {
                    if(pn==='1'||pn==='1.1') {
                        //0.1 is dropped (Nikaya name) , 0.3 is not always available
                        out[prefix+'0.2']=headers; //workaround to make header before ^n
                    } else {
                        out[prefix+pn+'.0']=headers;
                    }
                }
                out[prefix + pn+'.1']=l;
            }
            vakya=1;
        } else {
            if (ptspar) {
                if (!paravakya) {
                    throw "paravakya not available at line "+i;
                }
                out[prefix+'.'+ paravakya[vakya++] ]=l;
            } else {
                out[prefix+pn+'.'+ (vakya+1) ] = l;
                vakya++;
            }
        }
    }
    return JSON.stringify(out,'',' ');
}

export const listParaVakya=(ptspar,snpn_range)=>{ //give sn suttaid (pn) return list of all subpara with vakya
    const out=[];
    const listPara=pn=> {
        let vakya=1;
        const out2=[];
        let cnt=ptspar[pn+'.'+vakya];
        while ( cnt) {
            for (let i=1;i<=cnt;i++) out2.push(pn+':'+vakya+'.'+i)
            vakya++;
            cnt=ptspar[pn+'.'+vakya];
        }
        return out2;
    }

    if (ptspar[snpn_range+'.1']) {
        out.push(...listPara(snpn_range));
    } else{
        let [s,e]=snpn_range.split('-');
        s=parseInt(s);
        e=parseInt(e);
        if (!e) {
            console.log('pn not found',snpn_range);
        } else {
            for (let i=s;i<=e;i++) out.push(...listPara(''+i));
        }
    }
    return out;
}

export const countParaVakya=(ptspar,snpn_range)=>{ //give sn suttaid (pn) 
    //, return vakya count of all subpara, as bb has no markup of subpara
    let totalcount=0;
    const countPara=pn=> {
        let vakya=1,count=0;
        let cnt=ptspar[pn+'.'+vakya];
        
        while ( cnt) {
            count+=cnt;
            vakya++;
            cnt=ptspar[pn+'.'+vakya];
        }
        return count;
    }

    if (ptspar[snpn_range+'.1']) {
        totalcount=countPara(snpn_range);
    } else{
        let [s,e]=snpn_range.split('-');
        s=parseInt(s);
        e=parseInt(e);
        if (!e) {
            console.log('pn not found',snpn_range);
        } else {
            for (let i=s;i<=e;i++) totalcount+=countPara(''+i);
        }
    }
    return totalcount;
}