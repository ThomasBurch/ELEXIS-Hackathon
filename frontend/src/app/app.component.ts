import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import { MatSelectionList, MatTabChangeEvent, MatRadioChange } from '@angular/material';

import { OnInit } from '@angular/core';
import * as d3 from 'd3';

// read data in the app; the data are automatically uglified and compressed in the release version
declare const require: any;
const deClusterGraphInfo = require('../../../data/de_cluster_graph.json');
const enClusterGraphInfo = require('../../../data/en_cluster_graph.json');
const frClusterGraphInfo = require('../../../data/fr_cluster_graph.json');
const allLangsClusterGraphInfo = require('../../../data/all_langs_cluster_graph.json');
const deRootClusterGraphInfo = require('../../../data/de_gram_root_cluster_graph.json');
const enRootClusterGraphInfo = require('../../../data/en_gram_root_cluster_graph.json');
const frRootClusterGraphInfo = require('../../../data/fr_gram_root_cluster_graph.json');
const allLangsRootClusterGraphInfo = require('../../../data/all_langs_gram_root_cluster_graph.json');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentInit, OnInit {
  

  /**
   * div container for drawing graph
   *
   * @type {ElementRef}
   * @memberof AppComponent
   */
  @ViewChild('canvas') 
  canvas: ElementRef;
  
  /**
   * list elements of clusters selected by language
   *
   * @type {MatSelectionList}
   * @memberof AppComponent
   */
  @ViewChild('selectedClusters') 
  selectedClusters: MatSelectionList;

  gramRootRadioText = [
    'without gram "root"',
    'with gram "root"',
  ];
  gramRootRadioSwitcher = this.gramRootRadioText[0];
  withoutGramRootData = [deClusterGraphInfo, enClusterGraphInfo, frClusterGraphInfo, allLangsClusterGraphInfo];
  withGramRootData = [deRootClusterGraphInfo, enRootClusterGraphInfo, frRootClusterGraphInfo, 
    allLangsRootClusterGraphInfo
  ];

  /**
   * for storing all imported json data
   *
   * @type {*}
   * @memberof AppComponent
   */
  allData: any = {};

  /**
   * for storing nodes and edges info of showed graph
   *
   * @type {*}
   * @memberof AppComponent
   */
  data: any = {};
  
  groupLangsMap = {
    0: 'ar',
    1: 'de',
    2: 'en',
    3: 'fr',
    4: 'ar-root',
  };

  lemmaList: any[] = [];

  clusterGraph: any[];
  clusterGraphFiltered: any[];
  selectedLang = this.groupLangsMap[1];
  minNodesReal = 1;
  maxNodesReal = 9999;
  minNodes = 20;
  maxNodes = 500;
  clusterFilterInput = ' ';
  nodeTextFilterInput = ' ';

  simulationStopped = false;
  graphElems: {
    zoom: any;
    svg: any;
    container: any;
    simulation: any;
    dataLayout: any;
    nodeGroup: any;
    labelGroup: any;
    linkGroup: any;
    neighborsList: any[];
  } = {
    zoom: null,
    svg: null,
    container: null,
    simulation: null,
    dataLayout: null,
    nodeGroup: null,
    labelGroup: null,
    linkGroup: null,
    neighborsList: []
  };
  ticked: any;
  tickCount = 0;
  graphSettings = {
    zoomFactor: 1,
    zoomStep: 0.2,
    nodeCharge: -1000,
    linkDistance: 5,
    nodeChargeStep: 500,
    linkDistanceStep: 0.2,

    focusOpacity: 1,
    normalOpacity: 1,
    fadeOpacity: 0.1,
  };

  /**
   * create an instance of AppComponent
   * 
   * @memberof AppComponent
   */
  constructor() {
    this.allData[this.gramRootRadioText[0]] = this.withoutGramRootData;
    this.allData[this.gramRootRadioText[1]] = this.withGramRootData;
  }

  /**
   * ng life cicle hook for init view elements
   *
   * @memberof AppComponent
   */
  ngOnInit() {
    (<any> this.selectedClusters).selectedOptions._multiple = false;
  }

  /**
   * ng life cicle hook after content init
   *
   * @memberof AppComponent
   */
  ngAfterContentInit() {
    this.selectClusterLang(this.groupLangsMap[1], true);
  }

  /**
   * get language short name by group number
   * 
   * @param group number of group
   * @returns {string} language short name
   */
  getLangsByGroup(group: number): string {
    return this.groupLangsMap[group];
  }

  /**
   * handle mouseover event on a list item of lemmas or translation texts
   *
   * @param {*} lemmaItem
   * @memberof AppComponent
   */
  mouseoverLemmaItem(lemmaItem) {
    this.onlyShowNeighborsAndSelf(lemmaItem.node);
  }

  /**
   * handle mouseout event on a list item of lemmas or translation texts
   *
   * @memberof AppComponent
   */
  mouseoutLemmaItem() {
    this.showAllNodes();
  }

  /**
   * get class name of circle before lammas or translation texts
   *
   * @param {*} lemmaItem
   * @returns
   * @memberof AppComponent
   */
  getLemmaCircleSpecClass(lemmaItem) {
    const lang = this.getLangsByGroup(lemmaItem.node.group);
    return 'circle circle-' + lang;
  }

  /**
   * handle event of filter input above lemma list 
   *
   * @memberof AppComponent
   */
  nodeTextFilterChange() {
    const filter = this.nodeTextFilterInput.trim();
    for (const l of this.lemmaList) {
      if (l.node.text.indexOf(filter) > -1) {
        l.showed = true;
      } else {
        l.showed = false;
      }
    }
  }

  /**
   * handle event of filter input above cluster list
   *
   * @memberof AppComponent
   */
  clusterFilterChange() {
    const filter = this.clusterFilterInput.trim();
    this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, filter);
  }

  /**
   * filter clusters in cluster list according to given text
   *
   * @param {any[]} cg
   * @param {string} text
   * @returns
   * @memberof AppComponent
   */
  filterClusters(cg: any[], text: string) {
    this.removeGraph();
    let filtered = cg;
    let minNodesReal = 999999;
    let maxNodesReal = 1;
    filtered.forEach(cluster => {
      maxNodesReal = maxNodesReal > cluster.nodes.length ? maxNodesReal : cluster.nodes.length;      
      minNodesReal = minNodesReal < cluster.nodes.length || cluster.nodes.length === 0 ? minNodesReal : cluster.nodes.length;
    });
    this.minNodesReal = minNodesReal;
    this.maxNodesReal = maxNodesReal;
    this.maxNodes = this.maxNodes > this.maxNodesReal ? this.maxNodesReal : this.maxNodes;
    this.minNodes = this.minNodes < this.minNodesReal ? this.minNodesReal : this.minNodes;
    let min = this.minNodes;
    let max = this.maxNodes;
    if (text !== '') {
      if (/^[0-9]+$/g.test(text)) {
        const num = parseInt(text, 10);
        min = num;
        max = num;
      } else {
        filtered = filtered.filter((c: any) => {
          for (const n of c.nodes) {
            if (n.text.indexOf(text) > -1) {
              return true;
            }
          }
          return false;
        });
      }
    } else {
      filtered = this.clusterGraph;
    }
    filtered = filtered.filter((c: any) => c.nodes.length >= min && c.nodes.length <= max);
    for (const cluster of filtered) {
      cluster.selected = false;
    }
    return filtered;
  }

  /**
   * change list of clusters according to the given language
   *
   * @param {string} lang language short name
   * @param {boolean} redraw indicate if graph should be redrawed after selecting new clusters
   * @memberof AppComponent
   */
  selectClusterLang(lang: string, redraw: boolean) {

    this.selectedLang = lang;
    const rootSelectedData = this.allData[this.gramRootRadioSwitcher];
    if (lang === 'de') {
      this.clusterGraph = rootSelectedData[0];
    } else if (lang === 'en') {
      this.clusterGraph = rootSelectedData[1];
    } else if (lang === 'fr') {
      this.clusterGraph = rootSelectedData[2];
    } else if (lang === 'all-langs') {
      this.clusterGraph = rootSelectedData[3];
    }
    this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, this.clusterFilterInput);
    if (this.clusterGraphFiltered && this.clusterGraphFiltered.length > 0) {
      this.clusterGraphFiltered[0].selected = true;
      // this.clusterGraphFiltered[this.clusterGraphFiltered.length - 1].selected = true;
    }
    if (redraw) {
      this.showCluster();
    }
  }

  /**
   * handle event of radio button for showing gram "root" information in clusters
   *
   * @param {MatRadioChange} event
   * @memberof AppComponent
   */
  gramRootChange(event: MatRadioChange) {
    this.gramRootRadioSwitcher = event.value;
    this.selectClusterLang(this.selectedLang, true);
  }

  /**
   * handle event of changing clusters of different languages
   *
   * @param {MatTabChangeEvent} event
   * @memberof AppComponent
   */
  langTabChange(event: MatTabChangeEvent) {
    this.selectClusterLang(event.tab.textLabel.replace(/ar-/, ''), true);
  }

  /**
   * handle event of changing input of limiting max nodes
   *
   * @param {*} event
   * @memberof AppComponent
   */
  maxNodesChange(event) {
    const text = event.target.value;
    if (/^[0-9]+$/.test(text)) {
      this.maxNodes = parseInt(text, 10);
      this.clusterFilterChange();
    }
  }

  /**
   * handle event of changing input of limiting min nodes
   *
   * @param {*} event
   * @memberof AppComponent
   */
  minNodesChange(event) {
    const text = event.target.value;
    if (/^[0-9]+$/.test(text)) {
      this.minNodes = parseInt(text, 10);
      this.clusterFilterChange();
    }
  }

  /**
   * handle event of selecting a cluster from cluster list
   *
   * @param {MouseEvent} event
   * @param {*} cluster
   * @memberof AppComponent
   */
  selectCluster(event: MouseEvent, cluster) {
    for (const c of this.clusterGraphFiltered) {
      if (c !== cluster) {
        c.selected = false;
      }
    }
    if (cluster.selected) {
      cluster.selected = false;
    } else {
      cluster.selected = true;
    }
    this.showCluster();
  }

  /**
   * remove graph from panel 
   *
   * @memberof AppComponent
   */
  removeGraph() {
    if (this.graphElems.svg) {
      this.graphElems.simulation.stop();
      this.graphElems.svg.remove();
      this.graphSettings.zoomFactor = 1;
    }
  }

  /**
   * create list of lemma and translation texts
   *
   * @param {*} nodes
   * @memberof AppComponent
   */
  createLemmaList(nodes) {
    const list = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      list.push({
        node: n,
        index: i,
        showed: true,
      });
    }
    this.lemmaList = list.sort((a, b) => {
      if (a.node.group > b.node.group) {
        return 1;
      } else if (a.node.group < b.node.group) {
        return -1;
      } else {
        if (a.node.text > b.node.text) {
          return 1;
        } else if (a.node.text < b.node.text) {
          return -1;
        } else {
          return 0;
        }
      }
    });
  }

  /**
   * highlight seleted node and its neighbor nodes 
   *
   * @param {*} d
   * @memberof AppComponent
   */
  onlyShowNeighborsAndSelf(d) {
    const tempIndex = d.index;
    this.graphElems.nodeGroup.style('cursor', (o: any) => {
      return tempIndex === o.index ? 'pointer' : 'default';
    });
    this.graphElems.nodeGroup.style('opacity', (o: any) => {
      return this.checkNeighbour(tempIndex, o.index) ? this.graphSettings.focusOpacity : this.graphSettings.normalOpacity;
    });
    this.graphElems.nodeGroup.attr('r', (o: any) => {
      return this.checkNeighbour(tempIndex, o.index) ? 10 : 7;
    });
    this.graphElems.labelGroup.style('opacity', (o: any) => {
      return this.checkNeighbour(tempIndex, o.index) ? this.graphSettings.focusOpacity : this.graphSettings.fadeOpacity;
    });
    this.graphElems.labelGroup.style('font-weight', (o: any) => {
      return this.checkNeighbour(tempIndex, o.index) ? '700' : 'normal';
    });
    this.graphElems.labelGroup.style('font-size', (o: any) => {
      return this.checkNeighbour(tempIndex, o.index) ? 14 : 12;
    });
    this.graphElems.linkGroup.style('opacity', (o: any) => {
      return o.source.index === tempIndex || o.target.index === tempIndex ? 
        this.graphSettings.focusOpacity : this.graphSettings.normalOpacity;
    });
  }

  /**
   * show all nodes normally
   *
   * @memberof AppComponent
   */
  showAllNodes() {
    this.graphElems.nodeGroup.style('opacity', this.graphSettings.normalOpacity);
    this.graphElems.nodeGroup.attr('r', 7);
    this.graphElems.labelGroup.style('opacity', this.graphSettings.normalOpacity);
    this.graphElems.labelGroup.style('font-size', 12);
    this.graphElems.labelGroup.style('font-weight', 'normal');
    this.graphElems.linkGroup.style('opacity', this.graphSettings.normalOpacity);
  }

  /**
   * check if given index of nodes are neighbors
   *
   * @param {number} index1
   * @param {number} index2
   * @returns
   * @memberof AppComponent
   */
  checkNeighbour(index1: number, index2: number) {
    return index1 === index2 || this.graphElems.neighborsList[index1 + '-' + index2];
  }

  /**
   * create graph of selected cluster
   *
   * @returns
   * @memberof AppComponent
   */
  showCluster() {
    this.removeGraph();
    const selectedClusters = this.clusterGraphFiltered.filter(c => c.selected);
    if (selectedClusters.length === 0) {
      return;
    }
    const cluster = selectedClusters[0];
    this.data.nodes = cluster.nodes;
    this.createLemmaList(this.data.nodes);
    this.data.links = cluster.links;
    const data = this.data;

    const width = this.canvas.nativeElement.clientWidth;
    const height = this.canvas.nativeElement.clientHeight;

    const dataLayout = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(this.graphSettings.nodeCharge))
      .force('link', d3.forceLink(data.links).distance(3).strength(1));
    
    const graphLayout = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(this.graphSettings.nodeCharge))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(1))
      .force('y', d3.forceY(height / 2).strength(1))
      .force('link', d3.forceLink(data.links).id((d: any) => d.id ).distance(this.graphSettings.linkDistance).strength(1))
      ;
    this.graphElems.simulation = graphLayout;
    
    const neighborsList = [];
    this.graphElems.neighborsList = neighborsList;

    data.links.forEach((d) => {
      neighborsList[d.source.index + '-' + d.target.index] = true;
      neighborsList[d.target.index + '-' + d.source.index] = true;
    });

    const fixna = (x) => {
      if (isFinite(x)) {
        return x;
      }
      return 0;
    };

    const focus = (d) => {
      this.onlyShowNeighborsAndSelf(d);
    };
    
    const unfocus = () => {
      this.showAllNodes();
    };
    
    const updateLink = (ulink: any) => {
      ulink
        .attr('x1', (d) => fixna(d.source.x))
        .attr('y1', (d) => fixna(d.source.y))
        .attr('x2', (d) => fixna(d.target.x))
        .attr('y2', (d) => fixna(d.target.y));
    };
    
    const updateNode = (unode) => {
        unode.attr('transform', (d) => {
          return 'translate(' + fixna(d.x) + ',' + fixna(d.y) + ')';
        });
    };
    
    const updateLable = (unode) => {
        unode.attr('transform', (d) => {
          return 'translate(' + fixna(d.x - 6) + ',' + fixna(d.y - 8) + ')';
        });
    };
    
    const dragstarted = (d) => {
      d3.event.sourceEvent.stopPropagation();
      if (!d3.event.active) {
        graphLayout.alpha(0.3);
        graphLayout.alphaTarget(0).restart();
      }
    };
    
    const dragging = (d) => {
      d.fx = d.x + d3.event.dx;
      d.fy = d.y + d3.event.dy;
      // setNodeFixPosition(d);
      this.onlyShowNeighborsAndSelf(d);
    };
    
    const dragended = (d) => {
      this.showAllNodes();
    };
    
    const setNodeFixPosition = (d) => {
      d.x = d.fx;
      d.y = d.fy;
      const n = d3.select('#' + d.id);
      n.attr('transform', (nd: any) => {
        return 'translate(' + nd.x + ',' + nd.y + ')';
      });
    };

    const ticked = () => {
      this.tickCount++;
      nodeGroup.call(updateNode);
      linkGroup.call(updateLink);
      labelGroup.call(updateLable);
    
    };
    this.ticked = ticked;
    
    const svg = d3.select('#canvas').append('svg').attr('width', width).attr('height', height);
    const container = svg.append('g');
    this.graphElems.svg = svg;
    this.graphElems.container = container;
    svg.call(
      this.graphElems.zoom = d3.zoom()
        .scaleExtent([.1, 4])
        .on('zoom', () => { container.attr('transform', d3.event.transform); })
    );
    
    const linkGroup = container.append('g').attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .style('opacity', this.graphSettings.normalOpacity)
      .attr('stroke', '#aaa')
      .attr('stroke-width', '1px');
    this.graphElems.linkGroup = linkGroup;
    
    const nodeGroup = container.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('id', (d: any) => d.id)
      .attr('class', (d: any) => 'circle-' + this.groupLangsMap[d.group])
      .attr('r', 7)
      .style('opacity', this.graphSettings.normalOpacity);
    
    nodeGroup.on('mouseover', focus).on('mouseout', unfocus);
    
    nodeGroup.call(
      d3.drag()
        .on('start', dragstarted)
        .on('drag', dragging)
        .on('end', dragended)
    );
    this.graphElems.nodeGroup = nodeGroup;
    
    const labelGroup = container.append('g').attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      // .text((d: any, i) => d.id + '-' + d.text)
      .text((d: any, i) => d.text)
      .style('fill', '#666')
      .style('font-size', 12)
      .style('font-family', 'Sans')
      .style('font-weight', 'normal')
      .style('opacity', this.graphSettings.normalOpacity)
      // .attr('display', 'none')
      .style('pointer-events', 'none');
    this.graphElems.labelGroup = labelGroup;
    
    this.graphElems.labelGroup = labelGroup;
    
    graphLayout.on('tick', ticked);

    // draw legend on graph area
    let lineY = 15;
    const r = 7;
    const panelW = parseInt(svg.attr('width'), 10);
    // const legendPosX = panelW - 100;
    // const textPosX = panelW - 85;
    // const circlePosX = panelW - 45;
    const legendPosX = 0;
    const textPosX = 15;
    const circlePosX = 55;
    const getCirclePosY = (cr: number, y: number) => {
      return y - cr + 1;
    };
    const legend = svg.append('rect').attr('id', 'legend')
      .attr('width', 100).attr('height', 100)
      .style('fill', 'white')
      .attr('x', legendPosX)
      ;

    for (const key in this.groupLangsMap) {
      if (this.groupLangsMap[key]) {
        const lang = this.groupLangsMap[key];
        svg.append('text').text(lang + ': ')
        .attr('x', textPosX)
        .attr('y', lineY)
        ;
        const circle = svg.append('circle')
        .attr('r', r)
        .attr('cx', circlePosX)
        .attr('cy', getCirclePosY(r, lineY))
        .style('opacity', this.graphSettings.normalOpacity)
        .attr('class', 'circle-' + lang);
        if (lang === 'ar-root') {
          circle.attr('cx', circlePosX + 30);
        }

        lineY += 20;
      }
    }
  }


  /**
   * stop calculating and updating nodes' positions
   *
   * @memberof AppComponent
   */
  stopSimulation() {
    this.graphElems.simulation.stop();
    this.simulationStopped = true;
  }

  /**
   * stop calculating and updating nodes' positions
   *
   * @memberof AppComponent
   */
  startSimulation() {
    this.graphElems.simulation.force('charge', d3.forceManyBody().strength(this.graphSettings.nodeCharge))
    .force('link', d3.forceLink(this.data.links).id((d: any) => d.id ).distance(this.graphSettings.linkDistance).strength(1));
    this.graphElems.simulation.alpha(0.3);
    this.graphElems.simulation.alphaTarget(0).restart();
    this.simulationStopped = false;
  }

  /**
   * ease graph (longer deges)
   *
   * @memberof AppComponent
   */
  ease() {
    this.graphSettings.nodeCharge -= this.graphSettings.nodeChargeStep;
    this.graphSettings.linkDistance += this.graphSettings.linkDistanceStep;
    this.startSimulation();
  }

  /**
   * tense graph (shorter edges)
   *
   * @returns
   * @memberof AppComponent
   */
  tense() {
    if (this.graphSettings.nodeCharge >= 0) {
      this.graphSettings.nodeCharge = -500;
      return;
    }
    this.graphSettings.nodeCharge += this.graphSettings.nodeChargeStep;
    this.graphSettings.linkDistance -= this.graphSettings.linkDistanceStep;
    this.startSimulation();
  }

  /**
   * zoom into the graph (larger nodes and texts)
   *
   * @memberof AppComponent
   */
  zoomIn() {
    this.graphSettings.zoomFactor += this.graphSettings.zoomStep;
    this.graphSettings.zoomFactor = this.graphSettings.zoomFactor > 4 ? 4 : this.graphSettings.zoomFactor;
    this.graphElems.zoom.scaleTo(this.graphElems.svg, this.graphSettings.zoomFactor);
  }

  /**
   * zoom out of graph (smaller nodes and text)
   *
   * @memberof AppComponent
   */
  zoomOut() {
    this.graphSettings.zoomFactor -= this.graphSettings.zoomStep;
    this.graphSettings.zoomFactor = this.graphSettings.zoomFactor < 0.2 ? 0.2 : this.graphSettings.zoomFactor;
    this.graphElems.zoom.scaleTo(this.graphElems.svg, this.graphSettings.zoomFactor);
  }

}
