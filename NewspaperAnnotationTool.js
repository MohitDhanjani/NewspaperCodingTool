"use strict";
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
    // nat_add_new_attribute('Headline', VIA_ATTRIBUTE_TYPE.TEXT);
    // nat_add_new_attribute('Byline', VIA_ATTRIBUTE_TYPE.TEXT)
    // nat_add_new_attribute('Body', VIA_ATTRIBUTE_TYPE.TEXT);
    _via_attributes['region']['Codes'] = {};
    _via_attributes['region']['Codes'].type = 'checkbox';
    _via_attributes['region']['Codes'].options = {};
    _via_attributes['region']['Codes'].default_options = {};
    _via_attributes['region']['Codes'].description = 'Core attribute of coding application. You can add your coding categories in this attribute. You can also create a new attribute (of type checkbox) and add codes according to your requirements.';
    _via_attributes['region']['Type'] = {};
    _via_attributes['region']['Type'].type = 'dropdown';
    _via_attributes['region']['Type'].options = { 'Article': 'Article', 'Headline': 'Headline', 'Byline': 'Byline', 'Body': 'Body', 'Lead': 'Lead', 'Item': 'Item' };
    _via_attributes['region']['Type'].default_options = { 'Article': true };
    _via_attributes['region']['Type'].description = 'Core attribute of coding application. Options can only be added.';
    nat_add_new_attribute('Text', VIA_ATTRIBUTE_TYPE.TEXT);
    _via_attributes['region']['Text'].description = 'Core attribute of coding application. Mainly used to insert text from OCR.';
    _via_attributes['region']['Freeze Text'] = {};
    _via_attributes['region']['Freeze Text'].type = 'radio';
    _via_attributes['region']['Freeze Text'].options = { 'No': 'No', 'Yes': 'Yes' };
    _via_attributes['region']['Freeze Text'].default_options = { 'No': true };
    _via_attributes['region']['Freeze Text'].description = 'Core attribute of coding application. Options can only be added.';
    nat_add_new_attribute('Notes', VIA_ATTRIBUTE_TYPE.TEXT);
    _via_attributes['file']['Date'] = { 'type': 'text' };
    _via_attributes['file']['Date'].default_value = '';
    _via_attributes['file']['Page'] = { 'type': 'text' };
    _via_attributes['file']['Page'].default_value = '';
    _via_attributes['file']['Volume'] = { 'type': 'text' };
    _via_attributes['file']['Volume'].default_value = '';
    _via_attributes['file']['Issue'] = { 'type': 'text' };
    _via_attributes['file']['Issue'].default_value = '';
    _via_attributes['file']['Publication'] = { 'type': 'text' };
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
