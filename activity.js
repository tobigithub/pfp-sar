//      activity.js        	   Structure-Activity Report JavaScript
//
//	14-oct-2009 (ac) constraints move filtered rows/columns to the end
//	26-aug-2009 (ac) desisted from zapping constraints when axis changed
//	30-jun-2009 (ac) put in the 'invert' checkbox
//	11-jun-2009 (ac) allow constraints applied to axis
//	22-may-2009 (ac) redesigned units systems
//  	19-mar-2009 (ac) fixed bug with # selectors
//	13-feb-2009 (ac) more IE6 downgrading
//  	11-feb-2009 (ac) fixed a null bug with activity sorting
//  	11-feb-2009 (ac) fixed IE6 compatibility bug
//	07-jan-2009 (ac) now computed "selectivity" values for activity pairs
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

var activity_loaded = false;
var activity_seltick = 0;
var activity_axes, activity_naxes; // fixed info about axes
var activity_row, activity_col; // currently selected axes
var activity_sortrow, activity_sortcol; // sort orders for axes
var activity_rowidx, activity_colidx; // permutations for axis entities
var activity_valname; // the activities + combinations for selectivity
var activity_valtype; // one of 'activity'/'selectivity'
var activity_valstyle; // the source activity unit type, or a computed type
var activity_valsrc1, activity_valsrc2; // where computed data came from (or 0)
var activity_show; // activities to show; size 3, values are 1-based
var activity_scheme; // color schemes to use; size 3, values are 1-based
var activity_invert; // whether to invert each of the color schemes
var activity_nselectors; // between 1 and 3
var activity_cartwheels; // true if using cartwheel mode
var activity_zoom; // scale percentage (must be one of 25/50/100/200)
var activity_constraints; // one array per axis (used or not)
var activity_edconstr; // constraints being edited now
var activity_molarray; // for popups to access precomputed lists of molidx's

var SCHEME_CODES = new Array('', 'heatmap', 'magenta', 'greyscale');

function activity_Activate()
{
    if (activity_seltick != SelectionTick()) activity_loaded = false;
    activity_seltick = SelectionTick();
    
    if (activity_loaded /* !!! AND not IE6??? */) return null;

    if (!activity_loaded) {
    	activity_axes = GetDataSplit("correlation", "axes");
	activity_naxes = activity_axes.length;
		
    	activity_row = 0;
	activity_col = 1;
    	activity_sortrow = 0;
	activity_sortcol = 0;
    	activity_show = new Array(1, 0, 0);
    	activity_scheme = new Array(1, 1, 1);
    	activity_invert = new Array(false, false, false);
	activity_nselectors = Math.min(3, num_activities);
    	activity_cartwheels = false;
	activity_zoom = 100;
	activity_constraints = new Array(activity_naxes);
	for (var n = 0; n < activity_naxes; n++) {
	    activity_constraints[n] = new Array();
	}

	activity_valname = new Array();
	activity_valtype = new Array();
	activity_valstyle = new Array();
	activity_valsrc1 = new Array();
	activity_valsrc2 = new Array();
	for (var i = 0; i < num_activities; i++) {
	    activity_valname.push(activity_name[i]);
	    activity_valtype.push('activity');
	    activity_valstyle.push(activity_type[i]);
	    activity_valsrc1.push(0);
	    activity_valsrc2.push(0);
	}
	for (var i = 0; i < num_activities; i++) {
	    for (var j = 0; j < num_activities; j++) {
		if (i == j) continue;
		activity_valname.push(activity_name[i] + " vs " +
				     activity_name[j]);
		activity_valtype.push('selectivity');
		activity_valstyle.push('sel');
		activity_valsrc1.push(i+1);
		activity_valsrc2.push(j+1);
	    }
	}

    	activity_rowidx = AxisPermutations('row');
	activity_colidx = AxisPermutations('col');
    }
    activity_loaded = true;

    var html = "";

    	// Selector banner. Content is in: <div id="section_selector">

    html += ComposeSectionBar("selector", "Activity Selector", true)
          + ComposeActivitySelector()
	  + '</div>';

    	// Activity banner. Content is in: <div id="section_activity">

    var abar = '<span id="actbar_corr">' + ActivityBannerTitle() + '</span>';
    html += ComposeSectionBar("activity", abar, true)
          + ComposeActivityTable()
    	  + '</div>';
	  
    if (activity_naxes > 2) {
    	html += ComposeSectionBar("constraints", "Constraints", true)
	      + ComposeConstraints()
    	      + '</div>';
    }

    return html;
}

function activity_Deactivate()
{
    activity_seltick = SelectionTick();
}

// ---------------------------- Page Construction -----------------------------

// Returns suitable text to be popped into the activity table banner.

function ActivityBannerTitle()
{
    if (activity_row >= activity_axes.length ||
        activity_col >= activity_axes.length) return "Correlation";
    
    return "Correlation Table of <u>" + activity_axes[activity_row]
    	 + "</u> vs. <u>" + activity_axes[activity_col] + "</u>";
}

// Returns HTML content which reflects the state of the current selection tools
// which control the appearance of the activity table.

function ComposeActivitySelector()
{
    var html = '<p><table class="infodata">';
    
    	// Heading.
    
    html += '<tr><td class="ihdr">Rows</td><td class="ihdr">Columns</td>';
    for (var n = 1; n <= activity_nselectors; n++) {
    	html += '<td class="ihdr">Activity&nbsp;' + n + '</td>';
    }
    html += '</tr>';
    
    	// Axis selection.
	
    html += '<tr>';
    
    html += '<td class="inml" rowspan="3" style="vertical-align: top;">'
    	  + '<div id="actsel_row">'
    	  + ComposeAxisList('row') + '</div></td>'
	  + '<td class="inml" rowspan="3" style="vertical-align: top;">'
	  + '<div id="actsel_col">'
	  + ComposeAxisList('col') + '</div></td>';

    	// Activity selection, and color schemes.
	
    for (var n = 1; n <= activity_nselectors; n++) {
    	html += '<td class="inml" valign="top"><div id="actsel_show' + n + '">'
	      + ComposeShowList(n) + '</div></td>';
    }
    html += '</tr><tr>';
    for (var n = 1; n <= activity_nselectors; n++) {
    	html += '<td class="inml" style="vertical-align: top;">'
	      + '<div id="actsel_scheme' + n + '">'
	      + ComposeSchemeList(n) + '</div></td>';
    }
    html += '</tr><tr>';
    for (var n = 1; n <= activity_nselectors; n++) {
    	html += '<td class="inml" id="actsel_col' + n + '"'
	      + ' style="padding: 3px;">'
	      + ComposeColorSample(n) + '</td>';
    }
    html += '</tr>';
    
    	// Graphic mode.
	
    var cwStart = '', cwEnd = '';
    if (ieVersion > 0 && ieVersion < 7) {
    	cwStart = '<font color="#808080">';
	cwEnd = '</font>';
    }

    	// Display type (background vs. cartwheels).
    	
    html += '<tr><td colspan="' + (2 + activity_nselectors) + '" align="right">'
    	  + '<table><tr><td align="right">'
    	  + 'Display Style:</td><td>'
	  + '<input type="radio" id="actsel_disp0"'
          + ' onClick="activity_ChangeDisplay(0)"' 
	  + (activity_cartwheels ? '' : ' checked') + '>'
          + 'Background</input> '
	  + '<input type="radio" id="actsel_disp1"'
          + ' onClick="activity_ChangeDisplay(1)"' 
	  + (activity_cartwheels ? ' checked' : '') + '>'
          + cwStart + 'Cartwheels' + cwEnd + '</input></td></tr>'

    	// Zoom level.

    html += '<tr><td align="right">Zoom:</td><td>'
	  + '<input type="radio" id="actsel_zoom25"'
	  + ' onClick="activity_ChangeZoom(25)"'
	  + (activity_zoom == 25 ? 'checked' : '') + '>'
	  + cwStart + '25%' + cwEnd + '</input> '
	  + '<input type="radio" id="actsel_zoom50"'
	  + ' onClick="activity_ChangeZoom(50)"'
	  + (activity_zoom == 50 ? 'checked' : '') + '>'
	  + cwStart + '50%' + cwEnd + '</input> '
	  + '<input type="radio" id="actsel_zoom100"'
	  + ' onClick="activity_ChangeZoom(100)"'
	  + (activity_zoom == 100 ? 'checked' : '') + '>'
	  + '100%</input> '
	  + '<input type="radio" id="actsel_zoom200"'
	  + ' onClick="activity_ChangeZoom(200)"'
	  + (activity_zoom == 200 ? 'checked' : '') + '>'
	  + '200%</input></td></tr>';
    
    html += '</table></table>';

    return html;
}

// Returns HTML containing the selection box for the 'row' or 'col' axis.

function ComposeAxisList(axis)
{
    	// The choice of axis.

    var html = '<select size="' + Math.min(12, activity_naxes) + '"'
    	     + ' style="width: 10em;" onChange="activity_ChangeAxis(this)">';

    if (axis == 'row') {
    	for (var n = 0; n < activity_naxes; n++) {
	    html += '<option' + (n == activity_row ? ' selected' : '')
	    	  + '>' + activity_axes[n] + '</option>';
	}
    } else /* axis == 'col' */ {
    	for (var n = 0; n < activity_naxes; n++) {
	    if (n == activity_row) continue;
	    html += '<option' + (n == activity_col ? ' selected' : '')
	    	  + '>' + activity_axes[n] + '</option>';
	}
    }

    html += '</select>';
    
    	// The sort order for the axis.
	
    var cursort = axis == 'row' ? activity_sortrow : activity_sortcol;
    
    html += '<p><b>Sort Order:</b>'
    	  + '<p><input type="radio" id="sortby_' + axis + '0"'
	  + (cursort == 0 ? ' checked' : '')
	  + ' onClick="activity_SortBy(\'' + axis + '\',0)">'
	  + 'None</input>'
    	  + '<br><input type="radio" id="sortby_' + axis + '1"'
	  + (cursort == 1 ? ' checked' : '')
	  + ' onClick="activity_SortBy(\'' + axis + '\',1)">'
	  + 'Popularity</input>'
    	  + '<br><input type="radio" id="sortby_' + axis + '2"'
	  + (cursort == 2 ? ' checked' : '')
	  + ' onClick="activity_SortBy(\'' + axis + '\',2)">'
	  + 'Weight</input>'
    	  + '<br><input type="radio" id="sortby_' + axis + '3"'
	  + (cursort == 3 ? ' checked' : '')
	  + ' onClick="activity_SortBy(\'' + axis + '\',3)">'
	  + 'Activity</input>';

    return html;
}

// For the activity selector set (1..3), build the list of stuff.

function ComposeShowList(shownum)
{
    var sz = Math.min(12, Math.max(2,activity_valname.length));
    var html = '<select size="' + sz + '"'
    	     + ' style="width: 17em;"'
	     + ' onChange="activity_ChangeShow(this)">';
    
    for (var n = 0; n <= activity_valname.length; n++) {
    	if (shownum == 1 && n == 0) continue;
	if (shownum == 2 && n == activity_show[0]) continue;
	if (shownum == 3 && n > 0) {
	    if (activity_show[1] == 0) continue;
	    if (n == activity_show[0] || n == activity_show[1]) continue;
	}
    	html += '<option';
	if ((shownum == 1 && n == activity_show[0]) 
	  ||(shownum == 2 && n == activity_show[1]) 
	  ||(shownum == 3 && n == activity_show[2]))
	    html += ' selected';
	html += '>' + (n == 0 ? 'n/a' : activity_valname[n-1]) + '</option>';
    }
    
    html += '</select>';

    return html;
}

// Produces radio buttons for selecting a color mode.

function ComposeSchemeList(shownum)
{
    if (activity_show[shownum-1] == 0) return ""; // not applicable

    var chk = ' checked="checked"';
    var html = '<form><input type="radio"'
	     + ' onClick="activity_ChangeMode(' + shownum + ',1)"'
	     + (activity_scheme[shownum-1] == 1 ? chk : '') + '>'
	     + 'Heat-map</input><br>'
	     + '<input type="radio"'
	     + ' onClick="activity_ChangeMode(' + shownum + ',2)"'
	     + (activity_scheme[shownum-1] == 2 ? chk : '') + '>'
	     + 'Magenta</input><br>'
	     + '<input type="radio"'
	     + ' onClick="activity_ChangeMode(' + shownum + ',3)"'
	     + (activity_scheme[shownum-1] == 3 ? chk : '') + '>'
	     + 'Greyscale</input><br>'
	     + '<input type="checkbox"'
	     + ' onClick="activity_ChangeInvert(' + shownum + ',this)"'
	     + (activity_invert[shownum-1] ? chk : '') + '>'
	     + 'Invert</input>'
	     + '</form>';

    return html;
}

// Build a color sample palette for the indicated selector.

function ComposeColorSample(shownum)
{
    var actnum = activity_show[shownum-1];
    if (actnum == 0) return "";
    
    var aname = activity_valname[actnum-1];
    var aunits = activity_valstyle[actnum-1];
    var uspec = null;
    if (activity_valstyle[actnum-1] != 'sel') {
	uspec = activity_spec[actnum-1];
    }
    
    var scheme = SCHEME_CODES[activity_scheme[shownum-1]];
    
    	// Produce a list of value/heading combinations. The headings are
    	// derived by converting the normalized units (0..1) back to their
    	// original values, rounding to 2 s.f., then converting back to the
    	// normalized version, then skipping duplicates.
    
    var sval = [], shdr = [];
    for (var v = 0; v <= 1; v += 0.1) {
	if (uspec == null) {
	    sval.push(v);
	    if (Math.abs(v - 0.5) < 1E-10) {
		shdr.push('Equal');
	    } else if (v < 0.5) {
		shdr.push('- ' + (100-v*200).toPrecision(3) + '%');
	    } else {
		shdr.push('+ ' + (v*200-100).toPrecision(3) + '%');
	    }
	} else {
	    var dv = roundsf(DenormUnits(uspec, v), 2);
	    if (Math.abs(dv) < 1E-10) dv = 0;
	    if (shdr.length > 0 && shdr[shdr.length-1] == dv) continue;
	    sval.push(NormUnits(uspec, dv));	    
	    var fmtv = dv >= 100 ? Math.round(dv) : dv.toPrecision(2);
	    fmtv = activity_type[actnum-1] + " = " + fmtv;
	    shdr.push('<nobr>' + fmtv + '</nobr>');
	}
    }
    
    	// Produce the subtable.
	
    var html = '<table class="infodata" width="100%" height="100%"'
    	     + ' style="margin: 1px; border-width: 0;">';
    for (var n = 0; n < sval.length; n++) {
	var colval = activity_invert[shownum-1] ? (1-sval[n]) : sval[n];
    	html += '<tr><td style="text-align: left;" width="65%">'
	      + shdr[n] + '</td><td class="icol" width="35%" bgcolor="'
	      + ColorForActivity(colval, scheme)
	      + '">&nbsp;</td></tr>';
    }
    
    html += '</table>';
    return html;
}

// ----------------------- Composition of a Single Table -----------------------

// Returns HTML content which contains the correlation table, which reflects
// the currently selected options.

function ComposeActivityTable()
{
    var pfx = 'table_' + activity_col + '_' + activity_row;
    var tblsize = GetDataSplit("correlation", pfx + "_size");
    var tblcols = GetDataSplit("correlation", pfx + "_cols");
    var tblrows = GetDataSplit("correlation", pfx + "_rows");
    var tblgrid = GetDataSplit("correlation", pfx + "_grid");
    var tbltitle = GetDataSplit("correlation", pfx + "_title");

    	// Apply zooming rules to the sizes.

    var scale = activity_zoom * 0.01;
    if (activity_zoom != 100) {
    	tblsize[0] = Math.round(tblsize[0] * scale);
	tblsize[1] = Math.round(tblsize[1] * scale);

    	for (var n = 0; n < 3; n++) {
	    tblcols[n] = Math.round(tblcols[n] * scale);
	    tblrows[n] = Math.round(tblrows[n] * scale);
	}
	for (var n = 3; n < tblcols.length; n += 3) {
	    tblcols[n+1] = Math.round(tblcols[n+1] * scale);
	    tblcols[n+2] = Math.round(tblcols[n+2] * scale);
	}
	for (var n = 3; n < tblrows.length; n += 3) {
	    tblrows[n+1] = Math.round(tblrows[n+1] * scale);
	    tblrows[n+2] = Math.round(tblrows[n+2] * scale);
	}
	
	for (var n = 0; n < 4; n++) {
	    tblgrid[n] = Math.round(tblgrid[n] * scale);
	}
	tblgrid[4] *= scale; // can't be rounded
	tblgrid[5] *= scale; // ditto
	for (var n = 0; n < 8; n++) {
	    tbltitle[n] = Math.round(tbltitle[n] * scale);
	}
    }

    var ncols = tblsize[2], nrows = tblsize[3];
    var nshown = 1;
    if (activity_show[1] > 0) nshown = 2;
    if (activity_show[2] > 0) nshown = 3;

    var html = '<table><tr><td width="2em"></td><td valign="top">'
    	     + '<ul class="overlay" style="width: ' + tblsize[0] + 'px;'
	     + ' height: ' + tblsize[1] + 'px;">';
    
    	// Add the banner titles.

    if (activity_zoom >= 100) {
	html += PlaceTextBlob(
    	    '<b>' + activity_axes[activity_col] + '</b>',
	    tbltitle[0], tbltitle[1], tbltitle[2], tbltitle[3],
	    '#E8E8E8', 0, 'bottom', ''
	);
	html += PlaceTextBlob(
    	    '<b>' + activity_axes[activity_row] + '</b>',
	    tbltitle[4], tbltitle[5], tbltitle[6], tbltitle[7],
	    '#E8E8E8', 0, 'bottom', ''
	);
    }

    activity_molarray = new Array();
    
    	// Draw in the column headings.
	
    var w = parseInt(tblcols[0]), h = parseInt(tblcols[1]);
    var bandsz = parseInt(tblcols[2]);
    var sideflaps = false;

    for (var n = 3, c = 0; n < tblcols.length; n += 3, c++) {
    	var x = parseInt(tblcols[n+1]), y = parseInt(tblcols[n+2]);
	
	if (tblcols[n] == 0) {
	    html += PlaceColorBlob(
	    	x+1, y+1, (w/2)-1, h+bandsz, 
		bland ? '#E0E0E0' : '#D0D0D0'
	    );
	    sideflaps = true;
	    continue;
	}
	
	var ucol = tblcols[activity_colidx[c]*3];
	var members = QualifyingMolecules(ucol, -1);

	var attr = '';
	var molpos = activity_molarray.length;
	activity_molarray[molpos] = members;
	var attrid = molpos + ',' + ucol + ',this';
	var selkey = ',event.ctrlKey';
    	
	if (activity_col != 0) {
	    attr = ' onMouseOver="activity_AxisMouse(' + attrid + ',true)"'
	    	 + ' onMouseOut="activity_AxisMouse(' + attrid + ',false)"';
	}
	attr +=	' onClick="activity_AxisClick(' + attrid + selkey + ')"';
	
    	html += PlaceAxisBlob(
	    activity_col == 0, ucol,
	    x, y, w, h, '#D0D0D0', attr
	);
	
	var bx;
	if (nshown == 1) {
	    bx = [x+1, x+w+1];
	} else if (nshown == 2) {
	    bx = [x+1, 0, x+w+1];
	    bx[1] = Math.round(0.5 * (bx[0] + bx[2]));
	} else if (nshown == 3) {
	    bx = [x+1, 0, 0, x+w+1];
	    bx[1] = Math.round(bx[0] + (1/3) * w);
	    bx[2] = Math.round(bx[0] + (2/3) * w);
	}
	
	for (var i = 0; i < nshown; i++) {
	    var actv = SummarizeActivity(
	    	members, 
		activity_show[i],
		SCHEME_CODES[activity_scheme[i]],
		activity_invert[i]
	    );
	    var col = actv == null ? '#D0D0D0' : actv[1];
	    html += PlaceColorBlob(bx[i], y+1+h, bx[i+1]-bx[i], bandsz, col);
	}
	
	html += PlaceSelGlyph(members, x+1, y+1);
    }

    	// Draw in the row headings.
	
    w = parseInt(tblrows[0]); h = parseInt(tblrows[1]);
    bandsz = parseInt(tblrows[2]);
    
    for (var n = 3, r = 0; n < tblrows.length; n += 3, r++) {
    	var x = parseInt(tblrows[n+1]), y = parseInt(tblrows[n+2]);
	
	var urow = tblrows[activity_rowidx[r]*3];
    	var members = QualifyingMolecules(-1, urow);

    	var attr = '';	
	var molpos = activity_molarray.length;
	activity_molarray[molpos] = members;
	var attrid = molpos + ',' + urow + ',this';
	var selkey = ',event.ctrlKey';
	
	if (activity_row != 0) {
	    attr = ' onMouseOver="activity_AxisMouse(' + attrid + ',true)"'
	    	 + ' onMouseOut="activity_AxisMouse(' + attrid + ',false)"';
	}
	attr += ' onClick="activity_AxisClick(' + attrid + selkey + ')"';
	
    	html += PlaceAxisBlob(
	    activity_row == 0, urow,
	    x, y, w, h, '#D0D0D0', attr
	);

	var by;
	if (nshown == 1) {
	    by = [y+1, y+h+1];
	} else if (nshown == 2) {
	    by = [y+1, 0, y+h+1];
	    by[1] = Math.round(0.5 * (by[0] + by[2]));
	} else if (nshown == 3) {
	    by = [y+1, 0, 0, y+h+1];
	    by[1] = Math.round(by[0] + (1/3) * h);
	    by[2] = Math.round(by[0] + (2/3) * h);
	}

	for (var i = 0; i < nshown; i++) {
	    var actv = SummarizeActivity(
	    	members, 
		activity_show[i],
		SCHEME_CODES[activity_scheme[i]],
		activity_invert[i]
	    );
	    var col = actv==null ? '#D0D0D0' : actv[1];
    	    html += PlaceColorBlob(x+1+w, by[i], bandsz, by[i+1]-by[i], col);
	}
	
	html += PlaceSelGlyph(members, x+1, y+1);
    }

    	// Produce a matrix which contains references to estimated activity
	// signal glyphs.

    var pswap = activity_col > activity_row;    	
    var pmtx = new Array(nrows);
    for (var r = 0; r < nrows; r++) {
    	pmtx[r] = new Array(ncols);
	for (var c = 0; c < ncols; c++) {
	    pmtx[r][c] = 0;
	}
    }
    if (nshown == 1 && activity_show[0] <= num_activities) {
	var pij = Math.min(activity_col, activity_row) + '_' 
    		+ Math.max(activity_col, activity_row);
	var preds = GetDataSplit("predictions", "table_" + pij);
    	for (var n = 0; n+2 < preds.length; n += 3) {
	    var pc = preds[n]-1, pr = preds[n+1]-1;
	    var Q = (preds[n+2].split(' '))[activity_show[0]-1];
	    if (pswap) {
	    	pmtx[pc][pr] = Q;
	    } else {
	    	pmtx[pr][pc] = Q;
	    }
	}
    }
	
    	// Now the grid.
	
    var gx = parseInt(tblgrid[0]), gy = parseInt(tblgrid[1]);
    var gw = parseInt(tblgrid[2]), gh = parseInt(tblgrid[3]);
    var dx = parseFloat(tblgrid[4]), dy = parseFloat(tblgrid[5]);

    for (var r = 0; r < nrows; r++) {
    	if (sideflaps) {
	    var y = gy + r * dy, w = 0.5 * gw - 1;
	    html += PlaceColorBlob(gx - 0.5 * dx, y, w, gh, '#E0E0E0');
	    html += PlaceColorBlob(gx + dx*ncols, y, w-1, gh, '#E0E0E0');
	}
    
    	for (var c = 0; c < ncols; c++) {
	    var x = Math.round(gx + c * dx);
	    var y = Math.round(gy + r * dy);
	
	    var urow = tblrows[activity_rowidx[r]*3];
	    var ucol = tblcols[activity_colidx[c]*3];
	    var members = QualifyingMolecules(ucol, urow);

	    if (members == null) { // there were never any
		html += PlaceColorBlob(x, y, gw, gh, '#E0E0E0');
    	    	if (pmtx[r][c] != 0) {
		    html += PlaceSignalBlob(pmtx[r][c], x, y, gw, gh);
		}
		continue;
	    } else if (members.length == 0) { // all molecules got filtered
	    	html += PlaceTextBlob('',x,y,gw-2,gh-2,'#E0E0E0',1,null,'');
		continue;
	    }
	    
	    var molpos = activity_molarray.length;
	    activity_molarray[molpos] = members;
	    var attrid = molpos + ',this';
	    var selkey = ',event.ctrlKey';
	    var attr = ' onMouseOver="activity_CellMouse(' + attrid + ',true)"'
	    	     + ' onMouseOut="activity_CellMouse(' + attrid + ',false)"'
		     + ' onClick="activity_CellClick(' + attrid+selkey + ')"';

    	    if (activity_cartwheels && activity_zoom >= 100) {
    	    	// (NB: currently not able to draw zoomed cartwheels)
		html += ComposeCartwheel(members, x, y, gw, gh, attr);
	    } else if (nshown == 1) {
	    	var actv = SummarizeActivity(
		    members, 
		    activity_show[0],
		    SCHEME_CODES[activity_scheme[0]],
		    activity_invert[0]
		);
		if (actv == null) { // no activity data here
	    	    html += PlaceTextBlob(
		    	'', x, y, gw-2, gh-2, '#E0E0E0', 1, null, attr
		    );
		} else {
		    if (activity_zoom < 100) actv[0] = ''; // too small
		    html += PlaceTextBlob(
		    	actv[0], x, y, gw-2, gh-2, actv[1], 1, null, attr
		    );
		}
	    } else {
	    	var barcols = new Array(nshown);
		for (var n = 0; n < nshown; n++) {
		    barcols[n] = SummarizeActivity(
		    	members, 
			activity_show[n],
			SCHEME_CODES[activity_scheme[n]],
			activity_invert[n]
		    );
		    barcols[n] = barcols[n] ? barcols[n][1] : '#E0E0E0';
		}
		html += PlaceColorBars(
		    barcols, x, y, gw-2, gh-2, attr
		);
	    }
	    html += PlaceSelGlyph(members, x, y);
	}
    }

    html += '</ul></td></tr></table>';

    return html;
}

// Returns HTML which contains a positioned table, and optionally a non-
// opaque background and border.

function PlaceTextBlob(txt, x, y, w, h, backgr, border, valign, attr)
{
    if (valign) valign = ' valign="' + valign + '"';
    var html = '<li class="olblk" style="'
    	     + 'left: ' + x + 'px; top: ' + y + 'px;'
	     + ' width: ' + w + 'px; height: ' + h + 'px;'
    	     + ' background-color: ' + backgr + ';'
	     + (border ? ' border-color: #000000; border-width: 1px;' 
		    : 'border-width: 0px;')
	     + '"' + attr + '><table class="oltbl"'
             + ' style="width: ' + w + 'px; height: ' + h + 'px;'
	     + ' border-width: 0;">'
	     + '<tr><td align="center"' + valign + '>' + txt
	     + '</td></tr></table></li>';
    return html;
}

// Returns a formulation which involves a scaffold/R-group image being
// positioned in the center of a specified rectangle.

function PlaceAxisBlob(isscaff, idx, x, y, w, h, backgr, attr)
{
    var fn, isz;
    var sfx = activity_zoom <= 100 ? 'sm' : '';
    if (isscaff) {
    	fn = 'img/scaffold' + idx + sfx + '.png';
	isz = GetDataSplit("scaffolds", "size" + idx);
    } else {
    	fn = 'img/rgroup' + idx + sfx + '.png';
	isz = GetDataSplit("rgroups", "size" + idx);
    }
    
    var iw = activity_zoom <= 100 ? isz[2] : isz[0];
    var ih = activity_zoom <= 100 ? isz[3] : isz[1];
    
    if (activity_zoom < 100) {
    	iw *= activity_zoom * 0.01;
	ih *= activity_zoom * 0.01;
    }

    var dx = Math.floor(0.5 * (w - iw)),
    	dy = Math.floor(0.5 * (h - ih));

    var style = 'left: ' + x + 'px; top: ' + y + 'px;'
	     + ' width: ' + w + 'px; height: ' + h + 'px;';
    if (!bland) {
	style += ' background-color: ' + backgr + ';'
    } else {
    	style += ' background-color: #ffffff; border-width: 1px;'
    	       + ' border-style: solid; border-color: #808080;';
    }
        
    var html = '<li class="olblk"' + attr + ' style="' + style + '"' + '</li>';
	     
    var imgattr = attr + 'class="olimg"'
    	        + ' width="' + iw + '" height="' + ih + '"';
    html += '<li class="olblk"'
	  + ' style="left: ' + (x+dx+1) + '; top: ' + (y+dy+1) + 'px;'
	  + ' border-width: 0;">'
	  + LinkImageAttr(fn, imgattr, bland)
	  + '</li>';

    return html;   
}

// Creates a colored rectangle with the given properties.

function PlaceColorBlob(x, y, w, h, backgr)
{
    return '<img src="' + StaticPrefix() + 'blank.gif" class="olimg"'
    	     + ' style="left: ' + x + 'px; top: ' + y + 'px;'
	     + ' width: ' + w + 'px; height: ' + h + 'px;'
	     + ' background-color: ' + backgr + ';">';
}

// Appends an indicator of estimated activity within the specified box.

function PlaceSignalBlob(pred, x, y, w, h)
{
    var fn = pred > 0 ? ('sigpos' + pred + '.png')
    	    	      : ('signeg' + (-pred) + '.png');
    var px = Math.round(x + 0.5 * (w - 50));
    var py = Math.round(y + 0.5 * (h - 50));

    var html = '<li class="olblk" style="border-width: 0;'
	     + ' left: ' + px + 'px' + '; top: ' + py + 'px;">'
	     + LinkImageAttr('img/' + fn, 'width="50" height="50"')
	     + '</li>';
    return html;
}

// Generates a sequence of colored bars to fill up a cell.

function PlaceColorBars(barcols, x, y, w, h, attr)
{
    var bx = new Array(barcols.length + 1);
    bx[0] = 0;
    bx[bx.length-1] = w;
    for (var n = 1; n < barcols.length; n++) {
    	bx[n] = Math.round(w * n / barcols.length);
    }
    
    var html = '<li class="olblk" style="left: ' + x + 'px; top: ' + y + 'px;'
	     + ' width: ' + w + 'px; height: ' + h + 'px;"' + attr + '>';

    for (var n = 0; n < barcols.length; n++) {
    	html += '<img src="' + StaticPrefix() + 'blank.gif" class="olimg"'
    	     + ' style="left: ' + bx[n] + 'px; top: 0px;'
	     + ' width: ' + (bx[n+1]-bx[n]) + 'px; height: ' + h + 'px;'
	     + ' background-color: ' + barcols[n] + ';'
	     + ' border-width: 1px;">';
    }
    html += '</li>';

    return html;
}

// If there are any molecules indicated, and any of them are selected, returns
// the encoding for a glyph to denote this.

function PlaceSelGlyph(molidx, x, y)
{
    if (molidx == null || molidx.length == 0) return '';
    
    var all = true, any = false;
    for (var n = 0; n < molidx.length; n++) {
	if (IsMoleculeSelected(molidx[n])) {
	    any = true;
	} else {
	    all = false;
	}
    }
    
    var fn;
    if (all) fn = 'img/sel_all.png';
    else if (any) fn = 'img/sel_some.png';
    else return '';
    
    var imgattr = 'class="olimg" width="12" height="12"';
    var html = '<li class="olblk" style="border-width: 0;'
	     + ' left: ' + x + 'px; top: ' + y + 'px;'
	     + ' width: 12px; height: 12px;">'
	     + LinkImageAttr(fn, imgattr) + '</li>';
    return html;
}

// For the current table, return the set of molecules at a particular cell.
// If the cell never contained any molecules, the return value is null. If
// all of the molecules were filtered by constraints, result is a zero-length
// array. Otherwise it is a list of molecule indices.

function QualifyingMolecules(colidx, rowidx)
{
    var molidx = new Array(0);
    var anything = false;

    	// Fetch the molecules.

    for (var n = 0; n < num_molecules; n++) {
    	if (molecule_scaffold[n] == 0) continue; // never qualifies
    
    	if (activity_col == 0) {
	    if (colidx < 0) {}
	    else if (molecule_scaffold[n] != colidx) continue;
	} else {
	    if (colidx < 0 && molecule_rgroups[n][activity_col-1] > 0) {}
	    else if (molecule_rgroups[n][activity_col-1] != colidx) continue;
	}

    	if (activity_row == 0) {
	    if (rowidx < 0) {}
	    else if (molecule_scaffold[n] != rowidx) continue;
	} else {
	    if (rowidx < 0 && molecule_rgroups[n][activity_row-1] > 0) {}
	    else if (molecule_rgroups[n][activity_row-1] != rowidx) continue;
	}

    	anything = true; // got this far, means that either there are molecules,
	    	    	 // or at least there could have been...
	
	var violating = false;
	for (var i = 0; i < activity_naxes; i++) {
	    if (activity_constraints[i].length == 0) continue;
	    
	    var found = false;
	    
	    for (var j = 0; j < activity_constraints[i].length; j++) {
		var cval = activity_constraints[i][j];
	    	if (i == 0 && molecule_scaffold[n] == cval) {
		    found = true;
		    break;
		} else if (i > 0 && molecule_rgroups[n][i-1] == cval) {
		    found = true;
		    break;
		}
	    }
	    
	    if (!found) {violating = true; break;}
	}
	if (violating) continue;
	
	molidx.push(n+1);
    }
    
    if (!anything) return null;
    
    	// Now sort them in order of the selected activities.
	
    var normact1 = new Array(), normact2 = new Array(), normact3 = new Array();
    for (var n = 0; n < molidx.length; n++) {
	normact1.push(GetActivityNorm(molidx[n], activity_show[0]));
	normact2.push(GetActivityNorm(molidx[n], activity_show[1]));
	normact3.push(GetActivityNorm(molidx[n], activity_show[2]));
    }
    
    var p = 0;
    
    while (p < molidx.length-1) {
    	var swap = false;
	if (normact1[p] < normact1[p+1]) swap = true;
	else if (normact1[p] < normact1[p+1]) {
	    if (normact2[p] < normact2[p+1]) swap = true; 
	    else if (normact2[p] == normact2[p]) {
		if (normact3[p] < normact3[p+1]) swap = true;
	    }
	}
	
    	if (swap) {
	    var i = molidx[p]; molidx[p] = molidx[p+1]; molidx[p+1] = i;
	    i = normact1[p]; normact1[p] = normact1[p+1]; normact1[p+1] = i;
	    i = normact2[p]; normact2[p] = normact2[p+1]; normact2[p+1] = i;
	    i = normact3[p]; normact3[p] = normact3[p+1]; normact3[p+1] = i;
	    if (p > 0) p--;
	}
	else p++;
    }
    
    return molidx;
}

function NumQualifyingMolecules(ucol, urow)
{
    var molidx = QualifyingMolecules(ucol, urow);
    return !molidx ? 0 : molidx.length;
}

// For a list of molecule indices and an activity number, compose a textual
// description of the set, and an average color suitable for use as the
// background.

function SummarizeActivity(molidx, actnum, scheme, invcol)
{
    if (molidx == null) return null;

    	// Figure out the activity average and range.

    var actsum = 0, actcount = 0;
    var minval = null, maxval = null; // (in un-normalized units)
    
    for (var n = 0; n < molidx.length; n++) {
    	var actval = GetActivityValue(molidx[n], actnum);
	if (actval == '#') continue; // not-defined
	actval = parseFloat(actval);
	
	if (minval == null || actval < minval) minval = actval;
	if (maxval == null || actval > maxval) maxval = actval;
	
	// !!! actsum += NormalizeActivity(actval, activity_valstyle[actnum-1]);
	if (activity_valstyle[actnum-1] != 'sel') {
	    actval = NormUnits(activity_spec[actnum-1], actval);
	}
	actsum += actval;
	
    	actcount++;
    }
    
    if (actcount == 0) return null;
    	
    	// Format the text.

    var pfx = '', part1, part2;
    if (activity_valstyle[actnum-1] == 'sel') {
	part1 = minval < 0.5 ? (100-minval*200) : (minval*200-100);
	part2 = maxval < 0.5 ? (100-maxval*200) : (maxval*200-100);
	part1 = (part1>0 ? '+' : '') + part1.toFixed(0) + '%'; 
	part2 = (part2>0 ? '+' : '') + part2.toFixed(0) + '%'; 
    } else {
	part1 = minval.toPrecision(3);
	part2 = maxval.toPrecision(3);
    }
    
    var txt = pfx + part1;
    var maxch = txt.length;
    if (actcount >= 2) {
	maxch = Math.max(part1.length, part2.length);
	
	if (actcount == 2) {
	    txt = pfx + part1 + ', ' + part2;
	} else {
	    txt = pfx + part1 + ' .. ' + part2;
	}
    }
    
    actsum /= actcount;
    if (invcol) actsum = 1-actsum;
    var col = ColorForActivity(actsum, scheme);

    	// See if the text needs to be white-on-black.

    var style = maxch > 6 ? 'font-size: 0.6em;' : 'font-size: 0.7em;';
    if (activity_zoom >= 200) {
    	style = 'font-size: 1em;';
    }
    
    var r = parseInt("0x" + col.substring(1, 3));
    var g = parseInt("0x" + col.substring(3, 5));
    var b = parseInt("0x" + col.substring(5, 7));
    if (r < 0x80 && g < 0x80 && b < 0x80) {
    	style += ' color: #FFFFFF;';
    }
    txt = '<span style="' + style + '">' + txt + '</span>';
    
    return new Array(txt, col);
}

// Returns an array of size equal to the number of activities shown. Each of
// these is an array of one color per molecule. Missing activities are transp.

function DetermineBandColors(molidx)
{
    var nshown = 1;
    if (activity_show[1] > 0) nshown = 2;
    if (activity_show[2] > 0) nshown = 3;
    
    var bandcols = new Array(nshown);
    for (var i = 0; i < nshown; i++) {
    	bandcols[i] = new Array(molidx.length);
    	var actnum = activity_show[i];
	for (var j = 0; j < molidx.length; j++) {
	    var actval = GetActivityValue(molidx[j], actnum);
	    if (actnum <= num_activities) {
		actval = NormUnits(activity_spec[actnum-1], actval);
	    }
	    if (activity_invert[i]) actval = 1-actval;
	    bandcols[i][j] = ColorForActivity(
		actval, 
		SCHEME_CODES[activity_scheme[i]]
	    );
	}
    }
    return bandcols;
}

// Construct a cartwheel picture out of composite page segments, using the
// indicated molecules.

var spoke_baseidx = null;

function ComposeCartwheel(molidx, x, y, w, h, attr)
{
    molidx = molidx.join("*").split("*"); // shallow copy

    if (!spoke_baseidx) {
    	spoke_baseidx = new Array(16);
	spoke_baseidx[0] = 0;
	for (var n = 1; n < 16; n++) {
	    spoke_baseidx[n] = spoke_baseidx[n-1] + n;
	}
    }

    	// Fetch normalized activity values for each of the molecules.

    var nshown = 1;
    if (activity_show[1] > 0) nshown = 2;
    if (activity_show[2] > 0) nshown = 3;
    var molact = new Array(molidx.length);
    for (var i = 0; i < molidx.length; i++) {
    	molact[i] = new Array(nshown);
	for (var j = 0; j < nshown; j++) {
	    var v = GetActivityValue(molidx[i], activity_show[j]);
	    if (activity_valstyle[activity_show[j]-1] == 'sel') {
		// !?!?!
	    } else {
		v = NormUnits(activity_spec[activity_show[j]-1], v);
	    }
	    if (activity_invert[j]) v = 1-v;
	    molact[i][j] = v;
	}
    }

    	// If the number of molecules exceeds that magic number of 16,
	// then collapse them into clusters. We can assume that the molecules
	// are sorted in order of selected activities.

    var A = -1;
    while (molidx.length > 16) {
    	if (A < 0) A = molidx.length-1;
	
	    // Try to find a value of B such that B<A, and both A & B have
	    // the same pattern of null values... (we don't like merging
	    // nulls with non-nulls).
	
	var B = A - 1;
	while (B >= 0) {
	    var compat = (molact[A][0] == '#') == (molact[B][0] == '#');
	    if (compat && nshown > 1) {
	    	compact = (molact[A][1] == '#') == (molact[B][1] == '#');
	    }
	    if (compat && nshown > 2) {
	    	compact = (molact[A][2] == '#') == (molact[B][2] == '#');
	    }
	    if (compat) break;
	    B--;
	}
	if (B < 0) B = A - 1;
	
	    // Now merge the two together.
	    
	for (var n = 0; n < nshown; n++) {
	    if (molact[B][n] == '#') {
		molact[B][n] = molact[A][n];
	    } else if (molact[A][0] != '#') {
		molact[B][n] = 0.5 * (molact[A][n] + molact[B][n]);
	    }
	}
	
	molidx.splice(A, 1);
	molact.splice(A, 1);
	A--;
    }	

    	// Put together the images.

    var scale = activity_zoom < 100 ? activity_zoom*0.01 : 1;
    var cw = 48 * scale;
    var ch = 48 * scale;

    var html = '<li class="olblk"' + attr
    	     + ' style="left: ' + (x-1) + 'px; top: ' + (y-1) + 'px;'
	     + ' width: ' + w + 'px; height: ' + h + 'px;'
	     + ' background-color: #E0E0E0;">';
    var ox = Math.round(0.5 * (w - cw)), oy = Math.round(0.5 * (h - ch));
    
    for (var i = 0; i < molidx.length; i++) {
    	for (var j = 0; j < nshown; j++) {
	    if (molact[i][j] == '#') continue; // null spoke
	    var scheme = activity_scheme[j]-1;
	    /* !!!
	    var shade = molact[i][j] < 0.278 ? 0
	    	      : molact[i][j] < 0.389 ? 1
	    	      : molact[i][j] < 0.500 ? 2
	    	      : molact[i][j] < 0.583 ? 3
	    	      : molact[i][j] < 0.639 ? 4
	    	      : molact[i][j] < 0.694 ? 5
	    	      : molact[i][j] < 0.750 ? 6
	    	      : molact[i][j] < 0.833 ? 7
	    	      : molact[i][j] < 0.944 ? 8
		      :                        9;*/
	    var shade = Math.round(molact[i][j] * 9);
		      
	    var rung = j == 0 && nshown == 1 ? 0
	    	     : j == 0 && nshown == 2 ? 1
		     : j == 1 && nshown == 2 ? 2
		     : j == 0 && nshown == 3 ? 3
		     : j == 1 && nshown == 3 ? 4
		     : /*  == 2 && == 3  */    5;
	    var spoke = spoke_baseidx[molidx.length-1] + i;
	    var pos = scheme*8160 + shade*816 + rung*136 + spoke;
	    var spi = 1 + Math.floor(pos / (20*20));
	    pos -= (spi-1) * (20*20);
	    var spx = 48 * (pos%20);
	    var spy = 48 * Math.floor(pos/20);

	    var backgr = 'url(img/cartwheel' + spi + '.png)'
	    	       + ' -' + spx + 'px -' + spy + 'px no-repeat';
	    html += '<img src="' + StaticPrefix() + 'blank.gif"'
		  + ' class="olimg" style="left: ' + ox + 'px;'
		  + ' top: ' + oy + 'px;'
		  + ' width: ' + cw + 'px; height: '+ ch + 'px;'
		  + ' background: ' + backgr + '">';
	}
    }
    
    html += '</li>';
    return html;
}

// Given that the selection of axis and sort order is what it is, return a list
// of permutations that reflect any reordering of the content. The value of
// idx[n] is a 1-based reference to the original scaffold/R-group which belongs
// at the position 'n' (0-based), i.e. an array of {1,2,...,N} means the
// original order.

function AxisPermutations(axis)
{
    var pfx = "table_" + activity_col + "_" + activity_row;
    var tblsz = GetDataSplit("correlation", pfx + "_size");
    var tblaxis = GetDataSplit("correlation", pfx + "_" + axis + "s");
    var sz = axis == 'col' ? tblsz[2] : /* 'row' */ tblsz[3];
    var sortby = axis == 'row' ? activity_sortrow : activity_sortcol;

    var anyconstr = false;
    for (var n = 0; n < activity_naxes; n++) {
	if (   activity_constraints[n] != null 
	    && activity_constraints[n].length > 0) {
	    anyconstr = true;
	    break;
	}
    }
    	
    	// If no sorting is desired, just return with an identity vector.

    var idx = new Array(sz);
    for (var n = 0; n < sz; n++) idx[n] = n+1;
    if (sortby == 0 && !anyconstr) return idx;

    	// Obtain the numerical indices for sorting.

    var sortval = new Array(sz);
    for (var n = 0; n < sz; n++) {
    	var ucol = axis == 'row' ? -1 : tblaxis[3+3*n];
	var urow = axis == 'col' ? -1 : tblaxis[3+3*n];

	if (sortby == 0) {
	    sortval[n] = n;
	} else if (sortby == 1) {
	    sortval[n] = SortValPopularity(ucol, urow);
	} else if (sortby == 2) {
	    sortval[n] = SortValWeight(ucol, urow);
	} else if (sortby == 3) {
	    sortval[n] = SortValActivity(ucol, urow);
	}
	
	if (NumQualifyingMolecules(ucol, urow) == 0) {
	    sortval[n] += 1E6;
	}
    }
    	// Do the actual sorting.
    
    var p = 0;
    while (p < sz-1) {
    	if (sortval[p] > sortval[p+1]) {
	    arraySwap(idx, p, p+1);
	    arraySwap(sortval, p, p+1);
	    if (p > 0) p--;
	} else p++;
    }
    
    return idx;
}

// Return a sortable number which is representative of the popularity of a
// row/column, based on the number of molecules currently qualifying for
// membership.

function SortValPopularity(ucol, urow)
{
    // !!! return -QualifyingMolecules(ucol, urow);
    return -NumQualifyingMolecules(ucol, urow);
}

// Return a sortable number which is the molecular weight of the fragment,
// where the smaller ones are listed first.

function SortValWeight(ucol, urow)
{
    var group, idx;
    if (ucol >= 0) {
    	group = activity_col == 0 ? "scaffolds" : "rgroups";
	idx = ucol;
    } else {
    	group = activity_row == 0 ? "scaffolds" : "rgroups";
	idx = urow;
    }
    return parseFloat(GetDataSplit(group, "calcprops" + idx)[0]);
}

// Return a sortable number which is indicative of the average activity of the
// molecules contained within the row/column.

function SortValActivity(ucol, urow)
{
    var molidx = QualifyingMolecules(ucol, urow);
    if (!molidx) return 0;
    var numer = 0, denom = 0;
    for (var n = 0; n < molidx.length; n++) {
    	if (activity_value[molidx[n]-1][activity_show[0]-1] == '#') continue;
    	var v = parseFloat(activity_norm[molidx[n]-1][activity_show[0]-1]);

	if (activity_show[1] > 0 && 
	    activity_value[molidx[n]-1][activity_show[1]-1] != '#') {
	    v += activity_norm[molidx[n]-1][activity_show[1]-1] * 1E-3;
	}
	
	if (activity_show[2] > 0 && 
	    activity_value[molidx[n]-1][activity_show[2]-1] != '#') {
	    v += activity_norm[molidx[n]-1][activity_show[2]-1] * 1E-6;
	}

	numer += v;
	denom ++;
    }
    return denom == 0 ? 0 : -numer/denom;
}

// Returns the activity for a given molecule/activity index combination.
// If there is no data, returns '#'. If this is a selectivity value, computes
// the selectivity from the underlying data.

function GetActivityValue(molnum, actnum)
{
    if (actnum == 0) return '#';
    if (activity_valtype[actnum-1] == 'activity') {
	return activity_value[molnum-1][actnum-1];
    } 
    
	// Fetch the underlying activity data of the two to compare.
    
    var s1 = activity_valsrc1[actnum-1];
    var s2 = activity_valsrc2[actnum-1];
    var v1 = activity_value[molnum-1][s1-1];
    var v2 = activity_value[molnum-1][s2-1];
    if (v1 == '#' || v2 == '#') return '#';
    
    v1 = NormUnits(activity_spec[s1-1], v1);
    v2 = NormUnits(activity_spec[s2-1], v2);
    
    return 0.5 + 0.5 * (v1 - v2);
    
    /*
	// Convert them both to 'K' type units, i.e. non-log, same units.
	
    // !!!!!!!!!!!!!!!!!!! zogzog
    if (activity_style[s1-1] == 'K_u') {
	v1 = v1 * 1E-6;
    } else if (activity_style[s1-1] == 'pK') {
	v1 = Math.pow(10, -v1);
    }
    
    if (activity_style[s2-1] == 'K_u') {
	v2 = v2 * 1E-6;
    } else if (activity_style[s2-1] == 'pK') {
	v2 = Math.pow(10, -v2);
    }
    
    return v2 == 0 ? 0 : v2 / v1; // (NB: v2/v1 because lower is better...)
    */
}

// Return a normalized version of the indicated activity, or zero for none.

function GetActivityNorm(molnum, actnum)
{
    /* !!!
    var v = GetActivityValue(molnum, actnum);
    if (v == '#') return 0;
    var u = actnum <= num_activities ? activity_type[actnum-1] : 'sel';
    return NormalizeActivity(v, u);*/
    
    var v = GetActivityValue(molnum, actnum);
    if (v == '#') return 0;
    if (activity_valstyle[actnum] != 'sel') {
	v = NormUnits(activity_spec[actnum-1], v);
    }
    return v;
}

// For a group of molecules, cycles the selection between {all/none}, or
// {all/none/some}, in some cases.

function CycleSelection(molidx)
{
    if (molidx == null || molidx.length == 0) return;

    var all = true, any = false;
    for (var n = 0; n < molidx.length; n++) {
	if (IsMoleculeSelected(molidx[n])) {
	    any = true;
	} else {
	    all = false;
	}
    }
    
    if (!all) {
	for (var n = 0; n < molidx.length; n++) {
	    SelectMolecule(molidx[n], true);
	}
    } else {
	for (var n = 0; n < molidx.length; n++) {
	    SelectMolecule(molidx[n], false);
	}
    }
    Node('section_activity').innerHTML = ComposeActivityTable();
}

// ----------------------- Composition of a Constraints -----------------------

// Puts together the constraint HTML for the current table.

function ComposeConstraints()
{
    var html = '<p><table class="infodata"><tr>';
    
    for (var n = 0; n < activity_naxes; n++) {
    	//if (n == activity_row || n == activity_col) continue;
	html += '<td class="ihdr">' + activity_axes[n] + '</td>';

	var attr = '';
	if (bland) {
	    attr = ' style="background: #ffffff";';
	}
	html += '<td class="inml"' + attr
	      + ' onClick="activity_ConstrOpen(' + n + ',this)"'
	      + ' onMouseOver="activity_ConstrMouse(this,true)"'
	      + ' onMouseOut="activity_ConstrMouse(this,false)">';
    	
	var constr = activity_constraints[n];
    	if (constr == null || constr.length == 0) {
	    html += '&nbsp;none&nbsp;';
	} else {
	    for (var i = 0; i < constr.length; i++) {
	    	var fn, isz;
		if (n == 0) {
		    fn = 'img/scaffold' + constr[i] + 'sm.png';
		    isz = GetDataSplit("scaffolds", "size" + constr[i]);
		} else {
		    fn = 'img/rgroup' + constr[i] + 'sm.png';
		    isz = GetDataSplit("rgroups", "size" + constr[i]);
		}
		var attr = 'width="' + isz[2] + '" height="' + isz[3] + '"';
		html += LinkImageAttr(fn, attr, bland) + " ";
	    }
	}
	
	html += '</td>'
    }
    
    html += '</tr></table>';
    
    return html;
}

// ---------------------------------- Events ----------------------------------

// User has changed one of the axis selectors.

function activity_ChangeAxis(tgt)
{
    var nodes = tgt.getElementsByTagName('option'), seltxt = null;
    for (var n = 0; n < nodes.length; n++) {
    	if (nodes[n].selected) {
	    seltxt = nodes[n].innerHTML;
	    break;
	}
    }
    var selnum = seltxt == 'Scaffold' ? 0 : parseInt(seltxt.substring(1));

    if (tgt.parentNode.id == 'actsel_row') {
    	activity_row = selnum;
	Node("actsel_row").innerHTML = ComposeAxisList('row');
	if (activity_col == activity_row) {
	    activity_col = activity_row == 0 ? 1 : 0;
	}
	Node("actsel_col").innerHTML = ComposeAxisList('col');
    } else { // 'actsel_col'
    	activity_col = selnum;
	Node("actsel_col").innerHTML = ComposeAxisList('col');
    }

    activity_rowidx = AxisPermutations('row');
    activity_colidx = AxisPermutations('col');

    Node('section_activity').innerHTML = ComposeActivityTable();
    Node("actbar_corr").innerHTML = ActivityBannerTitle();
    if (activity_naxes > 2) {
    	Node('section_constraints').innerHTML = ComposeConstraints();
    }
    
    Node("constraints").style.visibility = 'hidden';
}

// User has changed one of the activities-to-show.

function activity_ChangeShow(tgt)
{
    var nodes = tgt.getElementsByTagName('option'), seltxt = null;
    for (var n = 0; n < nodes.length; n++) {
    	if (nodes[n].selected) {
	    seltxt = nodes[n].innerHTML;
	    break;
	}
    }
    var selnum = 0;
    for (var n = 0; n < activity_valname.length; n++) {
    	if (seltxt == activity_valname[n]) {
	    selnum = n+1;
	    break;
	}
    }
    
    if (tgt.parentNode.id == 'actsel_show1') {
    	activity_show[0] = selnum;
    } else if (tgt.parentNode.id == 'actsel_show2') {
    	activity_show[1] = selnum;
    } else if (tgt.parentNode.id == 'actsel_show3') {
    	activity_show[2] = selnum;
    }
    
    if (activity_show[1] == activity_show[0]) activity_show[1] = 0;
    if (activity_show[2] == activity_show[0]
     || activity_show[2] == activity_show[1]) activity_show[2] = 0;
    if (activity_show[1] == 0) activity_show[2] = 0;

    for (var n = 1; n <= activity_nselectors; n++) {    
    	Node('actsel_show' + n).innerHTML = ComposeShowList(n);
    	Node("actsel_scheme" + n).innerHTML = ComposeSchemeList(n);
    	Node("actsel_col" + n).innerHTML = ComposeColorSample(n);
    }
    
    activity_rowidx = AxisPermutations('row');
    activity_colidx = AxisPermutations('col');
    
    Node('section_activity').innerHTML = ComposeActivityTable();

    Node("constraints").style.visibility = 'hidden';
}

// User has clicked on a different color mode.

function activity_ChangeMode(shownum, newmode)
{
    activity_scheme[shownum-1] = newmode;

    Node("actsel_scheme" + shownum).innerHTML = ComposeSchemeList(shownum);
    Node("actsel_col" + shownum).innerHTML = ComposeColorSample(shownum);
    
    Node('section_activity').innerHTML = ComposeActivityTable();

    Node("constraints").style.visibility = 'hidden';
}

// User has toggled an invert button.

function activity_ChangeInvert(shownum, source)
{
    activity_invert[shownum-1] = source.checked;

    Node("actsel_scheme" + shownum).innerHTML = ComposeSchemeList(shownum);
    Node("actsel_col" + shownum).innerHTML = ComposeColorSample(shownum);
    
    Node('section_activity').innerHTML = ComposeActivityTable();

    Node("constraints").style.visibility = 'hidden';
}

// When one of the activity display style buttons is pressed (i.e. cartwheels
// or not).

function activity_ChangeDisplay(displ)
{
    if (displ == 1 && ieVersion > 0 && ieVersion < 7) {
    	alert('The cartwheel-style activity display\n'
	    + 'cannot be rendered effectively on versions\n'
	    + 'of Internet Explorer 6 or earlier.');
	return;
    }
    
    activity_cartwheels = (displ == 1);
    Node("actsel_disp0").checked = !activity_cartwheels;
    Node("actsel_disp1").checked = activity_cartwheels;
    
    Node('section_activity').innerHTML = ComposeActivityTable();

    Node("constraints").style.visibility = 'hidden';
}

// When the zoom level is changed.

function activity_ChangeZoom(zoom)
{
    if (zoom < 100 && ieVersion > 0 && ieVersion < 7) {
    	alert('The zoom-level cannot be reduced on versions\n'
	    + 'of Internet Explorer 6 or earlier.');
	return;
    }

    activity_zoom = zoom;
    Node("actsel_zoom25").checked = (activity_zoom == 25);
    Node("actsel_zoom50").checked = (activity_zoom == 50);
    Node("actsel_zoom100").checked = (activity_zoom == 100);
    Node("actsel_zoom200").checked = (activity_zoom == 200);
    
    Node('section_activity').innerHTML = ComposeActivityTable();

    Node("constraints").style.visibility = 'hidden';
}

// Mouse moved into/out of a cell with molecules in it.

function activity_CellMouse(molpos, tgt, isInside)
{
    if (isInside) {
    	var xyt = GetPositionForPopup(tgt);
	var molidx = activity_molarray[molpos];
	var bandcols = DetermineBandColors(molidx);
	PopupCellMolecules(molidx, xyt[0], xyt[1], xyt[2], bandcols);
    } else {
	PopdownCell();
    }
}

// Mouse was clicked on a cell with molecules in it.

function activity_CellClick(molpos, tgt, ctrlKey)
{
    Node("constraints").style.visibility = 'hidden';
    var molidx = activity_molarray[molpos];
    if (!ctrlKey) {
	var bandcols = DetermineBandColors(molidx);
	PopupPersistentMolecules(molidx, bandcols);
    } else {
	CycleSelection(molidx);
    }
}

// Mouse moved into/out of one of the axis headings.

function activity_AxisMouse(molpos, rgidx, tgt, isInside)
{
    if (isInside) {
    	var xyt = GetPositionForPopup(tgt);
	var molidx = activity_molarray[molpos];
	var bandcols = DetermineBandColors(molidx);
	var ashow = new Array();
	for (var n = 0; n < 3; n++) {
	    var a1 = 0, a2 = 0;
	    if (activity_show[n] <= num_activities) {
		a1 = activity_show[n];
	    } else {
		a1 = activity_valsrc1[activity_show[n]-1];
		a2 = activity_valsrc2[activity_show[n]-1];
	    }
	    if (a1 > 0 && indexOf(ashow, a1) < 0) ashow.push(a1);
	    if (a2 > 0 && indexOf(ashow, a2) < 0) ashow.push(a2);
	}
	var histo = FormatLinearHistograms(
	    molidx, ashow, activity_scheme
	);
	var props = FormatCalculatedProperties(
	    GetDataSplit("rgroups", "calcprops" + rgidx)
	);
	var heading = new Array(
	    '<div align="center">' + histo + '</div>',
	    '<div align="left">' + props + '</div>'
	);
	PopupCellMolecules(molidx, xyt[0], xyt[1], xyt[2], bandcols, heading);
    } else {
	PopdownCell();
    }
}

// Mouse was clicked on a cell with molecules in it.

function activity_AxisClick(molpos, rgidx, tgt, ctrlKey)
{
    Node("constraints").style.visibility = 'hidden';
    var molidx = activity_molarray[molpos];
    if (!ctrlKey) {
	var bandcols = DetermineBandColors(molidx);
	PopupPersistentMolecules(molidx, bandcols);
    } else {
	CycleSelection(molidx);
    }
}

// Mouseover one of the constraints...

function activity_ConstrMouse(tgt, isInside)
{
    if (isInside) {
    	tgt.style.backgroundColor = '#C0D0D0';
	tgt.style.cursor = 'pointer';
    } else {
    	tgt.style.backgroundColor = '#E8E8E8';
	tgt.style.cursor = 'default';
    }
}

// Clicked on a constraint, so popup the window.

function activity_ConstrOpen(whichAxis, tgt)
{
    activity_edconstr = activity_constraints[whichAxis].concat();
    
    var assnidx = new Array(), assnfn = new Array(), assnattr = new Array();
    
    if (whichAxis == 0) {
    	for (var n = 0; n < num_scaffolds; n++) {
	    assnidx.push(n+1);
	    assnfn.push('img/scaffold' + (n+1) + 'sm.png');
	    var isz = GetDataSplit("scaffolds", "size" + (n+1));
	    assnattr.push('width="' + isz[2] + '" height="' + isz[3] + '"');
	}
    } else {
    	for (var n = 0; n < num_molecules; n++) {
	    var rg = molecule_rgroups[n][whichAxis-1];
	    if (rg == 0) continue;
	    if (indexOf(rg, assnidx) >= 0) continue; // already got one
	    assnidx.push(rg);
	    assnfn.push('img/rgroup' + rg + 'sm.png');
	    var isz = GetDataSplit("rgroups", "size" + rg);
	    assnattr.push('width="' + isz[2] + '" height="' + isz[3] + '"');
	}
    }

    var sz = assnidx.length;
    if (sz <= 1) return; // hmmmm...

    var cols = sz, rows = 1;
    if (cols > 3) {
	cols = Math.min(6, Math.ceil(Math.sqrt(sz)));
	rows = Math.ceil(sz / cols);
    }

    var html = '<table style="border-width: 1px; border-collapse: collapse;'
	     + ' border-style: solid; border-color: #000000;">'
	     + '<tr><td colspan="' + cols + '">';
    
    var btn1 = '<input type="button" value="Clear"'
    	     + ' onClick="activity_ConstrClear()"'
    	     + '></input>';
    var btn2 = '<input type="button" value="Cancel"'
    	     + ' onClick="activity_ConstrClose('+whichAxis+',false)"></input>';
    var btn3 = '<input type="button" value="Apply"'
    	     + ' onClick="activity_ConstrClose('+whichAxis+',true)"></input>';


    html += '<table width="100%"><tr><td><b>Select ' 
    	  + activity_axes[whichAxis]
	  + ' Constraints</td><td align="right">'
	  + btn1 + " " + btn2 + " " + btn3 + '</td></table>'
	  + '</td></tr>';
    
    for (var pos = 0, r = 0; r < rows; r++) {
	html += "<tr>";
	for (var c = 0; c < cols; c++, pos++) {
	    if (pos >= sz) {
		html += '<td class="constrempty"></td>';
		continue;
	    }
	    var sel = indexOf(assnidx[pos], activity_edconstr)>=0;
	    var bckgr = sel ? '#FFFFFF' : '#D0E0FF';
    	    var param = 'this,' + assnidx[pos] + ',' + whichAxis;
	    html += '<td id="constrcell_' + assnidx[pos] + '"'
	    	  + ' class="constrfull" height="50"'
	    	  + ' style="background-color: ' + bckgr + ';"'
		  + ' onClick="activity_ConstrCellClick(' + param + ')"'
		  + ' onMouseOver="activity_ConstrCellMouse('+ param +',true)"'
		  + ' onMouseOut="activity_ConstrCellMouse('+ param +',false)"'
		  + '>' + LinkImageAttr(assnfn[pos], assnattr[pos]) + '</td>\n';
	}
	html += "</tr>";
    }
    
    html += '</table>';
    
    var popup = Node("constraints");
    var xyt = GetPositionForPopup(tgt);
    
    popup.style.left = xyt[0] + 'px';
    popup.style.top = xyt[1] + 'px';
    popup.innerHTML = html;
    popup.style.visibility = 'visible';
    
    var scrw = GetAbsWindowRight() - 1, scrh = GetAbsWindowBottom() - 1;
    if (popup.offsetTop + popup.offsetHeight > scrh) {
	popup.style.top = (scrh - popup.offsetHeight) + 'px';
    } else if (popup.offsetLeft + popup.offsetWidth > scrw) {
	popup.style.left = (scrw - popup.offsetWidth) + 'px';
    } 
    
    if (popup.offsetTop < 0) {
    	popup.style.top = '0px';
    }
}

function activity_ConstrClear()
{
    for (var n = 0; n < activity_edconstr.length; n++) {
    	var node = Node('constrcell_' + activity_edconstr[n]);
	node.style.backgroundColor = '#D0E0FF';
    }
    activity_edconstr = new Array();
}

function activity_ConstrClose(whichAxis, doApply)
{
    Node("constraints").style.visibility = 'hidden';

    if (doApply) {
    	activity_constraints[whichAxis] = activity_edconstr;
	activity_rowidx = AxisPermutations('row');
	activity_colidx = AxisPermutations('col');
    	Node('section_activity').innerHTML = ComposeActivityTable();
    	if (activity_naxes > 2) {
    	    Node('section_constraints').innerHTML = ComposeConstraints();
	}
    }
}

function activity_ConstrCellMouse(tgt, idx, whichAxis, isInside)
{
    var isSelected = indexOf(idx, activity_edconstr) >= 0;
    tgt.style.backgroundColor =
    	isSelected ? "#FFFFFF" : isInside ? "#E0F0FF" : "#D0E0FF";
}

function activity_ConstrCellClick(tgt, idx, whichAxis)
{
    var pos = indexOf(idx, activity_edconstr);
    
    if (pos < 0) {
    	activity_edconstr.push(idx);
	tgt.style.backgroundColor = '#FFFFFF';
    } else {
    	activity_edconstr.splice(pos, 1);
	tgt.style.backgroundColor = '#E0F0FF';
    }
}

// Changed the sort order for one of the axes.

function activity_SortBy(axis, sortby)
{
    if (axis == 'row') {
    	activity_sortrow = sortby;
    } else { // == 'col'
    	activity_sortcol = sortby;
    }
    
    for (var n = 0; n <= 3; n++) {
	Node("sortby_" + axis + n).checked = (n == sortby);
    }

    activity_rowidx = AxisPermutations('row');
    activity_colidx = AxisPermutations('col');

    Node('section_activity').innerHTML = ComposeActivityTable();
}
