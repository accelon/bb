# Bhikkhu Bodhi translation in offtext format

## prerequisite
download epub book from https://readingfaithfully.org/tag/bhikkhu-bodhi/ ,
 rename *.epub to *.zip,  extract to epub/dn , epub/mn , epub/sn , epub/an , epub/snp respectively

see bb-folder.js for filenames in epub

## steps

dump content of epub html to offtext with original structure information

    node tidy [bookid]

aligned with cs numbering system

    node gen [bookid]
    
Digha Nikaya volumn 1

    node gen dn1 

All 3 volumns of Digha Nikaya

    node gen dn

see [vri filename to bookid](https://github.com/accelon/cs/blob/main/src/newname.js)