//      frags.js        	   Structure-Activity Report JavaScript
//
//	31-mar-2009 (ac) minor textual clarification
//  	06-mar-2009 (ac) fixed windows CRLF bug
//  	05-mar-2009 (ac) minor tweaks
//	13-feb-2009 (ac) more IE6 downgrading
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

var frags_loaded = false;
var frags_root; // list of root fragments (1-based)
var frags_parent; // for each fragment, its parent (1-based)
var frags_branch; // for each fragment, its branch number
var frags_children; // for each fragment, its child fragments (1-based)
var frags_molidx; // for each fragment, the molecules belonging to it (1-based)
var frags_isopen; // true if fragment is checked-open

function frags_Activate()
{
    if (frags_loaded) return null;
    frags_loaded = true;
    
    ConstructFragmentTree();

    var html = '';
    
    for (var n = 0; n < frags_root.length; n++) {
    	html += '<p><div id="frags_branch' + (n+1) + '">'
	      + ComposeBranch(frags_root[n], true, true)
	      + '</div>';
    }

    return html;
}

function frags_Deactivate()
{
}

// Puts together the tree from the components written into the source data.

function ConstructFragmentTree()
{
    frags_root = new Array();
    frags_parent = new Array();
    frags_branch = new Array();
    frags_children = new Array();
    frags_molidx = new Array();
    frags_isopen = new Array();
    
    var sz = GetData("fragments", "count");
    var branchnum = 0;
    for (var n = 1; n <= sz; n++) {
    	var frag = GetDataSplit("fragments", "frag" + n);
	if (frag[0] == 0) branchnum++;
	var molidx = new Array();
	for (var i = 1; i < frag.length; i++) molidx.push(frag[i]);
	
	frags_parent[n-1] = frag[0];
	frags_branch[n-1] = branchnum;
	frags_children[n-1] = new Array(); // to be filled as we iterate
	frags_molidx[n-1] = molidx;

    	frags_isopen[n-1] = frag[0]==0; // only roots are open
	
	if (frag[0] == 0) {
	    frags_root.push(n);
	} else {
	    frags_children[frag[0]-1].push(n);
	}
    }
}

// ---------------------------- Page Construction -----------------------------

// Composes a table for the branch which begins at the indicated fragment,
// which involves drawing the fragment, the histograms, any other thingymabobs,
// and all the child fragments.

function ComposeBranch(fragnum, isFirst, isLast)
{
    var isRoot = frags_parent[fragnum-1] == 0;
    var isLeaf = frags_children[fragnum-1].length == 0;

    var bgstyle = bland ? ' style="background-color: #FFFFFF;"' : '';

    var html = '<div class="treerow' + (isRoot ? '0' : 'N') + '"' + bgstyle + '>'
	     + '<table class="treetable"' + bgstyle + '><tr>'
	     + '<td class="treecell"' + bgstyle
	     + '><div class="' + (isFirst && !isRoot ? 'hordots' : 'hornodots')
	     + '">&nbsp;</div></td>';

    	// The checkbox, or substitute.
    
    html += '<td class="' + (!isRoot&&!isLast ? 'verdots' : 'treecell') + '"'
          + bgstyle + '>';

    if (isLeaf) {
    	html += LinkImage(StaticPrefix() + 'treepoint.gif');
    } else if (frags_isopen[fragnum-1]) {
    	var attr = 'onClick="frags_ToggleSection(' + fragnum + ',false)"'
	    	 + ' class="secbtn"';
	html += LinkImageAttr(StaticPrefix() + 'treeminus.gif', attr);
    } else { // (!frags_isopen[fragnum-1]) {
    	var attr = 'onClick="frags_ToggleSection(' + fragnum + ',true)"'
	    	 + ' class="secbtn"';
	html += LinkImageAttr(StaticPrefix() + 'treeplus.gif', attr);
    }

    if (isRoot) {
    	var attr;
	attr = 'onClick="frags_ToggleGroup(' + fragnum + ',true)"'
	     + ' class="secbtn"';
	html += '<br>' + LinkImageAttr(StaticPrefix()+'treedblplus.gif', attr);
	attr = 'onClick="frags_ToggleGroup(' + fragnum + ',false)"'
	     + ' class="secbtn"';
	html += '<br>' + LinkImageAttr(StaticPrefix()+'treedblmin.gif', attr);
    }

    html += '</td>';	     
    
    	// The histograms, and molecule count.
    
    /* !!!
    html += '<td class="treecell">';
    for (var n = 1; n <= num_activities; n++) {
    	// !!! MINI HISTOGRAM... with frags_molidx[fragnum-1]
	// + <br>
    }
    html += '<b><small>(' + frags_molidx[fragnum-1].length + ')</small></b>'
    	  + '</td>';
    */

    	// The fragment image.
    
    var attr = 'class="' + (isLeaf ? 'treeleaf' : 'treebranch') + '"'
    	     + ' onClick="frags_Click(' + fragnum + ',this)"'
	     + ' onMouseOver="frags_Mouse(' + fragnum + ',this,true)"'
	     + ' onMouseOut="frags_Mouse(' + fragnum + ',this,false)"';
    html += '<td class="treecell"' + bgstyle + '>'
    	  + LinkImageAttr('img/fragment' + fragnum + '.png', attr)
	  + '</td>';
	  
    	// The descendents.
	  
    if (!isLeaf && frags_isopen[fragnum-1]) {
    	html += '<td' + bgstyle + '>';

    	for (var n = 0; n < frags_children[fragnum-1].length; n++) {
    	    html += ComposeBranch(
	    	frags_children[fragnum-1][n], 
		n == 0,
		n == frags_children[fragnum-1].length - 1
	    );
	}

    	html += '</td>';
    }
    
    html += '</tr></table></div>';
    
    return html;
}

// ---------------------------------- Events ----------------------------------

// Opened or closed a section.

function frags_ToggleSection(fragnum, toShow)
{
    frags_isopen[fragnum-1] = toShow;

    var branchnum = frags_branch[fragnum-1];
    Node('frags_branch' + branchnum).innerHTML = 
    	ComposeBranch(frags_root[branchnum-1], true, true);
}

// Clicked on one of the the ++/-- buttons.

function frags_ToggleGroup(fragnum, toShow)
{
    RecursivelySetOpen(fragnum, toShow);

    var branchnum = frags_branch[fragnum-1];
    Node('frags_branch' + branchnum).innerHTML = 
    	ComposeBranch(frags_root[branchnum-1], true, true);
}

function RecursivelySetOpen(fragnum, toShow)
{
    frags_isopen[fragnum-1] = toShow;
    for (var n = 0; n < frags_children[fragnum-1].length; n++) {
    	RecursivelySetOpen(frags_children[fragnum-1][n], toShow);
    }
}

// Mouse has moved into or out of one of the fragment diagrams.

function frags_Mouse(fragnum, tgt, isInside)
{
    if (isInside) {
    	tgt.style.backgroundColor = '#c0d0d0';
	tgt.style.borderColor = 'black';
	tgt.style.cursor = 'pointer';
    } else {
	if (tgt.className == 'treebranch') {
	    tgt.style.backgroundColor = '#e0e0e0';
	    tgt.style.borderColor = '#d0d0d0';
	} else {
	    tgt.style.backgroundColor = '#e8e8ff';
	    tgt.style.borderColor = '#d0d0e0';
	}
    	tgt.style.cursor = 'default';
    }
    
    var molidx = frags_molidx[fragnum-1];
    
    
    if (isInside && molidx.length > 0) {
    	var xyt = GetPositionForPopup(tgt);

	var actv = new Array();
	var scheme = new Array();
	for (var n = 1; n <= num_activities; n++) {
	    actv.push(n); 
	    scheme.push(1);
	}
	var histo = FormatLinearHistograms(molidx, actv, scheme);
	histo = '<div align="center">' + histo + '</div>';
	
	var heading;
	if (molidx.length == 1) {
	    heading = [histo];
	} else {
	    heading = [
	      '<div align="center">'
	      + '<b>' + molidx.length + ' molecules'+'</b><br>'
	      + '<i>Click to copy the fragment to the clipboard</i>'
	      + '</div>',
	      histo
	    ];
	}
	
	PopupCellMolecules(molidx, xyt[0], xyt[1], xyt[2], null, heading);
    } else {
    	PopdownCell();
    }
}

// User has clicked on a fragment diagram, so attempt to copy it to the
// clipboard... which is no mean feat, since the fragments SD file has to be
// downloaded in order to accomplish this.

var frags_toGet, frags_XmlHttp;

function DownloadFragments()
{
    if (!(frags_XmlHttp.readyState == 4 || 
    	  frags_XmlHttp.readyState == "complete")) {
	return;
    }
    
    var lines = (frags_XmlHttp.responseText + "");
    if (lines.indexOf("\r\n") >= 0) {
    	lines = lines.split("\r\n");
    } else {
    	lines = lines.split("\n");
    }

    var fragnum = 1, curfrag = "", past_end = false;
    for (var n = 0; n < lines.length; n++) {
    	if (lines[n] == '$$$$') {
	    if (fragnum == frags_toGet) {
	    	WriteClipboard(curfrag, "Molecule copied to clipboard.");
		return;
	    }
	    fragnum++;
	    curfrag = "";
	    past_end = false;
	} else if (!past_end) {
	    curfrag += lines[n] + "\n";
	    if (lines[n] == "M  END") {
	    	past_end = true;
	    }
	}
    }
}

function frags_Click(fragnum, tgt)
{
    frags_toGet = fragnum;
    try {
	frags_XmlHttp = GetXmlHttpObject(DownloadFragments);
	frags_XmlHttp.open('GET', "fragments.sdf", true);
	if (frags_XmlHttp.overrideMimeType) {
	    frags_XmlHttp.overrideMimeType('text/plain'); // (isn't XML)
	}
	frags_XmlHttp.send("");
    } catch (ex) {
    	// (older versions of I.E. don't like text/plain)
    	alert("Unable to fetch selected molecule from fragments file.");
    }
}
