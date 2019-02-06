## data cleaning:

### 2 translations in entries not in sense-tag:

    //tei:div[@type="entries"]/tei:entry[count(./tei:cit) > 0]

### typo error: 

    "mutliWordUnit"

### not understand:

* one example sentence has 2 translations with fully different meanings

```
    <cit xml:id="claa_qadd_ma_rayyadhtu_wa_laa_habb_yifhim_001" type="example">
      <quote xml:lang="ar-aeb-x-tunis-vicav">ʕlā qadd-ma ṛayyaḏ̣tu wa-lā ḥabb yifhim</quote>
      <bibl>Singer 1984, p. 683</bibl>
      <cit type="translation" xml:lang="de">
        <quote>So sehr ich ihm auch gut zuredete</quote>
      </cit>
      <cit type="translation" xml:lang="de">
        <quote>er wollte nicht verstehen.</quote>
      </cit>
    </cit>
```