//      sareport.js        	   Structure-Activity Report JavaScript
//
//	17-sep-2009 (ac) added HasData function
//	22-jun-2009 (ac) added missing static prefix
//	27-may-2009 (ac) fixed roundsf bug
//	22-may-2009 (ac) redesigned units systems
//	17-apr-2009 (ac) popups now cram data fields/cutoff if too many
//  	10-mar-2009 (ac) fixed calcprops bug
//	13-feb-2009 (ac) added IE6 compatibility override
//  	04-feb-2009 (ac) added minimum bound for popups
//	07-jan-2009 (ac) added support for "selectivity" unit type
//  	01-dec-2008 (ac) restructured as the base-library
//  	26-sep-2008 (ac) info popup for scaffolds; calcprops in persistent popup
//  	25-sep-2008 (ac) altered the explore history collection
//  	23-sep-2008 (ac) added "band colors" to rows & columns
//  	22-sep-2008 (ac) mouseover popup for R-group col/row headers
//  	12-sep-2008 (ac) fixed bug with no activity data
//  	11-sep-2008 (ac) mouseover popup for fragments
//  	11-sep-2008 (ac) fixed numerical precision display bug
//  	28-aug-2008 (ac) fixed black-on-black problem with activity tab
//  	22-aug-2008 (ac) fixed mouseover-no-data bug
//  	29-jul-2008 (ac) more conformant JavaScript, works on Konqueror/Safari
//  	28-jul-2008 (ac) use of ActiveX for ISIS/ChemDraw clipboard access
//  	25-jul-2008 (ac) added constraints to correlation tables
//  	16-jul-2008 (ac) data tab has a search feature
//  	14-jul-2008 (ac) added activity prediction & suggestions
//  	16-jun-2008 (ac) alpha pre-release
//  	15-jan-2008 (ac) created
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

// ---------------------------------- Utility ----------------------------------

// Miscellaneous preconfiguration stuff.

var ns4 = document.layers;
var ie4 = document.all;
var nn6 = document.getElementById && !document.all; 
var ieVersion = 0; // ==0: not internet explorer; >0: version of MSIE

// Makes an effort to figure out if some version of Internet Explorer is being
// used, since this line of browsers has rather different standards compliance.
// All other browsers are assumed to be compliant.

function DetectBrowser()
{
    ieVersion = 0;
    var a = navigator.userAgent;
    var i;
    
    if (a.indexOf("Opera") >= 0) {
    	// definitely not IE
    } else if (a.indexOf("Konqueror") >= 0) {
    	// definitely not IE
    } else if ((i = a.indexOf("MSIE")) >= 0) {
    	ieVersion = a.substr(i + 5, 1);
    }
}

// Creates a new request for HTTP content.

function GetXmlHttpObject(handler) 
{ 
    var objXmlHttp = null;
    
    if (navigator.userAgent.indexOf("MSIE") >= 0) { 
	var strName = "Msxml2.XMLHTTP";
	if (navigator.appVersion.indexOf("MSIE 5.5") >= 0) {
	    strName = "Microsoft.XMLHTTP";
	} 
	try { 
	    objXmlHttp = new ActiveXObject(strName);
	    objXmlHttp.onreadystatechange = handler;
	    return objXmlHttp;
	} 
	catch (e) { 
	    alert("Error. Scripting for ActiveX must be enabled");
	    return;
	} 
    } 
    if (navigator.userAgent.indexOf("Mozilla") >=0
     || navigator.userAgent.indexOf("Opera") >= 0) {
	objXmlHttp = new XMLHttpRequest();
	objXmlHttp.onload = handler;
	objXmlHttp.onerror = handler;
	return objXmlHttp;
    }
} 

// A creepy crawly little function which is guaranteed to terminate.

function BUGOUT() {gin.n.tonic += 0;}

// Returns a string-formatted stack trace. Quite useful for debugging.

function stacktrace()
{
    var callstack = []; 
    var isCallstackPopulated = false; 
    try { 
	BUGOUT();
    } catch (e) { 
        if (e.stack) { // Firefox 
            var lines = e.stack.split('\n'); 
            for (var i = 0, len = lines.length; i < len; i++) { 
                if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) { 
                    callstack.push(lines[i]); 
                } 
            } 
            callstack.shift(); 
            isCallstackPopulated = true; 
        } 
        else if (window.opera && e.message) { // Opera 
            var lines = e.message.split("\n"); 
            for (var i = 0, len = lines.length; i < len; i++) { 
                if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) { 
                    var entry = lines[i]; 
                    if (lines[i+1]) { 
                        entry += ' at ' + lines[i+1]; 
                        i++; 
                    } 
                    callstack.push(entry); 
                } 
            } 
            callstack.shift(); 
            isCallstackPopulated = true; 
        } 
    } 
    if (!isCallstackPopulated) { // IE and Safari 
        var currentFunction = arguments.callee.caller; 
        while (currentFunction) { 
            var fn = currentFunction.toString(); 
            var fname = fn.substring(fn.indexOf("function") 
	    	      + 8, fn.indexOf("(")) || "anonymous"; 
            callstack.push(fname); 
            currentFunction = currentFunction.caller; 
        } 
    } 
    return 'Call Stack:\n' + callstack.join('\n');
}

// Trims both sides of a string for whitespace.

function trim(str) 
{
    return (str + "").replace(/^\s+|\s+$/g,"");
}

// Provides functionality which is missing from older JavaScript 
// implementations.

function indexOf(val, arr)
{
    for (var n = 0; n < arr.length; n++) {
    	if (val == arr[n]) return n;
    }
    return -1;
}

// For an array, swaps the values at the two positions.

function arraySwap(ary, idx1, idx2)
{
    var z = ary[idx1];
    ary[idx1] = ary[idx2];
    ary[idx2] = z;
}

// Convenience function to replace the document.getElementById tedium, and also
// help debug missing nodes.

function Node(id)
{
    var node = document.getElementById(id);
    if (!node) 
    {
    	alert("ERROR! Node id not found:\n" + id + "\n" + stacktrace());
    	BUGOUT();
    	return null;
    }
    return node;
}

// An analog of the SVL mget function, for compacting an array based on a mask.

function mget(arr, mask)
{
    var ret = new Array();
    for (var n = 0; n < arr.length; n++) {
    	if (mask[n]) ret.push(arr[n]);
    }
    return ret;
}

// Supplement to Math functions.

function log10(num) {return Math.log(num) * 0.434294;}

// Round a number to significant figures, rather than decimal places.

function roundsf(num, nsf)
{
    if (Math.abs(num) < 1E-14) return 0;
    var shsz = nsf - 1 - Math.floor(log10(Math.abs(num)));
    return Math.pow(0.1, shsz) * Math.round(num * Math.pow(10, shsz));
}

// Pokes a cookie into the jar, taking with it an expiry date.

function WriteCookie(cname, cvalue, cdays) 
{
    var expires = "";
    if (cdays) {
	var cdate = new Date();
	cdate.setTime(cdate.getTime() + (cdays*24*60*60*1000));
	expires = "; expires=" + cdate.toGMTString();
    }
    cvalue = escape(cvalue);
    document.cookie = cname + "=" + cvalue + expires + "; path=/";
}

// Returns the cookie, or null.

function ReadCookie(cname) 
{
    var nameEQ = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = ca.length-1; i >= 0; i--) {
	var c = ca[i];
	while (c.charAt(0) == ' ') {
	    c = c.substring(1, c.length);
	}
	if (c.indexOf(nameEQ) == 0) {
	    c = c.substring(nameEQ.length, c.length);
	    return unescape(c);
	}
    }
    return null;
}

// Places a given text string onto the clipboard.

function WriteClipboard(content, notification)
{
    if (window.clipboardData) {
	try {
	    window.clipboardData.setData("Text", content);
	    if (notification) {
	    	alert(notification);
	    }
	    return;
	} catch (ex) {}
    }
    else if (ns4 || nn6) { 
	try {
	    netscape.security.PrivilegeManager.enablePrivilege(
		'UniversalXPConnect'
	    );
	
	    var clipb = Components.classes[
		'@mozilla.org/widget/clipboardhelper;1'
	    ].getService(Components.interfaces.nsIClipboardHelper);
	    if (clipb) {
		clipb.copyString(content);
	    }
	    if (notification) {
	    	alert(notification);
	    }
	    return;
	} catch (ex) {}
    }

    //alert("Failed to copy to clipboard.");

    if (confirm(
	"Content could not be copied to the clipboard,\n"+
	"possibly for security reasons. Would you like\n"+
	"to see the content?"
    )) {
	alert(content);
    }
}

// Returns a string with the clipboard contents.

function ReadClipboard()
{
    var content = null;
    
    	// If running on Internet Explorer, attempt to use the ActiveX control
	// for reading a MOL out of the MDLCT sketch format. This will read
	// the text part, which is in MOL format.
    
    if (ie4) {
    	var axnode = Node("activeX");
	try {
	    if (!axnode.innerHTML.length) {
		axnode.innerHTML = 
		    '<object classid='
		  + '"clsid:03B1A111-E222-432B-8D34-8A2EF0A33364"'
    		  + ' id="ReadMol" codebase="ReadMOL.cab#version=1,2,0,4"'
		  + ' width="0" height="0"></object>';
	    }
	    var readmol = Node("ReadMol");
	    var moldata = readmol.MOLReadFromClipboard("MDLCT");
	    if (moldata && moldata.length > 0) return moldata;
	} catch (ex) {
	    // (continue on)
	}
    }
    
    	// Attempt to extract text, and return it.
    
    if (window.clipboardData) {
	content = window.clipboardData.getData("Text");
    } else if (ns4 || nn6) { 
	try {
	    netscape.security.PrivilegeManager.enablePrivilege(
		'UniversalXPConnect'
	    );
	
	    var clipb = Components.classes[
		'@mozilla.org/widget/clipboard;1'
	    ].getService(Components.interfaces.nsIClipboard);
	    if (clipb) {		
		var trans = Components.classes[
		    '@mozilla.org/widget/transferable;1'
		].createInstance(Components.interfaces.nsITransferable);
		if (trans) {
		    trans.addDataFlavor('text/unicode');
		    clipb.getData(trans, clipb.kGlobalClipboard);

		    var str = new Object(), strlen = new Object();
		    trans.getTransferData("text/unicode", str, strlen);
		    if (str) str = str.value.QueryInterface(
			Components.interfaces.nsISupportsString
		    );
		    if (str) {
			content = str.data.substring(0, strlen.value / 2);
		    }
		}
	    }
	} catch (ex) {
	    alert("Failed to read clipboard.");
	}
    }
    
    return content;
}

// -------------------------------- HTML Support -------------------------------

// Returns HTML suitable for referencing an image. Normally this is a trivial
// matter of using an <img ..> tag, but for IE6, it is necessary to wire it
// out to an alternate invocation.
// Note the optional parameter 'opaque': if true, this causes the IE6 
// transparency to be disabled, for whatever desired reason.

function LinkImageAttr(fn, attr, opaque)
{
    var html;
    
    	// Under certain very specific circumstances, add an extra attribute
	// so that IE 6 can render graphics with alpha blending.

    if (!opaque && ieVersion > 0 && ieVersion < 7 && attr!= null &&
    	fn.indexOf(".png") == fn.length - 4 &&
    	!attr.match("top: \d") && !attr.match("left: \d")
    ) {
    	if (attr == null) attr = '';
	
    	var w = 0, h = 0;
	
	var regex = new RegExp('(.*)width="(\\d+)"(.*)');
	var str = regex.exec(attr);
	if (str && str.length == 4) {
	    w = parseInt(str[2]);
	    attr = str[1] + str[3];
	}

    	regex = new RegExp('(.*)height="(\\d+)"(.*)');
	str = regex.exec(attr);
	if (str && str.length == 4) {
	    h = parseInt(str[2]);
	    attr = str[1] + str[3];
	}
	
	if (w > 0 && h > 0) {
	    html = '<span ' + attr + ' style="filter:'
	          + ' progid:DXImageTransform.Microsoft.AlphaImageLoader('
		  + 'src=' + fn + ',sizingMethod=crop);'
		  + ' width: ' + w + 'px;'
		  + ' height: ' + h + 'px;"></span>';

    	    return html;
	}
    }

    html = '<img src="' + fn + '"';
    if (attr) html += " " + attr;
    html += '>';
    return html;
}
function LinkImage(fn) {return LinkImageAttr(fn, null);}

// Composes an HTML rendition of a section heading, ready for inclusion.
// Note that the result leaves open a <div...> tag, which MUST be closed by
// the caller with </div>.

function ComposeSectionBar(secname, secttl, isopen)
{
    var html = ""
    
    var imgfn = StaticPrefix() + (isopen ? "treeminus.gif" : "treeplus.gif");
    var disp = isopen ? 'block' : 'none';
    
    html += '<p><table class="section" width="100%"><tr height="25">'
    	  + '<td id="check_' + secname + '" class="secicon" width="25">'
    	  + '<img src="' + imgfn + '" class="secbtn"'
    	  + ' onClick="ToggleSection(\'' + secname + '\')"></td>'
    	  + '<td class="secbar" width="50"></td>'
    	  + '<td class="secbar">' + secttl + '</td></tr>'
    	  + '</table>'
    	  + '<div id="section_' + secname + '"'
	  + ' class="secblk" style="display: ' + disp + ';">';
	  
    return html;
}

// Turns a section, and its +/- icon, on or off, depending on initial state.

function ToggleSection(secname) 
{
    var chknode = document.getElementById("check_" + secname);
    if (!chknode) return;
    var img = chknode.getElementsByTagName('img')[0]
    var sec = Node("section_" + secname);
    var alt = document.getElementById("section_" + secname + "alt");
    
    if (sec.style.display == 'none') {
	img.src = StaticPrefix() + "treeminus.gif";
	sec.style.display = 'block';
	if (alt) alt.style.display = 'none';
    } else {
	img.src = StaticPrefix() + "treeplus.gif";
	sec.style.display = 'none';
	if (alt) alt.style.display = 'block';
    }
}

// Shows or hides an entire section, from the ++/-- icons.

function ToggleGroupSection(secname, showness) 
{
    var parnode = Node("section_" + secname);
    var nodes = parnode.getElementsByTagName("span");
    
    for (var n = -1; n < nodes.length; n++) {
	var node = n < 0 ? parnode : nodes[n];
	if (node.id.substring(0, 8) == "section_") {
	    var isshown = node.style.display == 'block';
	    if ((isshown && !showness) || (!isshown && showness)) {
		ToggleSection(node.id.substring(8));
	    }
	}
    }
}

// Shows or hides an array of tags, indicated by id list.

function ToggleSectionList(secarray, showness, chkarray)
{
    for (var n = 0; n < secarray.length; n++) {
    	var node = Node(secarray[n]);
	node.style.display = showness ? 'block' : 'none';
	if (chkarray != null) {
	    node = Node(chkarray[n]);
    	    var img = node.getElementsByTagName('img')[0];
	    img.src = StaticPrefix() 
	    	    + (showness ? "treeminus.gif" : "treeplus.gif");
	}
    }
}

// --------------------------- Access to Secret Data --------------------------

// So-called "secret data": parse the top level for a list of tags at the
// beginning, and make the sub-lists available to all and sundry.

var sarlib_secretdata = new Array();

function LoadSecretData()
{
    var blklist = Node("secret_data").getElementsByTagName("div");
    for (var i = 0; i < blklist.length; i++) {
    	var datarr = new Array();
	var datlist = blklist[i].getElementsByTagName("p");
	for (var j = 0; j < datlist.length; j++) {
	    datarr[datlist[j].id] = datlist[j];
	}
	sarlib_secretdata[blklist[i].id] = datarr;
    }
}

// Returns true or false, depending on whether the data item is present.

function HasData(blkname, datname)
{
    var blk = sarlib_secretdata[blkname];
    if (!blk) return false;
    var dat = blk[datname];
    if (!dat) return false;
    return true;
}

// For a data item with the block/datum identifiers, returns a text string
// which represents the contents of the node.

function GetData(blkname, datname)
{
    var blk = sarlib_secretdata[blkname];
    if (!blk) {
    	alert("ERROR! GetData: unknown block: [" + blkname + "]"
	    + "\n" + stacktrace());
	return null;
    }
    var dat = blk[datname];
    if (!dat) {
    	alert("ERROR! GetData: unknown datum: [" + blkname+"/"+datname + "]"
	    + "\n" + stacktrace());
	return null;
    }
    return dat.innerHTML;
}

// As above, except splits the result into an array, based on the assumption
// of comma-delimited values.

function GetDataSplit(blkname, datname)
{
    return GetData(blkname, datname).split(',');
}

// ------------------------- Commonly Used Secret Data -------------------------

// Load some of the cached data is of use to many tabs, so provide general
// cached access here.

var sarlib_tablist = null;

var num_scaffolds = 0;
var num_molecules = 0;
var num_rgroups = 0;
var num_rgsites = 0;
var num_activities = 0;
var num_properties = 0;
var num_textfields = 0;

var scaffold_assignments = null;
var scaffold_size = null;
var scaffold_unassigned = false; // true if any undefined scaffolds exist

var molecule_scaffold = null;
var molecule_rgroups = null;
var molecule_size = null;

var rgroup_size = null;

var activity_name = null;
var activity_type = null;
var activity_spec = null; // for each activity, an array of [a,b,f,c,d,m]
var activity_value = null; // (matrix of {mol,act}; # == no data)
var activity_norm = null; // (as above, but smoothed 0..1, and none==0)
var activity_bin = null; // (binned form of above; 0=none, 1..10=activity)

var property_name = null;
var property_spec = null;
var property_value = null;
var property_norm = null;

var textfield_name = null;
var textfield_data = null; // (array of arrays; each is HTML escaped)

var molecule_selected = null; // true or false for all molecules
var selection_tick = 0; // incremented each time a change is made

var bland = false; // this is set to true if it is necessary use white
		   // backgrounds everywhere to avoid transparency issues

function LoadCommonData()
{
    bland = ieVersion > 0 && ieVersion < 7;

    sarlib_tablist = GetDataSplit("tabs", "list");

    num_scaffolds = parseInt(GetData("scaffolds", "count"));
    num_molecules = parseInt(GetData("molecules", "count"));
    
    var rgcount = GetDataSplit("rgroups", "count");
    num_rgroups = parseInt(rgcount[0]);
    num_rgsites = parseInt(rgcount[1]);
    
    num_activities = parseInt(GetData("activity", "count"));
    num_properties = parseInt(GetData("property", "count"));
    num_textfields = parseInt(GetData("textfields", "count"));

    scaffold_assignments = new Array(num_scaffolds);
    scaffold_size = new Array(num_scaffolds);
    for (var n = 0; n < num_scaffolds; n++) {
    	scaffold_assignments[n] = GetDataSplit("scaffolds", "molecules"+(n+1));
	scaffold_size[n] = GetDataSplit("scaffolds", "size" + (n+1));
    }
    
    molecule_scaffold = new Array(num_molecules);
    molecule_rgroups = new Array(num_molecules);
    molecule_size = new Array(num_molecules);
    scaffold_unassigned = false;
    for (var n = 0; n < num_molecules; n++) {
    	var v = GetData("molecules", "scaffold" + (n+1));
	molecule_scaffold[n] = parseInt(v);
	molecule_rgroups[n] = GetDataSplit("molecules", "rgroups" + (n+1));
	molecule_size[n] = GetDataSplit("molecules", "size" + (n+1));
	
	if (molecule_scaffold[n] == 0) scaffold_unassigned = true;
    }
    
    rgroup_size = new Array(num_rgroups);
    for (var n = 0; n < num_rgroups; n++) {
    	rgroup_size[n] = GetDataSplit("rgroups", "size" + (n+1));
    }
    
    activity_name = GetDataSplit("activity", "names");
    activity_type = GetDataSplit("activity", "types");
    activity_spec = new Array(num_activities);
    for (var n = 0; n < num_activities; n++) {
	activity_spec[n] = GetDataSplit("activity", "spec" + (n+1));
	for (var i = 0; i < 6; i++) {
	    if (i != 2) activity_spec[n][i] = parseFloat(activity_spec[n][i]);
	}
    }
    activity_value = new Array(num_molecules);
    activity_norm = new Array(num_molecules);
    activity_bin = new Array(num_molecules);
    for (var n = 0; n < num_molecules && num_activities > 0; n++) {
    	activity_value[n] = GetDataSplit("activity", "data" + (n+1));
    	activity_norm[n] = GetDataSplit("activity", "norm" + (n+1));
    	activity_bin[n] = GetDataSplit("activity", "bin" + (n+1));
    }
    
    property_name = GetDataSplit("property", "names");
    property_spec = new Array(num_properties);
    for (var n = 0; n < num_properties; n++) {
	property_spec[n] = GetDataSplit("property", "spec" + (n+1));
	for (var i = 0; i < 6; i++) {
	    if (i != 2) property_spec[n][i] = parseFloat(property_spec[n][i]);
	}
    }
    property_value = new Array(num_properties);
    property_norm = new Array(num_properties);
    for (var n = 0; n < num_molecules && num_properties > 0; n++) {
	property_value[n] = GetDataSplit("property", "data" + (n+1));
	property_norm[n] = GetDataSplit("property", "norm" + (n+1));
    }
    
    textfield_name = GetDataSplit("textfields", "names");
    textfield_data = new Array(num_molecules);
    for (var n = 0; n < num_molecules && num_textfields > 0; n++) {
    	var tdata = GetData("textfields", "data" + (n+1));
    	textfield_data[n] = tdata.split("@!@");
    }
    
    molecule_selected = new Array(num_molecules);
    for (var n = 0; n < num_molecules; n++) molecule_selected[n] = false;
}

// -------------------------- Top Level Functionality --------------------------

// Called by the onLoad function: does perfunctory setup, then clears out the
// greyed parts of the screen.

function AfterLoad(firstTab)
{
    DetectBrowser();
    LoadSecretData();
    LoadCommonData();
    ActivateTab(firstTab);
    Node("greyscreen").style.visibility = 'hidden';
    Node("loading").style.visibility = 'hidden';
}

// For the given tab name, makes sure that tab is activated, after building
// its content, and ensures that all the others are hidden.

var sarlib_curtab = null;

function ActivateTab(tabname)
{
    	// Update the tab bar, immediately.
	
    for (var n = 0; n < sarlib_tablist.length; n++) {
    	var t = sarlib_tablist[n];
	Node("tab_" + t).className = (t == tabname ? 'tabon' : 'taboff');
    }
    
    	// If a previous tab is active, give it a chance to stash anything
	// it needs before the hide.
	
    if (sarlib_curtab) {
    	this[sarlib_curtab + "_Deactivate"]();
    }
    sarlib_curtab = tabname;
    
    window.scrollTo(0, 0); // jump to the top, though usually there already
    	
    	// Bizarre workaround for Firefox 2 bug.

    if (nn6 && ieVersion == 0 && tabname == 'explore') {
    	Node("div_explore").style.display = 'block';
    }

    	// Call the function loaded for a particular tab. This step can be slow.

    var html = this[tabname + "_Activate"]();
    
    if (html != null) {
    	Node("div_" + tabname).innerHTML = html;
    }

    	// Show only the division with this tab data, then poke in the result.
    
    for (var n = 0; n < sarlib_tablist.length; n++) {
    	var t = sarlib_tablist[n];
	Node("div_" + t).style.display = (t == tabname ? 'block' : 'none');
    }
}

// Sets the selection state of the indicated molecule.

function SelectMolecule(molnum, issel)
{
    if (molecule_selected[molnum-1] == issel) return;
    selection_tick++;
    molecule_selected[molnum-1] = issel;
}

// Returns true if the molecule is selected.

function IsMoleculeSelected(molnum)
{
    return molecule_selected[molnum-1];
}

// Returns an integer which is guaranteed to be different if the selection
// state has altered in some way. This is a way for tabs to know that they
// need to redraw themselves when being reactivated, due to some other tab
// changing the selection state.

function SelectionTick()
{
    return selection_tick;
}

// Return the status of the page scrolling.

function PageScrollX()
{
    if (typeof(window.pageXOffset) == 'number') {
	return window.pageXOffset;
    } else if (document.body && document.body.scrollLeft) {
	return document.body.scrollLeft;
    } else if (document.documentElement&&document.documentElement.scrollLeft) {
        return document.documentElement.scrollLeft;
    }
    return 0;
}
function PageScrollY()
{
    if (typeof(window.pageYOffset) == 'number') {
	return window.pageYOffset;
    } else if (document.body && document.body.scrollTop) {
	return document.body.scrollTop;
    } else if (document.documentElement&&document.documentElement.scrollTop) {
        return document.documentElement.scrollTop;
    }
    return 0;
}

// Compute and return the edges of the screen.

function GetAbsWindowRight()
{
    var x = PageScrollX();
    if (typeof(window.innerWidth) == 'number') {
	x += window.innerWidth;
    } else if (document.documentElement 
    	    && document.documentElement.clientWidth) {
	x += document.documentElement.clientWidth;
    } else if (document.body && document.body.clientWidth) {
	x += document.body.clientWidth;
    }
    return x - 20; // ugly hack to guestimate scollbar
}

function GetAbsWindowBottom()
{
    var y = PageScrollY();
    if (typeof(window.innerHeight) == 'number') {
	y += window.innerHeight;
    } else if (document.documentElement 
    	    && document.documentElement.clientHeight) {
	y += document.documentElement.clientHeight;
    } else if (document.body && document.body.clientHeight) {
	y += document.body.clientHeight;
    }
    return y - 20; // ugly hack to guestimate scrollbar
}

// For a "unit specification" (a,b,f,c,d,m) and a value, convert the value
// into a normalized version, between 0 and 1.

function NormUnits(uspec, actval)
{
    if (actval == '#') return '#'; // pass-through

    var a = uspec[0], b = uspec[1], f = uspec[2];
    var c = uspec[3], d = uspec[4], m = uspec[5];
    actval = actval * a + b;
    if (f == 'x') {}
    else if (f == 'log10') actval = log10(actval);
    else if (f == 'pow10') actval = Math.pow(10, actval);
    else if (f == 'log') actval = Math.log(actval);
    else if (f == 'exp') actval = Math.exp(actval);
    else if (f == 'inv') actval = 1/actval;
    
    actval = actval * c + d;
    
    if (m > 0 && m < 1 && m != 0.5) {
	if (actval < m) {
	    actval = 0.5 * actval / m;
	} else {
	    actval = 0.5 + 0.5 * (actval - m) / (1 - m );
	}
    }
    
    return actval < 0 ? 0 : actval > 1 ? 1 : actval;
}

// Convert normalized units back to the original scheme.

function DenormUnits(uspec, actval)
{
    var a = uspec[0], b = uspec[1], f = uspec[2];
    var c = uspec[3], d = uspec[4], m = uspec[5];
    
    if (m > 0 && m < 1 && m != 0.5) {
	if (actval < 0.5) {
	    actval = 2 * actval * m;
	} else {
	    //actval = m + (1 - m) * (2 * actval - 0.5);
	    //actval = m + (1 - m) * (2 * actval - 1);
	    actval = (2 * actval - 1) * (1 - m) + m;
	}
    }
    
    actval = (actval - d) / c;
    
    if (f == 'x') {}
    else if (f == 'log10') actval = Math.pow(10, actval);
    else if (f == 'pow10') actval = Math.log10(actval);
    else if (f == 'exp') actval = Math.log(actval);
    else if (f == 'log') actval = Math.exp(actval);
    else if (f == 'inv') actval = 1/actval;
    
    actval = (actval - b) / a;
    
    return actval;
}

// Converts a normalized activity value into an HTML color (#RRGGBB); the
// activity value should be between 0..1, which can be obtained from the
// NormUnits(..) function. Activity values of '#' are converted into
// the transparent color code.

function ColorForActivity(actval, scheme)
{
    if (actval == '#') return 'transparent';
    
/* !!! or not...
	// Make the normalized activity sinusoidal.
    
    actval = 0.5 + 0.5 * Math.sin (0.5 * Math.PI * 2 * actval - 1);
*/    
    	// Decide on the color.
	
    var red = 0, green = 0, blue = 0;
    
    if (scheme == 'heatmap') {
    	//green = actval < 0.3 ? actval * (1/3) : (actval - 0.2) * (5/4);
    	green = actval;
	red = 1 - green;
	var sc = 1/Math.max(green,red);
	green = green * sc;
	red = red * sc;
    } else if (scheme == 'magenta') {
	blue = actval;
	red = 1 - blue;
	var sc = 1/Math.max(blue,red);
	blue = blue * sc;
	red = red * sc;
    } else if (scheme == 'greyscale') {
	red = 1 - actval;
	blue = red;
	green = red;
    }

    	// Convert to hex encoding.
    
    red = Math.round(0xFF * red);
    green = Math.round(0xFF * green);
    blue = Math.round(0xFF * blue);
    var col = ((red << 16) | (green << 8) | blue).toString(16);
    while (col.length < 6) {
    	col = '0' + col;
    }
    return '#' + col.toUpperCase();
}

// For a single molecule index, return a list of its activity values,
// formatted in a top-down list of simple HTML. Throws in text fields as 
// a bonus.
// Note: if maxnum is not null, then: if the number of lines exceeds it, the
// result will be divided up into two columns, and if the number of lines
// exceeds 2*maxnum, the rest will be left out.

function FormatMoleculeActivities(molidx, maxnum)
{
    var html = "";
    
    var lines = new Array();
    for (var n = 0; n < num_activities; n++) {
    	if (activity_value[molidx-1][n] == '#') continue;
	lines.push(
	    '<b>' + activity_name[n] + '</b>:&nbsp;'
	          + activity_value[molidx-1][n]
	);
    }

    for (var n = 0; n < num_properties; n++) {
	lines.push(
	    '<b>' + property_name[n] + '</b>:&nbsp;'
	          + property_value[molidx-1][n]
	);
    }

    for (var n = 0; n < num_textfields; n++) {
	lines.push(
	    '<b>' + textfield_name[n] + '</b>:&nbsp;'
	          + textfield_data[molidx-1][n]
	);
    }
    
	// Bifurcate: if less than maxnum, simple blat. Otherwise generate
	// two columns.
    
    if (!maxnum || lines.length <= maxnum) {
	for (var n = 0; n < lines.length; n++) {
	    if (n > 0) html += '<br>';
	    html += lines[n];
	}
    } else {
	html += '<table><tr><td>';
	for (var n = 0; n < lines.length && n < 2*maxnum; n += 2) {
	    if (n > 0) html += '<br>';
	    html += lines[n];
	}
	html += '</td><td>';
	for (var n = 1; n < lines.length && n < 2*maxnum; n += 2) {
	    if (n > 1) html += '<br>';
	    html += lines[n];
	}
	html += '</td></table>';
	if (lines.length > 2*maxnum) {
	    html += '<div align="center">...</div>';
	}
    }
    
    return html;
}

// Takes an array of calculated properties {mw,chg,hba,hbd,tpsa,logp} and turns
// it into a nicely formatted HTML string.

function FormatCalculatedProperties(calcprops)
{
    var html = "";

    calcprops[0] = parseFloat(calcprops[0]).toFixed(2);
    calcprops[1] = (calcprops[1] < 1 ? calcprops[1] : ("+" + calcprops[1]));
    calcprops[5] = parseFloat(calcprops[5]).toFixed(4);

    html += "<nobr><b>MW</b> = " + calcprops[0] + "</nobr><br>";
    html += "<nobr><b>Charge</b> = " + calcprops[1] + "</nobr><br>";
    html += "<nobr><b>Acc</b> = " + calcprops[2] + "</nobr><br>";
    html += "<nobr><b>Don</b> = " + calcprops[3] + "</nobr><br>";
    html += "<nobr><b>PSA</b> = " + calcprops[4] + "</nobr><br>";
    html += "<nobr><b>logP</b> = " + calcprops[5] + "</nobr>";
    
    return html;
}

// Selects a position for the origin of a popup window, which is to not obscure
// the indicated target widget.

function GetPositionForPopup(tgt)
{
    var x = 0, y = 0, t = 0, el = tgt;
    if (el && el.offsetParent) {
	x = el.offsetLeft + el.offsetWidth - 3;
	y = el.offsetTop + el.offsetHeight - 3;
	t = el.offsetTop + 3;
	while (el = el.offsetParent) {
	    x += el.offsetLeft;
	    y += el.offsetTop;
	    t += el.offsetTop;
	}
    }
    x = Math.max(0, x);
    y = Math.max(0, y);
    return [x, y, t];
}

// Lower level function, for which molidx is an array of molecule indices,
// which will be shown in a popup table.

function PopupCellMolecules(molidx, x, y, ytop, bandcols, heading)
{
    var numshown = bandcols ? bandcols.length : 0;

    var html = '<table style="border-width: 1px; border-collapse: collapse;'
	     + ' border-style: solid; border-color: #A0A000;">';
    ;
    
    var sz = Math.min(12, molidx.length);
    var rows = sz, cols = 1;
    if (rows > 3) {
	rows = Math.ceil(Math.sqrt(sz));
	cols = Math.ceil(sz / rows);
    }
    
    var colspan = (numshown + 2) * cols;

    	// If the caller has provided an array of "heading" entries, plug
	// them in now.

    if (heading && heading.length > 0) {
    	html += '<tr><td colspan="' + colspan + '">'
	      + '<table style="border-width: 0; border-collapse: collapse;'
	      + ' margin: 0; padding: 0;'
	      + (bland ? ' background-color: #FFFFFF;' : '')
	      + ' border-style: solid; border-color: #A0A000;'
	      + ' width: 100%;"><tr>';
    	for (var n = 0; n < heading.length; n++) {
	    var style = n == 0 ? '' : ' style="border-left-width: 1px;"';
	    html += '<td class="popupmol"' + style + '>' + heading[n] + '</td>';
	}
	html += '</tr></table></td></tr>';
    }

    	// Draw the cells with molecular content.

    var pos = 0;
    for (var r = 0; r < rows; r++) {
	html += "<tr>";
	for (var c = 0; c < cols; c++) {
	    if (pos >= sz) {
		html += '<td class="popupmol"' 
		      + 'colspan="' + (2 + numshown) + '"></td>';
		continue;
	    }

	    for (var a = 0; a < numshown; a++) {
	    	html += '<td class="popuptxt"';
	    	if (bandcols[a][pos] != 'transparent') {
		    html += ' bgcolor="' + bandcols[a][pos] + '"';
		} 
		html += '>&nbsp;</td>';
	    }

    	    var attr = ' width="' + molecule_size[molidx[pos]-1][0] + '"'
	    	     + ' height="' + molecule_size[molidx[pos]-1][1] + '"';
	    var selbg = '';
	    if (IsMoleculeSelected(molidx[pos])) {
		selbg = ' style="background-color: #F0F0A0;"';
	    }
	    
	    html += '<td class="popupmol"' + selbg + '>'
	    	  + LinkImageAttr('img/mol' + molidx[pos] + '.png', attr)
		  + '</td>';

	    html += '<td class="popuptxt"' + selbg + '>'
	    	  + '#' + molidx[pos] + '<br>'
	          + FormatMoleculeActivities(molidx[pos], 6) 
		  + '</td>';
	    pos++;
	}
	html += '</tr>';
    }
    
    if (sz < molidx.length) {
	html += '<tr><td colspan="' + colspan + '" '
	      + 'align="center">';
	html += '(plus ' + (molidx.length - sz) + ' more not shown)';
	html += '</td></tr>';
    }
    
    html += '</table>';
    
    var popup = Node("popup");
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.innerHTML = html;
    popup.style.visibility = 'visible';
    
    	// See if it makes sense to move it back onto the screen.
    
    var scrw = GetAbsWindowRight() - 1, scrh = GetAbsWindowBottom() - 1;
    if (popup.offsetTop + popup.offsetHeight > scrh) {
	popup.style.top = (scrh - popup.offsetHeight) + 'px';
    } else if (popup.offsetLeft + popup.offsetWidth > scrw) {
	popup.style.left = (scrw - popup.offsetWidth) + 'px';
    }
    
    	// If that's a problem, consider moving it above.
    
    if (popup.offsetLeft + popup.offsetWidth > scrw ||
    	popup.offsetTop + popup.offsetHeight > scrh) {
	if (ytop - popup.offsetHeight >= 0) {
    	    popup.style.top = (ytop - popup.offsetHeight) + 'px';
	    popup.style.left = Math.max(0, scrw - popup.offsetWidth) + 'px';
	}
    }
}

// Hide the popup.

function PopdownCell()
{
    Node("popup").style.visibility = 'hidden';
}

// Conceptually similar to PopupCellMolecules, except that it brings up a
// browser window which hangs around, and also it shows all of the molecules.

function PopupPersistentMolecules(molidx, bandcols)
{
    PopdownCell(); // don't want both at the same time

    var docroot = document.location + "";
    docroot = docroot.substring(0, docroot.lastIndexOf('/')+1);
    var statroot = docroot + StaticPrefix();
    var numshown = bandcols ? bandcols.length : 0;

    var width = 450 /* !!! + 20 * numshown*/;

    var w = window.open(
    	"about:blank", 
	"ShowMolecules", 
	"width=" + width + ",height=400,status=no,toolbar=no,"
	    + "menubar=no,location=no,scrollbars=yes,resizable=yes"
    );
    w.focus();

    var d = w.document;

    d.write("<html><head><title>Molecules</title>\n");
    d.write("<link rel=\"stylesheet\" href=\"" + statroot + "sareport.css\">\n");
    d.write("</head><body>\n");

    d.write("<table class=\"infodata\">\n");
    
    d.write("<tr>");
    for (var a = 0; a < numshown; a++) d.write("<td></td>");
    d.write("<td class=\"ihdr\">&nbsp;Molecule&nbsp;</td>");
    d.write("<td class=\"ihdr\">&nbsp;Properties&nbsp;</td>\n");
    d.write("<td class=\"ihdr\">Calculated Properties</td></tr>\n");
    
    for (var n = 0; n < molidx.length; n++) {
	d.write("<tr>\n");

	for (var a = 0; a < numshown; a++) {
	    d.write("<td class=\"icol\"");
	    if (bandcols[a][n] != 'transparent') {
		d.write(' bgcolor="' + bandcols[a][n] + '"');
	    } 
	    d.write(">&nbsp;</td>\n");
	}

    	var mbg = bland ? ' style="background-color: #FFFFFF;"' : '';
	d.write("<td class=\"inml\"" + mbg + ">");
	d.write("<img src=\""+docroot+"img/mol" + molidx[n] + ".png\"></td>\n");
	
	d.write("<td class=\"inml\">");
	d.write("#" + molidx[n] + "<br>\n");
	d.write(FormatMoleculeActivities(molidx[n], 0));
	d.write("</td>");
	
	d.write("<td class=\"inml\">");
    	var calcprops = GetDataSplit("molecules", "calcprops" + molidx[n]);
    	d.write(FormatCalculatedProperties(calcprops));
	d.write("</td>");
	
	d.write("</tr>\n");
    }
    
    d.write("</table>\n");
    
    d.write("<p><a href=\"javascript:self.close()\">Close</a></p>\n");
    d.write("</body></html>\n");
    d.close();
}

// For a set of molecules, and some activities, with corresponding color
// schemes, returns HTML that composites the appropriate histogram templates
// with color bars. Note that 0 values in actidx are OK, and get skipped.
// The scheme parameter is an array, and uses indices rather than strings
// (1=heatmap, 2=magenta, 3=greyscale).

function FormatLinearHistograms(molidx, actidx, scheme)
{
    var dims = new Array(), tw = 0, th = 0;
    var slots = new Array(), maxsz = 0;
    
    for (var n = 0; n < actidx.length; n++) {
    	if (actidx[n] == 0) break;
	dims[n] = GetDataSplit('histograms', 'layout' + actidx[n]);
	for (var i = 0; i < dims[n].length; i++) {
	    dims[n][i] = parseFloat(dims[n][i]);
	}
	tw = Math.max(tw, dims[n][0]);
	th += dims[n][1];
	
	slots[n] = [0,0,0,0,0,0,0,0,0,0];
	for (var i = 0; i < molidx.length; i++) {
	    var bin = activity_bin[molidx[i]-1][actidx[n]-1];
	    if (bin > 0) {
	    	slots[n][bin-1]++;
	    	maxsz = Math.max(maxsz, slots[n][bin-1]);
	    }
	}
    }

    var html = '<ul class="overlay"'
             + ' style="width: ' + tw + 'px; height: ' + th + 'px;">';
    var y = 0;
    for (var n = 0; n < dims.length; n++) {
    	var fn = 'img/htempl' + actidx[n] + '.png';
	html += '<img src="' + fn + '" class="olimg"'
	      + ' style="left: 0px; top: ' + y + 'px;">'
	      
    	for (var i = 0; i < 10; i++) {
	    if (slots[n][i] == 0) continue;
	    
	    var bw = dims[n][4];
	    var bh = Math.round(dims[n][5] * slots[n][i] / maxsz);
	    var bx = dims[n][2] + bw * i;
	    var by = dims[n][3] + y + 1 - bh;
	    fn = 'img/hbar_' + scheme[n] + '_' + (i+1) + '.png';

	    html += '<img src="' + fn + '" class="olimg"'
	    	  + ' style="left: ' + bx + 'px; top: ' + by + 'px;'
		  + ' width: ' + bw + 'px; height: ' + bh + 'px;">';
	}
    	y += dims[n][1];
    }

    html += '</ul>';
	     
    return html;   
}

