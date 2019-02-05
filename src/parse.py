#%%
import sys
import os
import pprint
import re
import csv
#%%
import xml.etree.ElementTree as ET

pp = pprint.PrettyPrinter(indent=2, width=150)
tree = ET.parse(os.path.join(os.getcwd(), 'data', 'dc_aeb_eng_indented2_minified.xml'))
root = tree.getroot()
parentmap = {c:p for p in root.iter() for c in p}

ns = {'tei': 'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'}

def elem_analysis(elemname, attr=None, content=False):
  elems = root.findall('.//' + elemname, ns)
  title = '#######  ' + elemname + ' '
  res = []
  if attr != None:
    title += ' attr -- ' + attr['attr'] + ' ; '
  if content == True:
    title += ' content ; '
  print()
  print(title)
  # print(dir(elems[0]))
  # print(elems[0].attrib)
  count = 0
  for elem in elems:
    parent_node = parentmap[elem]
    ptag = parent_node.tag
    parent = [{
      '_tag': ptag,
      '_count': 0,
    }]
    text = elem.text

    if attr != None:
      if attr['ns'] != '':
        attrname = '{%s}%s' % (ns[attr['ns']], attr['attr']) 
      else:
        attrname = attr['attr']
      if attrname in elem.attrib:
        eattr = elem.attrib[attrname]
      else:
        eattr = ''
      attrfound = False
      for stat in res:
        if stat['_' + attrname] == eattr: 
          stat['_count'] += 1
          parent = stat['parent']
          res_elem = stat
          attrfound = True
      
      if attrfound == False:
        res_elem = {
          '_' + attrname: eattr,
          '_count': 1,
          'parent': parent
        }
        if content == True:
          res_elem['content'] = [{'_text': text, '_count': 1}]
        res.append(res_elem)
      else :

        # differ content in attr
        if content == True:
          if content == 'ams':
            print(elem)
          contentfound = False
          for con in res_elem['content']: 
            if con['_text'] == text:
              con['_count'] += 1
              contentfound = True
          if contentfound == False:
            res_elem['content'].append({
              '_text': text,
              '_count': 1
            })

    if attr == None and content == False: # all conditions are empty
      if count == 0:
        res.append({
          '_count': 1,
          'parent': parent
        })
      else:
        res[0]['_count'] += 1
        parent = res[0]['parent']
    
    parentfound = False
    for stat in parent:
      if stat['_tag'] == ptag:
        stat['_count'] += 1
        parentfound = True
    if parentfound == False:
      parent.append({
        '_tag': ptag,
        '_count': 1,
      })
    count += 1
    # break

  # delete namespace from parent tags
  for elem in res:
    for p in elem['parent']:
      p['_tag'] = re.sub(r'{.+}', '', p['_tag'])
  return res

### entry
pp.pprint(elem_analysis('tei:entry'))
entry_no_lemma = []
for entry in root.findall('.//tei:entry', ns):
  r = entry.findall('tei:form[@type="lemma"]', ns)
  if len(r) < 1:
    entry_no_lemma.append({'id': entry.attrib['{%s}%s' % (ns['xml'], 'id')]})
print('entry without lemma form: ' + str(len(entry_no_lemma)))
# pp.pprint(entry_no_lemma)
pp.pprint(elem_analysis('tei:form', attr={'ns': '', 'attr': 'type'}))
# pp.pprint(elem_analysis('tei:orth', attr={'ns': 'xml', 'attr': 'lang'}))
# pp.pprint(elem_analysis('tei:gramGrp'))
pp.pprint(elem_analysis('tei:gram', attr={'ns': '', 'attr': 'type'}))
pp.pprint(elem_analysis('tei:gram[@type="pos"]', attr={'ns': '', 'attr': 'type'}, content=True))
# pp.pprint(elem_analysis('tei:sense', attr={'ns': '', 'attr': 'type'}))
pp.pprint(elem_analysis('tei:ptr', attr={'ns': '', 'attr': 'type'}))

# pp.pprint(elem_analysis('tei:cit', attr={'ns': '', 'attr': 'type'}))
pp.pprint(elem_analysis('tei:div[@type="entries"]//tei:cit', attr={'ns': '', 'attr': 'type'}))
pp.pprint(elem_analysis('tei:div[@type="entries"]//tei:cit', attr={'ns': 'xml', 'attr': 'lang'}))
pp.pprint(elem_analysis('tei:div[@type="examples"]//tei:cit', attr={'ns': '', 'attr': 'type'}))
pp.pprint(elem_analysis('tei:div[@type="examples"]//tei:cit', attr={'ns': 'xml', 'attr': 'lang'}))

pp.pprint(elem_analysis('tei:fs', attr={'ns': '', 'attr': 'type'}))
pp.pprint(elem_analysis('tei:f', attr={'ns': '', 'attr': 'name'}))
pp.pprint(elem_analysis('tei:f[@name="who"]/tei:symbol', attr={'ns': '', 'attr': 'value'}))
# pp.pprint(elem_analysis('tei:form[@type="lemma"]/tei:orth', attr={'ns': '', 'attr': 'nothis'}, content=True))

### words count
def word_analysis(elemname, lang):
  elems = root.findall('.//' + elemname, ns)
  title = '#######  ' + lang + ' -- ' + elemname + ' '
  print()
  print(title)
  res = []
  res_index = {}
  count = 0
  token_count = 0
  for elem in elems:
    try:
      text = re.sub(r'[,\.;:_#\*\{}\[\]\+\(\)\!"]', '', str(elem.text))
    except TypeError:
      print(text) 
    textarr = text.split(' ')
    token_count += len(textarr)
    for t in textarr:
      if t in res_index.keys():
        res_index[t] += 1
      else:
        res_index[t] = 1
    count += 1
    # if count > 100: 
    #   break
    # break
  return res_index, token_count

print()
print('TOKEN and TYPE in entries:')
type_index, token_count = word_analysis('tei:div[@type="entries"]//tei:form//tei:orth', 'arabic in entries')
print('type count: ' + str(len(type_index)) + '; token count: ' + str(token_count))
for l in ['lemma', 'variant', 'inflected', 'multiWordUnit', 'construction', 'mutliWordUnit']:
  type_index, token_count = word_analysis('tei:div[@type="entries"]//tei:form[@type="' + l + '"]/tei:orth', 'arabic in ' + l)
  print('type count: ' + str(len(type_index)) + '; token count: ' + str(token_count))
for l in ['en', 'de', 'fr']:
  type_index, token_count = word_analysis('tei:div[@type="entries"]//tei:cit[@xml:lang="' + l + '"]/tei:quote', l)
  print('type count: ' + str(len(type_index)) + '; token count: ' + str(token_count))
# pp.pprint(type_index)
print()
print('TOKEN and TYPE in examples:')
type_index, token_count = word_analysis('tei:div[@type="examples"]//tei:cit[@type="example"]/tei:quote', 'arabic')
print('type count: ' + str(len(type_index)) + '; token count: ' + str(token_count))
for l in ['en', 'de', 'fr']:
  type_index, token_count = word_analysis('tei:div[@type="examples"]//tei:cit[@xml:lang="' + l + '"]/tei:quote', l)
  print('type count: ' + str(len(type_index)) + '; token count: ' + str(token_count))
# pp.pprint(type_index)



# with open(os.path.join(os.getcwd(), 'src', 'parseReport.csv'), 'w') as f:
#   w = csv.DictWriter(f, r[0].keys())
#   w.writeheader()
#   w.writerows(r)

