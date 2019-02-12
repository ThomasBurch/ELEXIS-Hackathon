import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import { MatSelectionList, MatTabChangeEvent, MatRadioChange } from '@angular/material';

import { OnInit } from '@angular/core';
import * as d3 from 'd3';

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
  
  @ViewChild('canvas') 
  canvas: ElementRef;
  
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
  allData: any = {};

  data: any = {};

  clusterGraph: any[];
  clusterGraphFiltered: any[];
  selectedLang = 'de';
  minNodesDefault = 6;
  maxNodesDefault = 500;
  minNodes = 6;
  maxNodes = 500;
  clusterFilterInput: string = '>' + (this.minNodes - 1);


  simulation: any;
  simulationStopped = false;
  dataLayout: any;
  nodeColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
  zoom: any;
  svg: any;
  ticked: any;
  tickCount = 0;
  zoomFactor = 1;
  zoomStep = 0.2;
  nodeCharge = -1000;
  linkDistance = 5;
  nodeChargeStep = 500;
  linkDistanceStep = 0.2;

  constructor() {
    this.allData[this.gramRootRadioText[0]] = this.withoutGramRootData;
    this.allData[this.gramRootRadioText[1]] = this.withGramRootData;
  }

  ngOnInit() {
    (<any> this.selectedClusters).selectedOptions._multiple = false;
  }

  ngAfterContentInit() {
    this.selectClusterLang('de', true);
  }

  filterChange() {
    const filter = this.clusterFilterInput;
    if (/^[0-9]+$/g.test(filter)) {
      const num = parseInt(filter, 10);
      this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, num, num, '');
    } else if (filter === '') {
      this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, this.minNodes, this.maxNodes, '');
    } else {
      if (filter.indexOf('>') === 0) {
        const p = filter.replace(/^>/, '').trim();
        const num = parseInt(p, 10);
        if (!isNaN(num)) {
          const fnum = num > this.minNodes ? num : this.minNodes;
          this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, fnum, this.maxNodes, '');
        }
      } else if (filter.indexOf('<') === 0) {
        const p = filter.replace(/^</, '').trim();
        const num = parseInt(p, 10);
        if (!isNaN(num)) {
          const fnum = num < this.minNodes ? num : this.minNodes;
          this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, this.minNodes, fnum, '');
        }
      }  else {
        this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, this.minNodes, this.maxNodes, filter);
      }
    }
  }

  filterClusters(cg: any[], min: number, max: number, text: string) {
    this.removeGraph();
    let filtered = cg;
    if (text !== '') {
      filtered = filtered.filter((c: any) => {
        for (const n of c.nodes) {
          if (n.text.indexOf(text) > -1) {
            return true;
          }
        }
        return false;
      });
    } else {
      filtered = this.clusterGraph;
    }
    filtered = filtered.filter((c: any) => c.nodes.length >= min && c.nodes.length <= max);
    for (const cluster of filtered) {
      cluster.selected = false;
    }
    return filtered;
  }

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
    this.clusterGraphFiltered = this.filterClusters(this.clusterGraph, this.minNodes, this.maxNodes, '');
    if (this.clusterGraphFiltered && this.clusterGraphFiltered.length > 0) {
      this.clusterGraphFiltered[0].selected = true;
    }
    // this.clusterGraphFiltered[this.clusterGraphFiltered.length - 1].selected = true;
    if (redraw) {
      this.showCluster();
    }
  }

  gramRootChange(event: MatRadioChange) {
    this.gramRootRadioSwitcher = event.value;
    this.selectClusterLang(this.selectedLang, true);
  }

  langTabChange(event: MatTabChangeEvent) {
    this.selectClusterLang(event.tab.textLabel.replace(/ar-/, ''), true);
  }

  maxNodesChange(event) {
    const text = event.target.value;
    if (/^[0-9]+$/.test(text)) {
      this.maxNodes = parseInt(text, 10);
      this.filterChange();
    }
  }

  minNodesChange(event) {
    const text = event.target.value;
    if (/^[0-9]+$/.test(text)) {
      this.minNodes = parseInt(text, 10);
      this.filterChange();
    }
  }

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

  removeGraph() {
    if (this.svg) {
      this.simulation.stop();
      this.svg.remove();
    }
  }

  showCluster() {
    this.removeGraph();
    const selectedClusters = this.clusterGraphFiltered.filter(c => c.selected);
    if (selectedClusters.length === 0) {
      return;
    }
    const cluster = selectedClusters[0];
    this.data.nodes = cluster.nodes;
    this.data.links = cluster.links;
    const data = this.data;
    // console.log(data);

    const width = this.canvas.nativeElement.clientWidth;
    const height = this.canvas.nativeElement.clientHeight;
    // const color = d3.scaleOrdinal(d3.schemeCategory10);

    const focusOpacity = 1;
    const normalOpacity = 1;
    const fadeOpacity = 0.1;

    const dataLayout = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(this.nodeCharge))
      .force('link', d3.forceLink(data.links).distance(3).strength(1));
    
    const graphLayout = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(this.nodeCharge))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(1))
      .force('y', d3.forceY(height / 2).strength(1))
      .force('link', d3.forceLink(data.links).id((d: any) => d.id ).distance(this.linkDistance).strength(1))
      ;
    this.simulation = graphLayout;
    
    const neighborsList = [];

    data.links.forEach((d) => {
      neighborsList[d.source.index + '-' + d.target.index] = true;
      neighborsList[d.target.index + '-' + d.source.index] = true;
    });
    
    const checkNeighor = (a, b) => {
      return a === b || neighborsList[a + '-' + b];
    };
    const fixna = (x) => {
      if (isFinite(x)) {
        return x;
      }
      return 0;
    };

    const onlyShowNeighborsAndSelf = (d) => {
      const tempIndex = d.index;
      nodeGroup.style('cursor', (o: any) => {
        return tempIndex === o.index ? 'pointer' : 'default';
      });
      nodeGroup.style('opacity', (o: any) => {
        return checkNeighor(tempIndex, o.index) ? focusOpacity : normalOpacity;
      });
      nodeGroup.attr('r', (o: any) => {
        return checkNeighor(tempIndex, o.index) ? 10 : 7;
      });
      labelGroup.style('opacity', (o: any) => {
        return checkNeighor(tempIndex, o.index) ? focusOpacity : fadeOpacity;
      });
      labelGroup.style('font-weight', (o: any) => {
        return checkNeighor(tempIndex, o.index) ? '700' : 'normal';
      });
      labelGroup.style('font-size', (o: any) => {
        return checkNeighor(tempIndex, o.index) ? 14 : 12;
      });
      // label.attr('display', (o: any) => {
      //   return checkNeighor(tempIndex, o.index) ? 'block' : 'none';
      // });
      linkGroup.style('opacity', (o: any) => {
        return o.source.index === tempIndex || o.target.index === tempIndex ? focusOpacity : normalOpacity;
      });
    };
    const showAll = () => {
      // label.attr('display', 'block');
      // label.attr('display', 'none');
      nodeGroup.style('opacity', normalOpacity);
      nodeGroup.attr('r', 7);
      labelGroup.style('opacity', normalOpacity);
      labelGroup.style('font-size', 12);
      labelGroup.style('font-weight', 'normal');
      linkGroup.style('opacity', normalOpacity);
    };

    const focus = (d) => {
      onlyShowNeighborsAndSelf(d);
    };
    
    const unfocus = () => {
      showAll();
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
        // if (!this.simulationStopped) {
        graphLayout.alpha(0.3);
        graphLayout.alphaTarget(0).restart();
        // } 
      }
    };
    
    const dragging = (d) => {
      d.fx = d.x + d3.event.dx;
      d.fy = d.y + d3.event.dy;
      // setNodeFixPosition(d);
      onlyShowNeighborsAndSelf(d);
    };
    
    const dragended = (d) => {
      showAll();
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
      // if (this.tickCount > 250) {
      //   this.simulation.stop();
      // }
      nodeGroup.call(updateNode);
      linkGroup.call(updateLink);
      labelGroup.call(updateLable);
    
    };
    this.ticked = ticked;
    
    const svg = d3.select('#canvas').append('svg').attr('width', width).attr('height', height);
    const container = svg.append('g');
    this.svg = svg;
    svg.call(
      this.zoom = d3.zoom()
        .scaleExtent([.1, 4])
        .on('zoom', () => { container.attr('transform', d3.event.transform); })
    );
    
    const linkGroup = container.append('g').attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .style('opacity', normalOpacity)
      .attr('stroke', '#aaa')
      .attr('stroke-width', '1px');
    
    const nodeGroup = container.append('g').attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('id', (d: any) => d.id)
      .attr('r', 7)
      .style('opacity', normalOpacity)
      .attr('fill', (d: any) => this.nodeColors[d.group]);
    
    nodeGroup.on('mouseover', focus).on('mouseout', unfocus);
    
    nodeGroup.call(
      d3.drag()
        .on('start', dragstarted)
        .on('drag', dragging)
        .on('end', dragended)
    );
    
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
      .style('opacity', normalOpacity)
      // .attr('display', 'none')
      .style('pointer-events', 'none');
    
    nodeGroup.on('mouseover', focus).on('mouseout', unfocus);
    
    graphLayout.on('tick', ticked);
  }

  stopSimulation() {
    this.simulation.stop();
    this.simulationStopped = true;
  }

  startSimulation() {
    this.simulation.force('charge', d3.forceManyBody().strength(this.nodeCharge))
    .force('link', d3.forceLink(this.data.links).id((d: any) => d.id ).distance(this.linkDistance).strength(1));
    this.simulation.alpha(0.3);
    this.simulation.alphaTarget(0).restart();
    this.simulationStopped = false;
  }

  ease() {
    this.nodeCharge -= this.nodeChargeStep;
    this.linkDistance += this.linkDistanceStep;
    console.log(this.nodeCharge, this.linkDistance);
    this.startSimulation();
  }

  tense() {
    if (this.nodeCharge >= 0) {
      this.nodeCharge = -500;
      return;
    }
    this.nodeCharge += this.nodeChargeStep;
    this.linkDistance -= this.linkDistanceStep;
    console.log(this.nodeCharge, this.linkDistance);
    this.startSimulation();
  }

  zoomIn() {
    this.zoomFactor += this.zoomStep;
    this.zoomFactor = this.zoomFactor > 4 ? 4 : this.zoomFactor;
    this.zoom.scaleTo(this.svg, this.zoomFactor);
  }

  zoomOut() {
    this.zoomFactor -= this.zoomStep;
    this.zoomFactor = this.zoomFactor < 0.2 ? 0.2 : this.zoomFactor;
    this.zoom.scaleTo(this.svg, this.zoomFactor);
  }

}
