//      explore.js        	   Structure-Activity Report JavaScript
//
//	31-mar-2009 (ac) minor textual clarification
//	16-jan-2009 (ac) fixed bug with updating current molecule
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

var explore_loaded = false;
var explore_seltick = 0;
var explore_selmol; // currently selected molecule (1-based)
var explore_activity; // which activity value is selected (1-based)
var explore_history; // an array of recently clicked upon molecules
var explore_scfp; // scaffold fingerprints per molecule
var explore_rgfp; // R-group fingerprints per molecule
var explore_active; // array; true if a molecule is actually on the plot
var explore_dotx, explore_doty; // arrays, with dot positions

function explore_Activate()
{
    if (explore_loaded && explore_seltick == SelectionTick()) return null;
    explore_seltick = SelectionTick();
    explore_loaded = true;
    
    explore_selmol = 1;
    explore_activity = 1;
    explore_history = new Array();
    explore_scfp = new Array();
    explore_rgfp = new Array();
    explore_active = new Array();
    explore_dotx = new Array();
    explore_doty = new Array();
    
    for (var n = 1; n <= num_molecules; n++) {
    	var bytes = GetDataSplit("explore", "mol" + n);
	explore_scfp.push(UnBigHex(bytes[0]));
	explore_rgfp.push(UnBigHex(bytes[1]));
    }
    
    CalculatePositions();
    var html = '<div id="div_explore">'
    	     + ComposeExplore() + '</div>';
    return html;
}

function explore_Deactivate()
{
    explore_seltick = SelectionTick();
}

// ---------------------------- Page Construction -----------------------------

// Composition of the entire exploration page.

function ComposeExplore()
{
    var html = '<p><table class="infodata">'
    	     + '<tr><td rowspan="2" style="width: 1em;"></td>'
	     + '<td style="width: 630px;" id="explore_radar">' 
	     + ComposeRadar() + '</td>'
	     + '<td rowspan="2" valign="top">' 
	     + ComposeSelectors() + '</td>'
	     + '</tr><tr><td>' 
	     + ComposeBlather() + '</td></tr></table>';
    return html;    
}

// Puts together the image references needed to compose the block "radar-plot".

function ComposeRadar()
{
    var html = '<ul class="overlay" style="width: 600px; height: 600px;">';
    
    var mouse = ' onClick="explore_Click(event)"'
    	      + ' onMouseOver="explore_Mouse(event,true)"'
	      + ' onMouseMove="explore_Mouse(event,true)"'
	      + ' onMouseOut="explore_Mouse(event,false)"';

    var attr = 'class="olimg" id="explore_points"' 
    	     + mouse + ' width="600" height="600"';
    html += LinkImageAttr('img/explore.png', attr);
    
    for (var circonly = 0; circonly < 2; circonly++) {
	for (var n = 1; n <= num_molecules; n++) {
    	    if (!explore_active[n-1] || n == explore_selmol) continue;

    	    var encircled = explore_history.length > 0 && 
	    	    	    explore_history[0] == n;
    	    if (encircled != (circonly == 1)) continue; // circled thing on top

    	    var dotoff = encircled ? 7 : 5;
	    var dotsz = encircled ? 15 : 11;

    	    var x = explore_dotx[n-1] - dotoff;
	    var y = explore_doty[n-1] - dotoff;

	    var fn = 'img/explore_' 
		   + (IsMoleculeSelected(n) ? 's' : '')
		   + (encircled ? 'x' : '') 
		   + 'dot.png';
	    
	    
	    attr = 'class="olptr" width="' + dotsz + '" height="' + dotsz + '"';
    	    html += '<li class="olblk" style="border-width: 0;'
	    	  + ' left: ' + x + 'px; top: ' + y + 'px;'
		  + ' width: ' + dotsz + 'px; height: ' + dotsz + 'px;'
		  + '" ' + mouse + '>'
		  + LinkImageAttr(fn, attr);
		  + '</li>';
	}
    }
    
    html += '</ul>';
    return html;
}

// Assembles the selection and current-molecule display.

function ComposeSelectors()
{
    var html = '';

    if (num_activities > 1) {
	html += '<p><b>Difference Activity:</b>';

	for (var n = 1; n <= num_activities; n++) {
    	    html += '<br><input type="radio"'
		  + ' onClick="explore_ChangeActivity(' + n + ')"'
		  + (n == explore_activity ? ' checked' : '')
		  + '>' + activity_name[n-1] + '</input>';
	}
    }

    var attr = 'class="treeleaf"';
    html += '<p>' + LinkImageAttr('img/mol' + explore_selmol + '.png', attr)
    	  + '<p>' + FormatMoleculeActivities([explore_selmol], 0);
    
    if (num_textfields > 0) {
    	html += '<form onSubmit="explore_ExploreSearch(); return false;">'
	      + 'Search ID Fields:<br>'
	      + '<input type="text" size="20" id="explore_search">'
	      + '<input type="submit" value="Find">'
	      + '</form>';
    }
    
    if (explore_history.length > 0) {
    	html += '<p><input type="button" onClick="explore_GoBack()"'
	      + ' value="Back">';
    }
    
    return html;
}

// Returns some helpful text explaining what's happening.

function ComposeBlather()
{
    return '<p>The current molecule is positioned at the center of the'
    	+ ' cross-hairs. Each other molecule with data for the selected'
    	+ ' activity is plotted, above or below the current molecule depending'
	+ ' on whether the activity is greater or less. Molecules plotted'
	+ ' to the left have the same scaffold, and the distance indicates the'
	+ ' extent to which the R-groups are different. Molecules plotted to'
	+ ' the right have a different scaffold, or no scaffold, and the'
	+ ' distance is proportional the the scaffold dissimilarity. Similarity'
	+ ' is computed using MACCS fingerprints.';
}

// -------------------------------- Calculation -------------------------------

// Converts a string of hex numbers to an array of bytes.

function UnBigHex(str)
{
    var arr = new Array();
    for (var n = 0; n < str.length; n += 2) {
    	arr.push(parseInt("0x" + str.substring(n, n+2)));
    }
    return arr;
}

// For two equal sized arrays of bytes, composes the bitwise OR of each pair.

function BitOR(bits1, bits2)
{
    var arr = new Array(bits1.length);
    for (var n = bits1.length-1; n >= 0; n--) {
    	arr[n] = (bits1[n] | bits2[n]);
    }
    return arr;
}

// Makes sure that the position of each dot is calculated properly, relative
// to the currently selected dot.

function CalculatePositions()
{
    	// Turn all dots off, and call it done if the current molecule has
	// no activity information.

    for (var n = 0; n < num_molecules; n++) explore_active[n] = false;
    if (activity_value[explore_selmol-1][explore_activity-1] == '#') return;
    
    	// Assign each molecule (which has an activity measurement) a
	// position relative to the current molecule.

    var selscaff = molecule_scaffold[explore_selmol-1];
    var curactv = activity_norm[explore_selmol-1][explore_activity-1];
    var maxDX = 0, maxDY = 0;
    
    for (var n = 1; n <= num_molecules; n++) {
    	if (activity_value[n-1][explore_activity-1] == '#') continue;

	var fp0, fpN, mult = 1;
	if (molecule_scaffold[n-1] == selscaff && selscaff > 0) {
	    fp0 = explore_rgfp[explore_selmol-1];
	    fpN = explore_rgfp[n-1];
	    mult = -1;
	} else if (molecule_scaffold[n-1] > 0 && selscaff > 0) {
	    fp0 = explore_scfp[explore_selmol-1];
	    fpN = explore_scfp[n-1];
	} else {
	    fp0 = BitOR(
	    	explore_scfp[explore_selmol-1], 
		explore_rgfp[explore_selmol-1]
	    );
	    fpN = BitOR(explore_scfp[n-1], explore_rgfp[n-1]);
	}
	
	explore_dotx[n-1] = (1 - Tanimoto(fp0, fpN)) * mult;
    	explore_doty[n-1] = activity_norm[n-1][explore_activity-1] - curactv;
    	explore_active[n-1] = true;
	
	maxDX = Math.max(Math.abs(explore_dotx[n-1]), maxDX);
	maxDY = Math.max(Math.abs(explore_doty[n-1]), maxDY);
    }
    
    	// Scale the axes, then scale down further if anything goes over
	// the edge of the circle, then translate to pixel coordinates on top 
	// of the circle.
    
    var scx = maxDX == 0 ? 1 : 1/maxDX, scy = maxDY == 0 ? 1 : 1/maxDY;
    var maxDSQ = 0;
    for (var n = 0; n < num_molecules; n++) {
    	if (explore_active[n]) {
	    explore_dotx[n] *= scx;
	    explore_doty[n] *= scy;
	    var dsq = explore_dotx[n] * explore_dotx[n]
	    	    + explore_doty[n] * explore_doty[n];
	    maxDSQ = Math.max(maxDSQ, dsq);
	}
    }
    var scr = 0.98 * (maxDSQ <= 1 ? 1 : 1 / Math.sqrt(maxDSQ));
    for (var n = 0; n < num_molecules; n++) {
    	if (explore_active[n]) {
	    explore_dotx[n] = 300 + 300 * explore_dotx[n] * scr;
	    explore_doty[n] = 300 - 300 * explore_doty[n] * scr;
	}
    }
}

// Calculates the Tanimoto coefficient between two arrays of bytes.

var BITSUM = [
    0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4,1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,
    1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,
    1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,
    2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,
    1,2,2,3,2,3,3,4,2,3,3,4,3,4,4,5,2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,
    2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,
    2,3,3,4,3,4,4,5,3,4,4,5,4,5,5,6,3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,
    3,4,4,5,4,5,5,6,4,5,5,6,5,6,6,7,4,5,5,6,5,6,6,7,5,6,6,7,6,7,7,8
];

function Tanimoto(bits1, bits2)
{
    var A = 0, B = 0;
    for (var n = 0; n < bits1.length; n++) {
    	A += BITSUM[bits1[n] & bits2[n]];
	B += BITSUM[bits1[n] | bits2[n]];
    }
    return B == 0 ? 0 : A/B;
}

// Given a mouse event which contains a position, figures out which points are
// considered to be within this set.

function WhichExplorePoints(event)
{
    var DOT_CSZ = 6;

    var x = event.clientX, y = event.clientY;
    var el = Node("explore_points");
    
    while (el) {
	x -= el.offsetLeft;
	y -= el.offsetTop;
	el = el.offsetParent;
    }
    
    x += PageScrollX();
    y += PageScrollY();
        
    	// Collect all the clicks near the dots, and record the distance.
    
    var hits = new Array(), dist = new Array();
    
    for (var n = 1; n <= num_molecules; n++) {
    	if (!explore_active[n-1]) continue;
	
	var dx = explore_dotx[n-1] - x;
	var dy = explore_doty[n-1] - y;
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

// Jumps to a specific molecule number, and rebuilds the display accordingly.

function GotoExploreMol(molnum)
{
    var newhist = new Array();
    newhist.push(explore_selmol);
    for (var n = 0; n < explore_history.length && newhist.length < 10; n++) {
    	if (indexOf(explore_history[n], newhist) >= 0) continue;
	newhist.push(explore_history[n]);
    }
    explore_history = newhist;
    
    explore_selmol = molnum;

    CalculatePositions();

    Node("div_explore").innerHTML = ComposeExplore();
}

// ---------------------------------- Events ----------------------------------

function explore_Click(event)
{
    PopdownCell();

    var hits = WhichExplorePoints(event);
    if (hits.length == 0) return;

    if (!event.ctrlKey) {
	GotoExploreMol(hits[0]);
    } else {
	SelectMolecule(hits[0], !IsMoleculeSelected(hits[0]));
	Node("div_explore").innerHTML = ComposeExplore();
    }
}

function explore_Mouse(event, isInside)
{
    var node = Node("explore_points");

    if (!isInside) {
	node.style.cursor = 'default';
	PopdownCell();
	return;
    }

    var hits = WhichExplorePoints(event);

    if (hits.length > 0) {
	node.style.cursor = 'pointer';

    	var xyt = [
	    event.clientX + 5 + PageScrollX(),
	    event.clientY + 5 + PageScrollY(),
	    event.clientY - 5 + PageScrollY()
	];
	    
	var heading = [
	    'Click on a point to make it the new current compound<br>'
	  + 'Ctrl-Click on a point to toggle selection'
	];
	PopupCellMolecules(hits, xyt[0], xyt[1], xyt[2], null, heading);
    } else {
    	node.style.cursor = 'default';
    	PopdownCell();
    }
}

function explore_ChangeActivity(actv)
{
    explore_activity = actv;
    CalculatePositions();
    Node("div_explore").innerHTML = ComposeExplore();
}

function explore_ExploreSearch()
{
    var srch = Node("explore_search").value;
    if (srch.length == 0) return;

    srch = srch.toLowerCase();
    for (var i = 1; i <= num_molecules; i++) {
    	for (var j = 1; j <= num_textfields; j++) {
	    if (textfield_data[i-1][j-1].toLowerCase() == srch) {
	    	GotoExploreMol(i);
		return;
	    }
	}
    }
    
    alert("Search text not found.");
}

function explore_GoBack()
{
    if (explore_history.length == 0) return;
    explore_selmol = explore_history[0];
    explore_history.splice(0, 1);
    CalculatePositions();
    Node("div_explore").innerHTML = ComposeExplore();
}
