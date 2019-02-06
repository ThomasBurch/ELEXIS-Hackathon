#%%
import sys
import os
import pprint
import re
import csv
import json

#%%
import xml.etree.ElementTree as ET

pp = pprint.PrettyPrinter(indent=2, width=150)

with open(os.path.join(os.getcwd(), 'data', 'dc_aeb_eng_indented2_minified.xml'), 'r') as xml_file:
  tree = ET.parse(xml_file)
  root = tree.getroot()

parentmap = {c:p for p in root.iter() for c in p}
text_id_lang_dict = {}
ns = {'tei': 'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'}
xml_id_key = '{%s}%s' % (ns['xml'], 'id')

def add_id_to_translations_in_entries(root, lang):
  num = 0
  elems = root.findall('.//tei:div[@type="entries"]/tei:entry//tei:sense/tei:cit[@xml:lang="%s"]' % (lang), ns)
  text_dict = {}
  text_dict_key_id = {}
  for elem in elems:
    quote_text = elem.find('./tei:quote', ns).text
    if quote_text == None:
      quote_text = ''
    if quote_text not in text_dict.keys():
      num += 1
      elem_id = lang + '_' + str(num)
      text_dict[quote_text] = elem_id
    else:
      elem_id = text_dict[quote_text]
    elem.set(xml_id_key, elem_id)
    # break
  for key in text_dict:
    text_dict_key_id[text_dict[key]] = key
  text_id_lang_dict[lang] = text_dict_key_id
  return root

add_id_to_translations_in_entries(root, 'de')
add_id_to_translations_in_entries(root, 'en')
add_id_to_translations_in_entries(root, 'fr')
pp.pprint(text_id_lang_dict)

def build_inverted_list(root, lang):
  entry_elems = root.findall('.//tei:div[@type="entries"]/tei:entry', ns)
  res_dict = {}
  res_list = []
  text_dict = text_id_lang_dict[lang]
  for entry in entry_elems:
    entry_id = entry.attrib[xml_id_key]
    trans_elems = entry.findall('.//tei:sense/tei:cit[@xml:lang="%s"]' % (lang), ns)
    for trans in trans_elems:
      trans_type = trans.attrib['type']
      trans_id = trans.attrib[xml_id_key]
      quote_text = text_dict[trans_id]
      if quote_text == None:
        quote_text = ''
      else: 
        # quote_text = quote_text.lower()
        pass
      if quote_text in res_dict.keys():
        found_entry_id = False
        for entryitem in res_dict[quote_text]['entry_list']:
          if entry_id == entryitem['entry_id']:
            entryitem['count'] += 1
            found_entry_id = True
        if found_entry_id == False:
          res_dict[quote_text]['entry_list'].append({'entry_id': entry_id, 'count': 1})
      else: 
        res_dict[quote_text] = {'entry_list': [{'entry_id': entry_id, 'count': 1}]}
    # break
  for key in res_dict.keys():
    count = sum([item['count'] for item in res_dict[key]['entry_list']])
    res_dict[key]['count'] = count
    res_list.append({'text': key, 'count': count, 'entry_list': res_dict[key]['entry_list']})
  res_list = sorted(res_list, key = lambda item: item['count'], reverse=True)
  return res_dict, res_list

for l in ['de', 'en', 'fr']:
  res_dict, res_list = build_inverted_list(root, l)
  cal = {}
  cal_list = []
  for res in res_list:
    if res['count'] in cal.keys():
      cal[res['count']]['count'] += 1
      cal[res['count']]['text_list'] += [res['text']]
    else:
      cal[res['count']] = {'count': 1, 'text_list': [res['text']]}
  for key in cal.keys():
    cal_list.append(
      [
        key, 
        cal[key]['count'], 
        ', '.join([('\'' + item + '\'') for item in sorted(cal[key]['text_list'])[0:5]])
      ]
    )
  sorted(cal_list, key=lambda item: item[0], reverse=True)
  out = l + ' count\tnumber of texts\tfirst 5 texts\n'
  for item in cal_list:
    out += str(item[0]) + '\t' + str(item[1]) + '\t' + item[2] + '\n'
  print(out)
  break
  # pp.pprint(res_list)
#   with open(os.path.join(os.getcwd(), 'data', l + '_list.json'), 'w', encoding='utf8') as f:
#     data = json.dumps(res_list, indent=2, ensure_ascii=False)
#     f.write(data)


