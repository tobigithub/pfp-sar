//      summary.js        	   Structure-Activity Report JavaScript
//
//	05-nov-2010 (hf) fixed crash when no rgroups
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

var summary_loaded = false;
var summary_rgopen; // holds a list of open/closed states for R-group lists

function summary_Activate()
{
    if (summary_loaded) return null;
    summary_loaded = true;
    
	// This is as good a place as any to fix the MOE/web logo in IE6.
	
    if (ieVersion > 0 && ieVersion < 7) {
	var node = Node("moeweblogo");
	node.innerHTML = LinkImageAttr(
	    StaticPrefix() + "moeweb.png",
	    'width="150" height="28"'
	);
    }
	
	// Start with initialization.
    
    summary_rgopen = new Array();

    var html = "";

    var ttl = GetData("summary", "title");
    if (ttl.length > 0) {
    	html += '<p><table class="infodata" align="center"><tr>'
	      + '<td class="ihdr">Title:&nbsp;</td>'
	      + '<td class="inml">' + ttl + '</td></table>';
    }

    for (var n = 1; n <= num_scaffolds; n++) {
    	html += BuildSummaryTable(n);
    }

    html += '<div align="right">Generated at: '
    	  + GetData("summary", "gentime") + '</div>';

    return html;
}

function summary_Deactivate()
{
}

// ---------------------------- Page Construction -----------------------------

// Returns the HTML corresponding to the summary of a single scaffold.	

function BuildSummaryTable(scaffnum)
{
    var secname = "scaffold" + scaffnum, secttl = "Scaffold " + scaffnum;
    var html = ComposeSectionBar(secname, secttl, true);

    var rgsites = GetDataSplit("scaffolds", "rgsites" + scaffnum);
    var scsize = scaffold_size[scaffnum-1];
    var maxsize = GetDataSplit("scaffolds", "maxsize");
    var rgroups = GetData("scaffolds", "rgroups" + scaffnum).split(";");
    
    html += '<table class="moldata">';

    var blandstyle = '';
    if (bland) {
    	blandstyle += ' background-color: #FFFFFF; border-width: 1px;'
    	       + ' border-style: solid; border-color: #808080;';
    }
    for (var n = 1; n == 1 || n <= rgsites.length; n++) {
	var style;
    	html += '<tr>';
    	if (n == 1) {
	    var rowspan = Math.max(1, rgsites.length);
	    style = 'width: ' + maxsize[0] + 'px;' + blandstyle;
	    var attr = 'width="' + scsize[0] + '" height="' + scsize[1] + '"';
	    html += '<td rowspan="' + rowspan + '" align="center"'
	    	  + ' class="nml" style="' + style + '">'
		  + '<div align="center">'
		  + LinkImageAttr("img/scaffold" + scaffnum + ".png", attr)
		  + '<p>(' + scaffold_assignments[scaffnum-1].length + ')<p>';
	    html += LinkImage("img/lhist" + scaffnum + ".png");
    	    html += '</div></td>';
	}
	
	if (n > rgsites.length) {
	    html += '</td></tr>'; 
	    continue;
	}
	
	var chkfn = StaticPrefix() + "treeminus.gif";
	var id = summary_rgopen.length;
	var chkattr = 'id="summary_chk' + id + '" class="secbtn"'
		    + ' onClick="summary_ToggleRGList(' + id + ')"';

	summary_rgopen.push(true);
	
	style = !bland ? '' : (' style="' + blandstyle + '"');
	html += '<td class="hdr"' + style + '>'
	      + '<table><tr><td align="center" valign="center">'
	      + '<b>R' + rgsites[n-1] + '</b></td><td>'
	      + '<img src="' + chkfn + '" ' + chkattr + '>'
	      + '</td></tr></table>'
	      + '</td><td class="nml"' + style + '>'
	      + '<div id="summary_rgp' + id + '">';

    	var rlist = rgroups[rgsites[n-1]-1];
	if (rlist) {
	    rlist = rlist.split(",");
	    for (var i = 0; i < rlist.length; i++) {
		var rgfn = "img/rgroup" + rlist[i] + "sm.png";
		var id = rlist[i] + "," + scaffnum;
		var rgsz = rgroup_size[rlist[i] - 1];
		style = 'border-width: 1px;  border-style: solid;'
		    + 'border-color: ' + (bland ? '#FFFFFF' : '#E8E8E8;');
		var attr = 'onMouseOver="summary_RGroupMouse(' + id + ',this,1)"'
			+ ' onMouseOut="summary_RGroupMouse(' + id + ',this,0)"'
			+ ' onClick="summary_RGroupClick(' + id + ')"'
			+ ' width="' + rgsz[2] + '" height="' + rgsz[3] + '"'
			+ ' style="' + style + '"';
		html += LinkImageAttr(rgfn, attr, bland) + " ";
	    }
	}
	
	html += '</div></td></tr>';
    }

    html += '</table>';
    html += "</div>"; 
    
    return html;
}

// ---------------------------------- Events ----------------------------------

// The mouse entered or left the boundaries.

function summary_RGroupMouse(rgidx, scidx, tgt, isInside)
{
    var rmols = GetDataSplit("rgroups", "molecules" + rgidx);
    var molidx = new Array();
    for (var n = 0; n < rmols.length; n++) {
    	if (molecule_scaffold[rmols[n]-1] == scidx) {
	    molidx[molidx.length] = rmols[n];
	}
    }

    tgt.style.borderColor = isInside ? '#B0C0D0' 
			  : bland ? '#FFFFFF' : '#E8E8E8';

    if (isInside) {
    	var xyt = GetPositionForPopup(tgt);
	PopupCellMolecules(molidx, xyt[0], xyt[1], xyt[2], null);
    } else {
	PopdownCell();
    }
}

// Clicked on an R-group, so want a popup window with the molecules in it.

function summary_RGroupClick(rgidx, scidx)
{
    var rmols = GetDataSplit("rgroups", "molecules" + rgidx);
    var molidx = new Array();
    for (var n = 0; n < rmols.length; n++) {
    	if (molecule_scaffold[rmols[n]-1] == scidx) {
	    molidx[molidx.length] = rmols[n];
	}
    }
    PopupPersistentMolecules(molidx, null);
}

// Clicked on one of the open/close buttons for expanding/contracting the
// list of R-groups.

function summary_ToggleRGList(id)
{
    id = parseInt(id);
    var img = Node("summary_chk" + id);
    var rgp = Node("summary_rgp" + id);
    var cell = rgp.parentNode;
    
    var isopen = !summary_rgopen[id];
    summary_rgopen[id] = isopen;
    
    img.src = StaticPrefix() + (isopen ? "treeminus.gif" : "treeplus.gif");
    rgp.style.display = isopen ? 'block' : 'none';
    cell.style.backgroundColor = !isopen ? 'transparent'
			       : bland ? '#FFFFFF' : '#E8E8E8';
}
