//      scaffold.js        	   Structure-Activity Report JavaScript
//
//	22-nov-2016 (ct) test for presence of java applet
//	31-mar-2009 (ac) minor textual clarification
//	16-feb-2009 (ac) added helpful text
//  	11-feb-2009 (ac) fixed CR/LF issue
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

var scaffolds_loaded = false;
var scaffolds_sketch; // MDL MOL-file string
var scaffolds_xmlHttp;
var scaffolds_unmolidx; // indices of the unassigned indices
var scaffolds_unassigned = null; // array of MDLMOL strings for these

function scaffolds_Activate()
{
    if (!scaffolds_loaded) {
    	scaffolds_sketch = GetData("sketch", "scaffolds");
	scaffolds_sketch = scaffolds_sketch.split("|").join("\n");
	
	    // Setup a request to download the list of unassigned scaffolds,
	    // which will be filled in whenever the result is ready. In the
	    // meanwhile, we continue on our merry way.
	
	try {
	    scaffolds_xmlHttp = GetXmlHttpObject(ReceiveUnassigned);
	    scaffolds_xmlHttp.open('GET', 'unmatched.sdf', true);
	    if (scaffolds_xmlHttp.overrideMimeType) {
	    	scaffolds_xmlHttp.overrideMimeType('text/plain'); // (not XML)
	    }
	    scaffolds_xmlHttp.send("");
	} catch (ex) {
	    // if file isn't there, don't freak out
	}
    }
    scaffolds_loaded = true;

    var html = BuildEditing() + BuildUnusedList() + BuildClipInfo();

    return html;
}

function scaffolds_Deactivate()
{
    scaffolds_sketch = "";
    if (document.scaffapplet) {
	scaffolds_sketch += document.scaffapplet.getMoleculeMDLMOL();
    }
}

// ---------------------------- Page Construction -----------------------------

// Build the applet area for editing a group of scaffolds.

function BuildEditing()
{
    var html = "";

    	// Emit the banner which is not closeable.

    html += '<p><table class="section" width="100%"><tr height="25">'
    	  + '<td id="check_scaffedit" class="secicon" width="25">'
    	  + '<img src="' + StaticPrefix() + 'treepoint.gif">'
    	  + '</td><td class="secbar" width="50"></td>'
    	  + '<td class="secbar">Edit Scaffolds</td></tr>'
    	  + '</table>';

    	// Emit a table which has the sketcher on one side, and some keyboard
	// shortcut info on the other.

    html += '<div id="section_scaffedit" class="secblk"'
    	  + ' style="display: block;">'
    	  + '<p><table border="0"><tr><td>'
    	  + '<applet name=\"scaffapplet\" id="scaffapplet"'
    	  + ' code="SketchEl.MainApplet"'
    	  + ' archive="' + StaticPrefix() + 'SketchEl.jar"'
    	  + ' width="800" height="600">';
    
    var mdlmol = scaffolds_sketch.split("\n");

    html += '<param name="nlines" value="' + mdlmol.length + '">';
    for (var n = 0; n < mdlmol.length; n++) {
    	var line = '';
	for (var i = 0; i < mdlmol[n].length; i++) {
	    var ch = mdlmol[n].charAt(i);
	    if (i == 0) {
	    	ch = ch == ' ' ? '_' : ch;
	    } else {
	    	ch = ch == '_' ? ' ' : ch;
	    }
	    line += ch;
	}
	
	html += '<param name="line' + (n+1) + '" value="' + line + '">';
    }
    
    html += '(java unavailable)</applet>';

    html += '</td><td valign="top">'
    	  + '<h3>Cursor Mouse Modifiers</h3>'
    	  + '<p><b>Click or Drag</b>: select atoms'
    	  + '<p><b>Shift + Click or Drag</b>: add to selection'
    	  + '<p><b>Ctrl + Click</b>: select component'
    	  + '<p><b>Ctrl + Shift + Click</b>: add component to selection'
    	  + '<p><b>Alt + Drag</b>: move selected atoms'
    	  + '<p><b>Ctrl + Drag</b>: move and duplicate selected atoms'
    	  + '<p><b>Alt + Shift + Drag</b>: scale selected atoms'
    	  + '</td></tr></table>';

    	// Add the action buttons below the table.

    html += '<p><input type=\"button\" id=\"copy_clip\"'
    	  + ' value=\"Copy to Clipboard\"'
    	  + ' onClick=\"CopyMolToClipboard()"> ';
    
    html += '<input type=\"button\" id=\"paste_clip\"'
    	  + ' value=\"Paste from Clipboard\"'
    	  + ' onClick=\"CopyMolFromClipboard()"> ';

    html += "</div>";

    return html;
}

// Build a clickable list of unassigned scaffolds.

function BuildUnusedList()
{
    	// Compile a list of molecules which have no assigned scaffold.

    var count = 0;
    for (var n = 0; n < num_molecules; n++) {
    	if (molecule_scaffold[n] == 0) count++;
    }
    scaffolds_unmolidx = new Array(count);
    
    if (count == 0) return ""; // skip this section
    
    count = 0;
    for (var n = 0; n < num_molecules; n++) {
    	if (molecule_scaffold[n] == 0) scaffolds_unmolidx[count++] = n+1;
    }

    	// Compose the HTML with the unused scaffolds.
    
    var html = ComposeSectionBar("unused", "Unused Molecules", true);

    html += '<p>Out of ' + num_molecules + ' molecules, ' + count + ' did not'
    	  + ' match any scaffold. Click on any of these structures to insert'
	  + ' it into the sketcher applet.<p>';

    for (var n = 0; n < count; n++) {
    	var molnum = scaffolds_unmolidx[n];
    	var attr = 'class="noscaff"'
	    	 + ' onClick="scaffolds_Click(' + n + ')"'
	    	 + ' onMouseOver="scaffolds_Mouse(this,1)"'
	    	 + ' onMouseOut="scaffolds_Mouse(this,0)"'
		 + ' width="' + molecule_size[molnum-1][0] + '"'
		 + ' height="' + molecule_size[molnum-1][1] + '"';
    	html += LinkImageAttr("img/mol" + molnum + ".png", attr) + " ";
    }

    html += '</div>';

    return html;
}

// Some text about how to setup the clipboard.

function BuildClipInfo()
{
    var html = ComposeSectionBar("clipinfo", "Clipboard Information", false);

    html += '<p>By default, your browser may not allow JavaScript applications'
          + ' to access the clipboard. The behavior of the permission settings'
	  + ' may also vary depending on whether the web page is a local file'
	  + ' or resides on a server.';

    html += '<p><b>Internet Explorer</b>: security warnings are to be expected,'
          + ' and may reoccur depending on responses to the dialog boxes, and'
	  + ' whether different URLs are used.';
	  
    html += '<p><b>Firefox</b>: to allow limited access to the clipboard,'
          + ' enter the URL <tt>about:config</tt> in the browser\'s location'
	  + ' bar. Locate or create the setting '
	  + ' <tt>signed.applets.codebase_principal_support</tt>,'
	  + ' which is a boolean value. Set it to true.';
    
    html += '</div>';

    return html;
}

// ---------------------------------- Events ----------------------------------

// Copy & paste.

function CopyMolToClipboard()
{
    var mdlmol = null;
    try {
	mdlmol = document.scaffapplet.getMoleculeMDLMOL();
    } catch (e) {}
    
    if (!mdlmol == null || mdlmol.length == 0) {
    	mdlmol = scaffolds_sketch;
    }
    
    WriteClipboard(mdlmol, false);
}

function CopyMolFromClipboard()
{
    var mdlmol = ReadClipboard();
    
    if (!mdlmol) {
	alert("Clipboard unavailable or blank.");
	return;
    }
    
    document.scaffapplet.appendMolecule(mdlmol);
}

// The SD file with unassigned scaffolds has been delivered.

function ReceiveUnassigned()
{
    if (!(scaffolds_xmlHttp.readyState == 4 
       || scaffolds_xmlHttp.readyState == "complete")) {
	return;
    }
    var list = scaffolds_xmlHttp.responseText + "";
    if (list.indexOf("$$$$\r\n") >= 0) {
    	list = list.split("$$$$\r\n");
    } else {
    	list = list.split("$$$$\n");
    }
    if (trim(list[list.length-1]).length == 0) list.length--;
    
    scaffolds_unassigned = list;
}

// Unassigned scaffold clicked upon: poke into the sketcher.

function scaffolds_Click(unidx)
{
    if (!scaffolds_unassigned) return; // not fetched, so no can do
    
    try {
    	var mdlmol = scaffolds_unassigned[unidx];
    	document.scaffapplet.appendMolecule(mdlmol);
    } catch (ex) {} // silent failure
}

// Mouse went into or out of an unassigned scaffold.

function scaffolds_Mouse(tgt, isInside)
{
    if (isInside && scaffolds_unassigned) {
    	tgt.style.borderColor = '#8090a0';
	tgt.style.backgroundColor = '#c0d0d0';
	tgt.style.cursor = 'pointer';
    } else {
    	tgt.style.borderColor = 'transparent';
	tgt.style.backgroundColor = 'transparent';
	tgt.style.cursor = 'default';
    }
}

