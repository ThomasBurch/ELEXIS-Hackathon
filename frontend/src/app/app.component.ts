import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import { MatSelectionList } from '@angular/material';

import { OnInit } from '@angular/core';
import * as d3 from 'd3';

declare const require: any;
// const deList = require('../../../data/de_list.json');
// const enList = require('../../../data/en_list.json');
// const frList = require('../../../data/fr_list.json');
const deGraphInfo = require('../../../data/de_graph.json');
const deClusterGraphInfo = require('../../../data/de_cluster_graph.json');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentInit, OnInit {
  
  @ViewChild('canvas') 
  canvas: ElementRef;

  data: any = {};

  clusterGraph: any[] = deClusterGraphInfo;
  
  @ViewChild('selectedClusters') 
  selectedClusters: MatSelectionList;

  simulation: any;
  dataLayout: any;
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
    this.clusterGraph = this.clusterGraph.filter((c) => c.nodes && c.nodes.length > 5);
    for (const cluster of this.clusterGraph) {
      cluster.selected = false;
    }
    this.clusterGraph[0].selected = true;
  }

  ngOnInit() {
    (<any> this.selectedClusters).selectedOptions._multiple = false;
  }

  selectCluster(event: MouseEvent, cluster) {
    for (const c of this.clusterGraph) {
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

  showCluster() {
    if (this.svg) {
      this.svg.remove();
    }
    const selectedClusters = this.clusterGraph.filter(c => c.selected);
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
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const focusOpacity = 1;
    const normalOpacity = 0.6;
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
    
    const neigh = (a, b) => {
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
      node.style('cursor', (o: any) => {
        return tempIndex === o.index ? 'pointer' : 'default';
      });
      node.style('opacity', (o: any) => {
        return neigh(tempIndex, o.index) ? focusOpacity : normalOpacity;
      });
      node.attr('r', (o: any) => {
        return neigh(tempIndex, o.index) ? 10 : 7;
      });
      label.style('opacity', (o: any) => {
        return neigh(tempIndex, o.index) ? focusOpacity : fadeOpacity;
      });
      label.style('font-weight', (o: any) => {
        return neigh(tempIndex, o.index) ? '700' : 'normal';
      });
      label.style('font-size', (o: any) => {
        return neigh(tempIndex, o.index) ? 14 : 12;
      });
      // label.attr('display', (o: any) => {
      //   return neigh(tempIndex, o.index) ? 'block' : 'none';
      // });
      link.style('opacity', (o: any) => {
        return o.source.index === tempIndex || o.target.index === tempIndex ? focusOpacity : normalOpacity;
      });
    };
    const showAll = () => {
      // label.attr('display', 'block');
      // label.attr('display', 'none');
      node.style('opacity', normalOpacity);
      node.attr('r', 7);
      label.style('opacity', normalOpacity);
      label.style('font-size', 12);
      label.style('font-weight', 'normal');
      link.style('opacity', normalOpacity);
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
        graphLayout.alpha(0.3);
        graphLayout.alphaTarget(0).restart();
      }
    };
    
    const dragged = (d) => {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
      onlyShowNeighborsAndSelf(d);
    };
    
    const dragended = (d) => {};
    
    const ticked = () => {
      this.tickCount++;
      // if (this.tickCount > 250) {
      //   this.simulation.stop();
      // }
      node.call(updateNode);
      link.call(updateLink);
      label.call(updateLable);
    
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
    
    const link = container.append('g').attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .style('opacity', normalOpacity)
      .attr('stroke', '#aaa')
      .attr('stroke-width', '1px');
    
    const node = container.append('g').attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', 7)
      .style('opacity', normalOpacity)
      .attr('fill', (d: any) => color(d.group + ''));
    
    node.on('mouseover', focus).on('mouseout', unfocus);
    
    node.call(
      d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
    );
    
    const label = container.append('g').attr('class', 'labels')
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
    
    node.on('mouseover', focus).on('mouseout', unfocus);
    
    graphLayout.on('tick', ticked);
  }

  ngAfterContentInit() {
    this.showCluster();
  }

  stopSimulation() {
    this.simulation.stop();
  }

  startSimulation() {
    this.simulation.force('charge', d3.forceManyBody().strength(this.nodeCharge))
    .force('link', d3.forceLink(this.data.links).id((d: any) => d.id ).distance(this.linkDistance).strength(1));
    this.simulation.alpha(0.3);
    this.simulation.alphaTarget(0).restart();
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
