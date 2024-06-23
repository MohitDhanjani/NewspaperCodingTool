/*
This file host some basic initial loading code for Newspaper Coding Tool (NCT).
Export related operations done during import of images (extracting date, volume, page, etc. information
from the filename) and export (creating a CSV file that can directly be used for analysis) are
in the main via.js file.

Version 3 of this tool was made by modifying VGG VIA version 3 by Mohit Dhanjani (Senior Research Fellow at Manipal University Jaipur).
 */


/*
Performs the following function when the VIA calls.
Loads the Newspaper Coding Tool (NCT) by adding Headline, Byline, Body region attributes.
Also adds Date, Page, Volume, Issue and Publication file attributes.
*/
function _via_load_submodules() {

    _via_util_msg_show('Newspaper Coding Tool loaded.');

    const NCTAttributes = [
        {name: "Headline", type: "region"},
        {name: "Byline", type: "region"},
        {name: "Body", type: "region"},
        {name: "Date", type: "file"},
        {name: "Page", type: "file"},
        {name: "Volume", type: "file"},
        {name: "Issue", type: "file"},
        {name: "Publication", type: "file"}
    ]

    for (let i = 0; i < NCTAttributes.length; i++) {
        var type = '';
        if(NCTAttributes[i].type == "file") {
            type = 'FILE1_Z0_XY0';
        } else {
            type = 'FILE1_Z0_XY1';
        }

        this.d.store.attribute[i] = new _via_attribute(NCTAttributes[i].name,
            type,
            _VIA_ATTRIBUTE_TYPE.TEXT,
            NCTAttributes[i].name,
            {},
            '');

    }

}