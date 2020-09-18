//      graphs.js        	   Structure-Activity Report JavaScript
//
//	30-jun-2009 (ac) added show datapoints; (but disabled it)
//	11-jun-2009 (ac) made selector axes wider
//	17-apr-2009 (ac) capped the length of the activity list
//	31-mar-2009 (ac) minor textual clarification
//	16-feb-2008 (ac) added click explanation in popup
//	30-dec-2008 (ac) unassigned set skipped if all assigned
//  	01-dec-2008 (ac) created
//
// COPYRIGHT (C) 2008-2017 CHEMICAL COMPUTING GROUP ULC ("CCG").
// ALL RIGHTS RESERVED.
//
// ACCESS TO AND USE OF THIS SOFTWARE IS GOVERNED BY A SOFTWARE LICENSE
// AGREEMENT WITH CCG OR AN AUTHORIZED DISTRIBUTOR OF CCG.
//
// CCG DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE, INCLUDING
// ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS, AND IN NO EVENT
// SHALL CCG BE LIABLE FOR ANY SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES OR
// ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER
// IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT
// OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

// -------------------------------- Kick Start --------------------------------

var graph_loaded = false;
var graph_seltick = 0;
var graph_numprops; // number of properties
var graph_propname; // array with the name of each property
var graph_xaxis, graph_yaxis; // currently selected axes
var graph_posx, graph_posy; // cached positions for current set
var graph_dotcols; // an array of dot colors; 0=black
var graph_scaffdot; // dot number assignments per scaffold (index 0 is for
    	    	    // unassigned; values: -1=do not plot, 0=black, >0=color)
var graph_hasexplore; // true if the Explore tab is available

function graph_Activate()
{
    if (graph_loaded && graph_seltick == SelectionTick()) return null;
    graph_seltick = SelectionTick();
    graph_loaded = true;
    	
    	// Fetch data and initiate.

    graph_hasexplore = document.getElementById("div_explore") != null;

    graph_numprops = GetData("graph", "count");
    graph_propname = new Array();
    graph_xaxis = 1;
    graph_yaxis = 0;
    for (var n = 1; n <= graph_numprops; n++) {
    	graph_propname[n-1] = GetData("graph", "propname" + n);
	if (graph_yaxis == 0 && 
	    graph_propname[n-1].indexOf(" Efficiency")>=0) graph_yaxis = n;
	if (graph_propname[n-1] == 'log P') graph_xaxis = n;
    }
    if (graph_yaxis == 0) graph_yaxis = 1;
    
    graph_posx = GetDataSplit("graph", "posx" + graph_xaxis);
    graph_posy = GetDataSplit("graph", "posy" + graph_yaxis);
    
    graph_dotcols = GetDataSplit("graph", "dotcols");
    graph_scaffdot = new Array();
    for (var n = 0; n <= num_scaffolds; n++) {
    	graph_scaffdot.push(n % (graph_dotcols.length));
    }

    	// Build the page.
    
    var gbar = '<span id="graph_title">' + GraphBannerTitle() + '</span>';
    
    var html = ComposeSectionBar('graphsel', 'Graph Selector', true)
    	     + ComposeGraphSelector()
	     + '</div>'
	     + ComposeSectionBar('graph', gbar, true)
	     + ComposeScatterGraph()
	     + '</div>';
	     
    return html;
}

function graph_Deactivate()
{
    graph_seltick = SelectionTick();
}

// ---------------------------- Page Construction -----------------------------

// Returns suitable title banner text.

function GraphBannerTitle()
{
    return 'Graph of <u>' + graph_propname[graph_yaxis-1]
    	 + '</u> vs. <u>' + graph_propname[graph_xaxis-1] + '</u>';
}

// Returns selection widgets for picking graph content.

function ComposeGraphSelector()
{
    var html = '<p><table class="infodata">';
    
    	// Heading.
    
    html += '<tr><td class="ihdr">Y-axis</td>'
    	  + '<td class="ihdr">X-axis</td>'
	  + '<td class="ihdr">Series</td></tr>';

    	// Y-axis.
    
    var selsz = Math.min(20, Math.max(2, graph_numprops));
    html += '<tr><td class="inml" style="vertical-align: top;">'
    	  + '<select size="' + selsz + '"'
    	  + ' style="width: 20em;" onChange="graph_ChangeAxis(\'Y\',this)">';
    for (var n = 0; n < graph_numprops; n++) {
    	var isSel = (n+1 == graph_yaxis);
	html += '<option' + (isSel ? ' selected' : '')
	      + '>' + graph_propname[n] + '</option>';
    }
    html += '</select></td>';
	
    	// X-axis.	
	
    html += '<td class="inml" style="vertical-align: top;">'
    	  + '<select size="' + selsz + '"'
    	  + ' style="width: 20em;" onChange="graph_ChangeAxis(\'X\',this)">';
    for (var n = 0; n < graph_numprops; n++) {
    	var isSel = (n+1 == graph_xaxis);
	html += '<option' + (isSel ? ' selected' : '')
	      + '>' + graph_propname[n] + '</option>';
    }
    html += '</select></td>';
    
    	// Colors for series.
    
    html += '<td class="inml" style="vertical-align: top;">'
    	  + '<table class="infodata">';
	  
    for (var n = scaffold_unassigned ? 0 : 1; n <= num_scaffolds; n++) {
    	html += '<tr><td class="inml"'
	      + ' style="border-width: 0; text-align: center;">';
    	if (n == 0) {
	    html += '<i>None</i>';
	} else {
	    var attr = 'width="' + scaffold_size[n-1][2] + '" '
	    	     + 'height="' + scaffold_size[n-1][3] + '"';
	    html += LinkImageAttr('img/scaffold' + n + 'sm.png', attr);
	}
	html += '</td>';
	
	for (var i = -1; i < graph_dotcols.length; i++) {
	    var fn = 'img/graph_s' + (i < 0 ? 'X' : i)
	    	   + (graph_scaffdot[n] == i ? '_on' : '_off') + '.png';

    	    var attr = 'width="20" height="20"';
	    if (graph_scaffdot[n] != i) {
	    	attr += ' class="gphcol"'
		      + ' onClick="graph_PickSeries(' + n + ',' + i + ')"';
	    }
	    html += '<td>' + LinkImageAttr(fn, attr) + '</td>';
	}
	
	html += '</tr>';
    }
	  
    html += '</table></td></tr></table>';
    
    /* !!! DISABLED; not really all that useful
    html += '<p><div align="center">'
	  + '<input type="button" value="Show Datapoints"'
	  + ' onClick="graph_ShowPoints(false)"> '
	  + '<input type="button" value="Show Selected Datapoints"'
	  + ' onClick="graph_ShowPoints(true)">'
	  + '</div>';*/
    
    return html;
}

// Puts together the composite graph.

function ComposeScatterGraph()
{
    var DOT_CSZ = 4;

    var html = '<p><ul class="overlay" style="width: 560px; height: 530px;'
    	     + (bland ? ' background-color: #FFFFFF;' : '') + '">';
    
    	// Put a "main" overlay into the mix.
    
    var mouse = ' onClick="graph_Click(event)"'
    	      + ' onMouseOver="graph_Mouse(event,true)"'
	      + ' onMouseMove="graph_Mouse(event,true)"';

    var attr = 'class="olimg" id="graph_main"' 
	      + ' style="left: 60px; top: 0px; width: 500px; height: 500px;'
	      + ' background-color: ' + (bland ? '#FFFFFF' : '#E0E0E0') + ';"'
	      + mouse + ' onMouseOut="graph_Mouse(event,false)"';
    html += LinkImageAttr(StaticPrefix() + 'blank.gif', attr);
    
    attr = ' class="olimg" style="left: 0px; top: 0px;"';
    	 //+ ' width="40" height="500"';
    html += LinkImageAttr('img/graph_y' + graph_yaxis + '.png', attr);
    
    attr = ' class="olimg" style="left: 60px; top: 500px;"';
    	 //+ ' width="500" height="30"';
    html += LinkImageAttr('img/graph_x' + graph_xaxis + '.png', attr);

    for (var n = 1; n <= num_molecules; n++) {
    	if (graph_posx[n-1] == '#' || graph_posy[n-1] == '#') continue;
    	var dotnum = graph_scaffdot[molecule_scaffold[n-1]];
	if (dotnum < 0) continue; // switched off

	var sel = IsMoleculeSelected(n) ? 's' : '';
    	var fn = 'img/graph_' + sel + 'dot' + dotnum + '.png';
	var ux = Math.round(60 + parseFloat(graph_posx[n-1]) - DOT_CSZ);
	var uy = Math.round(500 - parseFloat(graph_posy[n-1]) - DOT_CSZ);

	attr = 'class="olptr" width="8" height="8"';
    	html += '<li class="olblk" style="border-width: 0;'
	      + ' left: ' + ux + 'px; top: ' + uy + 'px;'
	      + ' width: 8px; height: 8px;'
	      + '" ' + mouse + '>'
	      + LinkImageAttr(fn, attr);
	      + '</li>';
    }
    
    html += '</ul>';
    return html;
}

// Given a mouse event which contains a position, figures out which points are
// considered to be within this set.

function WhichGraphPoints(event)
{
    var DOT_CSZ = 4;

    var x = event.clientX, y = event.clientY;
    var el = Node("graph_main");
    
    while (el) {
	x -= el.offsetLeft;
	y -= el.offsetTop;
	el = el.offsetParent;
    }
    
    x += PageScrollX();
    y += PageScrollY();
    
    y = 500 - y;
        
    	// Collect all the clicks near the dots, and record the distance.
    
    var hits = new Array(), dist = new Array();

    for (var n = 1; n <= num_molecules; n++) {
    	if (graph_posx[n-1] == '#' || graph_posy[n-1] == '#') continue;
    	var dotnum = graph_scaffdot[molecule_scaffold[n-1]];
	if (dotnum < 0) continue; // switched off

	var dx = graph_posx[n-1] - x;
	var dy = graph_posy[n-1] - y;
	var dsq = dx * dx + dy * dy;
	if (dsq > (DOT_CSZ+1) * (DOT_CSZ+1)) continue;
	hits.push(n);
	dist.push(dsq);
    }

	// Sort so that small distances are first.
    
    var p = 0, sw;
    while (p < hits.length - 1) {
	if (dist[p] > dist[p+1]) {
	    sw = hits[p]; hits[p] = hits[p+1]; hits[p+1] = sw;
	    sw = dist[p]; dist[p] = dist[p+1]; dist[p+1] = sw;
	    if (p > 0) p--;
	} else {
	    p++;
	}
    }
    return hits;
}

// ---------------------------------- Events ----------------------------------

// User has requested that a different axis be shown.

function graph_ChangeAxis(axis, tgt)
{
    var nodes = tgt.getElementsByTagName('option');
    for (var n = 0; n < nodes.length; n++) {
    	if (nodes[n].selected) {
	    if (axis == 'X') {
	    	graph_xaxis = n+1;
    	        graph_posx = GetDataSplit("graph", "posx" + graph_xaxis);
	    } else if (axis == 'Y') {
	    	graph_yaxis = n+1;
    	    	graph_posy = GetDataSplit("graph", "posy" + graph_yaxis);
	    }
	    break;
	}
    }

    Node("graph_title").innerHTML = GraphBannerTitle();
    Node("section_graphsel").innerHTML = ComposeGraphSelector();
    Node("section_graph").innerHTML = ComposeScatterGraph();
}

// The user picked a different color for a scaffold series.

function graph_PickSeries(scaffnum, dotset)
{
    graph_scaffdot[scaffnum] = dotset;

    Node("section_graphsel").innerHTML = ComposeGraphSelector();
    Node("section_graph").innerHTML = ComposeScatterGraph();
}

// Mouse moved somewhere potentially interesting.

function graph_Mouse(event, isInside)
{
    var node = Node("graph_main");

    if (!isInside) {
	node.style.cursor = 'default';
	PopdownCell();
	return;
    }

    var hits = WhichGraphPoints(event);

    if (hits.length > 0) {
	node.style.cursor = 'pointer';

    	var xyt = [
	    event.clientX + 5 + PageScrollX(),
	    event.clientY + 5 + PageScrollY(),
	    event.clientY - 5 + PageScrollY()
	];
	    
	var heading = null;
	if (graph_hasexplore) {
	    heading = [
		'Click on a point to jump to the Explore tab<br>'
	      + 'Ctrl-Click on a point to toggle selection'
	    ];
	}
	
	PopupCellMolecules(hits, xyt[0], xyt[1], xyt[2], null, heading);
    } else {
    	node.style.cursor = 'default';
    	PopdownCell();
    }
}

// User clicked on a graph point, or the main area.

function graph_Click(event)
{
    PopdownCell();

    var hits = WhichGraphPoints(event);
    if (hits.length == 0) return;

    if (!event.ctrlKey) {
	if (graph_hasexplore) {
	    ActivateTab("explore");
	    GotoExploreMol(hits[0]);
	}
    } else {
	SelectMolecule(hits[0], !IsMoleculeSelected(hits[0]));
	Node("section_graph").innerHTML = ComposeScatterGraph();
    }
}

/*
!!! ACTUALLY, this is pretty useless; obtaining this information for use
in other graph programs should be redirected to: downloading the SD file(s)
of the original molecules, and using that instead

// User wants to see a popup window containing the current data.

function graph_ShowPoints(selonly)
{
    var anyshow = false;
    for (var n = 1; n <= num_molecules; n++) {
	if (graph_scaffdot[molecule_scaffold[n-1]] < 0) continue;
	if (selonly && ! IsMoleculeSelected(n)) continue;
	anyshow = true;
	break;
    }
    if (!anyshow) {
	if (selonly) {
	    alert("There are no selected molecules.");
	} else {
	    alert("No molecules are shown on the graph.");
	}
	return;
    }

    var w = window.open(
    	"about:blank", 
	"Graph Data", 
	"width=400,height=400,status=no,toolbar=no,"
	    + "menubar=no,location=no,scrollbars=yes,resizable=yes"
    );
    w.focus();

    var d = w.document;
    d.write("<html><body><pre>");
    
    d.write('"series","X","Y"\n');
    for (var n = 1; n <= num_molecules; n++) {
	if (graph_scaffdot[molecule_scaffold[n-1]] < 0) continue;
	if (selonly && !IsMoleculeSelected(n)) continue;
	d.write(
	    graph_scaffdot[molecule_scaffold[n-1]] + "," +
	    graph_posx[n-1] + "," +
	    graph_posy[n-1] + "\n"
	);
    }
    
    d.write("</pre></body></html>\n");
    d.close();
}*/