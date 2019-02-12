# -*- coding: utf-8 -*-

import sys
import os
import pprint
import re
import csv
import json
import xml.etree.ElementTree as ET
sys.setrecursionlimit(2000)
pp = pprint.PrettyPrinter(indent=2, width=150)

class Builder:
  """ Builder for creating cluster informations based on given TEI-dictionary
  """

  def __init__(self, file_path=os.path.join(os.path.dirname(os.path.realpath(__file__)), '../data', 'dc_aeb_eng_indented2_minified.xml'), save_dir=os.path.join(os.path.dirname(os.path.realpath(__file__)), '../data'), namespaces=None):
    """
    Args: 
      file_path (str): location of TEI-dictionary data
      save_dir (str): location dir for output data
      namespaces (dict): dict of namespaces used in the dictionary, must have key "tei" and "xml"
    """
    self.file_path = file_path
    self.save_dir = save_dir
    self.ns = {'tei': 'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'}
    self.xml_id_key = '{%s}%s' % (self.ns['xml'], 'id')
    self.group_lang_map = {
      'ar': 0,
      'de': 1,
      'en': 2,
      'fr': 3,
      'gram_root': 4,
    }
    self.not_allowed_text_list = [
      '',
      '-'
    ]
    self.langs = [
      'de', 
      'en', 
      'fr'
    ]
    self.text_id_lang_dict = {}
    self.root = None
    self.parentmap = None

  def load_data(self):
    """Load TEI data and init some internal prameters
    """
    print('loading data from: %s ...' % (self.file_path))
    with open(self.file_path, 'r') as xml_file:
      tree = ET.parse(xml_file)
      self.root = tree.getroot()
      self.parentmap = {c:p for p in self.root.iter() for c in p}

    for l in self.langs:
      self.add_id_to_translations_in_entries(l)
    self.add_id_to_gram_type_in_entries('root')

  def make_clusters(self):
    clusters_graph_info_list = []
    for l in self.langs:
      sibling_langs = []
      for sl in self.langs:
        if sl != l:
          sibling_langs.append(sl)
      print()
      print('create clusters for %s ... ' % (l))
      res_dict, res_list, clusters_graph_info = self.transform_data_in_clusters(l, sibling_langs)
      clusters_graph_info_list.append(clusters_graph_info)
      save_file = os.path.join(self.save_dir, l + '_cluster_graph.json')
      print('save clusters data for %s as %s ...' % (l, save_file))
      with open(save_file, 'w', encoding='utf8') as f:
        data = json.dumps(clusters_graph_info, indent=2, ensure_ascii=False)
        f.write(data)
      print('create clusters with gram type "root" for %s ... ' % (l))
      clusters_gram_type_graph_info = self.add_gram_type_in_cluster(clusters_graph_info, 'root')
      save_file = os.path.join(self.save_dir, l + '_gram_root_cluster_graph.json')
      print('save clusters data with gram type "root" for %s as %s ...' % (l, save_file))
      with open(save_file, 'w', encoding='utf8') as f:
        data = json.dumps(clusters_gram_type_graph_info, indent=2, ensure_ascii=False)
        f.write(data)
      
    ## create cluster_graph with all the langs
    print()
    print('create clusters with all the languages ...')
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
      if node['in_cluster'] == False and node['text'] not in self.not_allowed_text_list:
        clusters_all.append(self.build_cluster([], node))
    clusters_graph_all_info = self.build_cluster_graph_info(clusters_all, sort=True, sort_reverse=False)

    save_file = os.path.join(self.save_dir, 'all_langs_cluster_graph.json')
    print('save clusters data with all the languages as %s ...' % (save_file))
    with open(save_file, 'w', encoding='utf8') as f:
      data = json.dumps(clusters_graph_all_info, indent=2, ensure_ascii=False)
      f.write(data)

    print()
    print('create clusters with all the languages and gram type "root" ...')
    clusters_gram_type_graph_info = self.add_gram_type_in_cluster(clusters_graph_all_info, 'root')
    save_file = os.path.join(self.save_dir, 'all_langs_gram_root_cluster_graph.json')
    print('save clusters data with all the languages and gram type "root" as %s ...' % (save_file))
    with open(save_file, 'w', encoding='utf8') as f:
      data = json.dumps(clusters_gram_type_graph_info, indent=2, ensure_ascii=False)
      f.write(data)

    print()
    print('all DONE')



  def build_cluster(self, cluster, node):
    """ build cluster using induction

    Args: 
      cluster (list): cluster to be fulfilled
      node (dict): a node in the cluster

    Returns:
      list: cluster built based on current given cluster and node
    """
    for target in node['target']:
      if target not in cluster and target['text'] not in self.not_allowed_text_list:
        cluster.append(target)
        target['in_cluster'] = True
        cluster = self.build_cluster(cluster, target)
    return cluster

  def build_cluster_graph_info(self, clusters, sort=False, sort_reverse=False):
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

    Args: 
      clusters (list): list of clusters for building the graph info
      sort (boolean): indicate whether to sort the clusters according to their number of nodes
      sort_reverse (boolean): if "sort" is True, indicate whether sort the result resversly

    Returns:
      list: list of graph info for every cluster in the given cluster list
    """

    if sort == True:
      s_clusters = sorted(clusters, key=lambda item : len(item), reverse=sort_reverse)
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
          if target['text']  not in self.not_allowed_text_list:
            cluster_links.append({
              'source': cluster.index(node),
              'source_': node['id'],
              'target': cluster.index(target),
              'target_': target['id']
            })
      clusters_graph.append({'nodes': cluster_nodes, 'links': cluster_links})
    return clusters_graph 

  def add_id_to_translations_in_entries(self, lang):
    """ Add ids to every different translations of entries

    Args: 
      lang (str): language code (de, en, ...)
    """
    num = 0
    elems = self.root.findall('.//tei:div[@type="entries"]/tei:entry//tei:sense/tei:cit[@xml:lang="%s"]' % (lang), self.ns)
    text_dict = {}
    text_dict_key_id = {}
    for elem in elems:
      quote_text = elem.find('./tei:quote', self.ns).text
      if quote_text == None:
        quote_text = ''
      if quote_text not in text_dict.keys():
        num += 1
        elem_id = lang + '_' + str(num)
        text_dict[quote_text] = elem_id
      else:
        elem_id = text_dict[quote_text]
      elem.set(self.xml_id_key, elem_id)
    for key in text_dict:
      text_dict_key_id[text_dict[key]] = key
    self.text_id_lang_dict[lang] = text_dict_key_id

  def add_id_to_gram_type_in_entries(self, gram_type):
    """ Add ids to gram with given type

    Args: 
      gram_type (str): type of gram
    """
    num = 0
    elems = self.root.findall('.//tei:div[@type="entries"]/tei:entry//tei:gramGrp/tei:gram[@type="%s"]' % (gram_type), self.ns)
    text_dict = {}
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
      elem.set(self.xml_id_key, elem_id)

  def transform_data_in_clusters(self, lang, sibling_langs):
    """ Add ids to gram with given type

    Args: 
      lang (str): language code
      sibling_langs (list): list of sibling languages' codes
    
    Returns:
      res_dict, res_list, clusters_graph_info
    """
    entry_elems = self.root.findall('.//tei:div[@type="entries"]/tei:entry', self.ns)
    entry_dict = {}
    res_dict = {}
    res_list = []
    text_dict = self.text_id_lang_dict[lang]
    for entry in entry_elems:
      entry_id = entry.attrib[self.xml_id_key]
      lemma_form = entry.find('./tei:form[@type="lemma"]/tei:orth', self.ns)
      multiwordunit_form = entry.find('./tei:form[@type="multiWordUnit"]/tei:orth', self.ns)
      lemma_form_text = None if lemma_form == None else lemma_form.text
      multiwordunit_form_text = None if multiwordunit_form == None else multiwordunit_form.text
      entry_text = None if lemma_form_text == None else lemma_form_text
      entry_text = multiwordunit_form_text if entry_text == None else entry_text
      entry_dict[entry_id] = entry_text
      trans_elems = entry.findall('.//tei:sense/tei:cit[@xml:lang="%s"]' % (lang), self.ns)
      for trans in trans_elems:
        # find ids of siblings
        sibling_elems = []
        sibling_ids = []
        trans_parent = self.parentmap[trans]
        for sl in sibling_langs:
          sibling_elems += trans_parent.findall('./tei:cit[@xml:lang="%s"]' % (sl), self.ns)
        for se in sibling_elems:
          sibling_ids.append(se.attrib[self.xml_id_key])
        # trans_type = trans.attrib['type']
        # find id of trans cit
        trans_id = trans.attrib[self.xml_id_key]
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
        'group': self.group_lang_map['ar'],
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
        'group': self.group_lang_map[lang]
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

    # find clusters
    clusters = []
    for node in nodes:
      if node['in_cluster'] == False and node['text'] not in self.not_allowed_text_list:
        clusters.append(self.build_cluster([], node))

    clusters_graph_info = self.build_cluster_graph_info(clusters, sort=True, sort_reverse=False)

    return res_dict, res_list, clusters_graph_info

  def add_gram_type_in_cluster(self, clusters, gram_type):
    """ add gram type as nodes in clusters

    Args:
      clusters (list): list of clusters for building the graph info
      gram_type (str): type of gram
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
    entry_elems = self.root.findall('.//tei:div[@type="entries"]/tei:entry', self.ns)
    for entry in entry_elems:
      entry_id = entry.attrib[self.xml_id_key]
      # check if entry in node list
      if entry_id not in node_dict.keys():
        continue
      # check if entry has the given gram type
      gram_root_elems = entry.findall('./tei:gramGrp/tei:gram[@type="%s"]' % (gram_type), self.ns)
      if gram_root_elems == None or len(gram_root_elems) <= 0:
        continue
      for gr_elem in gram_root_elems:
        gr_text = '' if gr_elem.text == None else gr_elem.text
        gr_id = gr_elem.attrib[self.xml_id_key]
        temp_gram_type_node = {
        'id': gr_id,
        'text': gr_text,
        'target': [],
        'in_cluster': False,
        'group': self.group_lang_map['gram_' + gram_type]
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
      if node['in_cluster'] == False and node['text'] not in self.not_allowed_text_list:
        new_clusters.append(self.build_cluster([], node))

    clusters_graph_info = self.build_cluster_graph_info(new_clusters, sort=True, sort_reverse=False)
    return clusters_graph_info

