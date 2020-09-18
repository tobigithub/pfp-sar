//      suggest.js        	   Structure-Activity Report JavaScript
//
//	30-jun-2009 (ac) lack of suggestions is now annotated
//	17-apr-2009 (ac) capped the length of the activity list
//	13-feb-2009 (ac) more IE6 downgrading
//	12-feb-2009 (ac) redesigned predictions & suggestions
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

var suggest_loaded = false;
var suggest_count; // # of suggestions
var suggest_data; // for each suggestion, {actnum,pred,scaff,R1,R2,...}
var suggest_activity; // 1-based, which scaffold to display & rank by
var suggest_scaffold; // 0==all scaffolds, >0=just this scaffold

function suggest_Activate()
{
    if (suggest_loaded) return null;
    suggest_loaded = true;

    suggest_count = GetData("predictions", "count");
    suggest_data = new Array();
    for (var n = 0; n < suggest_count; n++) {
    	suggest_data[n] = GetDataSplit("predictions", "suggest" + (n+1));
    }
    
    suggest_activity = 1; // the first
    suggest_scaffold = 0; // any

    var html = ComposeSectionBar('criteria', 'Criteria', true)
    	     + ComposeSuggestionCriteria()
	     + '</div>'
	     + ComposeSectionBar('suggestions', 'Suggestions', true)
	     + ComposeSuggestedMolecules()
	     + '</div>';
    return html;
}

function suggest_Deactivate()
{
}

// ---------------------------- Page Construction -----------------------------

// Returns a panel selection bar with the criteria for selecting/ordering the
// suggestions.

function ComposeSuggestionCriteria()
{
    var html = '<p><table><tr><td>';

    html += '<table class="infodata" style="border-width: 1px;">'
    	  + '<tr><td class="ihdr">Activity</td>'
    	  + '<td class="ihdr" colspan="2">Filter Scaffolds</td></tr>'
	  + '<tr>';
	     
    	// Add the activity selector.
	
    var selsz = Math.min(15, Math.max(2, num_activities));
    html += '<td class="inml" style="vertical-align: top;">'
    	  + '<select size="' + selsz + '"'
    	  + ' style="width: 10em;" onChange="suggest_ChangeActivity(this)">';
    for (var n = 0; n < num_activities; n++) {
    	var isSel = (n+1 == suggest_activity);
	html += '<option' + (isSel ? ' selected' : '')
	      + '>' + activity_name[n] + '</option>';
    }

    html += '</select></td>';
    	  
	// Add the scaffold selection.

    var bgcol = suggest_scaffold == 0 ? '#C0C0D0' 
	      : bland ? '#FFFFFF' : '#E8E8E8';
    html += '<td class="inml" '
    	  + ' onMouseOver="suggest_ScaffMouse(0,this,true)"'
	  + ' onMouseOut="suggest_ScaffMouse(0,this,false)"'
	  + ' onClick="suggest_ScaffClick(0,this)"'
	  + ' style="background-color: ' + bgcol + ';"'
	  + '>&nbsp;any&nbsp;</td>';
    html += '<td class="inml"';
    if (bland) html += ' style="background-color: #FFFFFF;"';
    html += '><nobr>';
    
    for (var n = 1; n <= num_scaffolds; n++) {
	var anything = CountSuggestions(n) > 0;
    	bgcol = suggest_scaffold == n ? '#C0C0D0' 
	      : anything ? '#E8E8E8' : '#F8F8F8';
	var bordcol = suggest_scaffold == n ? '#8090A0' 
		    : bland ? '#FFFFFF' : '#E8E8E8';
	var style = 'background-color: ' + bgcol + ';'
		 + ' border-width: ' + (bland ? 5 : 1) + 'px;'
		 + ' border-color: ' + bordcol + ';';
		 	
	var attr = '';
	if (anything) {
	    attr += ' onMouseOver="suggest_ScaffMouse(' + n + ',this,true)"'
	    	  + ' onMouseOut="suggest_ScaffMouse(' + n + ',this,false)"'
		  + ' onClick="suggest_ScaffClick(' + n + ',this)"';
	}
	attr +=	' class="noscaff" style="' + style + '"';
	html += LinkImageAttr('img/scaffold' + n + 'sm.png', attr);
	//html += "(" + CountSuggestions(n) + ")";
	if (n < num_scaffolds && n%2 == 0) html += '</nobr> <nobr>';
    }
    html += '</nobr></td>';
    
    html += '</tr></table>';

    	// Add the blab.
	
    html += '</td><td style="width: 2em;">&nbsp;</td><td valign="top">'
    	  + '<p>Suggested molecules are hypothetical constructions based on'
	  + ' motifs found in the input data, with statistical estimates of'
	  + ' probable activity. Most promising molecules are listed first.'
	  + '</td></table>';
	  
    return html;
}

// Returns all of the suggestions, as requested.

function ComposeSuggestedMolecules()
{
    var sugidx = SortedSuggestionList();
    
    if (sugidx.length == 0) {
    	return '<p>There are no helpful suggestions.';
    }

    var html = '<p><table class="infodata" style="border-width: 1px;">\n'
    	     + '<td class="ihdr">Structure</td>'
	     + '<td class="ihdr">Score</tr>';
	     
    for (var n = 0; n < sugidx.length; n++) {
    	var data = suggest_data[sugidx[n]-1]; // {actnum,pred,scaff,R...}
	var pred = parseFloat(data[1]).toFixed(4);
	var bgcol = bland ? '#FFFFFF' : '#E0E0E0';
	
    	html += '<tr><td class="inml" style="text-align: center;'
	      + ' background-color: ' + bgcol + '">'
	      + LinkImage('img/mutant' + sugidx[n] + '.png')
	      + '</td><td class="inml" style="text-align: center;">'
	      + pred + '</td></tr>';
    }
	     
    html += '</table>';
    return html;
}

// Returns the number of suggestions corresponding to a scaffold.

function CountSuggestions(scaffnum)
{
    var count = 0;
    for (var n = 0; n < suggest_count; n++) {
	if (   suggest_data[n][0] == suggest_activity
	    && suggest_data[n][2] == scaffnum) {
	    count++;
	}
    }
    return count;
}

// Returns an array with the list of suggestions that should be displayed, in
// the requested order. Indices are 1-based.

function SortedSuggestionList()
{
    var sugidx = new Array();

    for (var n = 0; n < suggest_count; n++) {
	if (suggest_data[n][0] != suggest_activity) continue;
	if (suggest_scaffold != 0 && suggest_data[n][2] != suggest_scaffold)
	    continue;
	sugidx.push(n+1);
    }
    
    var p = 0;
    while (p < sugidx.length - 1) {
	if (suggest_data[sugidx[p]-1][1] < suggest_data[sugidx[p+1]-1][1]) {
	    arraySwap(sugidx, p, p+1);
	    if (p > 0) p--;
	} else p++;
    }
    
    if (sugidx.length > 100) sugidx.length = 100;
    
    return sugidx;
}

// ---------------------------------- Events ----------------------------------

function suggest_ChangeActivity(tgt)
{
    var nodes = tgt.getElementsByTagName('option');
    for (var n = 0; n < nodes.length; n++) {
    	if (nodes[n].selected) {
	    suggest_activity = n+1;
	    break;
	}
    }
    
    Node("section_criteria").innerHTML = ComposeSuggestionCriteria();
    Node("section_suggestions").innerHTML = ComposeSuggestedMolecules();
}

function suggest_ScaffMouse(scaff, tgt, isInside)
{
    tgt.style.backgroundColor = suggest_scaffold == scaff ? '#C0C0D0'
	    	    	      : isInside ? '#E0F0FF' : '#E8E8E8';
    tgt.style.cursor = isInside ? 'pointer' : 'default';

    if (scaff != 0) {
    	tgt.style.borderColor = isInside ? '#000000'
	    	    	      : suggest_scaffold == scaff ? '#8090A0'
			      : bland ? '#FFFFFF' : 'transparent';
    }
}

function suggest_ScaffClick(scaff, tgt)
{
    if (scaff == suggest_scaffold) return;
    suggest_scaffold = scaff;
    
    Node("section_criteria").innerHTML = ComposeSuggestionCriteria();
    Node("section_suggestions").innerHTML = ComposeSuggestedMolecules();
}
