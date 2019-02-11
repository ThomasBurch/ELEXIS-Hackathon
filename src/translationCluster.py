#%%
import sys
import os
import pprint
import re
import csv
import json

#%%
import xml.etree.ElementTree as ET
sys.setrecursionlimit(2000)
pp = pprint.PrettyPrinter(indent=2, width=150)

with open(os.path.join(os.getcwd(), 'data', 'dc_aeb_eng_indented2_minified.xml'), 'r') as xml_file:
  tree = ET.parse(xml_file)
  root = tree.getroot()

parentmap = {c:p for p in root.iter() for c in p}
text_id_lang_dict = {}
ns = {'tei': 'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'}
xml_id_key = '{%s}%s' % (ns['xml'], 'id')

group_lang_map = {
  'ar': 0,
  'de': 1,
  'en': 2,
  'fr': 3,
  'gram_root': 4,
}

not_allowed_text_list = [
  '',
  '-'
]

def build_cluster(cluster, node):
  """ build cluster using induction
  """
  for target in node['target']:
    if target not in cluster and target['text'] not in not_allowed_text_list:
      cluster.append(target)
      target['in_cluster'] = True
      cluster = build_cluster(cluster, target)
  return cluster

def build_cluster_graph_info(clusters, sort=False, sort_reverse=False):
  """ create graph info structure like: 
  [
    {
      "nodes": [
        {
          "id": "de_40",
          "text": "sicher",
          "group": 1
        },
        {
          "id": "akiid_001",
          "text": "akīd",
          "group": 0
        },
        ...
      ],
      "links": [
        {
          "source": 0,
          "source_": "de_40",
          "target": 1,
          "target_": "akiid_001"
        },
        {
          "source": 0,
          "source_": "de_40",
          "target": 5,
          "target_": "b_zhaddik_001"
        },
        ...
      ]
    }
  ]
  """
  if sort == True:
    s_clusters = sorted(clusters, key=lambda item : len(item), reverse=True)
  else:
    s_clusters = clusters
  clusters_graph = []
  for cluster in s_clusters:
    cluster_nodes = []
    cluster_links = []
    for node in cluster:
      cluster_nodes.append({
        'id': node['id'],
        'text': node['text'],
        'group': node['group']
      })
      for target in node['target']:
        if target['text']  not in not_allowed_text_list:
          cluster_links.append({
            'source': cluster.index(node),
            'source_': node['id'],
            'target': cluster.index(target),
            'target_': target['id']
          })
    clusters_graph.append({'nodes': cluster_nodes, 'links': cluster_links})
  return clusters_graph 

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
# pp.pprint(text_id_lang_dict)

def add_id_to_gram_type_in_entries(root, gram_type):
  num = 0
  elems = root.findall('.//tei:div[@type="entries"]/tei:entry//tei:gramGrp/tei:gram[@type="%s"]' % (gram_type), ns)
  text_dict = {}
  text_dict_key_id = {}
  for elem in elems:
    quote_text = elem.text
    if quote_text == None:
      quote_text = ''
    if quote_text not in text_dict.keys():
      num += 1
      elem_id = 'gram_' + gram_type + '_' + str(num)
      text_dict[quote_text] = elem_id
    else:
      elem_id = text_dict[quote_text]
    elem.set(xml_id_key, elem_id)
    # break
  for key in text_dict:
    text_dict_key_id[text_dict[key]] = key
  return root
add_id_to_gram_type_in_entries(root, 'root')

def transform_data_in_clusters(root, lang, sibling_langs):
  entry_elems = root.findall('.//tei:div[@type="entries"]/tei:entry', ns)
  entry_dict = {}
  res_dict = {}
  res_list = []
  text_dict = text_id_lang_dict[lang]
  for entry in entry_elems:
    entry_id = entry.attrib[xml_id_key]
    lemma_form = entry.find('./tei:form[@type="lemma"]/tei:orth', ns)
    multiwordunit_form = entry.find('./tei:form[@type="multiWordUnit"]/tei:orth', ns)
    lemma_form_text = None if lemma_form == None else lemma_form.text
    multiwordunit_form_text = None if multiwordunit_form == None else multiwordunit_form.text
    entry_text = None if lemma_form_text == None else lemma_form_text
    entry_text = multiwordunit_form_text if entry_text == None else entry_text
    entry_dict[entry_id] = entry_text
    trans_elems = entry.findall('.//tei:sense/tei:cit[@xml:lang="%s"]' % (lang), ns)
    for trans in trans_elems:
      # find ids of siblings
      sibling_elems = []
      sibling_ids = []
      trans_parent = parentmap[trans]
      for sl in sibling_langs:
        sibling_elems += trans_parent.findall('./tei:cit[@xml:lang="%s"]' % (sl), ns)
      for se in sibling_elems:
        sibling_ids.append(se.attrib[xml_id_key])
      # find id of trans cit
      trans_type = trans.attrib['type']
      trans_id = trans.attrib[xml_id_key]
      quote_text = text_dict[trans_id]
      if quote_text == None:
        quote_text = ''
      else: 
        # quote_text = quote_text.lower()
        pass
      if trans_id in res_dict.keys():
        found_entry_id = False
        for entryitem in res_dict[trans_id]['entry_list']:
          if entry_id == entryitem['entry_id']:
            entryitem['count'] += 1
            entryitem['connection_info'].append({'sibling_ids': sibling_ids})
            found_entry_id = True
        if found_entry_id == False:
          res_dict[trans_id]['entry_list'].append({
            'entry_id': entry_id, 
            'text': entry_text, 
            'count': 1, 
            'connection_info': [{'sibling_ids': sibling_ids}]
          })
      else: 
        res_dict[trans_id] = {'entry_list': [{
          'entry_id': entry_id, 
          'text': entry_text, 
          'count': 1, 
          'connection_info': [{'sibling_ids': sibling_ids}]
        }]}
    # break
  for key in res_dict.keys():
    count = sum([item['count'] for item in res_dict[key]['entry_list']])
    res_dict[key]['count'] = count
    res_list.append({'id': key, 'text': text_dict[key], 'count': count, 'entry_list': res_dict[key]['entry_list']})
  res_list = sorted(res_list, key = lambda item: item['count'], reverse=True)
  
  # build graph data
  nodes = []
  links = []
  node_count = 0
  node_dict = {}
  for entry_id in entry_dict.keys():
    temp_node = {
      'id': entry_id,
      'text': entry_dict[entry_id],
      'group': group_lang_map['ar'],
      'target': [],
      'in_cluster': False
    }
    nodes.append(temp_node)
    node_dict[entry_id] = {'index': node_count, 'node': temp_node}
    node_count += 1
  for trans_node in res_list:
    temp_node = {
      'id': trans_node['id'],
      'text': trans_node['text'],
      'target': [],
      'in_cluster': False,
      'group': group_lang_map[lang]
    }
    nodes.append(temp_node)
    node_dict[trans_node['id']] = {'index': node_count, 'node': temp_node}
    node_count += 1
    for arlink in trans_node['entry_list']:
      links.append({
        'source': node_dict[trans_node['id']]['index'], # index of node in node_dict
        'source_': trans_node['id'],
        'target': node_dict[arlink['entry_id']]['index'], # index of node in node_dict
        'target_': arlink['entry_id'],
        'value': arlink['count']
      })
      if node_dict[arlink['entry_id']]['node'] not in temp_node['target']:
        temp_node['target'].append(node_dict[arlink['entry_id']]['node'])
      if temp_node not in temp_node['target']:
        node_dict[arlink['entry_id']]['node']['target'].append(temp_node)
  # for link in links:
  #   link['source'] = node_dict[link['source_']]
  #   link['target'] = node_dict[link['target_']]

  # find clusters
  clusters = []
  for node in nodes:
    if node['in_cluster'] == False and node['text'] not in not_allowed_text_list:
      clusters.append(build_cluster([], node))
  
  not_in_cluster_count = 0
  for node in nodes:
    if node['in_cluster'] == False:
      pp.pprint(node['id'] + ' text: ' + node['text'])
      not_in_cluster_count += 1
  pp.pprint(lang + ' not in cluster: ' + str(not_in_cluster_count))

  clusters_graph_info = build_cluster_graph_info(clusters, sort=True, sort_reverse=True)

  return res_dict, res_list, clusters_graph_info

def add_gram_type_in_cluster(root, clusters, gram_type):
  """ add gram type as nodes in clusters
  """
  new_clusters = []
  # create node list
  node_dict = {}
  for cluster in clusters:
    nodes = cluster['nodes']
    for node in nodes:
      if node['id'] not in node_dict.keys():
        node_dict[node['id']] = node
        node['target'] = []
        node['in_cluster'] = False
  # create links in nodes
  for cluster in clusters:
    links = cluster['links']
    for link in links:
      source_id = link['source_']
      target_id = link['target_']
      source_node = node_dict[source_id]
      target_node = node_dict[target_id]
      if target_node not in source_node['target']:
        source_node['target'].append(target_node)
      if source_node not in target_node['target']:
        target_node['target'].append(source_node)

  # add gram type in nodes
  entry_elems = root.findall('.//tei:div[@type="entries"]/tei:entry', ns)
  for entry in entry_elems:
    entry_id = entry.attrib[xml_id_key]
    # check if entry in node list
    if entry_id not in node_dict.keys():
      continue
    # check if entry has the given gram type
    gram_root_elems = entry.findall('./tei:gramGrp/tei:gram[@type="%s"]' % (gram_type), ns)
    if gram_root_elems == None or len(gram_root_elems) <= 0:
      continue
    for gr_elem in gram_root_elems:
      gr_text = '' if gr_elem.text == None else gr_elem.text
      gr_id = gr_elem.attrib[xml_id_key]
      temp_gram_type_node = {
      'id': gr_id,
      'text': gr_text,
      'target': [],
      'in_cluster': False,
      'group': group_lang_map['gram_' + gram_type]
      }
      if gr_id not in node_dict.keys():
        node_dict[gr_id] = temp_gram_type_node
      target_node = node_dict[entry_id]
      source_node = node_dict[gr_id]
      if target_node not in source_node['target']:
        source_node['target'].append(target_node)
      if source_node not in target_node['target']:
        target_node['target'].append(source_node)

  node_list = []
  for id in node_dict.keys():
    node_list.append(node_dict[id])

  for node in node_list:
    if node['in_cluster'] == False and node['text'] not in not_allowed_text_list:
      new_clusters.append(build_cluster([], node))
  pp.pprint(len(new_clusters))

  clusters_graph_info = build_cluster_graph_info(new_clusters, sort=True, sort_reverse=True)
  return clusters_graph_info


langs = [
  'de', 
  'en', 
  'fr'
]
clusters_graph_info_list = []
for l in langs:
  sibling_langs = []
  for sl in langs:
    if sl != l:
      sibling_langs.append(sl)
  res_dict, res_list, clusters_graph_info = transform_data_in_clusters(root, l, sibling_langs)
  clusters_graph_info_list.append(clusters_graph_info)
  # # calculate claster nodes connections
  # cal = {}
  # cal_list = []
  # for res in res_list:
  #   if res['count'] in cal.keys():
  #     cal[res['count']]['count'] += 1
  #     cal[res['count']]['text_list'] += [res['text']]
  #   else:
  #     cal[res['count']] = {'count': 1, 'text_list': [res['text']]}
  # for key in cal.keys():
  #   cal_list.append(
  #     [
  #       key, 
  #       cal[key]['count'], 
  #       ', '.join([('\'' + item + '\'') for item in sorted(cal[key]['text_list'])[0:5]])
  #     ]
  #   )
  # sorted(cal_list, key=lambda item: item[0], reverse=True)
  # out = l + ' count\tnumber of texts\tfirst 5 texts\n'
  # for item in cal_list:
  #   out += str(item[0]) + '\t' + str(item[1]) + '\t' + item[2] + '\n'
  # print(out)
  # # save graph data to file
  # with open(os.path.join(os.getcwd(), 'data', l + '_list.json'), 'w', encoding='utf8') as f:
  #   data = json.dumps(res_list, indent=2, ensure_ascii=False)
  #   f.write(data)
  # with open(os.path.join(os.getcwd(), 'data', l + '_cluster_graph.json'), 'w', encoding='utf8') as f:
  #   data = json.dumps(clusters_graph_info, indent=2, ensure_ascii=False)
  #   f.write(data)
  # clusters_gram_type_graph_info = add_gram_type_in_cluster(root, clusters_graph_info, 'root')
  # with open(os.path.join(os.getcwd(), 'data', l + '_gram_root_cluster_graph.json'), 'w', encoding='utf8') as f:
  #   data = json.dumps(clusters_gram_type_graph_info, indent=2, ensure_ascii=False)
  #   f.write(data)
  # break

## create cluster_graph with all the langs
clusters_all = []
node_dict = {}
for clusters_graph_info in clusters_graph_info_list:
  for cluster in clusters_graph_info:
    nodes = cluster['nodes']
    for node in nodes:
      if node['id'] not in node_dict.keys():
        node_dict[node['id']] = node
        node['target'] = []
        node['in_cluster'] = False

for clusters_graph_info in clusters_graph_info_list:
  for cluster in clusters_graph_info:
    links = cluster['links']
    for link in links:
      source_id = link['source_']
      target_id = link['target_']
      source_node = node_dict[source_id]
      target_node = node_dict[target_id]
      if target_node not in source_node['target']:
        source_node['target'].append(target_node)
      if source_node not in target_node['target']:
        target_node['target'].append(source_node)

node_list = []
for id in node_dict.keys():
  node_list.append(node_dict[id])

for node in node_list:
  if node['in_cluster'] == False and node['text'] not in not_allowed_text_list:
    clusters_all.append(build_cluster([], node))

not_in_cluster_count = 0
for node in node_list:
  if node['in_cluster'] == False:
    # pp.pprint(node)
    not_in_cluster_count += 1
pp.pprint('for all langs, not in cluster: ' + str(not_in_cluster_count))

clusters_graph_all_info = build_cluster_graph_info(clusters_all, sort=True, sort_reverse=True)

# # save graph data with all langs to file
# with open(os.path.join(os.getcwd(), 'data', 'all_langs_cluster_graph.json'), 'w', encoding='utf8') as f:
#   data = json.dumps(clusters_graph_all_info, indent=2, ensure_ascii=False)
#   f.write(data)

clusters_gram_type_graph_info = add_gram_type_in_cluster(root, clusters_graph_all_info, 'root')
with open(os.path.join(os.getcwd(), 'data', 'all_langs_gram_root_cluster_graph.json'), 'w', encoding='utf8') as f:
  data = json.dumps(clusters_gram_type_graph_info, indent=2, ensure_ascii=False)
  f.write(data)


