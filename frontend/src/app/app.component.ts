import { Component, AfterContentInit, ViewChild, ElementRef } from '@angular/core';

import { OnInit } from '@angular/core';
import * as d3 from 'd3';

declare const require: any;
const deList = require('../../../data/de_list.json');
const enList = require('../../../data/en_list.json');
const frList = require('../../../data/fr_list.json');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterContentInit {
  
  @ViewChild('canvas') 
  canvas: ElementRef;

  data: any = {};

  simulation: any;
  zoom: any;
  svg: any;
  ticked: any;
  tickCount = 0;

  ngAfterContentInit() {
    // create nodes and links
    const nodes = [];
    const links = [];
    const entryIdDict = {};
    const nodeDict = {};
    for (const list of [
      deList, 
      // enList, 
      // frList
    ]) {
      for (const n of deList) {
        const tempNode = {
          id: n.id,
          group: 1
        };
        nodes.push(tempNode);
        nodeDict[n.id] = nodes.indexOf(tempNode);
        for (const arabicEntry of n.entry_list) {
          links.push({
            source_: n.id,
            target_: arabicEntry.entry_id,
            value: arabicEntry.count
          });
          if (!entryIdDict[arabicEntry.entry_id]) {
            entryIdDict[arabicEntry.entry_id] = arabicEntry.entry_id;
          }
          // for (const siblingConn of arabicEntry.connetion_info) {
          //   for (const sibId of siblingConn.sibling_ids) {
          //     links.push({
          //       source: n.id,
          //       target: sibId,
          //       value: 1
          //     });
          //   }
          // }
        }
      }
    }
    for (const key in entryIdDict) {
      if (entryIdDict[key]) {
        const tempNode = {
          id: key,
          group: 0
        };
        nodes.push(tempNode);
        nodeDict[key] = nodes.indexOf(tempNode);
      }
    }
    for (const l of links) {
      l.source = nodeDict[l.source_];
      l.target = nodeDict[l.target_];
    }
    this.data.nodes = nodes;
    this.data.links = links;
    const data = this.data;
    console.log(data);

    const width = this.canvas.nativeElement.clientWidth;
    const height = this.canvas.nativeElement.clientHeight;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // d3.data(data).then((graph: any) => {
      
    const dataLayout = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(10))
      .force('link', d3.forceLink(data.links).distance(2).strength(2));
    
    const graphLayout = d3.forceSimulation(data.nodes)
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(1))
      .force('y', d3.forceY(height / 2).strength(1))
      .force('link', d3.forceLink(data.links).id((d: any) => d.id ).distance(2).strength(1))
      ;
    this.simulation = graphLayout;
    
    const adjlist = [];
    
    // graph.nodes.forEach((d, i) => {
    //   data.nodes.push({node: d});
    //   data.nodes.push({node: d});
    //   data.links.push({
    //     source: i * 2,
    //     target: i * 2 + 1
    //   });
    // });
    // graph.links.forEach((d) => {
    //   adjlist[d.source.index + '-' + d.target.index] = true;
    //   adjlist[d.target.index + '-' + d.source.index] = true;
    // });
    
    const neigh = (a, b) => {
      return a === b || adjlist[a + '-' + b];
    };
    const fixna = (x) => {
      if (isFinite(x)) {
        return x;
      }
      return 0;
    };
    
    const focus = (d) => {
        const indexObj = <any> (d3.select(d3.event.target).datum());
        const index = indexObj.index;
        node.style('opacity', (o: any) => {
          return neigh(index, o.index) ? 1 : 0.1;
        });
        dataNode.attr('display', (o: any) => {
          return neigh(index, o.index) ? 'block' : 'none';
        });
        link.style('opacity', (o: any) => {
          return o.source.index === index || o.target.index === index ? 1 : 0.1;
        });
    };
    
    const unfocus = () => {
      // dataNode.attr('display', 'block');
      dataNode.attr('display', 'none');
      node.style('opacity', 1);
      link.style('opacity', 1);
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
    
    const dragstarted = (d) => {
      d3.event.sourceEvent.stopPropagation();
      if (!d3.event.active) {
        graphLayout.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    };
    
    const dragged = (d) => {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    };
    
    const dragended = (d) => {
      if (!d3.event.active) {
        graphLayout.alphaTarget(0);
      }
      d.fx = null;
      d.fy = null;
    };
    
    const ticked = () => {
      this.tickCount++;
      node.call(updateNode);
      link.call(updateLink);
  
      // dataLayout.alphaTarget(0.3).restart();
      // dataNode.each(function(d: any, i) {
        // if (i % 2 === 0) {
        //   d.x = d.node.x;
        //   d.y = d.node.y;
        // } else {
        //   const b = this.getBBox();

        //   const diffX = d.x - d.node.x;
        //   const diffY = d.y - d.node.y;

        //   const dist = Math.sqrt(diffX * diffX + diffY * diffY);

        //   let shiftX = b.width * (diffX - dist) / (dist * 2);
        //   shiftX = Math.max(-b.width, Math.min(0, shiftX));
        //   const shiftY = 16;
        //   this.setAttribute('transform', 'translate(' + shiftX + ',' + shiftY + ')');
        // }
      // });
      dataNode.call(updateNode);
    
    };
    this.ticked = ticked;
    
    const svg = d3.select('#canvas').attr('width', width).attr('height', height);
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
      .attr('stroke', '#aaa')
      .attr('stroke-width', '1px');
    
    const node = container.append('g').attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', 2)
      .attr('fill', (d: any) => color(d.group));
    
    node.on('mouseover', focus).on('mouseout', unfocus);
    
    // node.call(
    //   d3.drag()
    //     .on('start', dragstarted)
    //     .on('drag', dragged)
    //     .on('end', dragended)
    // );
    
    const dataNode = container.append('g').attr('class', 'dataNodes')
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      .text((d: any, i) => d.id)
      .style('fill', '#555')
      .style('font-family', 'Arial')
      .style('font-size', 6)
      // .attr('display', 'none')
      .style('pointer-events', 'none'); // to prevent mouseover/drag capture
    
    node.on('mouseover', focus).on('mouseout', unfocus);
    
    // graphLayout.on('tick', ticked);

  }

  stopSimulation() {
    this.simulation.stop();
    console.log('ticked: ', this.tickCount);
  }

  startSimulation() {
    this.simulation.on('tick', this.ticked);
  }

  step() {
    this.simulation.tick();
  }

  zoomIn() {
    this.zoom.scale(2);
    this.zoom.event(this.svg);
  }

  zoomOut() {
    this.zoom.scale(0.5);
    this.zoom.event(this.svg);
  }

}
