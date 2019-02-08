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

* entry (or entries), which has repeated translations 

```
<entry xml:id="sallah_001">
  <form type="lemma">
    <orth xml:lang="ar-aeb-x-tunis-vicav">ṣaḷḷaḥ</orth>
    <bibl>Singer 1984, p. 373</bibl>
  </form>
  <!-- ... -->
  <sense>
    <cit type="translation" xml:lang="en">
      <quote/>
    </cit>
    <cit type="translation" xml:lang="de">
      <quote>wieder gut</quote>
    </cit>
    <cit type="translation" xml:lang="de">
      <quote>tauglich machen</quote>
    </cit>
    <cit type="translation" xml:lang="de">
      <quote>in guten Zustand bringen</quote>
    </cit>
    <cit type="translation" xml:lang="fr">
      <quote/>
    </cit>
  </sense>
  <sense>
    <cit type="translation" xml:lang="en">
      <quote/>
    </cit>
    <cit type="translation" xml:lang="de">
      <quote>wieder gut/tauglich machen</quote>
    </cit>
    <cit type="translation" xml:lang="de">
      <quote>in guten Zustand bringen</quote>
    </cit>
    <cit type="translation" xml:lang="fr">
      <quote/>
    </cit>
  </sense>
</entry>
```