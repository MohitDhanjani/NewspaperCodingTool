/*
This file host some basic initial loading code for Newspaper Annotation Tool (NAT).
Export related operations done during import of images (extracting date, volume, page, etc. information
from the filename) and export (creating a CSV file that can directly be used for analysis) are
in the main via.js file.

This tool was made by modifying VGG VIA version 2 by Mohit Dhanjani (Senior Research Fellow at Manipal University Jaipur).
 */


/*
Performs the following function when the VIA calls.
Loads the Newspaper Annotation Tool (NAT) by adding Headline, Byline, Body region attributes.
Also adds Date, Page, Volume, Issue and Publication file attributes.
*/
function _via_load_submodules() {


    nat_add_new_attribute('Headline', VIA_ATTRIBUTE_TYPE.TEXT);
    nat_add_new_attribute('Byline', VIA_ATTRIBUTE_TYPE.TEXT)
    nat_add_new_attribute('Body', VIA_ATTRIBUTE_TYPE.TEXT);

    _via_attributes['region']['Type'] = {};
    _via_attributes['region']['Type'].type = 'dropdown';
    _via_attributes['region']['Type'].options = {'News': 'News', 'Ad': 'Ad'};
    _via_attributes['region']['Type'].default_options = 'News';

    _via_attributes['file']['Date'] = { 'type':'text' };
    _via_attributes['file']['Date'].default_value = '';

    _via_attributes['file']['Page'] = { 'type':'text' };
    _via_attributes['file']['Page'].default_value = '';

    _via_attributes['file']['Volume'] = { 'type':'text' };
    _via_attributes['file']['Volume'].default_value = '';

    _via_attributes['file']['Issue'] = { 'type':'text' };
    _via_attributes['file']['Issue'].default_value = '';

    _via_attributes['file']['Publication'] = { 'type':'text' };
    _via_attributes['file']['Publication'].default_value = '';

    show_message('Successfully loaded News Annotation Tool.');

}

//Function to quickly add region attributes.
function nat_add_new_attribute(attribute_id, type) {

    _via_attributes['region'][attribute_id] = {};
    _via_attributes['region'][attribute_id].type = type;
    _via_attributes['region'][attribute_id].description = '';
    _via_attributes['region'][attribute_id].default_value = '';

}