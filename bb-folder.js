import { readTextContent,patchBuf} from 'pitaka/cli'
import { sc } from 'pitaka/meta';
import  Errata  from './errata.js';
export const filesFolders={
    dn1:["dn/_{54-73}"], 
    d1:["dn/_{54-61}"],
    d22:["dn/_{82-108}"],
    d23:["dn/_109?"],
    dn2:["dn/_{75-109}"],
    dn3:["dn/_{111-121}"],
    dn_notes:["dn/_{126-127}"],
    mn1:["mn/_{32-214}"], 
    mn2:["mn/_{215-282}"],
    mn3:["mn/_{283-393}"],
    m1:["mn/_{32-40}"],m2:["mn/_{41-50}"],m3:["mn/?_051"],m4:["mn/?_052"],m5:["mn/?_053"],m6:["mn/?_054"],m7:["mn/?_055"],m8:["mn/_{056-63}"],m9:["mn/_{064-80}"],m10:["mn/_{81-93}"],
    m11:["mn/?_094"],m12:["mn/_{095-101}"],m13:["mn/_{102-105}"],m14:["mn/?_106"],m15:["mn/?_107"],m16:["mn/?_108"],m17:["mn/?_109"],m18:["mn/?_110"],m19:["mn/?_111"],m20:["mn/?_112"],
    m21:["mn/?_114"],m22:["mn/_{115-125}"],m23:["mn/?_126"],m24:["mn/?_127"],m25:["mn/?_128"],m26:["mn/_{129-134}"],m27:["mn/?_135"],m28:["mn/_{136-140}"],m29:["mn/?_141"],m30:["mn/?_142"],
    m31:["mn/?_144"],m32:["mn/?_145"],m33:["mn/?_146"],m34:["mn/?_147"],m35:["mn/?_148"],m36:["mn/?_149"],m37:["mn/?_150"],m38:["mn/_{151-167}"],m39:["mn/_{168-177}"],m40:["mn/?_178"],
    m41:["mn/?_180"],m42:["mn/?_181"],m43:["mn/_{182-193}"],m44:["mn/_{194-204}"],m45:["mn/?_205"],m46:["mn/_{206-210}"],m47:["mn/?_211"],m48:["mn/?_212"],
    m49:["mn/?_213"],m50:["mn/?_214"],m51:["mn/?_217"],m52:["mn/?_218"],m53:["mn/?_219"],m54:["mn/?_220"],m55:["mn/?_221"],m56:["mn/?_222"],m57:["mn/?_223"],m58:["mn/?_224"],m59:["mn/?_225"],m60:["mn/?_{226-232}"],
    m61:["mn/?_234"],m62:["mn/_{235-236}"],m63:["mn/?_237"],m64:["mn/?_238"],m65:["mn/?_239"],m66:["mn/?_240"],m67:["mn/?_241"],m68:["mn/?_242"],m69:["mn/?_243"],m70:["mn/?_244"],
    m71:["mn/?_246"],m72:["mn/?_247"],m73:["mn/?_248"],m74:["mn/?_249"],m75:["mn/?_250"],m76:["mn/?_251"],m77:["mn/?_252"],m78:["mn/?_258"],m79:["mn/?_259"],m80:["mn/?_260"],
    m81:["mn/?_262"],m82:["mn/?_263"],m83:["mn/?_264"],m84:["mn/?_265"],m85:["mn/?_266"],m86:["mn/?_267"],m87:["mn/?_268"],m88:["mn/?_269"],m89:["mn/?_270"],m90:["mn/?_271"],
    m91:["mn/?_273"],m92:["mn/?_274"],m93:["mn/?_275"],m94:["mn/?_276"],m95:["mn/?_277"],m96:["mn/?_278"],m97:["mn/?_279"],m98:["mn/?_280"],m99:["mn/?_281"],m100:["mn/?_282"],
    m101:["mn/?_285"],m102:["mn/_{286-289}"],m103:["mn/?_290"],m104:["mn/?_291"],m105:["mn/?_292"],m106:["mn/?_{293-297}"],m107:["mn/?_298"],m108:["mn/?_299"],m109:["mn/?_300"],m110:["mn/?_301"],
    m111:["mn/?_303"],m112:["mn/?_304"],m113:["mn/?_305"],m114:["mn/?_{306-315}"],m115:["mn/?_{316-321}"],m116:["mn/?_322"],m117:["mn/?_{323-329}"],m118:["mn/_{330-335}"],m119:["mn/?_{336-345}"],m120:["mn/?_346"],
    m121:["mn/?_348"],m122:["mn/?_349"],m123:["mn/?_350"],m124:["mn/?_351"],m125:["mn/?_352"],m126:["mn/?_353"],m127:["mn/?_354"],m128:["mn/?_355"],m129:["mn/?_{356-361}"],m130:["mn/?_362"],
    m131:["mn/?_364"],m132:["mn/?_365"],m133:["mn/?_366"],m134:["mn/?_367"],m135:["mn/?_368"],m136:["mn/?_369"],m137:["mn/?_370"],m138:["mn/?_371"],m139:["mn/?_372"],m140:["mn/?_373"],m141:["mn/?_374"],m142:["mn/?_375"],
    m143:["mn/?_377"],m144:["mn/?_378"],m145:["mn/?_379"],m146:["mn/?_380"],m147:["mn/?_381"],m148:["mn/?_382"],m149:["mn/?_391"],m150:["mn/?_392"],m151:["mn/?_393"],m152:["mn/?_394"],
    mn_notes:["mn/_{400-403}"],
    sn1:["sn/c{1-11}_r1."] ,
    sn2:["sn/c{12-21}_r1."] ,
    sn3:["sn/c{23-35}_r1."] ,
    sn4:["sn/c{36-45}_r1."] ,
    sn5:["sn/c{46-57}_r1."] ,
    //sn notes in each samyutta

    an1:["an/?_100."],an2:["an/?_101."],an3:["an/_{102-122}."],an4:["an/_{124-174}."], an5:["an/_{175-196}."],
    an6:["an/_{197-211}."],an7:["an/_{212-228}."],an8:["an/_{230-256}."],an9:["an/?_257."], an10:["an/_{258-268}."],an11:["an/_{269-271}."],

    an_notes:["an/_273-283"],
    snp:["snp/_{7-89}.html"]
}
for (let i=2;i<14;i++) filesFolders['d'+i]=["dn/?_"+(''+(i+60)).padStart(3,'0')];//_62 dn1
for (let i=14;i<23;i++) filesFolders['d'+i]=["dn/?_"+(''+(i+61)).padStart(3,'0')];//_75 dn2
for (let i=24;i<35;i++) filesFolders['d'+i]=["dn/?_"+(''+(i+87)).padStart(3,'0')]; //_111 dn3

for (let i=1;i<22;i++) filesFolders['s'+i]=["sn/?c"+(''+(i)).padStart(2,'0')+'_r'];// sn1
for (let i=22;i<35;i++) filesFolders['s'+i]=["sn/?c"+(''+(i+1)).padStart(2,'0')+'_r'];// sn3
for (let i=35;i<45;i++) filesFolders['s'+i]=["sn/?c"+(''+(i+1)).padStart(2,'0')+'_r'];// sn4
for (let i=45;i<57;i++) filesFolders['s'+i]=["sn/?c"+(''+(i+1)).padStart(2,'0')+'_r'];// sn5
for (let i=1;i<=11;i++) filesFolders['a'+i]=filesFolders['an'+i];

const hasNote={
    'epub/sn/tran_9780861719730_oeb_c11_r1.html':true,   //text and footnotes
    'epub/sn/tran_9780861719730_oeb_c11_r1_b.html':true, //pure footnotes
    'epub/sn/tran_9780861719730_oeb_c21_r1.html':true,
    'epub/sn/tran_9780861719730_oeb_c21_r1_b.html':true,
    'epub/sn/tran_9780861719730_oeb_c35_r1.html':true,
    'epub/sn/tran_9780861719730_oeb_c45_r1.html':true,
    'epub/sn/tran_9780861719730_oeb_c57_r1.html':true,
    'epub/sn/tran_9780861719730_oeb_c57_r1_b.html':true,
}
export const combineHTML=(files=[])=>{
    let out='',html='',notes='';
    for (let i=0;i<files.length;i++){
        const fn=files[i];
        try{
            if (fs.existsSync(fn)) html=readTextContent(fn);
        } catch(e) {
            throw e;
        }
        html=patchBuf(html,Errata[fn],fn);
        const start=html.match(/<body[^>]*>/);
        const isfinished=html.indexOf('is finished.</p>');
        let  end=html.indexOf('</body>');
        if (isfinished>-1 && isfinished<end) end=isfinished;
        if (hasNote[fn]) {
            const m=html.match(/<b> ?Notes<\/b>/);
            if (m) {
                notes+=html.substr(m.index+m[0].length);
                out+=html.substring(0,m.index);    
            } else {
                notes+=html;
            }
        } else {
            out+=html.substring(start[0].length+start.index,end);
        }
    }
    return [out,notes];
}
export const bookFiles=bkid=>{
    suttaOfBook(bk)
}


export const filesOf=(pat,rootfolder)=>sc.getFilesOfBook(pat,filesFolders,rootfolder);