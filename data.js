//      data.js        	   Structure-Activity Report JavaScript
//
//	08-mar-2010 (ac) unmatched only downloadable if there are any
//	17-sep-2009 (ac) fixed missing predictions bugout
//	30-jun-2009 (ac) added select all/none; OpenSDF has <scaffold> field
//	31-mar-2009 (ac) SDF links open in new window
//  	10-mar-2009 (ac) reinstated downloadable suggestions
//	16-feb-2009 (ac) fixed selection bug
//  	11-feb-2009 (ac) added IE6-specific hack for searching
//  	11-feb-2009 (ac) fixed CR/LF issue
//	22-jan-2009 (ac) fixed bugs with tolerance
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

var data_loaded = false;
var data_seltick = 0;
var data_groups; // for each scaffold (0=none, 1=first, etc..), contained mols
var scaffolds_xmlHttp;
var data_fetchfiles, data_fetchstring, data_fetchaction, data_window;

function data_Activate()
{
    if (data_loaded && data_seltick == SelectionTick()) return null;
    data_loaded = true;
    data_seltick = SelectionTick();
    
    data_groups = new Array();
    for (var n = 0; n <= num_scaffolds; n++) data_groups.push(new Array());
    for (var n = 1; n <= num_molecules; n++) {
    	data_groups[molecule_scaffold[n-1]].push(n);
    }

    var html = ComposeSectionBar('search', 'Search', true)
	     + ComposeSearchData() + '</div>';
    
    for (var n = 1; n <= num_scaffolds; n++) {
    	html += ComposeSectionBar('data' + n, 'Scaffold ' + n, true)
    	      + ComposeDataGroup(n)
	      + '</div>';
    }
    
    if (scaffold_unassigned) {
	html += ComposeSectionBar('data0', 'No Scaffold', true)
	    + ComposeDataGroup(0)
	    + '</div>';
    }

    html += ComposeSectionBar('downloads', 'Downloads', true)
    	  + ComposeDownloads()
	  + '</div>';

    return html;
}

function data_Deactivate()
{
    data_seltick = SelectionTick();
}

// ---------------------------- Page Construction -----------------------------

// Returns a little search box for finding text fields.

function ComposeSearchData()
{
    var html = '<table><tr><td valign="top">';
    
	// Text search.
    
    if (num_textfields > 0) {
	html += '<p><form onSubmit="data_TextSearch(); return false;">'
	      + 'Search ID Fields: '
	      + '<input type="text" size="20" id="data_search"> '
	      + '<input type="submit" value="Search"></form>';    
    }
    
	// Search numeric fields by equality.
    
    html += '<p><nobr><form onSubmit="data_SearchEquality(); return false;">'
	  + 'Numeric Equality: '
	  + '<select size="1" id="data_numfld">';
    for (var n = 0; n < num_activities; n++) {
	html += '<option>' + activity_name[n] + '</option>';
    }
    html += '</select> Value = '
	  + '<input type="text" size="10" id="data_numval">'
	  + ' &plusmn; <input type="text" size="10" id="data_numtol"> '
          + '<input type="submit" value="Search"></form></nobr>';

	// Search numeric fields by range.

    html += '<p><nobr><form onSubmit="data_SearchRange(); return false;">'
	  + 'Numeric Range: '
	  + '<select size="1" id="data_rangefld">';
    for (var n = 0; n < num_activities; n++) {
	html += '<option>' + activity_name[n] + '</option>';
    }
    html += '</select> Value &ge; '
	  + '<input type="text" size="10" id="data_rangelo">'
	  + ' and &le; <input type="text" size="10" id="data_rangehi"> '
          + '<input type="submit" value="Search"></form></nobr>';

	// Add a radio button pertaining to selection.
	
    html += '<p>Apply to Selection: '
	  + '<input type="radio" name="data_apply" checked'
	  + ' id="data_applyrepl" value="Replace">Replace '
	  + '<input type="radio" name="data_apply"'
	  + ' id="data_applyext" value="Extend">Extend '
	  + '<input type="radio" name="data_apply"'
	  + ' id="data_applyfilt" value="Filter">Filter'
	  + '<input type="radio" name="data_apply"'
	  + ' id="data_applydesel" value="Filter">Deselect';

	// Let the user know how many molecules are selected.
	
    var nsel = NumSelected();
    html += '<p><span id="data_numsel">' + nsel + ' molecule'
	  + (nsel == 1 ? '' : 's') + '</span> selected'
	  + ' <input type="button" value="View"'
	  + ' onClick="data_SelectionView()">'
	  + ' <input type="button" value="OpenSDF"'
	  + ' onClick="data_SelectionOpenSDF()">';
	  
    html += '<p><input type="button" value="Select All Molecules"'
          + ' onClick="data_SelectAll(true)">'
          + ' <input type="button" value="Clear Selection"'
          + ' onClick="data_SelectAll(false)">';

    	// Add some explanatory text.
	
    html += '</td><td valign="top" style="border-width: 1px;'
    	  + ' border-style: solid; border-color: #A0A0C0">';
    
    html += '<p>Searching by ID replaces the selection list with compounds'
          + '  with an exactly identical text field.';
    
    html += '<p>Numeric Equality matches the indicated field by value,'
          + ' with an optional tolerance parameter.';
	  
    html += ' Numeric Range matches the indicated field if it lies between'
    	  + ' the lower and upper limits; if either limit is omitted, it is'
	  + ' open.';
	  
    html += '<p>For numeric searches, Replace overwrites the current selection'
    	  + ' list with those compounds which match the criteria. Extend adds'
	  + ' matching compounds to the selection list. Filter unselects '
	  + ' compounds unless they match. Deselect unselects compounds which'
	  + ' match.';
    
    html += '</td></table>';

    return html;
}

// For a group of molecules corresponding to a scaffold index, show them all
// in tabular form.

function ComposeDataGroup(scaffnum)
{
    var html = '<p><table class="infodata">';

    var tsz = data_groups[scaffnum].length;
    var ncols = Math.min(3, tsz);
    var nrows = Math.ceil(tsz / ncols);
    
    	// Heading.
    
    html += '<tr>';
    for (var c = 0; c < ncols; c++) {
	html += '<td class="ihdr">Structure</td><td class="ihdr">Data</td>';
    }
    html += '</tr>';
    
    	// Content.
    
    for (var r = 0, pos = 0; r < nrows; r++) {
    	html += '<tr>';
	
    	for (var c = 0; c < ncols; c++, pos++) {
	    if (pos >= tsz) {
	    	html += '<td style="border-width: 0;" colspan="2"></td>';
	    	continue;
	    }
	    var molnum = data_groups[scaffnum][pos];
	    var bgcol = IsMoleculeSelected(molnum) ? '#C0E0FF' : '#E8E8E8';
	    var attr = 'width="' + molecule_size[molnum-1][0] + '" '
	    	     + 'height="' + molecule_size[molnum-1][1] + '"';
	    html += '<td class="inml" id="data_mol' + molnum + '"'
		  + ' onClick="data_ClickMol(' + molnum 
		  + ',event.ctrlKey,this)"'
	    	  + ' style="text-align: center;'
	    	  + ' background-color: ' + bgcol + ';">'
	    	  + LinkImageAttr('img/mol' + molnum + '.png', attr)
		  + '</td><td class="inml" style="vertical-align: top;">'
		  + '#' + molnum + '<br>'
		  + FormatMoleculeActivities(molnum, 0)
		  + '</td>';
	}
	
	html += '</tr>';
    }
    
    html += '</table>';
    
    return html;
}

// Makes a list of all the SD files which may be downloaded.

function ComposeDownloads()
{
    var html = '<p>Click on the links to download SD files containing '
	     + 'the data used to make up this report, which has been '
	     + 'categorized and processed accordingly. '
	     + 'Scaffolds are numbered and annotated with R-groups, as shown '
	     + 'in this report. Molecules matched to these scaffolds use the '
	     + 'scaffold layout for the core, with R-groups redepicted. The '
	     + 'matching indexes are recorded. Unmatched molecules are '
	     + 'presented in their original form.';

    html += '<p><ul>';
    
    var fn = 'scaffolds.sdf';
    html += '<li><a href="' + fn + '" target="_blank">' + fn + '</a>: '
    	  + 'each of the scaffolds shown in this report.</li>';
	  
    for (var n = 1; n <= num_rgsites; n++) {
    	fn = 'rgroups' + n + '.sdf';
	html += '<li><a href="' + fn + '" target="_blank">' + fn + '</a>: '
    	      + 'unique substituents for R' + n + '.</li>';
    }
    
    for (var n = 1; n <= num_scaffolds; n++) {
    	fn = 'matched' + n + '.sdf';
	html += '<li><a href="' + fn + '" target="_blank">' + fn + '</a>: '
    	      + 'molecules and activities matched to scaffold ' + n + '.</li>';
    }

    if (scaffold_unassigned) {
	fn = 'unmatched.sdf';
	html += '<li><a href="' + fn + '" target="_blank">' + fn + '</a>: '
	    + 'molecules which matched no scaffold.</li>';
    }
    
    fn = 'fragments.sdf';
    html += '<li><a href="' + fn + '" target="_blank">' + fn + '</a>: '
    	  + 'fragment decomposition tree.</li>';

    if (HasData("predictions", "count")) {
	if (GetData("predictions", "count") > 0) {
	    fn = 'suggestions.sdf';
	    html += '<li><a href="' + fn + '" target="_blank">' + fn + '</a>: '
		+ 'hypothetical molecules.</li>';
	}
    }

    html += '</ul>';
    
    return html;
}


// Applies selection to the indicated molecule, depending on whether it
// matched the criteria.

function ApplySelectionCriteria(molnum, srchcmp, isequal)
{
    if (srchcmp == 'Replace') {
	SelectMolecule(molnum, isequal);
    } else if (srchcmp == 'Extend') {
	SelectMolecule(molnum, isequal || IsMoleculeSelected(molnum));
    } else if (srchcmp == 'Filter') {
	SelectMolecule(molnum, isequal && IsMoleculeSelected(molnum));
    } else if (srchcmp == 'Deselect') {
	SelectMolecule(molnum, !isequal && IsMoleculeSelected(molnum));
    }
}

// Replaces all of the sections with new data.

function ReplaceContent()
{
    for (var n = scaffold_unassigned ? 0 : 1; n <= num_scaffolds; n++) {
    	Node("section_data" + n).innerHTML = ComposeDataGroup(n);
    }
    
    var nsel = NumSelected();
    Node("data_numsel").innerHTML = nsel + ' molecule' + (nsel==1 ? '' : 's');
}
	
// Counts # of selected molecules.
	
function NumSelected()
{
    var nsel = 0;
    for (var n = 1; n <= num_molecules; n++) if (IsMoleculeSelected(n)) nsel++;
    return nsel;
}

// Part of the sequence of downloading source data and making use of it. Either
// requests the next file, or if none left to do, executes the intended action.

function ReceiveSourceData()
{
    if (!(data_xmlHttp.readyState == 4 
       || data_xmlHttp.readyState == "complete")) {
	return;
    }
	
	// Run through the list of molecules, and add any which are selected.
    
    var list = data_xmlHttp.responseText + "";
    if (list.indexOf("$$$$\r\n") >= 0) {
    	list = list.split("$$$$\r\n");
    } else {
    	list = list.split("$$$$\n");
    }
    
    if (trim(list[list.length-1]).length == 0) list.length--;
    for (var i = 0; i < list.length; i++) {
	var sdrec = list[i].split("\n");
	for (var j = 0; j < sdrec.length-1; j++) {
	    if (trim(sdrec[j]) == '> <srcmol>') {
		var molnum = parseInt(sdrec[j+1]);
		if (IsMoleculeSelected(molnum)) {
		    data_fetchstring += list[i] 
				      + "> <scaffold>\n"
				      + molecule_scaffold[molnum-1] + "\n\n"
				      + "$$$$\n";
		}
	    }
	}
    }
	
	// If there are more to do, then rack up the next one.
	
    data_fetchfiles.splice(0, 1);
    if (data_fetchfiles.length > 0) {
	try {
	    data_xmlHttp = GetXmlHttpObject(ReceiveSourceData);
	    data_xmlHttp.open('GET', data_fetchfiles[0], true);
	    if (data_xmlHttp.overrideMimeType) {
		data_xmlHttp.overrideMimeType('text/plain'); // (not XML)
	    }
	    data_xmlHttp.send("");
	} catch (ex) {
	    alert("Unable to download: "+data_fetchfiles[0]+"\n"+ex);
	}
	return;
    }

	// No files left todo, so we must be finished.
	
    if (data_fetchaction == "OpenSDF") {
	var content = data_fetchstring.replace(/\&/g,"&amp");
	content = content.replace(/\</g, "&lt;");
	content = content.replace(/\>/g, "&gt;");
	
	if (    content.length > 0 
	    && (content.charAt(0) == "\n" || content.charAt(0) == "\r")) {
	    content = " " + content;
	}
	
	var d = data_window.document;
	
	d.write("<html><head><title>");
	d.write("SD File: Select All and Copy");
	d.write("</title></head><body><pre>");
	d.write(content);
	d.write("</pre></body></html>");
    
	d.close();	
    }
}

// ---------------------------------- Events ----------------------------------

// Do a search for the user-entered string, in the text fields.

function data_TextSearch()
{
    var srch = Node("data_search").value;
    if (srch.length == 0) return;
    
    	// Do the search, and update the selected molecules.
    
    srch = srch.toLowerCase();
    
    var numfound = 0, firsthit = 0;
    for (var i = 1; i <= num_molecules; i++) {
	SelectMolecule(i, false);
	for (var j = 0; j < num_textfields; j++) {
	    if (srch == textfield_data[i-1][j].toLowerCase()) {
		SelectMolecule(i, true);
	    	numfound++;
		if (firsthit == 0) firsthit = i;
		break;
	    }
	}
    }

    ReplaceContent();
    
    if (numfound == 0) {
    	alert("Search text not found.");
	return;
    }
    
    	// Adjust the scroller position.
    
    var el = Node("data_mol" + firsthit), y = el.offsetTop - 5;
    while (el = el.offsetParent) {
	y = y + el.offsetTop;
    }
    window.scrollTo(0, y);
}

// Search a numeric field, and select those which are equal, within the given
// tolerance.

function data_SearchEquality()
{
    var srchfld = Node("data_numfld").value;
    if (!srchfld) { // (IE6 hack)
    	var sel = Node("data_numfld").getElementsByTagName("option");
	for (var n = 0; n < sel.length; n++) {
	    if (sel[n].selected) srchfld = sel[n].text;
	}
    }

    var srchval = Node("data_numval").value;
    var srchtol = Node("data_numtol").value;
    var srchcmp = Node("data_applyrepl").checked ? 'Replace' :
	          Node("data_applyext").checked ? 'Extend' :
	          Node("data_applyfilt").checked ? 'Filter' :
						   'Deselect';
    if (srchval.length == 0) {
	alert("Enter something in the search value field first.");
	return;
    }
    
    srchval = parseFloat(srchval);
    srchtol = Math.abs(parseFloat(srchtol));
    if (isNaN(srchtol)) srchtol = 0;

    var actnum = 0;
    for (var n = 1; n <= num_activities; n++) {
	if (activity_name[n-1] == srchfld) {
	    actnum = n;
	    break;
	}
    }

    for (var n = 1; n <= num_molecules; n++) {
	var molval = activity_value[n-1][actnum-1];
	if (molval == '#') continue; // null means do nothing
	
	var tol = srchtol == 0 ? molval*1E-13 : srchtol;
	var isequal = molval >= srchval-tol && molval <= srchval+tol;
	ApplySelectionCriteria(n, srchcmp, isequal);
    }
    
    	// Replace the content.
    
    ReplaceContent();
}

// Search a numeric field, and select those which are between the given range -
// or less/greater, if it is open-ended.

function data_SearchRange()
{
    var srchfld = Node("data_rangefld").value;
    if (!srchfld) { // (IE6 hack)
    	var sel = Node("data_rangefld").getElementsByTagName("option");
	for (var n = 0; n < sel.length; n++) {
	    if (sel[n].selected) srchfld = sel[n].text;
	}
    }
    
    var srchlo = Node("data_rangelo").value;
    var srchhi = Node("data_rangehi").value;
    var srchcmp = Node("data_applyrepl").checked ? 'Replace' :
	          Node("data_applyext").checked ? 'Extend' :
	          Node("data_applyfilt").checked ? 'Filter' :
						   'Deselect';
						   
    var haslo = srchlo.length > 0, hashi = srchhi.length > 0;						   
    if (!haslo && !hashi) {
	alert("Enter a minimum and/or maximum value first.");
	return;
    }
    
    srchlo = parseFloat(srchlo);
    srchhi = parseFloat(srchhi);
    if (haslo && hashi && srchlo > srchhi) {
	alert("Enter a maximum value which is greater than or\n"
	    + "equal to the minimum value.");
	return;
    }

    var actnum = 0;
    for (var n = 1; n <= num_activities; n++) {
	if (activity_name[n-1] == srchfld) {
	    actnum = n;
	    break;
	}
    }
    for (var n = 1; n <= num_molecules; n++) {
	var molval = activity_value[n-1][actnum-1];
	if (molval == '#') continue; // null means do nothing
	
	var hit = (!haslo || molval >= srchlo)
	       && (!hashi || molval <= srchhi);
	
	ApplySelectionCriteria(n, srchcmp, hit);
    }
    
    ReplaceContent();
}

// The cell containing a molecule diagram has been clicked on.

function data_ClickMol(molnum, ctrlKey, tgt)
{
    var issel = !IsMoleculeSelected(molnum)
    SelectMolecule(molnum, issel);
    tgt.style.backgroundColor = issel ? '#C0E0FF' : '#E8E8E8';
    var nsel = NumSelected();
    Node("data_numsel").innerHTML = nsel + ' molecule' + (nsel==1 ? '' : 's');
}

// Bring up a window which shows just the selected molecules.

function data_SelectionView()
{
    var molidx = new Array();
    for (var n = 1; n <= num_molecules; n++) {
	if (IsMoleculeSelected(n)) molidx.push(n);
    }
    if (molidx.length == 0) {
	alert("Select some molecules first.");
	return;
    }
    PopupPersistentMolecules(molidx, null);
}

// Assembles the selected molecules into an SD file, the presents the results.

function data_SelectionOpenSDF()
{    
    if (NumSelected() == 0) {
	alert("Select some molecules first.");
	return;
    }
	// Decide which files we need to download.

    data_fetchfiles = new Array();
    data_fetchstring = "";
    data_fetchaction = "OpenSDF";
    
    data_window = window.open(
	"about:blank", 
	"SelectedMolecules", 
	"width=600,height=400,status=no,toolbar=no,"
	    + "menubar=yes,location=no,scrollbars=yes"
    );
    data_window.focus();

    for (var n = scaffold_unassigned ? 0 : 1; n <= num_scaffolds; n++) {
	for (var i = 1; i <= num_molecules; i++) {
	    if (IsMoleculeSelected(i) && molecule_scaffold[i-1] == n) {
		if (n == 0) data_fetchfiles.push("unmatched.sdf");
		else data_fetchfiles.push("matched" + n + ".sdf");
		break;
	    }
	}
    }

	// Start the sequence of recursive blocking callbacks.
	
    try {
	data_xmlHttp = GetXmlHttpObject(ReceiveSourceData);
	data_xmlHttp.open('GET', data_fetchfiles[0], true);
	if (data_xmlHttp.overrideMimeType) {
	    data_xmlHttp.overrideMimeType('text/plain'); // (not XML)
	}
	data_xmlHttp.send("");
    } catch (ex) {
	alert("Unable to download: "+data_fetchfiles[0]+"\n"+ex);
    }
}

function data_SelectAll(selstate)
{
    for (var n = 1; n <= num_molecules; n++) {
	SelectMolecule(n, selstate);
    }
    ReplaceContent();
}

